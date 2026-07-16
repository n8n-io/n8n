import type { Mock } from 'vitest';
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

import { EvalThreadCredentialAllowlistService } from '../eval/thread-credential-allowlist.service';
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
			planRequestsByThread: Map<string, number>;
			runState: { clearThread: Mock };
			backgroundTasks: { cancelThread: Mock };
			schedulerLocks: Map<string, unknown>;
			liveness: { clearThreadState: Mock };
			domainAccessTrackersByThread: Map<string, unknown>;
			evalCredentialAllowlists: EvalThreadCredentialAllowlistService;
			eventBus: { clearThread: Mock };
			tracing: {
				finalizeRunTracing: Mock;
				finalizeBackgroundTaskTracing: Mock;
				finalizeRemainingMessageTraceRoots: Mock;
				deleteTraceContextsForThread: Mock;
				getTrackedThreadIds: Mock;
				clear: Mock;
			};
			memoryTaskRegistry: { clearThread: Mock };
			sandboxService: { destroySandbox: Mock };
			temporaryWorkflowService: { reapForThreadCleanup: Mock };
			suspendedThreads: { dropPendingConfirmationsForThread: Mock };
			clearThreadState: (threadId: string) => Promise<void>;
		};
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;

		service.threadPushRef = new Map<string, string>([['thread-a', 'push-ref-a']]);
		service.planRequestsByThread = new Map<string, number>([['thread-a', 2]]);
		service.runState = {
			clearThread: vi.fn(() => ({ active: undefined, suspended: undefined })),
		};
		service.backgroundTasks = { cancelThread: vi.fn(() => []) };
		service.schedulerLocks = new Map();
		service.liveness = { clearThreadState: vi.fn() };
		service.domainAccessTrackersByThread = new Map();
		service.evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
		service.evalCredentialAllowlists.set('thread-a', ['cred-1']);
		service.eventBus = { clearThread: vi.fn() };
		service.tracing = {
			finalizeRunTracing: vi.fn(async () => {}),
			finalizeBackgroundTaskTracing: vi.fn(async () => {}),
			finalizeRemainingMessageTraceRoots: vi.fn(async () => {}),
			deleteTraceContextsForThread: vi.fn(),
			getTrackedThreadIds: vi.fn(() => []),
			clear: vi.fn(),
		};
		service.memoryTaskRegistry = { clearThread: vi.fn() };
		service.sandboxService = { destroySandbox: vi.fn(async () => {}) };
		service.temporaryWorkflowService = { reapForThreadCleanup: vi.fn(async () => {}) };
		service.suspendedThreads = { dropPendingConfirmationsForThread: vi.fn(async () => {}) };

		await service.clearThreadState('thread-a');

		expect(service.threadPushRef.has('thread-a')).toBe(false);
		expect(service.planRequestsByThread.has('thread-a')).toBe(false);
		expect(service.evalCredentialAllowlists.get('thread-a')).toBeUndefined();
	});

	it('startRun overwrites the threadPushRef entry on each new run', () => {
		// The map persists across a single thread's lifetime to keep planned-task
		// dispatch wired up. New chat sends overwrite (rather than appending) so
		// a refreshed iframe with a new pushRef is picked up immediately.
		const source = getMethodSource('startRun' as keyof InstanceAiService);
		expect(source).toContain('threadPushRef.set');
	});
});
