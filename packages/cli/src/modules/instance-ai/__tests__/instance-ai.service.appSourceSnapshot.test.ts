import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
vi.mock('@n8n/instance-ai', async () => {
	const { z } = await vi.importActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			disconnect = vi.fn();
		},
		createDomainAccessTracker: vi.fn(),
		createSandbox: vi.fn(),
		createWorkspace: vi.fn(),
		createLazyRuntimeWorkspace: vi.fn(),
		createLazyWorkspaceRuntimeSkillSource: vi.fn(({ source }) => source),
		setupSandboxWorkspace: vi.fn(),
		loadInstanceAiRuntimeSkillSource: vi.fn(() => ({
			registry: { skillsHash: 'runtime-skills-hash', skills: [] },
			loadSkill: vi.fn(),
		})),
		disabledInstanceAiSkillIds: vi.fn(() => []),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: vi.fn(),
		handleVerificationVerdict: vi.fn(),
		createInstanceAgent: vi.fn(),
	};
});

import { AppPreviewService } from '../app-preview/app-preview.service';
import { AppSourceSnapshotService } from '../app-preview/app-source-snapshot.service';
import { InstanceAiService } from '../instance-ai.service';

/**
 * `finalizeRun` is the one place after the agent loop where every run ends;
 * the end-of-turn app source snapshot hangs off it and must never take the
 * run down with it.
 */
