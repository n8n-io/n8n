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
		setTracePromptVersion: vi.fn(),
		setTraceModelId: vi.fn(),
		modelIdTraceMetadata: (modelId: unknown) =>
			typeof modelId === 'string' && modelId.length > 0 ? { model_id: modelId } : {},
		modelConfigId: (config: unknown) =>
			typeof config === 'string' && config.length > 0 ? config : undefined,
	};
});

import { EvalThreadCredentialAllowlistService } from '../eval/thread-credential-allowlist.service';
import { InstanceAiService } from '../instance-ai.service';

/**
 * Regression: planned-task workflow runs (build agent, checkpoint verifications)
 * dispatch AFTER the orchestrator's main run finishes. They look up the iframe
 * `pushRef` from `threadPushRef` to route execution push events back to the user's
 * session, so only `clearThreadState` (thread teardown) may clear the map.
 */
describe('InstanceAiService — threadPushRef lifetime', () => {
	it('clearThreadState clears the threadPushRef entry for the thread', async () => {
		// Bypass the constructor — we only exercise the map state and the few
		// dependencies clearThreadState reaches.
		type Internals = {
			threadPushRef: Map<string, string>;
			planRequestsByThread: Map<string, number>;
			runState: { clearThread: Mock };
			schedulerLocks: Map<string, unknown>;
			failedInternalFollowUpStreaks: Map<string, number>;
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
			clearThreadState: (threadId: string) => Promise<void>;
		};
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;

		service.threadPushRef = new Map<string, string>([['thread-a', 'push-ref-a']]);
		service.planRequestsByThread = new Map<string, number>([['thread-a', 2]]);
		service.runState = {
			clearThread: vi.fn(() => ({ active: undefined, suspended: undefined })),
		};
		service.schedulerLocks = new Map();
		service.failedInternalFollowUpStreaks = new Map();
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

		await service.clearThreadState('thread-a');

		expect(service.threadPushRef.has('thread-a')).toBe(false);
		expect(service.planRequestsByThread.has('thread-a')).toBe(false);
		expect(service.evalCredentialAllowlists.get('thread-a')).toBeUndefined();
	});

	it('a new turn overwrites the threadPushRef entry with its push ref', () => {
		// The map persists across a single thread's lifetime to keep planned-task
		// dispatch wired up. Each turn carries the push ref in its queued options,
		// so a refreshed iframe with a new pushRef is picked up on any main.
		type Internals = {
			threadPushRef: Map<string, string>;
			runState: Record<string, Mock>;
			applyTurnState: (threadId: string, options: { runId: string; pushRef?: string }) => void;
		};
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.threadPushRef = new Map([['thread-a', 'push-ref-old']]);
		service.runState = {
			setTimeZone: vi.fn(),
			setComputerUseChannels: vi.fn(),
			setBuildMode: vi.fn(),
			setPromptVersion: vi.fn(),
			setObserverThresholdTokens: vi.fn(),
		};

		service.applyTurnState('thread-a', { runId: 'run-1', pushRef: 'push-ref-new' });
		expect(service.threadPushRef.get('thread-a')).toBe('push-ref-new');

		// A machine follow-up without a push ref keeps the last one.
		service.applyTurnState('thread-a', { runId: 'run-2' });
		expect(service.threadPushRef.get('thread-a')).toBe('push-ref-new');
	});
});
