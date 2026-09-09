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
		createAllTools: vi.fn(),
	};
});

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

	function createService(
		{ cachedEntry }: { cachedEntry?: unknown } = { cachedEntry: { workspace } },
	) {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.publishRunFinish = vi.fn();
		service.emitRunMetrics = vi.fn();
		service.refineTitleIfNeeded = vi.fn(async () => {});
		service.sandboxService = { getCachedWorkspaceEntry: vi.fn(() => cachedEntry) };
		service.logger = { debug: vi.fn(), warn: vi.fn() };
		return service;
	}

	beforeEach(() => {
		snapshotAfterRun.mockReset().mockResolvedValue(undefined);
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return { isActive: (name: string) => name === 'apps' };
			if (token === AppSourceSnapshotService) return { snapshotAfterRun };
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const flush = async () => await new Promise((resolve) => setImmediate(resolve));

	it('snapshots the cached sandbox of a completed run', async () => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });
		await flush();

		expect(service.sandboxService.getCachedWorkspaceEntry).toHaveBeenCalledWith('thread-1');
		expect(snapshotAfterRun).toHaveBeenCalledWith('thread-1', user, workspace);
	});

	it.each(['cancelled', 'errored'] as const)('does not snapshot a %s run', async (status) => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', status, { userId: 'user-1', user });
		await flush();

		expect(snapshotAfterRun).not.toHaveBeenCalled();
	});

	it('does not snapshot without a user', async () => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1' });
		await flush();

		expect(snapshotAfterRun).not.toHaveBeenCalled();
	});

	it('logs at debug and never creates a sandbox when the thread has none cached', async () => {
		const service = createService({ cachedEntry: undefined });

		await service.finalizeRun('thread-1', 'run-1', 'completed', { userId: 'user-1', user });
		await flush();

		expect(snapshotAfterRun).not.toHaveBeenCalled();
		expect(service.logger.debug).toHaveBeenCalledWith(
			'No cached sandbox to snapshot app sources from',
			{ threadId: 'thread-1' },
		);
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
			error: 'sandbox gone',
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
