/**
 * AGENT-354 — build-agent HITL cascade, end to end through REAL SDK mechanics.
 *
 * `build-agent.tool.test.ts` mocks `InstanceAiBuilderDelegate` and invokes the
 * handler directly with hand-built `ctx` objects — it never touches the AI
 * SDK's own suspend/resume plumbing. That plumbing is exactly where a real P1
 * was found: the SDK validates resume data against a tool's `.resume()`
 * schema and REPLACES `ctx.resumeData` with the parse result, so a
 * badly-chosen schema (e.g. a permissive zod union) silently strips fields
 * the handler never sees. Mocking the delegate can't catch that, because the
 * mock never runs real validation.
 *
 * This test drives the actual cascade through two REAL `Agent` instances (the
 * orchestrator and the builder sub-agent), each backed by a scripted
 * `LanguageModel` so the real `streamText` loop, tool executor, and
 * suspend/resume checkpoint machinery all run unmodified — no `vi.mock` of
 * `ai` or `@n8n/agents`. It exercises three seams unit tests cannot reach:
 *
 * 1. `ctx.suspendPayload` restoration on resume (the cli's `builderCheckpoint`
 *    ref, read back from the checkpoint store, not from in-memory state).
 * 2. Two-level SDK resume validation: the orchestrator's permissive
 *    passthrough schema, then the builder's own `questionsResumeSchema` —
 *    the user's answer must survive both without being stripped or replaced.
 * 3. A full "suspend → drop every in-memory object → resume from checkpoint
 *    storage only" restart, per AGENT-354's testing requirement: phase 2
 *    below constructs fresh Agent instances, a fresh delegate, and a fresh
 *    domain context, and resumes purely from the shared checkpoint store and
 *    thread-metadata record (the only state carried across phases).
 */
import { Agent, Tool } from '@n8n/agents';
import type {
	CheckpointStore,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
} from '@n8n/agents';
import {
	questionsResumeSchema,
	questionsSuspendPayloadSchema,
	type QuestionsResumeData,
} from '@n8n/api-types';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type { Logger } from '../../../logger';
import type { PatchableThreadMemory, ThreadRecord } from '../../../storage/thread-patch';
import type {
	BuilderOpenSuspension,
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { ORCHESTRATION_TOOL_IDS } from '../../tool-ids';
import { createBuildAgentTool } from '../build-agent.tool';

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

const BUILDER_THREAD_ID = 'ia-builder:thread-1:agent-1';

function makeToolCallTurn(
	toolCallId: string,
	toolName: string,
	args: Record<string, unknown>,
): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'tool-call', toolCallId, toolName, input: JSON.stringify(args) },
		{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

function makeTextTurn(text: string): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 'txt-1' },
		{ type: 'text-delta', id: 'txt-1', delta: text },
		{ type: 'text-end', id: 'txt-1' },
		{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

function createScriptedModel(turns: MockStreamResult[]): MockLanguageModelV3 {
	let next = 0;
	return new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'scripted',
		doStream: async () => await Promise.resolve(turns[next++]),
	});
}

/**
 * Shared durable checkpoint storage — the only agent-run state that survives
 * the "restart" between phase 1 and phase 2. Mirrors the in-repo precedent in
 * `@n8n/agents`' `state-restore-after-suspension.test.ts`, plus a `listStates`
 * helper so the test delegate can scan for open suspensions by thread id, the
 * same way the cli adapter's `findOpenCheckpointForThread` does.
 */
class InMemoryCheckpointStore implements CheckpointStore {
	private store = new Map<string, SerializableAgentState>();

	async save(key: string, state: SerializableAgentState): Promise<void> {
		await Promise.resolve(this.store.set(key, structuredClone(state)));
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		const state = this.store.get(key);
		return await Promise.resolve(state ? structuredClone(state) : undefined);
	}

	async delete(key: string): Promise<void> {
		await Promise.resolve(this.store.delete(key));
	}

	listStates(): Array<[string, SerializableAgentState]> {
		return [...this.store.entries()];
	}

	get size(): number {
		return this.store.size;
	}
}

/** Read all chunks from a stream into an array. */
async function collectStreamChunks(stream: ReadableStream<StreamChunk>): Promise<StreamChunk[]> {
	const chunks: StreamChunk[] = [];
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	return chunks;
}

function chunksOfType<T extends StreamChunk['type']>(
	chunks: StreamChunk[],
	type: T,
): Array<StreamChunk & { type: T }> {
	return chunks.filter((c) => c.type === type) as Array<StreamChunk & { type: T }>;
}

