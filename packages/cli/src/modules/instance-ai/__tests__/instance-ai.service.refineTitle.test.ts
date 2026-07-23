import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
const { generateTitleForRun, patchThread } = vi.hoisted(() => ({
	generateTitleForRun: vi.fn(),
	patchThread: vi.fn(),
}));

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
		// No trace context so refineTitleIfNeeded takes the direct title-generation path.
		createInternalOperationTraceContext: vi.fn(async () => undefined),
		releaseTraceClient: vi.fn(),
		generateTitleForRun,
		patchThread,
	};
});

import type { ModelConfig } from '@n8n/instance-ai';

import { withCurrentDateTime, AUTO_FOLLOW_UP_MESSAGE } from '../internal-messages';
import { InstanceAiService } from '../instance-ai.service';

/**
 * Regression: stored user messages carry service-injected blocks (the
 * <current-date-time> suffix, task-context prefixes). Title refinement must
 * strip them before deciding whether the message is substantial enough to
 * title — otherwise a bare "hey" (which title generation defers on) arrives
 * padded to hundreds of chars and gets titled anyway (e.g. "Casual greeting").
 */
describe('InstanceAiService — refineTitleIfNeeded input cleaning', () => {
	type StoredMessage = { role: string; content: Array<{ type: string; text: string }> };
	type Internals = {
		agentMemory: {
			getThread: ReturnType<typeof vi.fn>;
			getMessages: ReturnType<typeof vi.fn>;
		};
		tracing: { getTraceContextForContinuation: ReturnType<typeof vi.fn> };
		eventBus: { publish: ReturnType<typeof vi.fn> };
		logger: { warn: ReturnType<typeof vi.fn> };
		refineTitleIfNeeded: (threadId: string, userId: string, modelId: ModelConfig) => Promise<void>;
	};

	const modelId = { provider: 'anthropic', model: 'test-model' } as unknown as ModelConfig;

	function createService(storedMessages: StoredMessage[]): Internals {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.agentMemory = {
			getThread: vi.fn(async () => ({ id: 'thread-1', title: 'hey', metadata: {} })),
			getMessages: vi.fn(async () => storedMessages),
		};
		service.tracing = { getTraceContextForContinuation: vi.fn(() => undefined) };
		service.eventBus = { publish: vi.fn() };
		service.logger = { warn: vi.fn() };
		return service;
	}

	function userMessage(text: string): StoredMessage {
		return { role: 'user', content: [{ type: 'text', text }] };
	}

	function assistantMessage(text: string): StoredMessage {
		return { role: 'assistant', content: [{ type: 'text', text }] };
	}

	beforeEach(() => {
		generateTitleForRun.mockReset();
		patchThread.mockReset();
	});

	it('strips the injected date-time block before generating a title', async () => {
		const stored = withCurrentDateTime('hey', '\n## Current Date and Time\n\n2026-07-03 09:30');
		const service = createService([userMessage(stored)]);
		// Simulate the trivial-message deferral inside title generation.
		generateTitleForRun.mockResolvedValue(null);

		await service.refineTitleIfNeeded('thread-1', 'user-1', modelId);

		expect(generateTitleForRun).toHaveBeenCalledTimes(1);
		expect(generateTitleForRun).toHaveBeenCalledWith(modelId, 'hey');
		// Deferred title generation must not mark the thread as refined.
		expect(patchThread).not.toHaveBeenCalled();
	});

	it('strips task-context prefix blocks from the title prompt', async () => {
		const stored = withCurrentDateTime(
			'<running-tasks>\ntask-1: syncing\n</running-tasks>\n\nbuild me a slack notification workflow',
			'\n2026-07-03 09:30',
		);
		const service = createService([userMessage(stored)]);
		generateTitleForRun.mockResolvedValue('Slack notification workflow');

		await service.refineTitleIfNeeded('thread-1', 'user-1', modelId);

		expect(generateTitleForRun).toHaveBeenCalledWith(
			modelId,
			'build me a slack notification workflow',
		);
		expect(patchThread).toHaveBeenCalledTimes(1);
	});

	it('ignores auto-follow-up messages entirely', async () => {
		const stored = withCurrentDateTime(AUTO_FOLLOW_UP_MESSAGE, '\n2026-07-03 09:30');
		const service = createService([userMessage(stored)]);

		await service.refineTitleIfNeeded('thread-1', 'user-1', modelId);

		expect(generateTitleForRun).not.toHaveBeenCalled();
		expect(patchThread).not.toHaveBeenCalled();
	});

	it('titles from the opening user turns even when a build buries them under assistant messages', async () => {
		// A build emits many assistant/reasoning/tool messages after the request,
		// so a recency-limited window would miss the user's messages entirely.
		const stored = [
			userMessage(withCurrentDateTime('hey', '\n2026-07-03 09:30')),
			assistantMessage("Hi! I'm your n8n assistant."),
			userMessage(
				withCurrentDateTime(
					'lets build a workflow that greets me on telegram every morning',
					'\n2026-07-03 09:31',
				),
			),
			assistantMessage('Reasoning about the workflow...'),
			assistantMessage('Build succeeded.'),
			assistantMessage('Verification is ready.'),
			assistantMessage('Verified — both nodes ran.'),
		];
		const service = createService(stored);
		generateTitleForRun.mockResolvedValue('Morning telegram greeting');

		await service.refineTitleIfNeeded('thread-1', 'user-1', modelId);

		expect(generateTitleForRun).toHaveBeenCalledWith(
			modelId,
			'hey\nlets build a workflow that greets me on telegram every morning',
		);
		expect(patchThread).toHaveBeenCalledTimes(1);
	});

	it('fetches a wide history window rather than only the last few messages', async () => {
		const service = createService([userMessage(withCurrentDateTime('hey', '\n2026-07-03 09:30'))]);
		generateTitleForRun.mockResolvedValue(null);

		await service.refineTitleIfNeeded('thread-1', 'user-1', modelId);

		// A small recency window would drop the user's request behind a build's
		// assistant messages, so the window must be wide enough to clear them.
		expect(service.agentMemory.getMessages).toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({ limit: expect.any(Number) }),
		);
		const [, opts] = service.agentMemory.getMessages.mock.calls[0];
		expect(opts.limit).toBeGreaterThanOrEqual(50);
	});
});

