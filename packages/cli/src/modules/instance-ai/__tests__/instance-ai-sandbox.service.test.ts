import type { Mock } from 'vitest';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';

vi.mock('@n8n/instance-ai', () => ({
	createSandbox: vi.fn(),
	createWorkspace: vi.fn(),
	setupSandboxWorkspace: vi.fn(),
}));

import {
	createSandbox,
	createWorkspace,
	setupSandboxWorkspace,
	type InstanceAiContext,
	type ManagedBackgroundTask,
} from '@n8n/instance-ai';

import {
	InstanceAiSandboxService,
	type InstanceAiSandboxBackgroundTasks,
	type InstanceAiSandboxProxy,
	type InstanceAiSandboxRunState,
	type InstanceAiSandboxServiceOptions,
	type InstanceAiSandboxSettings,
} from '../sandbox';

const fakeUser = { id: 'user-1' } as User;

type Overrides = {
	config?: Partial<InstanceAiConfig>;
	runState?: Partial<InstanceAiSandboxRunState>;
	backgroundTasks?: Partial<InstanceAiSandboxBackgroundTasks>;
	settingsService?: Partial<InstanceAiSandboxSettings>;
	aiService?: Partial<InstanceAiSandboxProxy>;
};

function createSandboxService(overrides: Overrides = {}) {
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	const errorReporter = { error: vi.fn() } as unknown as ErrorReporter;
	const runState: InstanceAiSandboxRunState = {
		getActiveRunId: vi.fn(() => undefined),
		hasSuspendedRun: vi.fn(() => false),
		...overrides.runState,
	};
	const backgroundTasks: InstanceAiSandboxBackgroundTasks = {
		getRunningTasks: vi.fn(() => [] as ManagedBackgroundTask[]),
		...overrides.backgroundTasks,
	};
	const settingsService: InstanceAiSandboxSettings = {
		resolveDaytonaConfig: vi.fn(async () => ({})),
		resolveN8nSandboxConfig: vi.fn(async () => ({})),
		...overrides.settingsService,
	};
	const aiService: InstanceAiSandboxProxy = {
		isProxyEnabled: vi.fn(() => false),
		getClient: vi.fn(),
		...overrides.aiService,
	};
	const options: InstanceAiSandboxServiceOptions = {
		config: overrides.config as InstanceAiConfig,
		logger,
		errorReporter,
		runState,
		backgroundTasks,
		settingsService,
		aiService,
	};
	const service = new InstanceAiSandboxService(options);
	return { service, logger, runState, backgroundTasks, settingsService, aiService };
}