/** Adapts a real SDK `StreamResult` into the `BuilderTurnStream` shape the
 *  delegate contract expects — mirrors `toBuilderTurnStream` in
 *  `packages/cli/src/modules/agents/instance-ai-builder-delegate.adapter.ts`. */
function toTurnStream(result: StreamResult): BuilderTurnStream {
	let resolveText!: (text: string) => void;
	const text = new Promise<string>((resolve) => {
		resolveText = resolve;
	});
	let acc = '';

	async function* pump(): AsyncGenerator<StreamChunk> {
		const reader = result.stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value.type === 'text-delta') acc += value.delta;
				yield value;
			}
		} finally {
			resolveText(acc);
		}
	}

	return { fullStream: pump(), text };
}

/**
 * Build the agent-builder sub-agent: `write_config` (a mutation tool whose
 * name drives `configUpdated` via `CONFIG_MUTATION_TOOL_NAMES`) and
 * `ask_questions` (an interruptible tool using the real shared contract
 * from `@n8n/api-types`, mirroring the cli's own `ask_questions` tool). On
 * resume, `onResume` records the exact `ctx.resumeData` the SDK handed back
 * after validating it against `questionsResumeSchema` — the central
 * assertion of this test is that nothing was stripped along the way.
 */
function createBuilderAgent(
	checkpointStore: CheckpointStore,
	model: MockLanguageModelV3,
	onResume: (data: QuestionsResumeData) => void,
): Agent {
	const writeConfigTool = new Tool('write_config')
		.description('Persist the agent configuration')
		.input(z.object({}))
		.output(z.object({ ok: z.boolean() }))
		.handler(async () => await Promise.resolve({ ok: true }));

	const askQuestionsTool = new Tool('ask_questions')
		.description('Ask the user clarifying questions; suspends until answered')
		.input(z.object({}))
		.suspend(questionsSuspendPayloadSchema)
		.resume(questionsResumeSchema)
		.handler(async (_input, ctx) => {
			if (ctx.resumeData === undefined || ctx.resumeData === null) {
				return await ctx.suspend({
					requestId: 'builder-req-1',
					message: 'The agent builder has questions',
					severity: 'info',
					inputType: 'questions',
					questions: [
						{ id: 'q1', question: 'Which channel?', type: 'single', options: ['slack', 'email'] },
					],
				});
			}
			onResume(ctx.resumeData);
			return { answered: true };
		});

	return new Agent('agent-builder')
		.model(model)
		.instructions('You are the agent builder sub-agent. Use your tools to build the agent.')
		.tool(writeConfigTool)
		.tool(askQuestionsTool)
		.checkpoint(checkpointStore);
}

/**
 * Instance-AI builder delegate, backed by the real SDK. Mirrors the thin
 * mapping in `InstanceAiBuilderDelegateAdapterService`: one builder Agent
 * constructed per call, resuming purely from the shared checkpoint store.
 */
function createBuilderDelegate(
	store: InMemoryCheckpointStore,
	model: MockLanguageModelV3,
	onResume: (data: QuestionsResumeData) => void,
): InstanceAiBuilderDelegate {
	return {
		createAgent: async (_name: string) =>
			await Promise.resolve({ agentId: 'agent-1', projectId: 'proj-1' }),

		streamBuild: async (_agentId, message, session) => {
			const builder = createBuilderAgent(store, model, onResume);
			const result = await builder.stream(message, {
				persistence: { threadId: session.threadId, resourceId: 'user-1' },
			});
			return toTurnStream(result);
		},

		resumeBuild: async (_agentId, resume, _session) => {
			const builder = createBuilderAgent(store, model, onResume);
			const result = await builder.resume('stream', resume.resumeData, {
				runId: resume.runId,
				toolCallId: resume.toolCallId,
			});
			return toTurnStream(result);
		},

		findOpenSuspensions: async (_agentId, session) => {
			const found: BuilderOpenSuspension[] = [];
			for (const [, state] of store.listStates()) {
				if (state.status !== 'suspended') continue;
				if (state.persistence?.threadId !== session.threadId) continue;
				for (const call of Object.values(state.pendingToolCalls)) {
					if (call.suspended) found.push({ runId: call.runId, toolCallId: call.toolCallId });
				}
			}
			return await Promise.resolve(found);
		},

		cancelOpenSuspension: async (_agentId, runId) => {
			await store.delete(runId);
		},

		listAgents: async () => await Promise.resolve([]),

		resolveAgentName: async () => await Promise.resolve(undefined),
	};
}

