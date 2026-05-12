import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
jest.mock('@n8n/instance-ai', () => {
	const { z } = jest.requireActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			disconnect = jest.fn();
		},
		createDomainAccessTracker: jest.fn(),
		BuilderSandboxFactory: class {},
		SnapshotManager: class {},
		createSandbox: jest.fn(),
		createWorkspace: jest.fn(),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: jest.fn(),
		handleVerificationVerdict: jest.fn(),
		createInstanceAgent: jest.fn(),
		createAllTools: jest.fn(),
		createMemory: jest.fn(),
		mapMastraChunkToEvent: jest.fn(),
	};
});
jest.mock('@mastra/core/agent', () => ({}));
jest.mock('@mastra/core/storage', () => ({
	MemoryStorage: class {},
	MastraCompositeStore: class {},
	WorkflowsStorage: class {},
}));
jest.mock('@mastra/memory', () => ({
	Memory: class {},
}));
jest.mock('@mastra/core/workflows', () => ({}));

import { InstanceAiService } from '../instance-ai.service';

/**
 * Regression: planned-task workflow runs (build agent, checkpoint verifications)
 * dispatch AFTER the orchestrator's main run finishes. They look up the iframe
 * `pushRef` from `threadPushRef` to route execution push events back to the user's
 * session. If a finally block in `executeRun` deletes the map before planned-task
 * dispatch, those events never reach the frontend.
 *
 * Locking down:
 *   1. `executeRun` and `executeRunResume` MUST NOT call `threadPushRef.delete`
 *      in their finally blocks (that was the bug we fixed).
 *   2. `clearThreadState` (the legitimate teardown path) MUST clear the map.
 */
describe('InstanceAiService — threadPushRef lifetime', () => {
	function getMethodSource(name: keyof InstanceAiService): string {
		const fn = InstanceAiService.prototype[name] as unknown;
		if (typeof fn !== 'function') throw new Error(`Method ${name} not a function`);
		return (fn as (...args: unknown[]) => unknown).toString();
	}

	it('executeRun does not delete threadPushRef in its run-finally', () => {
		// The map is now cleared via clearThreadState (thread teardown) and
		// overwritten via startRun on each new chat send. Adding a delete here
		// kills push-event routing for any planned tasks that dispatch after
		// the run.
		const source = getMethodSource('executeRun' as keyof InstanceAiService);
		expect(source).not.toContain('threadPushRef.delete');
	});

	it('processResumedStream does not delete threadPushRef in its run-finally', () => {
		// Same constraint as executeRun for the suspended/resumed run path.
		const source = getMethodSource('processResumedStream' as keyof InstanceAiService);
		expect(source).not.toContain('threadPushRef.delete');
	});

	it('clearThreadState clears the threadPushRef entry for the thread', async () => {
		// Bypass the constructor — we only exercise the map state and the few
		// dependencies clearThreadState reaches.
		type Internals = {
			threadPushRef: Map<string, string>;
			runState: { clearThread: jest.Mock };
			backgroundTasks: { cancelThread: jest.Mock };
			creditedThreads: Map<string, unknown>;
			schedulerLocks: Map<string, unknown>;
			liveness: { clearThreadState: jest.Mock };
			domainAccessTrackersByThread: Map<string, unknown>;
			eventBus: { clearThread: jest.Mock };
			finalizeRemainingMessageTraceRoots: jest.Mock;
			deleteTraceContextsForThread: jest.Mock;
			builderSandboxSessions: { cleanupThread: jest.Mock };
			destroySandbox: jest.Mock;
			reapAiTemporaryForThreadCleanup: jest.Mock;
			clearThreadState: (threadId: string) => Promise<void>;
		};
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;

		service.threadPushRef = new Map<string, string>([['thread-a', 'push-ref-a']]);
		service.runState = {
			clearThread: jest.fn(() => ({ active: undefined, suspended: undefined })),
		};
		service.backgroundTasks = { cancelThread: jest.fn(() => []) };
		service.creditedThreads = new Map();
		service.schedulerLocks = new Map();
		service.liveness = { clearThreadState: jest.fn() };
		service.domainAccessTrackersByThread = new Map();
		service.eventBus = { clearThread: jest.fn() };
		service.finalizeRemainingMessageTraceRoots = jest.fn(async () => {});
		service.deleteTraceContextsForThread = jest.fn();
		service.builderSandboxSessions = { cleanupThread: jest.fn(async () => {}) };
		service.destroySandbox = jest.fn(async () => {});
		service.reapAiTemporaryForThreadCleanup = jest.fn(async () => {});

		await service.clearThreadState('thread-a');

		expect(service.threadPushRef.has('thread-a')).toBe(false);
	});

	it('startRun overwrites the threadPushRef entry on each new run', () => {
		// The map persists across a single thread's lifetime to keep planned-task
		// dispatch wired up. New chat sends overwrite (rather than appending) so
		// a refreshed iframe with a new pushRef is picked up immediately.
		const source = getMethodSource('startRun' as keyof InstanceAiService);
		expect(source).toContain('threadPushRef.set');
	});
});