describe('InstanceAiSandboxService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(createSandbox as Mock).mockReset();
		(createWorkspace as Mock).mockReset();
		(setupSandboxWorkspace as Mock).mockReset();
	});

	describe('config resolution', () => {
		it('returns a disabled config when sandboxes are not enabled', async () => {
			const { service } = createSandboxService({
				config: { sandboxEnabled: false, sandboxProvider: 'daytona', sandboxTimeout: 42 },
			});

			const config = await service.resolveSandboxConfig(fakeUser);

			expect(config).toEqual({ enabled: false, provider: 'daytona', timeout: 42 });
		});

		it('merges admin Daytona credentials in direct mode', async () => {
			const resolveDaytonaConfig = vi.fn(async () => ({
				apiUrl: 'https://admin.daytona',
				apiKey: 'admin-key',
			}));
			const { service } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
				settingsService: { resolveDaytonaConfig },
				aiService: { isProxyEnabled: vi.fn(() => false) },
			});

			const config = await service.resolveSandboxConfig(fakeUser);

			expect(resolveDaytonaConfig).toHaveBeenCalledWith(fakeUser);
			expect(config).toMatchObject({
				enabled: true,
				provider: 'daytona',
				daytonaApiUrl: 'https://admin.daytona',
				daytonaApiKey: 'admin-key',
			});
		});

		it('routes Daytona traffic through the assistant proxy when enabled', async () => {
			const getBuilderApiProxyToken = vi.fn(async () => ({ accessToken: 'token-1' }));
			const client = {
				getSandboxProxyConfig: vi.fn(async () => ({ image: 'proxy-image' })),
				getSandboxProxyBaseUrl: vi.fn(() => 'https://proxy.base'),
				getBuilderApiProxyToken,
			};
			const { service } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
				aiService: {
					isProxyEnabled: vi.fn(() => true),
					getClient: vi.fn(async () => client),
				},
			});

			const config = await service.resolveSandboxConfig(fakeUser);

			expect(config).toMatchObject({
				enabled: true,
				provider: 'daytona',
				daytonaApiUrl: 'https://proxy.base',
				image: 'proxy-image',
			});
			if (config.enabled && config.provider === 'daytona') {
				const token = await config.getAuthToken?.();
				expect(token).toBe('token-1');
				expect(getBuilderApiProxyToken).toHaveBeenCalledWith(
					{ id: fakeUser.id },
					expect.objectContaining({ userMessageId: expect.any(String) }),
				);
			}
		});

		it('merges admin n8n-sandbox credentials', async () => {
			const resolveN8nSandboxConfig = vi.fn(async () => ({
				serviceUrl: 'https://admin.sandbox',
				apiKey: 'admin-key',
			}));
			const { service } = createSandboxService({
				config: {
					sandboxEnabled: true,
					sandboxProvider: 'n8n-sandbox',
					n8nSandboxServiceUrl: 'https://env.sandbox',
				},
				settingsService: { resolveN8nSandboxConfig },
			});

			const config = await service.resolveSandboxConfig(fakeUser);

			expect(config).toMatchObject({
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl: 'https://admin.sandbox',
				apiKey: 'admin-key',
			});
		});
	});

	describe('getSandboxConfigFromEnv', () => {
		const daytonaEnvConfig: Partial<InstanceAiConfig> = {
			sandboxEnabled: true,
			sandboxProvider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'key',
			sandboxImage: 'img',
			sandboxTimeout: 1000,
			sandboxNamePrefix: '',
			sandboxEphemeral: false,
			sandboxAutoStopMinutes: 15,
			sandboxAutoArchiveMinutes: 10_080,
			sandboxAutoDeleteMinutes: 43_200,
			daytonaTokenRefreshSkewMs: 1000,
		};

		it('marks daytona sandboxes ephemeral when the env flag is set', () => {
			const { service } = createSandboxService({
				config: { ...daytonaEnvConfig, sandboxEphemeral: true },
			});

			expect(service.getSandboxConfigFromEnv()).toMatchObject({
				enabled: true,
				provider: 'daytona',
				ephemeral: true,
			});
		});

		it('keeps daytona sandboxes non-ephemeral by default', () => {
			const { service } = createSandboxService({
				config: { ...daytonaEnvConfig, sandboxEphemeral: false },
			});

			expect(service.getSandboxConfigFromEnv()).toMatchObject({
				provider: 'daytona',
				ephemeral: false,
			});
		});

		it('forwards stop, archive and delete intervals for non-ephemeral sandboxes', () => {
			const { service } = createSandboxService({
				config: {
					...daytonaEnvConfig,
					sandboxEphemeral: false,
					sandboxAutoStopMinutes: 30,
					sandboxAutoArchiveMinutes: 1440,
					sandboxAutoDeleteMinutes: 43_200,
				},
			});

			expect(service.getSandboxConfigFromEnv()).toMatchObject({
				provider: 'daytona',
				autoStopInterval: 30,
				autoArchiveInterval: 1440,
				autoDeleteInterval: 43_200,
			});
		});

		it('omits the delete interval for ephemeral sandboxes so Daytona deletes on stop', () => {
			const { service } = createSandboxService({
				config: {
					...daytonaEnvConfig,
					sandboxEphemeral: true,
					sandboxAutoDeleteMinutes: 43_200,
				},
			});

			const config = service.getSandboxConfigFromEnv();

			expect(config).toMatchObject({ provider: 'daytona', ephemeral: true });
			expect((config as { autoDeleteInterval?: number }).autoDeleteInterval).toBeUndefined();
		});

		it('pins the full snapshot name when the override env var is set', () => {
			const { service } = createSandboxService({
				config: { ...daytonaEnvConfig, sandboxSnapshot: 'n8n/instance-ai:2.27.3' },
			});

			expect(service.getSandboxConfigFromEnv()).toMatchObject({
				provider: 'daytona',
				snapshot: 'n8n/instance-ai:2.27.3',
			});
		});
	});

	describe('workspace lifecycle', () => {
		it('serializes workspace creation for concurrent calls on the same thread', async () => {
			const { service } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
			});

			let resolveSandbox!: (sandbox: unknown) => void;
			const sandboxPromise = new Promise((resolve) => {
				resolveSandbox = resolve;
			});
			const sandbox = { id: 'sandbox-1' };
			const workspace = { init: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
			(createSandbox as Mock).mockReturnValue(sandboxPromise);
			(createWorkspace as Mock).mockReturnValue(workspace);
			(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

			const first = service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);
			const second = service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);
			resolveSandbox(sandbox);
			const [firstEntry, secondEntry] = await Promise.all([first, second]);

			expect(firstEntry).toBe(secondEntry);
			expect(createSandbox).toHaveBeenCalledTimes(1);
			expect(createSandbox).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'instance-ai-thread-thread-1',
					name: 'instance-ai-thread-thread-1',
					labels: expect.objectContaining({
						'n8n-builder': 'instance-ai-thread-thread-1',
						thread_id: 'thread-1',
					}),
				}),
				expect.objectContaining({ useSnapshotFallback: true }),
			);
			expect(createWorkspace).toHaveBeenCalledTimes(1);
			expect(createWorkspace).toHaveBeenCalledWith(sandbox);
			expect(workspace.init).toHaveBeenCalledTimes(1);
			expect(setupSandboxWorkspace).toHaveBeenCalledTimes(1);
		});

		it('threads Daytona name prefixes and labels through sandbox creation', async () => {
			const { service } = createSandboxService({
				config: {
					sandboxEnabled: true,
					sandboxProvider: 'daytona',
					sandboxNamePrefix: 'Acme Eval',
				},
			});
			const sandbox = { id: 'sandbox-1' };
			const workspace = { init: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
			(createSandbox as Mock).mockResolvedValue(sandbox);
			(createWorkspace as Mock).mockReturnValue(workspace);
			(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

			await service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);

			expect(createSandbox).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'acme-eval-instance-ai-thread-thread-1',
					name: 'acme-eval-instance-ai-thread-thread-1',
					labels: expect.objectContaining({
						'n8n-builder': 'instance-ai-thread-thread-1',
						name_prefix: 'Acme-Eval',
						thread_id: 'thread-1',
					}),
				}),
				expect.objectContaining({ useSnapshotFallback: true }),
			);
		});

		it('returns undefined without creating a sandbox when the resolved config is disabled', async () => {
			const { service } = createSandboxService({
				config: { sandboxEnabled: false, sandboxProvider: 'daytona' },
			});

			const entry = await service.getOrCreateWorkspace(
				'thread-1',
				fakeUser,
				{} as InstanceAiContext,
			);

			expect(entry).toBeUndefined();
			expect(createSandbox).not.toHaveBeenCalled();
		});

		it('keeps the sandbox after setup failure and retries setup on the next use', async () => {
			const { service } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
			});
			const sandbox = { id: 'sandbox-1' };
			const workspace = { init: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
			(createSandbox as Mock).mockResolvedValue(sandbox);
			(createWorkspace as Mock).mockReturnValue(workspace);
			(setupSandboxWorkspace as Mock)
				.mockRejectedValueOnce(new Error('setup failed'))
				.mockResolvedValueOnce(undefined);

			await expect(
				service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext),
			).rejects.toThrow('setup failed');

			expect(workspace.destroy).not.toHaveBeenCalled();

			const entry = await service.getOrCreateWorkspace(
				'thread-1',
				fakeUser,
				{} as InstanceAiContext,
			);

			expect(entry).toBeDefined();
			expect(createSandbox).toHaveBeenCalledTimes(1);
			expect(setupSandboxWorkspace).toHaveBeenCalledTimes(2);
		});

		it('destroys the workspace when sandbox startup fails', async () => {
			const { service } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
			});
			const sandbox = { id: 'sandbox-1' };
			const workspace = {
				init: vi.fn(async () => {
					throw new Error('init failed');
				}),
				destroy: vi.fn(async () => {}),
			};
			(createSandbox as Mock).mockResolvedValue(sandbox);
			(createWorkspace as Mock).mockReturnValue(workspace);

			await expect(
				service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext),
			).rejects.toThrow('init failed');

			expect(workspace.destroy).toHaveBeenCalledTimes(1);
			expect(setupSandboxWorkspace).not.toHaveBeenCalled();
		});
	});

	describe('expiry timers', () => {
		it('evicts expired runtime sandbox entries without destroying the provider workspace', async () => {
			vi.useFakeTimers();
			try {
				const { service } = createSandboxService({
					config: { sandboxEnabled: true, sandboxProvider: 'daytona', builderSandboxTtlMs: 1000 },
				});
				const sandbox = { id: 'sandbox-1' };
				const workspace = { init: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
				(createSandbox as Mock).mockResolvedValue(sandbox);
				(createWorkspace as Mock).mockReturnValue(workspace);
				(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

				const entry = await service.getOrCreateWorkspace(
					'thread-1',
					fakeUser,
					{} as InstanceAiContext,
				);
				expect(entry).toBeDefined();

				vi.advanceTimersByTime(1000);

				// Eviction drops the cache entry but never destroys the remote workspace.
				expect(workspace.destroy).not.toHaveBeenCalled();
				await service.destroySandbox('thread-1');
				// Already evicted, so destroy has nothing to tear down.
				expect(workspace.destroy).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('keeps an in-use sandbox alive when the expiry timer fires', async () => {
			vi.useFakeTimers();
			try {
				const getRunningTasks = vi.fn(() => [{ taskId: 'task-1' }] as ManagedBackgroundTask[]);
				const { service } = createSandboxService({
					config: { sandboxEnabled: true, sandboxProvider: 'daytona', builderSandboxTtlMs: 1000 },
					backgroundTasks: { getRunningTasks },
				});
				const sandbox = { id: 'sandbox-1' };
				const workspace = { init: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
				(createSandbox as Mock).mockResolvedValue(sandbox);
				(createWorkspace as Mock).mockReturnValue(workspace);
				(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

				await service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);

				vi.advanceTimersByTime(1000);

				// In-use sandboxes are touched (re-scheduled) rather than dropped.
				const reused = await service.getOrCreateWorkspace(
					'thread-1',
					fakeUser,
					{} as InstanceAiContext,
				);
				expect(reused).toBeDefined();
				expect(createSandbox).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});

		it('clears scheduled expiry timers on stopSandboxExpiryTimers', async () => {
			vi.useFakeTimers();
			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
			try {
				const { service } = createSandboxService({
					config: { sandboxEnabled: true, sandboxProvider: 'daytona', builderSandboxTtlMs: 1000 },
				});
				const sandbox = { id: 'sandbox-1' };
				const workspace = { init: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
				(createSandbox as Mock).mockResolvedValue(sandbox);
				(createWorkspace as Mock).mockReturnValue(workspace);
				(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

				await service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);
				clearTimeoutSpy.mockClear();

				service.stopSandboxExpiryTimers();

				expect(clearTimeoutSpy).toHaveBeenCalled();
			} finally {
				clearTimeoutSpy.mockRestore();
				vi.useRealTimers();
			}
		});
	});

	describe('destroySandbox', () => {
		it('destroys and removes the workspace for a thread', async () => {
			const { service } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
			});
			const sandbox = { id: 'sandbox-1' };
			const workspace = { init: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
			(createSandbox as Mock).mockResolvedValue(sandbox);
			(createWorkspace as Mock).mockReturnValue(workspace);
			(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

			await service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);
			await service.destroySandbox('thread-1');

			expect(workspace.destroy).toHaveBeenCalledTimes(1);

			// A second call is a no-op because the entry is already gone.
			await service.destroySandbox('thread-1');
			expect(workspace.destroy).toHaveBeenCalledTimes(1);
		});

		it('swallows workspace destroy errors and logs a warning', async () => {
			const { service, logger } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
			});
			const sandbox = { id: 'sandbox-1' };
			const workspace = {
				init: vi.fn(async () => {}),
				destroy: vi.fn(async () => {
					throw new Error('teardown failed');
				}),
			};
			(createSandbox as Mock).mockResolvedValue(sandbox);
			(createWorkspace as Mock).mockReturnValue(workspace);
			(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

			await service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);
			await expect(service.destroySandbox('thread-1', 'custom_reason')).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to destroy sandbox',
				expect.objectContaining({
					threadId: 'thread-1',
					reason: 'custom_reason',
					error: 'teardown failed',
				}),
			);
		});

		it('is a no-op for an unknown thread', async () => {
			const { service } = createSandboxService({
				config: { sandboxEnabled: true, sandboxProvider: 'daytona' },
			});

			await expect(service.destroySandbox('missing-thread')).resolves.toBeUndefined();
		});
	});
});