/**
 * Regression: a run that suspends for HITL and completes on the resume path
 * must still be titled. The resume-path finalizeRun caller previously dropped
 * modelId, so the guard skipped refinement and the thread kept its heuristic
 * first-message title (e.g. a trivial "hey").
 */
describe('InstanceAiService — finalizeRun title refinement guard', () => {
	type FinalizeInternals = {
		publishRunFinish: ReturnType<typeof vi.fn>;
		emitRunMetrics: ReturnType<typeof vi.fn>;
		saveAgentTreeSnapshot: ReturnType<typeof vi.fn>;
		refineTitleIfNeeded: ReturnType<typeof vi.fn>;
		finalizeRun: (
			threadId: string,
			runId: string,
			status: 'completed' | 'cancelled' | 'errored',
			snapshotStorage: unknown,
			options?: { userId?: string; modelId?: ModelConfig },
		) => Promise<void>;
	};

	const modelId = { provider: 'anthropic', model: 'test-model' } as unknown as ModelConfig;

	function createService(): FinalizeInternals {
		const service = Object.create(InstanceAiService.prototype) as unknown as FinalizeInternals;
		service.publishRunFinish = vi.fn();
		service.emitRunMetrics = vi.fn();
		service.saveAgentTreeSnapshot = vi.fn(async () => {});
		service.refineTitleIfNeeded = vi.fn(async () => {});
		return service;
	}

	it('refines the title when a completed run supplies userId and modelId', async () => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', 'completed', {}, { userId: 'user-1', modelId });

		expect(service.refineTitleIfNeeded).toHaveBeenCalledWith('thread-1', 'user-1', modelId);
	});

	it('skips refinement when modelId is missing', async () => {
		const service = createService();

		await service.finalizeRun('thread-1', 'run-1', 'completed', {}, { userId: 'user-1' });

		expect(service.refineTitleIfNeeded).not.toHaveBeenCalled();
	});
});