/** Thread-metadata stub over a shared record — stands in for real thread
 *  persistence so `saveAgentBuilderTarget`/`resolveAgentBuilderTarget`
 *  (`agent-target-binding.ts`) can round-trip the bound agent id across the
 *  simulated restart. Implements the native `getThread`/`saveThread` pair
 *  that `patchThread` (`storage/thread-patch.ts`) falls back to. */
function createThreadMemoryStub(records: Map<string, ThreadRecord>): PatchableThreadMemory {
	return {
		getThread: async (threadId: string) => await Promise.resolve(records.get(threadId) ?? null),
		saveThread: async (thread: ThreadRecord) => {
			records.set(thread.id, thread);
			return await Promise.resolve(thread);
		},
	};
}

function createEventBusStub(): InstanceAiEventBus {
	return {
		publish: () => {},
		subscribe: () => () => {},
		getEventsAfter: () => [],
		getEventsForRun: () => [],
		getEventsForRuns: () => [],
		getNextEventId: async () => await Promise.resolve(1),
	};
}

function createLoggerStub(): Logger {
	return { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
}

/** Builds a fresh `OrchestrationContext` + `InstanceAiContext` pair for one
 *  phase — mirrors `makeContext()` in `build-agent.tool.test.ts`, but with
 *  real values for the fields the cascade actually keys persistence on
 *  (`threadId`, `domainContext.threadId`, `domainContext.threadMemory`). */
function createOrchestrationContext(params: {
	threadRecords: Map<string, ThreadRecord>;
	delegate: InstanceAiBuilderDelegate;
	agentBuilderTarget: InstanceAiContext['agentBuilderTarget'];
}): OrchestrationContext {
	const domainContext = mock<InstanceAiContext>();
	domainContext.projectId = 'proj-1';
	domainContext.builderDelegate = params.delegate;
	domainContext.threadId = 'thread-1';
	domainContext.threadMemory = createThreadMemoryStub(params.threadRecords);
	domainContext.agentBuilderTarget = params.agentBuilderTarget;
	domainContext.logger = createLoggerStub();

	const context = mock<OrchestrationContext>();
	context.domainContext = domainContext;
	context.threadId = 'thread-1';
	context.runId = 'orch-run-1';
	context.orchestratorAgentId = 'root';
	context.abortSignal = new AbortController().signal;
	context.eventBus = createEventBusStub();
	context.logger = createLoggerStub();
	context.modelId = 'anthropic/test-model';
	// Tracing-off is the default; tracing tests set their own stub.
	context.tracing = undefined;

	return context;
}

describe('build-agent cascade restart (real SDK)', () => {
	it('suspends on a builder question, drops all in-memory state, and resumes purely from checkpoint storage with the answer intact', async () => {
		const store = new InMemoryCheckpointStore();
		const threadRecords = new Map<string, ThreadRecord>();
		threadRecords.set('thread-1', {
			id: 'thread-1',
			resourceId: 'user-1',
			metadata: {},
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// ── Phase 1: build and suspend ──────────────────────────────────────
		const phase1Delegate = createBuilderDelegate(
			store,
			createScriptedModel([
				makeToolCallTurn('b-tc-1', 'write_config', {}),
				makeToolCallTurn('b-tc-2', 'ask_questions', {}),
			]),
			() => {
				throw new Error('builder should not resume during phase 1');
			},
		);
		const phase1Context = createOrchestrationContext({
			threadRecords,
			delegate: phase1Delegate,
			agentBuilderTarget: undefined,
		});
		const orchModel1 = createScriptedModel([
			makeToolCallTurn(ORCHESTRATION_TOOL_IDS.BUILD_AGENT, ORCHESTRATION_TOOL_IDS.BUILD_AGENT, {
				message: 'Build a support agent',
				name: 'Support Agent',
			}),
		]);
		const orchestrator1 = new Agent('ia-orchestrator')
			.model(orchModel1)
			.instructions('Test orchestrator')
			.tool(createBuildAgentTool(phase1Context))
			.checkpoint(store);

		const firstRun = await orchestrator1.stream('Build a support agent');
		const phase1Chunks = await collectStreamChunks(firstRun.stream);

		const suspendedChunks = chunksOfType(phase1Chunks, 'tool-call-suspended');
		expect(suspendedChunks).toHaveLength(1);
		const suspended = suspendedChunks[0];
		expect(suspended.toolName).toBe(ORCHESTRATION_TOOL_IDS.BUILD_AGENT);
		const orchestratorRunId = suspended.runId;
		const orchestratorToolCallId = suspended.toolCallId;
		expect(orchestratorRunId).toBeTruthy();
		expect(orchestratorToolCallId).toBeTruthy();

		// Exactly one suspended builder checkpoint, keyed to the builder's
		// instance-AI-scoped thread — read its real runId/toolCallId back from
		// the store rather than assuming the model's tool-call ids survived.
		const suspendedBuilderEntries = store
			.listStates()
			.filter(
				([, state]) =>
					state.status === 'suspended' && state.persistence?.threadId === BUILDER_THREAD_ID,
			);
		expect(suspendedBuilderEntries).toHaveLength(1);
		const [, builderState] = suspendedBuilderEntries[0];
		const builderPendingCalls = Object.values(builderState.pendingToolCalls).filter(
			(call) => call.suspended,
		);
		expect(builderPendingCalls).toHaveLength(1);
		const builderRunId = builderPendingCalls[0].suspended
			? builderPendingCalls[0].runId
			: undefined;
		const builderToolCallId = builderPendingCalls[0].toolCallId;

		const suspendPayload = suspended.suspendPayload as Record<string, unknown>;
		expect(suspendPayload).toMatchObject({
			inputType: 'questions',
			severity: 'info',
			questions: [
				{ id: 'q1', question: 'Which channel?', type: 'single', options: ['slack', 'email'] },
			],
			builderCheckpoint: {
				runId: builderRunId,
				toolCallId: builderToolCallId,
				configUpdated: true,
			},
		});
		expect(typeof suspendPayload.requestId).toBe('string');
		expect(suspendPayload.requestId).not.toBe('builder-req-1');

		// The store now holds both the orchestrator's and the builder's own
		// suspended checkpoints.
		expect(store.size).toBe(2);

		// The agent-builder target was persisted to thread metadata (name-path bind).
		const persistedThread = threadRecords.get('thread-1');
		expect(persistedThread?.metadata?.instanceAiAgentBuilderTarget).toMatchObject({
			agentId: 'agent-1',
			projectId: 'proj-1',
		});

		// ── Phase 2: drop everything, resume purely from checkpoint storage ─
		let observedBuilderResumeData: QuestionsResumeData | undefined;
		const phase2Delegate = createBuilderDelegate(
			store,
			createScriptedModel([makeTextTurn('Configured Slack as the channel.')]),
			(data) => {
				observedBuilderResumeData = data;
			},
		);
		const phase2Context = createOrchestrationContext({
			threadRecords,
			delegate: phase2Delegate,
			agentBuilderTarget: undefined,
		});
		const orchModel2 = createScriptedModel([makeTextTurn('Your agent is ready.')]);
		const orchestrator2 = new Agent('ia-orchestrator')
			.model(orchModel2)
			.instructions('Test orchestrator')
			.tool(createBuildAgentTool(phase2Context))
			.checkpoint(store);

		const resumeData = {
			approved: true,
			answers: [{ questionId: 'q1', selectedOptions: ['slack'] }],
		};
		const resumedRun = await orchestrator2.resume('stream', resumeData, {
			runId: orchestratorRunId,
			toolCallId: orchestratorToolCallId,
		});
		const phase2Chunks = await collectStreamChunks(resumedRun.stream);

		// The user's answer survived BOTH SDK resume-validation layers intact:
		// the orchestrator's passthrough resume schema, the delegate pass-through,
		// and the builder's own questionsResumeSchema validation.
		expect(observedBuilderResumeData).toEqual(resumeData);

		const toolResultChunks = chunksOfType(phase2Chunks, 'tool-result').filter(
			(c) => c.toolName === ORCHESTRATION_TOOL_IDS.BUILD_AGENT,
		);
		expect(toolResultChunks).toHaveLength(1);
		expect(toolResultChunks[0].output).toMatchObject({
			ok: true,
			configUpdated: true,
		});
		const output = toolResultChunks[0].output as { builderReply?: string };
		expect(output.builderReply).toContain('Configured Slack');

		const finishChunks = chunksOfType(phase2Chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		expect(finishChunks.at(-1)?.finishReason).toBe('stop');

		// The resume settled both checkpoints — no suspended state remains.
		const remainingSuspended = store
			.listStates()
			.filter(([, state]) => state.status === 'suspended');
		expect(remainingSuspended).toHaveLength(0);
	});
});
