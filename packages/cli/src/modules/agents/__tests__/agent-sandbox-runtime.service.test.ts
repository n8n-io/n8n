import { canonicalizePath, MxcLocalFilesystem, MxcSandbox } from '@n8n/agents/sandbox';
import type {
	DaytonaSandboxConfig,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { InstanceSettings } from 'n8n-core';

import type { SandboxSettingsService } from '../../../services/sandbox-settings.service';

import type { ProjectAgent } from '../entities/agent.entity';
import { hashAgentSandboxPrincipal } from '../agent-sandbox-principal';
import { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentRepository } from '../repositories/agent.repository';

const { createSandboxMock, createFilesystemMock } = vi.hoisted(() => ({
	createSandboxMock: vi.fn(),
	createFilesystemMock: vi.fn(),
}));

vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	createSandbox: createSandboxMock,
	createFilesystem: createFilesystemMock,
}));

const instanceId = 'instance-1';
const projectId = 'project-1';
const agentId = 'agent-1';
const principalHash = hashAgentSandboxPrincipal({
	type: 'integration-thread',
	connectionId: 'connection/raw:id',
	platform: 'slack',
	platformThreadId: 'U/raw:123',
});
const otherPrincipalHash = hashAgentSandboxPrincipal({
	type: 'n8n-user',
	userId: 'user/123:raw',
});
const workspaceSandboxId = 'cd7bd5bf-d6c4-5a24-a100-43c5158ab50d';
const otherWorkspaceSandboxId = '4197eecc-3092-54b8-9196-a4fecccea156';
const knowledgeSandboxId = 'a54b9053-9f50-51e5-b971-e02942ff7b6b';

type TestWorkspaceSandbox = WorkspaceSandbox &
	Required<Pick<WorkspaceSandbox, '_start' | 'destroy' | 'deleteRemote' | 'executeCommand'>>;

function makeAgentRepository(): ReturnType<typeof mock<AgentRepository>> {
	const repository = mock<AgentRepository>();
	repository.findByIdAndProjectId.mockResolvedValue({
		id: agentId,
		projectId,
		activeVersionId: null,
	} as ProjectAgent);
	return repository;
}

function makeSandboxSettingsService(
	provider: SandboxProvider = 'daytona',
): ReturnType<typeof mock<SandboxSettingsService>> {
	const service = mock<SandboxSettingsService>();
	service.isAgentSandboxEnabled.mockReturnValue(true);
	service.getProvider.mockReturnValue(provider);
	service.resolveDaytonaSandboxConfig.mockImplementation(async (_projectId, options) => ({
		...options,
		daytonaApiUrl: 'https://daytona.example',
		daytonaApiKey: 'test-key',
	}));
	service.resolveN8nSandboxConfig.mockResolvedValue({
		serviceUrl: 'https://sandbox.example',
		apiKey: 'sandbox-key',
	});
	return service;
}

function makeService({
	configOverrides = {},
	logger = mock<Logger>(),
	instanceSettings = mock<InstanceSettings>({ instanceId, n8nFolder: '/home/node/.n8n' }),
	agentRepository = makeAgentRepository(),
	sandboxSettingsService = makeSandboxSettingsService(),
}: {
	configOverrides?: Partial<AgentsConfig>;
	logger?: Logger;
	instanceSettings?: InstanceSettings;
	agentRepository?: AgentRepository;
	sandboxSettingsService?: SandboxSettingsService;
} = {}): AgentSandboxRuntimeService {
	return new AgentSandboxRuntimeService(
		{
			sandboxEnabled: true,
			sandboxImage: 'daytonaio/sandbox:0.5.0',
			sandboxSnapshot: '',
			sandboxTimeout: 300_000,
			sandboxEphemeral: false,
			sandboxProvider: '',
			mxcWorkspaceRoot: '',
			mxcReadonlyPaths: '',
			mxcDenialsReportDir: '',
			...configOverrides,
		} as AgentsConfig,
		logger,
		instanceSettings,
		agentRepository,
		sandboxSettingsService,
	);
}

function makeSandbox(
	provider: SandboxProvider = 'daytona',
	id = 'sandbox-id',
): ReturnType<typeof mock<TestWorkspaceSandbox>> {
	const sandbox = mock<TestWorkspaceSandbox>({
		id,
		name: provider === 'daytona' ? 'DaytonaSandbox' : 'N8nSandboxServiceSandbox',
		provider,
		status: 'pending',
	});
	sandbox._start.mockResolvedValue();
	sandbox.destroy.mockResolvedValue();
	return sandbox;
}

