import {
	BUILDER_CHECKPOINT_UNAVAILABLE_CODE,
	type InstanceAiEvent,
	type QuestionAnswer,
} from '@n8n/api-types';
import { UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { z } from 'zod';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type {
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	InstanceAiTraceContext,
	InstanceAiTraceRun,
	OrchestrationContext,
} from '../../../types';
import type * as AgentTargetBindingModule from '../agent-target-binding';
import {
	getSessionAgentByRef,
	readPendingAgentTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from '../agent-target-binding';
import { createBuildAgentTool } from '../build-agent.tool';

vi.mock('../agent-target-binding', async () => {
	const actual = await vi.importActual<typeof AgentTargetBindingModule>('../agent-target-binding');
	return {
		...actual,
		resolveAgentBuilderTarget: vi.fn(
			async (ctx: InstanceAiContext) => await Promise.resolve(ctx.agentBuilderTarget),
		),
		saveAgentBuilderTarget: vi.fn(),
		getSessionAgentByRef: vi.fn(async () => await Promise.resolve(undefined)),
		readPendingAgentTarget: vi.fn(async () => await Promise.resolve(undefined)),
	};
});

interface BuildAgentOutput {
	ok: boolean;
	builderReply?: string;
	configUpdated?: boolean;
	error?: string;
	agentId?: string;
	agentRef?: string;
	agentName?: string;
	answers?: QuestionAnswer[];
}

function fakeStream(chunks: unknown[], text: string): BuilderTurnStream {
	return {
		fullStream: (async function* () {
			await Promise.resolve();
			for (const chunk of chunks) {
				yield chunk;
			}
		})(),
		text: Promise.resolve(text),
	};
}

/** A stream whose iteration rejects mid-consumption, instead of yielding an `error` chunk. */
function throwingStream(error: Error): BuilderTurnStream {
	return {
		fullStream: {
			[Symbol.asyncIterator]() {
				return {
					next: async () => {
						await Promise.resolve();
						throw error;
					},
				};
			},
		},
		text: Promise.resolve(''),
	};
}

/** A stream that yields a `tool-call-suspended` chunk for one of the builder's interactive tools. */
function suspendingStream(
	toolName: string,
	suspendPayload: Record<string, unknown>,
	options: { runId?: string; toolCallId?: string } = {},
): BuilderTurnStream {
	return fakeStream(
		[
			{
				type: 'tool-call-suspended',
				runId: options.runId ?? 'builder-run-1',
				toolCallId: options.toolCallId ?? 'builder-call-1',
				toolName,
				suspendPayload,
			},
		],
		'',
	);
}

function toolCallChunk(toolCallId: string, toolName: string) {
	return { type: 'tool-call', toolCallId, toolName, input: {} };
}

function toolResultChunk(toolCallId: string, output: unknown = {}) {
	return { type: 'tool-result', toolCallId, output };
}

/** A `finish` chunk carrying billable token usage, for credit-metering tests. */
function finishChunk() {
	return {
		type: 'finish',
		model: 'anthropic/claude-sonnet',
		usage: {
			promptTokens: 100,
			completionTokens: 20,
			totalTokens: 120,
			inputTokenDetails: { noCache: 80, cacheRead: 20, cacheWrite: 0 },
		},
	};
}

const expectedUsageItem = {
	type: 'llmTokens',
	model: 'anthropic/claude-sonnet',
	uncachedInput: 80,
	cacheRead: 20,
	cacheWrite: 0,
	output: 20,
};

/** A manually-resolvable promise, for proving the tool awaits `claimSubAgentUsage`. */
function deferredClaim(): { promise: Promise<void>; resolve: () => void } {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function askQuestionsSuspendPayload() {
	return {
		requestId: 'builder-req-1',
		message: 'The agent builder has questions',
		severity: 'info' as const,
		inputType: 'questions' as const,
		questions: [
			{
				id: 'q1',
				question: 'Which channel?',
				type: 'single' as const,
				options: ['slack', 'email'],
			},
		],
	};
}

function askCredentialSuspendPayload() {
	return {
		requestId: 'builder-req-2',
		message: 'Connect Slack',
		severity: 'info' as const,
		credentialRequests: [
			{ credentialType: 'slackApi', reason: 'To send messages', existingCredentials: [] },
		],
		credentialFlow: { stage: 'generic' as const },
	};
}

function configureChannelSuspendPayload() {
	return {
		requestId: 'builder-req-3',
		message: 'Set up the chat channel',
		severity: 'info' as const,
		channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
		projectId: 'proj-1',
	};
}

function targetApprovalSuspendPayload() {
	return {
		type: 'approval' as const,
		toolName: 'delete_record',
		displayName: 'Delete record',
		args: { id: 'record-1' },
	};
}

/** Stub for `context.tracing`: a sentinel telemetry object plus mocked child-run lifecycle. */
function makeTracingStub() {
	const sentinelTelemetry = { functionId: 'sentinel' } as unknown as ReturnType<
		NonNullable<InstanceAiTraceContext['getTelemetry']>
	>;
	const traceRun = { id: 'trace-run-1' } as unknown as InstanceAiTraceRun;
	const tracing = mock<InstanceAiTraceContext>();
	tracing.getTelemetry = vi.fn(() => sentinelTelemetry);
	tracing.startChildRun.mockResolvedValue(traceRun);
	tracing.withActiveSpan.mockImplementation(async (_run, fn) => await fn());
	tracing.finishRun.mockResolvedValue(undefined);
	tracing.failRun.mockResolvedValue(undefined);
	return { tracing, sentinelTelemetry, traceRun };
}

function makeContext(overrides: { delegate?: InstanceAiBuilderDelegate } = {}): {
	context: OrchestrationContext;
	delegate: InstanceAiBuilderDelegate;
	publishedEvents: InstanceAiEvent[];
} {
	const publishedEvents: InstanceAiEvent[] = [];
	const delegate = overrides.delegate ?? mock<InstanceAiBuilderDelegate>();

	const domainContext = mock<InstanceAiContext>();
	domainContext.builderDelegate = delegate;
	domainContext.projectId = 'proj-1';
	// Force resolveAgentBuilderTarget/saveAgentBuilderTarget onto the
	// no-persistence path (no thread-persistence plumbing needed for these tests).
	domainContext.threadMemory = undefined;
	domainContext.threadId = undefined;
	domainContext.agentBuilderTarget = undefined;

	const eventBus = mock<InstanceAiEventBus>();
	eventBus.publish.mockImplementation((_threadId: string, event: InstanceAiEvent) => {
		publishedEvents.push(event);
	});

	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	} as unknown as OrchestrationContext['logger'];
	domainContext.logger = logger;

	const context = mock<OrchestrationContext>();
	context.domainContext = domainContext;
	context.threadId = 'thread-1';
	context.runId = 'run-1';
	context.userId = 'user-1';
	context.orchestratorAgentId = 'root-agent';
	context.abortSignal = new AbortController().signal;
	context.eventBus = eventBus;
	context.logger = logger;
	// Sentinel model — the orchestrator's own resolved model, which the
	// builder sub-agent session must inherit (see `session.modelConfig`).
	context.modelId = 'anthropic/claude-sonnet-host-resolved';
	// Tracing-off is the default; tracing tests set their own stub.
	context.tracing = undefined;
	// Billing-off is the default; metering tests set their own spy — otherwise the
	// deep-mock proxy would make the hook truthy (and its assertions meaningless)
	// in every existing test.
	context.claimSubAgentUsage = undefined;
	// Telemetry-off is the default; product-telemetry tests set their own spy.
	context.trackTelemetry = undefined;

	return { context, delegate, publishedEvents };
}

async function runTool(context: OrchestrationContext, input: Record<string, unknown>) {
	const tool = createBuildAgentTool(context);
	return await executeTool<BuildAgentOutput>(tool, input);
}

/** Like `runTool`, but with an explicit interruptible ctx for suspend/resume tests. */
async function runToolWithCtx(
	context: OrchestrationContext,
	input: Record<string, unknown>,
	ctx: Record<string, unknown>,
) {
	const tool = createBuildAgentTool(context);
	return await executeTool<BuildAgentOutput>(tool, input, ctx);
}

describe('build-agent tool', () => {
	beforeEach(() => {
		vi.mocked(saveAgentBuilderTarget).mockClear();
		vi.mocked(getSessionAgentByRef).mockReset().mockResolvedValue(undefined);
	});

	it('creates and binds a new agent when name is given, keying the session to the instance thread', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

		await runTool(context, { message: 'Build me a support agent', name: 'Support Agent' });

		expect(delegate.createAgent).toHaveBeenCalledWith('Support Agent', undefined);
		expect(delegate.streamBuild).toHaveBeenCalledWith('agent-1', 'Build me a support agent', {
			threadId: 'ia-builder:thread-1:agent-1',
			hostThreadId: 'thread-1',
			runId: 'run-1',
			modelConfig: context.modelId,
			abortSignal: context.abortSignal,
		});
	});

	it('returns the accumulated builder reply on completion', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					{ type: 'text-delta', id: 'a', delta: 'Hello ' },
					{ type: 'text-delta', id: 'a', delta: 'world' },
				],
				'Hello world',
			),
		);

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result.ok).toBe(true);
		expect(result.builderReply).toBe('Hello world');
	});

	it('publishes agent-spawned (with projectId + name on targetResource), then stream chunk events, then agent-completed in order', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream([{ type: 'text-delta', id: 'a', delta: 'hi' }], 'hi'),
		);

		await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(publishedEvents.map((event) => event.type)).toEqual([
			'agent-spawned',
			'text-delta',
			'agent-completed',
		]);
		const spawned = publishedEvents[0];
		expect(spawned).toMatchObject({ type: 'agent-spawned', agentId: 'agent-builder:agent-1' });
		expect(spawned && 'payload' in spawned ? spawned.payload : undefined).toMatchObject({
			role: 'agent-builder',
			kind: 'agent-builder',
			title: 'Building agent',
			// projectId + name are required for the FE to surface the agent as a
			// conversation artifact (list entry + preview).
			targetResource: { type: 'agent', id: 'agent-1', projectId: 'proj-1', name: 'New Agent' },
		});

		const completed = publishedEvents[2];
		expect(completed).toMatchObject({ type: 'agent-completed', agentId: 'agent-builder:agent-1' });
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			result: 'hi',
		});
	});

	it('errors when there is no bound target and neither name nor agentId is given', async () => {
		const { context, delegate } = makeContext();

		const result = await runTool(context, { message: 'Do something' });

		expect(result).toEqual({
			ok: false,
			error:
				'Pass `name` (and optionally `agentRef`) to create a new agent, `agentId` to adopt an existing one, or omit both to continue the current agent.',
		});
		expect(delegate.streamBuild).not.toHaveBeenCalled();
	});

	it('maps a builder-not-configured error thrown mid-stream (during first-call streaming) to a friendly message and publishes agent-completed', async () => {
		// The real delegate's `streamBuild`/`resumeBuild` are async generators: the call
		// itself never rejects — errors from their bodies only surface once the returned
		// stream is consumed. A call-time rejection (as this test used to simulate) cannot
		// happen in production; see build-agent.tool.ts's `runBuilderConsumeLoop` catch.
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			throwingStream(
				Object.assign(new Error('not configured'), { code: 'BUILDER_NOT_CONFIGURED' }),
			),
		);
		const friendlyMessage =
			'The agent builder model is not configured. Set it up in the agents module settings.';

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result).toEqual({
			ok: false,
			error: friendlyMessage,
			configUpdated: false,
			agentId: 'agent-1',
			agentRef: 'new-agent',
			agentName: 'New Agent',
		});
		expect(publishedEvents.map((event) => event.type)).toEqual([
			'agent-spawned',
			'agent-completed',
		]);
		const completed = publishedEvents[1];
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: friendlyMessage,
		});
	});

	it('publishes agent-completed and rethrows when streamBuild throws an unknown error', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockRejectedValue(new Error('boom'));

		await expect(runTool(context, { message: 'Build it', name: 'New Agent' })).rejects.toThrow(
			'boom',
		);

		expect(publishedEvents.map((event) => event.type)).toEqual([
			'agent-spawned',
			'agent-completed',
		]);
		const completed = publishedEvents[1];
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: 'boom',
		});
	});

	it('publishes agent-completed and rethrows when consumeStreamCascading itself throws mid-loop', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(throwingStream(new Error('stream exploded')));

		await expect(runTool(context, { message: 'Build it', name: 'New Agent' })).rejects.toThrow(
			'stream exploded',
		);

		expect(publishedEvents.map((event) => event.type)).toEqual([
			'agent-spawned',
			'agent-completed',
		]);
		const completed = publishedEvents[1];
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: 'stream exploded',
		});
	});

	it('binds directly to an existing agentId without creating a new agent', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

		await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

		expect(delegate.createAgent).not.toHaveBeenCalled();
		expect(delegate.streamBuild).toHaveBeenCalledWith('agent-existing', 'Add a tool', {
			threadId: 'ia-builder:thread-1:agent-existing',
			hostThreadId: 'thread-1',
			runId: 'run-1',
			modelConfig: context.modelId,
			abortSignal: context.abortSignal,
		});
	});

	it('errors without persisting a target when agentId is given but no projectId', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		context.domainContext!.projectId = undefined;

		const result = await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

		expect(result).toEqual({
			ok: false,
			error:
				'Cannot bind to agentId without an active project context. Start this conversation from within a project.',
		});
		expect(delegate.streamBuild).not.toHaveBeenCalled();
		expect(publishedEvents).toEqual([]);
	});

	it('returns a failure result when the builder run does not complete', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream([{ type: 'error', error: 'boom' }], ''),
		);

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result.ok).toBe(false);
		expect(result.error).toBe('The agent builder run errored.');
		const last = publishedEvents.at(-1);
		expect(last).toMatchObject({ type: 'agent-completed' });
		expect(last && 'payload' in last ? last.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: 'The agent builder run errored.',
		});
	});

	describe('cancellation', () => {
		it('throws without starting a builder turn when the run is already aborted', async () => {
			const { context, delegate } = makeContext();
			const controller = new AbortController();
			controller.abort();
			context.abortSignal = controller.signal;

			await expect(runTool(context, { message: 'Build it', name: 'New Agent' })).rejects.toThrow(
				'The agent builder run was cancelled.',
			);
			expect(delegate.streamBuild).not.toHaveBeenCalled();
		});

		it('throws an abort error and still claims usage when the builder turn is cancelled mid-stream', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			const controller = new AbortController();
			context.abortSignal = controller.signal;
			context.claimSubAgentUsage = vi.fn().mockResolvedValue(undefined);
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue({
				fullStream: (async function* () {
					await Promise.resolve();
					controller.abort();
					yield finishChunk();
				})(),
				text: Promise.resolve(''),
			});

			await expect(
				runToolWithCtx(
					context,
					{ message: 'Build it', name: 'New Agent' },
					{ toolCallId: 'orch-call-1' },
				),
			).rejects.toMatchObject({ name: 'AbortError' });
			expect(context.claimSubAgentUsage).toHaveBeenCalledWith(
				'run-1:orch-call-1',
				[expectedUsageItem],
				'cancelled',
			);
			expect(delegate.resolveAgentName).not.toHaveBeenCalled();
			const completed = publishedEvents.find((event) => event.type === 'agent-completed');
			expect(completed && 'payload' in completed ? completed.payload : undefined).toEqual({
				role: 'agent-builder',
				result: '',
				status: 'cancelled',
			});
		});
	});

	it('reports that the agent is not available on this instance when no builder delegate is configured', async () => {
		const { context } = makeContext();
		context.domainContext!.builderDelegate = undefined;

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result).toEqual({
			ok: false,
			error: 'Agent building is not available on this instance.',
		});
	});

	// An eval case needs the agent BEFORE the turn and again after a pass that
	// changed it. Nothing else in the trace records either.
	describe('agent-snapshot', () => {
		const ARTIFACT = {
			config: { name: 'Support Triage' },
			skills: {},
			configHash: 'hash-1',
		} as unknown as Awaited<
			ReturnType<NonNullable<InstanceAiBuilderDelegate['readAgentArtifact']>>
		>;

		/** The read only runs under a live trace, so every case here needs one. */
		function makeTracedContext() {
			const made = makeContext();
			made.context.tracing = makeTracingStub().tracing;
			return made;
		}

		it('snapshots an adopted agent before the builder can change it', async () => {
			const { context, delegate } = makeTracedContext();
			vi.mocked(delegate.readAgentArtifact!).mockResolvedValue(ARTIFACT);
			vi.mocked(delegate.streamBuild).mockImplementation(async () => {
				// Ordering is the point: read before the builder runs, or the
				// "baseline" is the state the turn produced.
				expect(delegate.readAgentArtifact).toHaveBeenCalledWith('agent-existing');
				return await Promise.resolve(fakeStream([], 'Editing it.'));
			});

			await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			expect(delegate.readAgentArtifact).toHaveBeenCalledWith('agent-existing');
		});

		it('takes no baseline for an agent it just created — there is no prior state', async () => {
			const { context, delegate } = makeTracedContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.readAgentArtifact!).mockResolvedValue(ARTIFACT);
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Built it.'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(delegate.readAgentArtifact).not.toHaveBeenCalled();
		});

		it('snapshots again after a pass that changed the config', async () => {
			const { context, delegate } = makeTracedContext();
			vi.mocked(delegate.readAgentArtifact!).mockResolvedValue(ARTIFACT);
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[toolCallChunk('call-1', 'patch_config'), toolResultChunk('call-1')],
					'Updated the config.',
				),
			);

			await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			// Baseline + outcome.
			expect(delegate.readAgentArtifact).toHaveBeenCalledTimes(2);
		});

		it('does not re-read after a pass that changed nothing', async () => {
			const { context, delegate } = makeTracedContext();
			vi.mocked(delegate.readAgentArtifact!).mockResolvedValue(ARTIFACT);
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Nothing to change.'));

			await runTool(context, { message: 'What does it do?', agentId: 'agent-existing' });

			expect(delegate.readAgentArtifact).toHaveBeenCalledTimes(1);
		});

		it('reads nothing when tracing is off — there is nowhere to emit', async () => {
			// Tracing is disabled on most instances, and the read costs a scope
			// check plus two queries on every non-create build-agent turn.
			const { context, delegate } = makeContext();
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[toolCallChunk('call-1', 'patch_config'), toolResultChunk('call-1')],
					'Updated the config.',
				),
			);

			await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			expect(delegate.readAgentArtifact).not.toHaveBeenCalled();
		});

		it('emits the event with the config, the agent id and the reason', async () => {
			const { context, delegate } = makeContext();
			const { tracing } = makeTracingStub();
			context.tracing = tracing;
			vi.mocked(delegate.readAgentArtifact!).mockResolvedValue(ARTIFACT);
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			const snapshotRuns = vi
				.mocked(tracing.startChildRun)
				.mock.calls.filter(([, init]) => (init as { name?: string }).name === 'agent-snapshot');
			expect(snapshotRuns).toHaveLength(1);
			expect(snapshotRuns[0][1]).toMatchObject({
				runType: 'chain',
				metadata: { agent_id: 'agent-existing', snapshot_reason: 'target-resolved' },
			});
		});

		it('builds normally on a host whose delegate cannot read agents', async () => {
			// An older host doesn't implement the read; that must not break building.
			const delegate = mock<InstanceAiBuilderDelegate>();
			delegate.readAgentArtifact = undefined;
			const { context } = makeContext({ delegate });
			context.tracing = makeTracingStub().tracing;
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			const result = await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			expect(result).toMatchObject({ ok: true, builderReply: 'Editing it.' });
		});
	});

	describe('configUpdated', () => {
		it.each(['write_config', 'patch_config', 'publish_agent', 'unpublish_agent'])(
			'is true when the work summary has a succeeded %s call',
			async (toolName) => {
				const { context, delegate } = makeContext();
				vi.mocked(delegate.createAgent).mockResolvedValue({
					agentId: 'agent-1',
					projectId: 'proj-1',
				});
				vi.mocked(delegate.streamBuild).mockResolvedValue(
					fakeStream(
						[toolCallChunk('call-1', toolName), toolResultChunk('call-1')],
						'Updated the config.',
					),
				);

				const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

				expect(result).toEqual({
					ok: true,
					builderReply: 'Updated the config.',
					configUpdated: true,
					agentId: 'agent-1',
					agentRef: 'new-agent',
					agentName: 'New Agent',
				});
			},
		);

		it('is false when no config-mutation tool succeeded', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[toolCallChunk('call-1', 'read_config'), toolResultChunk('call-1')],
					'Here is the config.',
				),
			);

			const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(result.configUpdated).toBe(false);
		});
	});

	describe('deferred agentId-path binding', () => {
		it('does not persist the target when the agentId path fails before the stream settles', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.streamBuild).mockRejectedValue(new Error('agent:update forbidden'));

			await expect(
				runTool(context, { message: 'Add a tool', agentId: 'agent-existing' }),
			).rejects.toThrow('agent:update forbidden');

			expect(saveAgentBuilderTarget).not.toHaveBeenCalled();
			expect(context.domainContext!.agentBuilderTarget).toBeUndefined();
		});

		it('persists the target after the agentId-path stream completes normally', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.resolveAgentName).mockResolvedValue('Existing Agent');
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-existing',
				projectId: 'proj-1',
				name: 'Existing Agent',
				ref: 'existing-agent',
			});
			expect(context.domainContext!.agentBuilderTarget).toEqual({
				agentId: 'agent-existing',
				projectId: 'proj-1',
				name: 'Existing Agent',
				ref: 'existing-agent',
			});
		});

		it('keeps the name-path bind even when streamBuild rejects, since createAgent already proved the agent exists', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockRejectedValue(new Error('boom'));

			await expect(runTool(context, { message: 'Build it', name: 'New Agent' })).rejects.toThrow(
				'boom',
			);

			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'New Agent',
				ref: 'new-agent',
			});
		});

		it('recovers from a failed agentId bind by allowing a subsequent name-path create on the same context', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.streamBuild).mockRejectedValueOnce(new Error('agent:update forbidden'));

			await expect(
				runTool(context, { message: 'Add a tool', agentId: 'agent-existing' }),
			).rejects.toThrow('agent:update forbidden');

			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-2',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

			await runTool(context, { message: 'Build me a new one', name: 'Fresh Agent' });

			expect(delegate.createAgent).toHaveBeenCalledWith('Fresh Agent', undefined);
		});

		it('persists the deferred agentId-path bind when the first turn suspends', async () => {
			const { context, delegate } = makeContext();
			const suspend: Mock = vi.fn().mockResolvedValue(undefined);
			vi.mocked(delegate.resolveAgentName).mockResolvedValue('Existing Agent');
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				suspendingStream('ask_questions', askQuestionsSuspendPayload()),
			);

			await runToolWithCtx(
				context,
				{ message: 'Add a tool', agentId: 'agent-existing' },
				{ suspend },
			);

			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-existing',
				projectId: 'proj-1',
				name: 'Existing Agent',
				ref: 'existing-agent',
			});
		});
	});

	describe('agent display-name refresh', () => {
		it('labels the first agent-spawned with the resolved name on the agentId path and stamps it on the output', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			vi.mocked(delegate.resolveAgentName).mockResolvedValue('Existing Agent');
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			const result = await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			const spawned = publishedEvents[0];
			expect(spawned).toMatchObject({ type: 'agent-spawned' });
			expect(spawned && 'payload' in spawned ? spawned.payload : undefined).toMatchObject({
				targetResource: {
					type: 'agent',
					id: 'agent-existing',
					projectId: 'proj-1',
					name: 'Existing Agent',
				},
			});
			expect(result).toMatchObject({
				ok: true,
				agentId: 'agent-existing',
				agentRef: 'existing-agent',
				agentName: 'Existing Agent',
			});
			// Name already fresh — no second agent-spawned republish.
			expect(publishedEvents.filter((event) => event.type === 'agent-spawned')).toHaveLength(1);
		});

		it('leaves the spawn event unnamed and proceeds when the upfront lookup fails on the agentId path', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			vi.mocked(delegate.resolveAgentName).mockRejectedValue(new Error('db down'));
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			const result = await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			expect(result).toMatchObject({ ok: true, agentId: 'agent-existing' });
			expect(result.agentName).toBeUndefined();
			expect(result.agentRef).toBeUndefined();
			const spawned = publishedEvents[0];
			const payload = spawned && 'payload' in spawned ? spawned.payload : undefined;
			expect(payload).toMatchObject({
				targetResource: { type: 'agent', id: 'agent-existing', projectId: 'proj-1' },
			});
			expect(
				(payload as { targetResource?: { name?: string } }).targetResource?.name,
			).toBeUndefined();
		});

		it('picks up a builder rename after the turn: fresh agentName on the output, a republished agent-spawned, and a re-saved binding', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.resolveAgentName).mockResolvedValue('Renamed Agent');
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[toolCallChunk('call-1', 'patch_config'), toolResultChunk('call-1')],
					'Renamed.',
				),
			);

			const result = await runTool(context, { message: 'Rename it', name: 'New Agent' });

			expect(result).toMatchObject({
				ok: true,
				agentId: 'agent-1',
				agentRef: 'new-agent',
				agentName: 'Renamed Agent',
			});
			const spawnedEvents = publishedEvents.filter((event) => event.type === 'agent-spawned');
			expect(spawnedEvents).toHaveLength(2);
			const republished = spawnedEvents[1];
			expect(
				republished && 'payload' in republished ? republished.payload : undefined,
			).toMatchObject({
				targetResource: {
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'Renamed Agent',
				},
			});
			expect(saveAgentBuilderTarget).toHaveBeenLastCalledWith(context.domainContext, {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Renamed Agent',
				ref: 'new-agent',
			});
		});

		it('does not republish or re-save when the resolved name matches the current target name', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.resolveAgentName).mockResolvedValue('New Agent');
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Done.'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(publishedEvents.filter((event) => event.type === 'agent-spawned')).toHaveLength(1);
			// Only the create-path bind — no refresh save.
			expect(saveAgentBuilderTarget).toHaveBeenCalledTimes(1);
		});

		it('keeps a successful turn intact and logs a warning when the post-turn refresh fails', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.resolveAgentName).mockRejectedValue(new Error('db down'));
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Done.'));

			const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(result).toMatchObject({
				ok: true,
				agentId: 'agent-1',
				agentRef: 'new-agent',
				agentName: 'New Agent',
			});
			expect(publishedEvents.filter((event) => event.type === 'agent-spawned')).toHaveLength(1);
			expect(context.logger.warn).toHaveBeenCalledWith(
				'Failed to refresh agent name after builder turn',
				expect.objectContaining({ agentId: 'agent-1' }),
			);
		});

		it('carries the refreshed name in the builderCheckpoint target when the turn suspends', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.resolveAgentName).mockResolvedValue('Renamed Agent');
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				suspendingStream('ask_questions', askQuestionsSuspendPayload()),
			);
			const suspend: Mock = vi.fn().mockResolvedValue(undefined);

			await runToolWithCtx(context, { message: 'Build it', name: 'New Agent' }, { suspend });

			const payload = suspend.mock.calls[0][0] as Record<string, unknown>;
			expect(payload).toMatchObject({
				builderCheckpoint: {
					target: {
						agentId: 'agent-1',
						projectId: 'proj-1',
						name: 'Renamed Agent',
						ref: 'new-agent',
					},
				},
			});
		});
	});

	describe('ref-keyed target resolution', () => {
		it('creates when the key is unknown and name is given', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

			const result = await runTool(context, {
				message: 'Build it',
				name: 'Support Triage',
				agentRef: 'support-triage',
			});

			expect(delegate.createAgent).toHaveBeenCalledWith('Support Triage', undefined);
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Support Triage',
				ref: 'support-triage',
			});
			expect(result).toMatchObject({
				ok: true,
				agentId: 'agent-1',
				agentRef: 'support-triage',
				agentName: 'Support Triage',
			});
		});

		it('continues without creating when the same key is repeated', async () => {
			const { context, delegate } = makeContext();
			const sessionAgent: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Support Triage',
				ref: 'support-triage',
			};
			vi.mocked(getSessionAgentByRef).mockResolvedValue(sessionAgent);
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, {
				message: 'Continue',
				name: 'Support Triage',
				agentRef: 'support-triage',
			});

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith(
				'agent-1',
				'Continue',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-1' }),
			);
		});

		it('refuses when the key is bound to a different agentId', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(getSessionAgentByRef).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Support Triage',
				ref: 'support-triage',
			});

			const result = await runTool(context, {
				message: 'Edit',
				agentRef: 'support-triage',
				agentId: 'agent-other',
			});

			expect(result).toEqual({
				ok: false,
				error:
					'`agentRef` "support-triage" is already bound to agent agent-1 in this conversation, ' +
					'but `agentId` agent-other was passed. Continue the bound agent (omit `agentId`, ' +
					'or pass its id), or pick a different `agentRef` for a new agent.',
			});
			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).not.toHaveBeenCalled();
		});

		it('continues the bound target when no key is given', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Helper',
				ref: 'helper',
			};
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, { message: 'Add a tool' });

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith(
				'agent-1',
				'Add a tool',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-1' }),
			);
		});

		it('errors when the key is unknown and neither name nor agentId is given', async () => {
			const { context, delegate } = makeContext();

			const result = await runTool(context, {
				message: 'Continue',
				agentRef: 'unknown-ref',
			});

			expect(result).toEqual({
				ok: false,
				error:
					'Unknown `agentRef`. Pass `name` to create a new agent under that key, or `agentId` to adopt an existing agent.',
			});
			expect(delegate.createAgent).not.toHaveBeenCalled();
		});

		it('creates a second agent under a different key when createNew is passed', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'First',
				ref: 'first',
			};
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-2',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

			await runTool(context, {
				message: 'Build me another agent',
				name: 'Second',
				createNew: true,
			});

			expect(getSessionAgentByRef).toHaveBeenCalledWith(context.domainContext, 'second');
			expect(delegate.createAgent).toHaveBeenCalledWith('Second', undefined);
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-2',
				projectId: 'proj-1',
				name: 'Second',
				ref: 'second',
			});
		});

		it('creates under the id the frontend minted for its unsaved artifact', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(readPendingAgentTarget).mockResolvedValue({
				projectId: 'proj-1',
				agentId: 'aBcDeFgHiJkLmNoP',
			});
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'aBcDeFgHiJkLmNoP',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

			await runTool(context, { message: 'Build it', name: 'Support Triage' });

			expect(delegate.createAgent).toHaveBeenCalledWith('Support Triage', 'aBcDeFgHiJkLmNoP');
		});

		it('ignores a pending artifact belonging to another project', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(readPendingAgentTarget).mockResolvedValue({
				projectId: 'other-project',
				agentId: 'aBcDeFgHiJkLmNoP',
			});
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

			await runTool(context, { message: 'Build it', name: 'Support Triage' });

			expect(delegate.createAgent).toHaveBeenCalledWith('Support Triage', undefined);
		});

		it('continues the bound target when a fresh key arrives without createNew', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'New agent',
			};
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Built it.'));

			await runTool(context, {
				message: 'Build a support triage agent',
				name: 'Support Triage',
			});

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith(
				'agent-1',
				'Build a support triage agent',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-1' }),
			);
			// The reported agentRef has to resolve on later calls.
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(
				context.domainContext,
				expect.objectContaining({ agentId: 'agent-1', ref: 'support-triage' }),
			);
		});

		it('switches back via registry ref instead of creating a duplicate', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = {
				agentId: 'agent-2',
				projectId: 'proj-1',
				name: 'Docs Helper',
				ref: 'docs-helper',
			};
			const sessionAgent: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Platform Cycle Tracker',
				ref: 'platform-cycle-tracker',
			};
			vi.mocked(getSessionAgentByRef).mockResolvedValue(sessionAgent);
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Switched back.'));

			await runTool(context, {
				message: 'Go back to the tracker agent',
				name: 'Platform Cycle Tracker',
			});

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith(
				'agent-1',
				'Go back to the tracker agent',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-1' }),
			);
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				...sessionAgent,
				ref: 'platform-cycle-tracker',
				name: 'Platform Cycle Tracker',
			});
		});

		it('does not clobber the binding when a registry switch-back fails before settling', async () => {
			const { context, delegate } = makeContext();
			const boundTarget: AgentBuilderTarget = {
				agentId: 'agent-2',
				projectId: 'proj-1',
				name: 'Docs Helper',
				ref: 'docs-helper',
			};
			context.domainContext!.agentBuilderTarget = boundTarget;
			vi.mocked(getSessionAgentByRef).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Platform Cycle Tracker',
				ref: 'platform-cycle-tracker',
			});
			vi.mocked(delegate.streamBuild).mockRejectedValue(new Error('boom'));

			await expect(
				runTool(context, {
					message: 'Go back to the tracker agent',
					name: 'Platform Cycle Tracker',
				}),
			).rejects.toThrow('boom');

			expect(saveAgentBuilderTarget).not.toHaveBeenCalled();
			expect(context.domainContext!.agentBuilderTarget).toEqual(boundTarget);
		});

		it('continues the bound build when the given name slug-matches the bound target', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Helper',
				ref: 'helper',
			};
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, { message: 'Add a tool', name: 'helper' });

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith(
				'agent-1',
				'Add a tool',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-1' }),
			);
		});

		it('switches to a different existing agentId with deferred persistence', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.resolveAgentName).mockResolvedValue('Other Agent');
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			await runTool(context, { message: 'Now edit this one', agentId: 'agent-2' });

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith(
				'agent-2',
				'Now edit this one',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-2' }),
			);
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-2',
				projectId: 'proj-1',
				name: 'Other Agent',
				ref: 'other-agent',
			});
		});

		it('does not clobber the existing binding when the switched agentId turn fails before settling', async () => {
			const { context, delegate } = makeContext();
			const originalTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			context.domainContext!.agentBuilderTarget = originalTarget;
			vi.mocked(delegate.streamBuild).mockRejectedValue(new Error('boom'));

			await expect(
				runTool(context, { message: 'Now edit this one', agentId: 'agent-2' }),
			).rejects.toThrow('boom');

			expect(saveAgentBuilderTarget).not.toHaveBeenCalled();
			expect(context.domainContext!.agentBuilderTarget).toEqual(originalTarget);
		});

		it('continues without re-persisting when the given agentId matches the bound target', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, { message: 'Add a tool', agentId: 'agent-1' });

			expect(saveAgentBuilderTarget).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith(
				'agent-1',
				'Add a tool',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-1' }),
			);
		});

		it('replays an identical create call after a cancelled turn without creating a second agent', async () => {
			const { context, delegate } = makeContext();
			const controller = new AbortController();
			context.abortSignal = controller.signal;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue({
				fullStream: (async function* () {
					await Promise.resolve();
					controller.abort();
					yield finishChunk();
				})(),
				text: Promise.resolve(''),
			});

			await expect(
				runTool(context, { message: 'Build it', name: 'Support Triage' }),
			).rejects.toMatchObject({ name: 'AbortError' });
			expect(delegate.createAgent).toHaveBeenCalledTimes(1);

			// Registry would have the key after the immediate create-path bind; model
			// the post-cancel follow-up finding it and continuing.
			vi.mocked(getSessionAgentByRef).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Support Triage',
				ref: 'support-triage',
			});
			context.abortSignal = new AbortController().signal;
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, { message: 'Build it', name: 'Support Triage' });

			expect(delegate.createAgent).toHaveBeenCalledTimes(1);
			expect(delegate.streamBuild).toHaveBeenLastCalledWith(
				'agent-1',
				'Build it',
				expect.objectContaining({ threadId: 'ia-builder:thread-1:agent-1' }),
			);
		});
	});

	describe('interactive suspension cascade', () => {
		it.each([
			['ask_questions', askQuestionsSuspendPayload],
			['ask_credential', askCredentialSuspendPayload],
			['configure_channel', configureChannelSuspendPayload],
			['call_agent', targetApprovalSuspendPayload],
		] as const)(
			'cascades a %s suspension into ctx.suspend, passing the shared-contract payload through with a re-minted requestId and builderCheckpoint ref',
			async (toolName, buildPayload) => {
				const { context, delegate } = makeContext();
				vi.mocked(delegate.createAgent).mockResolvedValue({
					agentId: 'agent-1',
					projectId: 'proj-1',
				});
				vi.mocked(delegate.streamBuild).mockResolvedValue(
					suspendingStream(toolName, buildPayload()),
				);
				const suspend: Mock = vi.fn().mockResolvedValue(undefined);

				await runToolWithCtx(context, { message: 'Build it', name: 'New Agent' }, { suspend });

				expect(suspend).toHaveBeenCalledTimes(1);
				const payload = suspend.mock.calls[0][0] as Record<string, unknown>;
				const original = buildPayload();
				if ('requestId' in original) {
					const { requestId: originalRequestId, ...basePayload } = original;
					expect(payload).toMatchObject(basePayload);
					expect(payload.requestId).not.toBe(originalRequestId);
				} else {
					expect(payload).toMatchObject(original);
				}
				expect(payload).toMatchObject({
					builderCheckpoint: {
						runId: 'builder-run-1',
						toolCallId: 'builder-call-1',
						configUpdated: false,
						target: { agentId: 'agent-1', projectId: 'proj-1', name: 'New Agent' },
					},
				});
				expect(typeof payload.requestId).toBe('string');
			},
		);

		it('carries configUpdated: true in the builderCheckpoint when a write_config succeeded before the suspension', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[
						toolCallChunk('call-1', 'write_config'),
						toolResultChunk('call-1'),
						{
							type: 'tool-call-suspended',
							runId: 'builder-run-1',
							toolCallId: 'builder-call-1',
							toolName: 'ask_questions',
							suspendPayload: askQuestionsSuspendPayload(),
						},
					],
					'',
				),
			);
			const suspend: Mock = vi.fn().mockResolvedValue(undefined);

			await runToolWithCtx(context, { message: 'Build it', name: 'New Agent' }, { suspend });

			const payload = suspend.mock.calls[0][0] as Record<string, unknown>;
			expect(payload).toMatchObject({ builderCheckpoint: { configUpdated: true } });
		});

		it('fails the turn and cancels the builder checkpoint when the suspend payload does not match the shared contract', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				suspendingStream('ask_questions', { foo: 'bar' }),
			);
			const suspend: Mock = vi.fn();

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ suspend },
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(result.ok).toBe(false);
			expect(result.error).toContain('could not be shown');
			expect(result.configUpdated).toBe(false);
			expect(delegate.cancelOpenSuspension).toHaveBeenCalledWith('agent-1', 'builder-run-1');
			const last = publishedEvents.at(-1);
			expect(last).toMatchObject({ type: 'agent-completed' });
		});
	});

	it('resume schema passes non-questions confirm shapes through without stripping (SDK validates resume data against it and replaces the data with the parse result)', () => {
		const { context } = makeContext();
		const built = createBuildAgentTool(context);
		const parsed: unknown = (built.resumeSchema as z.ZodTypeAny).parse({
			credentials: { slack: 'cred-1' },
		});
		expect(parsed).toEqual({ credentials: { slack: 'cred-1' } });
	});

	describe('resume', () => {
		class FakeBuilderCheckpointUnavailableError extends UserError {
			readonly code = BUILDER_CHECKPOINT_UNAVAILABLE_CODE;
		}

		function suspendPayloadWithCheckpoint(
			overrides: Partial<{ runId: string; toolCallId: string; configUpdated: boolean }> = {},
		) {
			return {
				...askQuestionsSuspendPayload(),
				requestId: 'orch-req-1',
				builderCheckpoint: {
					runId: 'builder-run-1',
					toolCallId: 'builder-call-1',
					configUpdated: false,
					...overrides,
				},
			};
		}

		it('resumes the builder via delegate.resumeBuild with resumeData passed through unchanged when the identity check passes', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Using Slack.'));
			const resumeData = {
				approved: true,
				answers: [{ questionId: 'q1', selectedOptions: ['slack'] }],
			};

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ resumeData, suspendPayload: suspendPayloadWithCheckpoint() },
			);

			// Legacy fallback: the checkpoint ref carries no `target`, so the active
			// binding decides which agent this resumes against.
			expect(delegate.findOpenSuspensions).toHaveBeenCalledWith('agent-1', {
				threadId: 'ia-builder:thread-1:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: context.modelId,
				abortSignal: context.abortSignal,
			});
			expect(delegate.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1', resumeData },
				{
					threadId: 'ia-builder:thread-1:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: context.modelId,
					abortSignal: context.abortSignal,
				},
			);
			expect(result).toEqual({
				ok: true,
				builderReply: 'Using Slack.',
				configUpdated: false,
				agentId: 'agent-1',
				answers: [{ questionId: 'q1', selectedOptions: ['slack'] }],
			});
		});

		it('does not attach answers when resuming a credential suspension', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Connected Slack.'));

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { credentials: { slack: 'cred-1' } },
					suspendPayload: {
						...askCredentialSuspendPayload(),
						requestId: 'orch-req-1',
						builderCheckpoint: {
							runId: 'builder-run-1',
							toolCallId: 'builder-call-1',
							configUpdated: false,
						},
					},
				},
			);

			expect(result).toEqual({
				ok: true,
				builderReply: 'Connected Slack.',
				configUpdated: false,
				agentId: 'agent-1',
			});
		});

		it('resumes against the target carried in the builderCheckpoint ref even when the active binding points elsewhere', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-2', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Using Slack.'));

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: {
						...askQuestionsSuspendPayload(),
						requestId: 'orch-req-1',
						builderCheckpoint: {
							runId: 'builder-run-1',
							toolCallId: 'builder-call-1',
							configUpdated: false,
							target: { agentId: 'agent-1', projectId: 'proj-1' },
						},
					},
				},
			);

			expect(delegate.findOpenSuspensions).toHaveBeenCalledWith('agent-1', {
				threadId: 'ia-builder:thread-1:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: context.modelId,
				abortSignal: context.abortSignal,
			});
			expect(delegate.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1', resumeData: { approved: true } },
				{
					threadId: 'ia-builder:thread-1:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: context.modelId,
					abortSignal: context.abortSignal,
				},
			);
		});

		it('resumes when the persisted ref matches one of several open suspensions', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
				{ runId: 'builder-run-2', toolCallId: 'builder-call-2' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Using Slack.'));

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: suspendPayloadWithCheckpoint({
						runId: 'builder-run-1',
						toolCallId: 'builder-call-1',
					}),
				},
			);

			expect(delegate.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1', resumeData: { approved: true } },
				{
					threadId: 'ia-builder:thread-1:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: context.modelId,
					abortSignal: context.abortSignal,
				},
			);
		});

		it('fails loudly without resuming when the open suspension does not match the persisted builderCheckpoint ref', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'other-run', toolCallId: 'builder-call-1' },
			]);

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ resumeData: { approved: true }, suspendPayload: suspendPayloadWithCheckpoint() },
			);

			expect(result.ok).toBe(false);
			expect(result.error).toContain('does not match');
			expect(delegate.resumeBuild).not.toHaveBeenCalled();
		});

		it('fails when no builder suspension is open on resume', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([]);

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ resumeData: { approved: true }, suspendPayload: suspendPayloadWithCheckpoint() },
			);

			expect(result.ok).toBe(false);
			expect(result.error).toContain('no longer open');
			expect(delegate.resumeBuild).not.toHaveBeenCalled();
		});

		it('carries configUpdated forward when no builder suspension is open on resume', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([]);

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: suspendPayloadWithCheckpoint({ configUpdated: true }),
				},
			);

			expect(result).toEqual({
				ok: false,
				error: 'The builder question this answer belongs to is no longer open.',
				configUpdated: true,
				agentId: 'agent-1',
			});
		});

		it('fails when the persisted suspend payload lacks the builderCheckpoint ref', async () => {
			const { context, delegate } = makeContext();

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ resumeData: { approved: true }, suspendPayload: undefined },
			);

			expect(result.ok).toBe(false);
			expect(delegate.resumeBuild).not.toHaveBeenCalled();
		});

		it('carries configUpdated forward when the resumed pass re-suspends', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(
				suspendingStream('ask_credential', askCredentialSuspendPayload(), {
					runId: 'builder-run-2',
					toolCallId: 'builder-call-2',
				}),
			);
			const suspend: Mock = vi.fn().mockResolvedValue(undefined);

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: suspendPayloadWithCheckpoint({ configUpdated: true }),
					suspend,
				},
			);

			const payload = suspend.mock.calls[0][0] as Record<string, unknown>;
			expect(payload).toMatchObject({ builderCheckpoint: { configUpdated: true } });
		});

		it('ORs carried configUpdated with the resumed pass when finishing', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Done.'));

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: suspendPayloadWithCheckpoint({ configUpdated: true }),
				},
			);

			expect(result.configUpdated).toBe(true);
		});

		it('reports carried configUpdated when the resumed pass errors', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(
				fakeStream([{ type: 'error', error: 'boom' }], ''),
			);

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: suspendPayloadWithCheckpoint({ configUpdated: true }),
				},
			);

			expect(result.ok).toBe(false);
			expect(result.configUpdated).toBe(true);
		});

		it('republishes agent-spawned on resume', async () => {
			const { context, delegate, publishedEvents } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Done.'));

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ resumeData: { approved: true }, suspendPayload: suspendPayloadWithCheckpoint() },
			);

			expect(publishedEvents[0]).toMatchObject({
				type: 'agent-spawned',
				agentId: 'agent-builder:agent-1',
			});
		});

		it('maps a builder-not-configured error thrown mid-stream (during resume streaming) to a friendly message', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(
				throwingStream(
					Object.assign(new Error('not configured'), { code: 'BUILDER_NOT_CONFIGURED' }),
				),
			);

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ resumeData: { approved: true }, suspendPayload: suspendPayloadWithCheckpoint() },
			);

			expect(result).toEqual({
				ok: false,
				error:
					'The agent builder model is not configured. Set it up in the agents module settings.',
				configUpdated: false,
				agentId: 'agent-1',
			});
		});

		it.each([false, true])(
			'friendly-maps a checkpoint-unavailable error thrown mid-stream on resume (carried configUpdated: %s)',
			async (carriedConfigUpdated) => {
				const { context, delegate } = makeContext();
				context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
				vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
					{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
				]);
				vi.mocked(delegate.resumeBuild).mockResolvedValue(
					throwingStream(
						new FakeBuilderCheckpointUnavailableError(
							'The builder question this answer belongs to has expired and can no longer be resumed.',
						),
					),
				);

				const result = await runToolWithCtx(
					context,
					{ message: 'Build it', name: 'New Agent' },
					{
						resumeData: { approved: true },
						suspendPayload: suspendPayloadWithCheckpoint({ configUpdated: carriedConfigUpdated }),
					},
				);

				expect(result).toEqual({
					ok: false,
					error:
						'The builder question this answer belongs to has expired and can no longer be resumed.',
					configUpdated: carriedConfigUpdated,
					agentId: 'agent-1',
				});
			},
		);

		it('snapshots the config a friendly-mapped resume failure left behind', async () => {
			// A pass mutated the config, suspended for confirmation, and the resume
			// failed. The tool still reports configUpdated, so the post-state a
			// repair-shaped case grades has to exist in the trace.
			const { context, delegate } = makeContext();
			const { tracing } = makeTracingStub();
			context.tracing = tracing;
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.readAgentArtifact!).mockResolvedValue({
				config: { name: 'Support Triage' },
				configHash: 'hash-1',
			} as unknown as Awaited<
				ReturnType<NonNullable<InstanceAiBuilderDelegate['readAgentArtifact']>>
			>);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(
				throwingStream(new FakeBuilderCheckpointUnavailableError('Checkpoint expired.')),
			);

			const result = await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: suspendPayloadWithCheckpoint({ configUpdated: true }),
				},
			);

			expect(result).toMatchObject({ ok: false, configUpdated: true });
			const snapshots = vi
				.mocked(tracing.startChildRun)
				.mock.calls.filter(([, init]) => (init as { name?: string }).name === 'agent-snapshot');
			expect(snapshots).toHaveLength(1);
			expect(snapshots[0][1]).toMatchObject({ metadata: { snapshot_reason: 'config-updated' } });
		});

		it('still rethrows an unrelated error thrown mid-stream during resume', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(
				throwingStream(new Error('boom mid-resume')),
			);

			await expect(
				runToolWithCtx(
					context,
					{ message: 'Build it', name: 'New Agent' },
					{ resumeData: { approved: true }, suspendPayload: suspendPayloadWithCheckpoint() },
				),
			).rejects.toThrow('boom mid-resume');
		});
	});

	describe('credit metering', () => {
		it('claims usage once for a completed leg', async () => {
			const { context, delegate } = makeContext();
			context.claimSubAgentUsage = vi.fn().mockResolvedValue(undefined);
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([finishChunk()], 'ok'));

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ toolCallId: 'orch-call-1' },
			);

			expect(context.claimSubAgentUsage).toHaveBeenCalledTimes(1);
			expect(context.claimSubAgentUsage).toHaveBeenCalledWith(
				'run-1:orch-call-1',
				[expectedUsageItem],
				'completed',
			);
		});

		it('waits for the usage claim before returning a completed leg', async () => {
			const { context, delegate } = makeContext();
			const claim = deferredClaim();
			context.claimSubAgentUsage = vi.fn().mockReturnValue(claim.promise);
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([finishChunk()], 'ok'));

			const resultPromise = runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ toolCallId: 'orch-call-1' },
			);

			// The tool call must not settle while its usage claim is still pending.
			const timeoutSentinel = Symbol('timeout');
			const raceBeforeResolve = await Promise.race([
				resultPromise,
				new Promise((resolve) => setTimeout(() => resolve(timeoutSentinel), 20)),
			]);
			expect(raceBeforeResolve).toBe(timeoutSentinel);

			claim.resolve();
			const result = await resultPromise;

			expect(result.ok).toBe(true);
			expect(context.claimSubAgentUsage).toHaveBeenCalledTimes(1);
		});

		it('claims usage with status errored for an errored leg', async () => {
			const { context, delegate } = makeContext();
			context.claimSubAgentUsage = vi.fn().mockResolvedValue(undefined);
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream([finishChunk(), { type: 'error', error: 'boom' }], ''),
			);

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ toolCallId: 'orch-call-1' },
			);

			expect(context.claimSubAgentUsage).toHaveBeenCalledWith(
				'run-1:orch-call-1',
				[expectedUsageItem],
				'errored',
			);
		});

		it('claims usage with a suspension-suffixed dedupe id before cascading the suspension', async () => {
			const { context, delegate } = makeContext();
			const claim = deferredClaim();
			context.claimSubAgentUsage = vi.fn().mockReturnValue(claim.promise);
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[
						finishChunk(),
						{
							type: 'tool-call-suspended',
							runId: 'builder-run-1',
							toolCallId: 'builder-call-1',
							toolName: 'ask_questions',
							suspendPayload: askQuestionsSuspendPayload(),
						},
					],
					'',
				),
			);
			const suspend: Mock = vi.fn().mockResolvedValue(undefined);

			const resultPromise = runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ toolCallId: 'orch-call-1', suspend },
			);

			// The suspension must not be cascaded while its usage claim is still pending.
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(suspend).not.toHaveBeenCalled();

			claim.resolve();
			await resultPromise;

			expect(context.claimSubAgentUsage).toHaveBeenCalledTimes(1);
			expect(context.claimSubAgentUsage).toHaveBeenCalledWith(
				'run-1:orch-call-1:s:builder-call-1',
				[expectedUsageItem],
				'suspended',
			);
			expect(suspend).toHaveBeenCalledTimes(1);
			const claimOrder = (context.claimSubAgentUsage as Mock).mock.invocationCallOrder[0];
			const suspendOrder = suspend.mock.invocationCallOrder[0];
			expect(claimOrder).toBeLessThan(suspendOrder);
		});

		it('claims usage with the ref-suffixed dedupe base on the resume leg', async () => {
			const { context, delegate } = makeContext();
			context.claimSubAgentUsage = vi.fn().mockResolvedValue(undefined);
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([finishChunk()], 'Done.'));

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData: { approved: true },
					suspendPayload: {
						...askQuestionsSuspendPayload(),
						requestId: 'orch-req-1',
						builderCheckpoint: {
							runId: 'builder-run-1',
							toolCallId: 'builder-call-1',
							configUpdated: false,
						},
					},
					toolCallId: 'orch-call-1',
				},
			);

			expect(context.claimSubAgentUsage).toHaveBeenCalledWith(
				'run-1:orch-call-1:builder-call-1',
				[expectedUsageItem],
				'completed',
			);
		});

		it('does not throw when the metering hook is absent', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([finishChunk()], 'ok'));

			const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(result.ok).toBe(true);
		});

		it('still calls the hook with an empty array when the stream carried no usage', async () => {
			const { context, delegate } = makeContext();
			context.claimSubAgentUsage = vi.fn().mockResolvedValue(undefined);
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ toolCallId: 'orch-call-1' },
			);

			expect(context.claimSubAgentUsage).toHaveBeenCalledWith('run-1:orch-call-1', [], 'completed');
		});
	});

	describe('parent-trace tracing', () => {
		it('includes host telemetry from context.tracing.getTelemetry in the builder session', async () => {
			const { context, delegate } = makeContext();
			const { tracing, sentinelTelemetry } = makeTracingStub();
			context.tracing = tracing;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(tracing.getTelemetry).toHaveBeenCalledWith({
				agentRole: 'agent-builder',
				functionId: 'instance-ai.subagent.agent-builder',
				executionMode: 'foreground',
				metadata: { agent_id: 'agent-builder:agent-1', target_agent_id: 'agent-1' },
			});
			const [, , sessionArg] = vi.mocked(delegate.streamBuild).mock.calls[0];
			expect(sessionArg).toEqual(expect.objectContaining({ telemetry: sentinelTelemetry }));
		});

		it('omits telemetry from the builder session when tracing is unset', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			const [, , sessionArg] = vi.mocked(delegate.streamBuild).mock.calls[0];
			expect(sessionArg).not.toHaveProperty('telemetry');
		});

		it('forwards the parent trace memory-task lease hook in the builder session', async () => {
			const { context, delegate } = makeContext();
			const { tracing } = makeTracingStub();
			const onMemoryTaskEvent = vi.fn();
			tracing.onMemoryTaskEvent = onMemoryTaskEvent;
			context.tracing = tracing;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			const [, , sessionArg] = vi.mocked(delegate.streamBuild).mock.calls[0];
			expect(sessionArg).toEqual(
				expect.objectContaining({ memoryTaskObserver: onMemoryTaskEvent }),
			);
		});

		it('omits the memory-task lease hook from the builder session when tracing is unset', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			const [, , sessionArg] = vi.mocked(delegate.streamBuild).mock.calls[0];
			expect(sessionArg).not.toHaveProperty('memoryTaskObserver');
		});

		it('starts a labeled agent-builder child run and finishes it with outputs on completion', async () => {
			const { context, delegate } = makeContext();
			const { tracing, traceRun } = makeTracingStub();
			context.tracing = tracing;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(tracing.startChildRun).toHaveBeenCalledTimes(1);
			const [, initOptions] = tracing.startChildRun.mock.calls[0];
			expect(initOptions).toMatchObject({
				name: 'agent: agent-builder',
				canonicalName: 'instance-ai.subagent.agent-builder.stream',
				tags: ['sub-agent'],
				metadata: {
					agent_role: 'agent-builder',
					agent_id: 'agent-builder:agent-1',
					task_kind: 'agent-builder',
					target_agent_id: 'agent-1',
				},
			});
			const [finishedRun, finishOptions] = tracing.finishRun.mock.calls[0];
			expect(finishedRun).toBe(traceRun);
			expect(finishOptions).toMatchObject({ outputs: { ok: true } });
			expect(tracing.failRun).not.toHaveBeenCalled();
		});

		it('fails the child run when the builder result status is errored', async () => {
			const { context, delegate } = makeContext();
			const { tracing, traceRun } = makeTracingStub();
			context.tracing = tracing;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream([{ type: 'error', error: 'boom' }], ''),
			);

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(tracing.failRun).toHaveBeenCalledWith(traceRun, expect.any(Error), undefined);
			expect(tracing.finishRun).not.toHaveBeenCalled();
		});

		it('fails the child run when the stream throws mid-consumption', async () => {
			const { context, delegate } = makeContext();
			const { tracing, traceRun } = makeTracingStub();
			context.tracing = tracing;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				throwingStream(new Error('stream exploded')),
			);

			await expect(runTool(context, { message: 'Build it', name: 'New Agent' })).rejects.toThrow(
				'stream exploded',
			);

			expect(tracing.failRun).toHaveBeenCalledWith(traceRun, expect.any(Error), undefined);
		});

		it('finishes the child run with a suspended outcome before cascading the suspension', async () => {
			const { context, delegate } = makeContext();
			const { tracing, traceRun } = makeTracingStub();
			context.tracing = tracing;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				suspendingStream('ask_questions', askQuestionsSuspendPayload()),
			);
			const suspend: Mock = vi.fn().mockResolvedValue(undefined);

			await runToolWithCtx(context, { message: 'Build it', name: 'New Agent' }, { suspend });

			expect(tracing.finishRun).toHaveBeenCalledWith(
				traceRun,
				expect.objectContaining({ metadata: { outcome: 'suspended' } }),
			);
			expect(tracing.finishRun.mock.invocationCallOrder[0]).toBeLessThan(
				suspend.mock.invocationCallOrder[0],
			);
		});

		it('resume leg also includes host telemetry in the builder session', async () => {
			const { context, delegate } = makeContext();
			const { tracing, sentinelTelemetry } = makeTracingStub();
			context.tracing = tracing;
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.findOpenSuspensions).mockResolvedValue([
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1' },
			]);
			vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Using Slack.'));
			const resumeData = {
				approved: true,
				answers: [{ questionId: 'q1', selectedOptions: ['slack'] }],
			};

			await runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{
					resumeData,
					suspendPayload: {
						...askQuestionsSuspendPayload(),
						requestId: 'orch-req-1',
						builderCheckpoint: {
							runId: 'builder-run-1',
							toolCallId: 'builder-call-1',
							configUpdated: false,
						},
					},
				},
			);

			const [, , sessionArg] = vi.mocked(delegate.resumeBuild).mock.calls[0];
			expect(sessionArg).toEqual(expect.objectContaining({ telemetry: sentinelTelemetry }));
		});
	});

	describe('product telemetry', () => {
		it('tracks instance_ai_agent_build_route with mode create on a new-agent call', async () => {
			const { context, delegate } = makeContext();
			context.trackTelemetry = vi.fn();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Done.'));

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(context.trackTelemetry).toHaveBeenCalledWith('instance_ai_agent_build_route', {
				thread_id: 'thread-1',
				run_id: 'run-1',
				user_id: 'user-1',
				mode: 'create',
				agent_id: 'agent-1',
			});
		});

		it('tracks instance_ai_agent_build_route with mode edit when continuing a bound target', async () => {
			const { context, delegate } = makeContext();
			context.trackTelemetry = vi.fn();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Done.'));

			await runTool(context, { message: 'Tweak it' });

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(context.trackTelemetry).toHaveBeenCalledWith('instance_ai_agent_build_route', {
				thread_id: 'thread-1',
				run_id: 'run-1',
				user_id: 'user-1',
				mode: 'edit',
				agent_id: 'agent-1',
			});
		});

		it('does not throw when trackTelemetry is absent', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[toolCallChunk('call-1', 'write_config'), toolResultChunk('call-1')],
					'Updated.',
				),
			);

			const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(result.ok).toBe(true);
		});
	});
});