describe('InstanceAiService — finalizeRun app source snapshot', () => {
	type Internals = {
		publishRunFinish: ReturnType<typeof vi.fn>;
		emitRunMetrics: ReturnType<typeof vi.fn>;
		refineTitleIfNeeded: ReturnType<typeof vi.fn>;
		sandboxService: { getCachedWorkspaceEntry: ReturnType<typeof vi.fn> };
		logger: { debug: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
		runState: { getActiveRun: ReturnType<typeof vi.fn> };
		pendingAppSnapshots: Map<string, Promise<void>>;
		appIdByThread: Map<string, string>;
		awaitPendingSnapshot: (threadId: string) => Promise<void>;
		finalizeRun: (
			threadId: string,
			runId: string,
			status: 'completed' | 'cancelled' | 'errored',
			options?: { userId?: string; user?: User },
		) => Promise<void>;
	};

	const user = { id: 'user-1' } as User;
	const workspace = { id: 'ws' };
	const snapshotAfterRun = vi.fn(async () => {});
	const rebuildIfBuilt = vi.fn(async () => {});

	function createService(
		{ cachedEntry }: { cachedEntry?: unknown } = { cachedEntry: { workspace } },
	) {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.publishRunFinish = vi.fn();
		service.emitRunMetrics = vi.fn();
		service.refineTitleIfNeeded = vi.fn(async () => {});
		service.sandboxService = { getCachedWorkspaceEntry: vi.fn(() => cachedEntry) };
		service.logger = { debug: vi.fn(), warn: vi.fn() };
		service.runState = { getActiveRun: vi.fn(() => undefined) };
		service.pendingAppSnapshots = new Map();
		service.appIdByThread = new Map([['thread-1', 'app-1']]);
		return service;
	}

	beforeEach(() => {
		snapshotAfterRun.mockReset().mockResolvedValue(undefined);
		rebuildIfBuilt.mockReset().mockResolvedValue(undefined);
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return { isActive: (name: string) => name === 'apps' };
			if (token === AppSourceSnapshotService) return { snapshotAfterRun };
			if (token === AppPreviewService) return { rebuildIfBuilt };
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const flush = async () => await new Promise((resolve) => setImmediate(resolve));

	it("snapshots the cached sandbox of the completed run's app", async () => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });
		await flush();

		expect(service.sandboxService.getCachedWorkspaceEntry).toHaveBeenCalledWith('app-app-1');
		expect(snapshotAfterRun).toHaveBeenCalledWith('app-1', user, workspace);
		expect(rebuildIfBuilt).toHaveBeenCalledWith('app-1', workspace);
	});

	it('marks built previews for rebuild in the same tick as the run-finish, before the snapshot', async () => {
		const service = createService();
		snapshotAfterRun.mockReturnValue(new Promise(() => {}));

		const finalized = service.finalizeRun('thread-1', 'run-1', 'completed', {
			userId: 'user-1',
			user,
		});

		expect(rebuildIfBuilt).toHaveBeenCalledWith('app-1', workspace);
		expect(rebuildIfBuilt.mock.invocationCallOrder[0]).toBeLessThan(
			snapshotAfterRun.mock.invocationCallOrder[0],
		);
		await finalized;
	});

	it.each(['cancelled', 'errored'] as const)('does not snapshot a %s run', async (status) => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', status, { userId: 'user-1', user });
		await flush();

		expect(snapshotAfterRun).not.toHaveBeenCalled();
		expect(rebuildIfBuilt).not.toHaveBeenCalled();
	});

	it('does not snapshot without a user', async () => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1' });
		await flush();

		expect(snapshotAfterRun).not.toHaveBeenCalled();
	});

	it('logs at debug and never creates a sandbox when the app has none cached', async () => {
		const service = createService({ cachedEntry: undefined });

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });
		await flush();

		expect(snapshotAfterRun).not.toHaveBeenCalled();
		expect(service.logger.debug).toHaveBeenCalledWith(
			'No cached app sandbox to snapshot app sources from',
			{ threadId: 'thread-1', appId: 'app-1' },
		);
	});

	it('does not look for a sandbox when the thread builds no app', async () => {
		const service = createService();
		service.appIdByThread.clear();

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });
		await flush();

		expect(service.sandboxService.getCachedWorkspaceEntry).not.toHaveBeenCalled();
		expect(snapshotAfterRun).not.toHaveBeenCalled();
	});

	it('logs a warning instead of failing the run when the snapshot throws', async () => {
		const service = createService();
		snapshotAfterRun.mockRejectedValue(new Error('sandbox gone'));

		await expect(
			service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user }),
		).resolves.toBeUndefined();
		await flush();

		expect(service.logger.warn).toHaveBeenCalledWith('App source snapshot failed', {
			threadId: 'thread-1',
			appId: 'app-1',
			error: 'sandbox gone',
		});
	});

	describe('awaitPendingSnapshot', () => {
		const settled = async (promise: Promise<void>) =>
			await Promise.race([promise.then(() => true), flush().then(() => false)]);

		it('resolves at once when the app has no snapshot in flight', async () => {
			const service = createService();

			await expect(service.awaitPendingSnapshot('app-1')).resolves.toBeUndefined();
		});

		it('resolves only after the snapshot of the completed run has landed', async () => {
			const service = createService();
			let finishSnapshot!: () => void;
			snapshotAfterRun.mockReturnValue(new Promise<void>((resolve) => (finishSnapshot = resolve)));
			await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });

			const waited = service.awaitPendingSnapshot('app-1');
			expect(await settled(waited)).toBe(false);

			finishSnapshot();
			expect(await settled(waited)).toBe(true);
			expect(await settled(service.awaitPendingSnapshot('app-1'))).toBe(true);
		});

		it('resolves when the snapshot fails', async () => {
			const service = createService();
			snapshotAfterRun.mockRejectedValue(new Error('sandbox gone'));
			await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });

			await expect(service.awaitPendingSnapshot('app-1')).resolves.toBeUndefined();
		});

		it('gives up after 15 s on a snapshot that does not land', async () => {
			vi.useFakeTimers();
			try {
				const service = createService();
				snapshotAfterRun.mockReturnValue(new Promise(() => {}));
				await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });

				const waited = service.awaitPendingSnapshot('app-1').then(() => 'done');
				await vi.advanceTimersByTimeAsync(14_999);
				expect(await Promise.race([waited, Promise.resolve('pending')])).toBe('pending');

				await vi.advanceTimersByTimeAsync(1);
				expect(await waited).toBe('done');
			} finally {
				vi.useRealTimers();
			}
		});

		it('waits only for its own app', async () => {
			const service = createService();
			snapshotAfterRun.mockReturnValue(new Promise(() => {}));
			await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });

			expect(await settled(service.awaitPendingSnapshot('app-2'))).toBe(true);
		});
	});

	it('does nothing when the apps module is inactive', async () => {
		const service = createService();
		vi.mocked(Container.get).mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return { isActive: () => false };
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });
		await flush();

		expect(service.sandboxService.getCachedWorkspaceEntry).not.toHaveBeenCalled();
		expect(snapshotAfterRun).not.toHaveBeenCalled();
	});
});