describe('AgentSandboxRuntimeService', () => {
	let sandbox: ReturnType<typeof mock<TestWorkspaceSandbox>>;

	beforeEach(() => {
		vi.clearAllMocks();
		sandbox = makeSandbox();
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(mock<WorkspaceFilesystem>());
	});

	it('creates and starts the deterministic direct-mode Daytona knowledge sandbox', async () => {
		const sandboxSettingsService = makeSandboxSettingsService();
		const service = makeService({
			configOverrides: {
				sandboxSnapshot: 'n8n/agent-knowledge:1.2.3',
				sandboxEphemeral: true,
			},
			sandboxSettingsService,
		});
		const expectedName = `agent-kb-${knowledgeSandboxId}`;

		await service.warmKnowledgeSandbox(projectId, agentId);

		expect(sandboxSettingsService.resolveDaytonaSandboxConfig).toHaveBeenCalledWith(projectId, {
			image: 'daytonaio/sandbox:0.5.0',
			snapshot: 'n8n/agent-knowledge:1.2.3',
		});
		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				enabled: true,
				provider: 'daytona',
				id: expectedName,
				name: expectedName,
				daytonaApiUrl: 'https://daytona.example',
				daytonaApiKey: 'test-key',
				labels: {
					'n8n-agents-knowledgebase': 'true',
					'n8n-project-id': projectId,
					'n8n-agent-id': agentId,
					'n8n-agent-sandbox-kind': 'knowledge',
				},
				timeout: 300_000,
				createTimeoutSeconds: 300,
				image: 'daytonaio/sandbox:0.5.0',
				snapshot: 'n8n/agent-knowledge:1.2.3',
				ephemeral: true,
				autoStopInterval: 15,
				autoArchiveInterval: 60,
			}),
			expect.anything(),
		);
		expect(
			(createSandboxMock.mock.calls[0][0] as DaytonaSandboxConfig).autoDeleteInterval,
		).toBeUndefined();
		expect(sandbox._start).toHaveBeenCalled();
		expect(createFilesystemMock).toHaveBeenCalledWith(sandbox, undefined);
	});

	it('constructs workspace sandboxes without booting them and passes the filesystem init hook', async () => {
		const service = makeService();
		const onFilesystemInit = vi.fn();

		await service.acquireWorkspaceSandbox(projectId, agentId, principalHash, {
			onFilesystemInit,
		});

		expect(sandbox._start).not.toHaveBeenCalled();
		expect(createFilesystemMock).toHaveBeenCalledWith(sandbox, { onInit: onFilesystemInit });

		await service.acquireKnowledgeSandbox(projectId, agentId);

		expect(sandbox._start).toHaveBeenCalledTimes(1);
	});

	it('single-flights concurrent knowledge acquisition for the same project and agent', async () => {
		let resolveCreation: (value: WorkspaceSandbox) => void;
		createSandboxMock.mockReturnValue(
			new Promise((resolve) => {
				resolveCreation = resolve;
			}),
		);
		const service = makeService();

		const first = service.warmKnowledgeSandbox(projectId, agentId);
		const second = service.warmKnowledgeSandbox(projectId, agentId);
		await vi.waitFor(() => expect(createSandboxMock).toHaveBeenCalledTimes(1));
		resolveCreation!(sandbox);
		await Promise.all([first, second]);
	});

	it('uses deterministic, isolated Daytona identities and labels', async () => {
		const service = makeService();

		await service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		await service.acquireWorkspaceSandbox(projectId, agentId, otherPrincipalHash);
		await service.acquireKnowledgeSandbox(projectId, agentId);

		const configs = createSandboxMock.mock.calls.map(([config]) => config as DaytonaSandboxConfig);
		expect(configs.map(({ id, name }) => ({ id, name }))).toEqual([
			{
				id: `agent-ws-${workspaceSandboxId}`,
				name: `agent-ws-${workspaceSandboxId}`,
			},
			{
				id: `agent-ws-${otherWorkspaceSandboxId}`,
				name: `agent-ws-${otherWorkspaceSandboxId}`,
			},
			{
				id: `agent-kb-${knowledgeSandboxId}`,
				name: `agent-kb-${knowledgeSandboxId}`,
			},
		]);
		expect(configs[0].labels).toEqual({
			'n8n-project-id': projectId,
			'n8n-agent-id': agentId,
			'n8n-agent-sandbox-kind': 'workspace',
			'n8n-agent-principal-hash': principalHash,
		});
		expect(
			configs.map(({ ephemeral, autoStopInterval, autoArchiveInterval, autoDeleteInterval }) => [
				ephemeral,
				autoStopInterval,
				autoArchiveInterval,
				autoDeleteInterval,
			]),
		).toEqual([
			[false, 5, 60, 1_440],
			[false, 5, 60, 1_440],
			[false, 15, 60, 10_080],
		]);
	});

	it('single-flights the same workspace identity without coalescing different principals', async () => {
		const resolveCreations: Array<(value: WorkspaceSandbox) => void> = [];
		createSandboxMock.mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolveCreations.push(resolve);
				}),
		);
		const service = makeService();

		const first = service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		const duplicate = service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		const distinct = service.acquireWorkspaceSandbox(projectId, agentId, otherPrincipalHash);
		await vi.waitFor(() => expect(createSandboxMock).toHaveBeenCalledTimes(2));
		for (const resolveCreation of resolveCreations) resolveCreation(sandbox);
		await Promise.all([first, duplicate, distinct]);
	});

	it('uses distinct deterministic workspace and knowledge IDs for the n8n sandbox', async () => {
		const service = makeService({
			sandboxSettingsService: makeSandboxSettingsService('n8n-sandbox'),
		});

		await service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		await service.acquireKnowledgeSandbox(projectId, agentId);

		expect(createSandboxMock.mock.calls.map(([config]) => config.id)).toEqual([
			workspaceSandboxId,
			knowledgeSandboxId,
		]);
		expect(createSandboxMock.mock.calls[1][0]).toEqual(
			expect.objectContaining({
				provider: 'n8n-sandbox',
				serviceUrl: 'https://sandbox.example',
				apiKey: 'sandbox-key',
			}),
		);
	});

	it('marks the n8n sandbox knowledge sandbox ephemeral when configured, but never the workspace', async () => {
		const service = makeService({
			configOverrides: { sandboxEphemeral: true },
			sandboxSettingsService: makeSandboxSettingsService('n8n-sandbox'),
		});

		await service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		await service.acquireKnowledgeSandbox(projectId, agentId);

		expect(createSandboxMock.mock.calls.map(([config]) => config.ephemeral)).toEqual([false, true]);
	});

	it('reports how to configure a missing n8n sandbox service URL', async () => {
		const settingsService = makeSandboxSettingsService('n8n-sandbox');
		settingsService.resolveN8nSandboxConfig.mockResolvedValue({});
		const service = makeService({ sandboxSettingsService: settingsService });

		await expect(service.warmKnowledgeSandbox(projectId, agentId)).rejects.toThrow(
			/N8N_SANDBOX_SERVICE_URL/,
		);
		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('surfaces a snapshot failure without falling back to an image', async () => {
		createSandboxMock.mockRejectedValueOnce(new Error('snapshot missing'));
		const sandboxSettingsService = makeSandboxSettingsService();
		sandboxSettingsService.resolveDaytonaSandboxConfig.mockResolvedValue({
			daytonaApiUrl: 'https://sandbox-proxy.example',
			snapshot: 'n8n/agent-knowledge:missing',
		});
		const service = makeService({
			sandboxSettingsService,
		});

		await expect(service.warmKnowledgeSandbox(projectId, agentId)).rejects.toThrow(
			'snapshot missing',
		);
		const config = createSandboxMock.mock.calls[0][0] as DaytonaSandboxConfig;
		expect(config.snapshot).toBe('n8n/agent-knowledge:missing');
		expect(config.image).toBeUndefined();
	});

	it('best-effort destroys workspace and knowledge sandboxes by only their exact identities', async () => {
		const destroyedIds: string[] = [];
		createSandboxMock.mockImplementation(async (config) => {
			const target = makeSandbox(config.provider, config.id);
			// Teardown must delete by identity even though these instances never started.
			target.deleteRemote.mockImplementation(async () => {
				destroyedIds.push(config.id);
				if (config.id === `agent-kb-${knowledgeSandboxId}`) {
					throw new Error('remote unavailable');
				}
			});
			return target;
		});
		const service = makeService();

		await service.destroyWorkspaceSandbox(projectId, agentId, principalHash);
		await service.destroyKnowledgeSandbox(projectId, agentId);

		expect(destroyedIds).toEqual([
			`agent-ws-${workspaceSandboxId}`,
			workspaceSandboxId,
			`agent-kb-${knowledgeSandboxId}`,
			knowledgeSandboxId,
		]);
	});

	describe('with N8N_AGENTS_AI_SANDBOX_PROVIDER=mxc', () => {
		const mxcConfig: Partial<AgentsConfig> = {
			sandboxProvider: 'mxc',
			mxcWorkspaceRoot: '/srv/agent-workspaces',
			mxcReadonlyPaths: '/data/reports, /data/exports',
		};
		const n8nFolder = '/home/node/.n8n';

		it('builds a local mxc workspace without the shared sandbox factory', async () => {
			const service = makeService({
				configOverrides: mxcConfig,
				instanceSettings: mock<InstanceSettings>({ instanceId, n8nFolder }),
			});

			const runtime = await service.acquireWorkspaceSandbox(projectId, agentId, principalHash);

			// Paths are compared as real paths. On macOS, /home is itself a link.
			const root = await canonicalizePath('/srv/agent-workspaces');
			expect(createSandboxMock).not.toHaveBeenCalled();
			expect(runtime.provider).toBe('mxc');
			expect(runtime.sandbox).toBeInstanceOf(MxcSandbox);
			expect(runtime.filesystem).toBeInstanceOf(MxcLocalFilesystem);
			expect(runtime.workspaceRoot).toBe(join(root, workspaceSandboxId));
			const sandbox = runtime.sandbox as MxcSandbox;
			expect(sandbox.readonlyPaths).toEqual(['/data/reports', '/data/exports']);
			expect(sandbox.deniedPaths).toContain(await canonicalizePath(n8nFolder));
		});

		it('refuses a workspace root inside the n8n user folder', async () => {
			const service = makeService({
				configOverrides: { ...mxcConfig, mxcWorkspaceRoot: `${n8nFolder}/workspaces` },
				instanceSettings: mock<InstanceSettings>({ instanceId, n8nFolder }),
			});

			await expect(
				service.acquireWorkspaceSandbox(projectId, agentId, principalHash),
			).rejects.toThrow(/must be outside the n8n user folder/);
		});

		it('refuses a workspace root that is a symlink into the n8n user folder', async () => {
			const base = mkdtempSync(join(tmpdir(), 'mxc-root-test-'));
			try {
				const userFolder = join(base, '.n8n');
				mkdirSync(join(userFolder, 'inner'), { recursive: true });
				symlinkSync(join(userFolder, 'inner'), join(base, 'workspaces'));
				const service = makeService({
					configOverrides: { ...mxcConfig, mxcWorkspaceRoot: join(base, 'workspaces') },
					instanceSettings: mock<InstanceSettings>({ instanceId, n8nFolder: userFolder }),
				});

				await expect(
					service.acquireWorkspaceSandbox(projectId, agentId, principalHash),
				).rejects.toThrow(/must be outside the n8n user folder/);
			} finally {
				rmSync(base, { recursive: true, force: true });
			}
		});

		it('refuses a read-only path that is a symlink into the n8n user folder', async () => {
			const base = mkdtempSync(join(tmpdir(), 'mxc-readonly-test-'));
			try {
				const userFolder = join(base, '.n8n');
				mkdirSync(userFolder);
				symlinkSync(userFolder, join(base, 'reports'));
				const service = makeService({
					configOverrides: {
						...mxcConfig,
						mxcWorkspaceRoot: join(base, 'workspaces'),
						mxcReadonlyPaths: join(base, 'reports'),
					},
					instanceSettings: mock<InstanceSettings>({ instanceId, n8nFolder: userFolder }),
				});

				await expect(
					service.acquireWorkspaceSandbox(projectId, agentId, principalHash),
				).rejects.toThrow(/must not include the n8n user folder/);
			} finally {
				rmSync(base, { recursive: true, force: true });
			}
		});

		it('keeps the knowledge sandbox on the n8n Assistant provider', async () => {
			const service = makeService({ configOverrides: mxcConfig });

			await service.acquireKnowledgeSandbox(projectId, agentId);

			expect(createSandboxMock).toHaveBeenCalledWith(
				expect.objectContaining({ provider: 'daytona' }),
				expect.anything(),
			);
		});

		it('deletes the local workspace folder with the workspace sandbox only', async () => {
			const root = mkdtempSync(join(tmpdir(), 'mxc-teardown-test-'));
			try {
				const workspace = join(await canonicalizePath(root), workspaceSandboxId);
				mkdirSync(workspace);
				const service = makeService({
					configOverrides: { ...mxcConfig, mxcWorkspaceRoot: root },
				});

				await service.destroyKnowledgeSandbox(projectId, agentId);
				expect(existsSync(workspace)).toBe(true);

				await service.destroyWorkspaceSandbox(projectId, agentId, principalHash);
				expect(existsSync(workspace)).toBe(false);
			} finally {
				rmSync(root, { recursive: true, force: true });
			}
		});
	});

	it('warns about an unsupported N8N_AGENTS_AI_SANDBOX_PROVIDER value', () => {
		const logger = mock<Logger>();

		makeService({ configOverrides: { sandboxProvider: 'docker' }, logger });

		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"docker"'));
	});
});
