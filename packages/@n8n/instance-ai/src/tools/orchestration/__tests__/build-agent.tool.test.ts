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
	findSessionAgentByName,
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
		findSessionAgentByName: vi.fn(async () => await Promise.resolve(undefined)),
	};
});

interface BuildAgentOutput {
	ok: boolean;
	builderReply?: string;
	configUpdated?: boolean;
	error?: string;
	agentId?: string;
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
		vi.mocked(findSessionAgentByName).mockReset().mockResolvedValue(undefined);
	});

	it('creates and binds a new agent when name is given, keying the session to the instance thread', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

		await runTool(context, { message: 'Build me a support agent', name: 'Support Agent' });

		expect(delegate.createAgent).toHaveBeenCalledWith('Support Agent');
		expect(delegate.streamBuild).toHaveBeenCalledWith('agent-1', 'Build me a support agent', {
			threadId: 'ia-builder:thread-1:agent-1',
			hostThreadId: 'thread-1',
			runId: 'run-1',
			modelConfig: context.modelId,
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
			error: 'Pass name to create a new agent or agentId to edit an existing one.',
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

	it('appends the session-workflows envelope to the outbound message when workflowContext is passed', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

		await runTool(context, {
			message: 'Attach the workflow',
			name: 'New Agent',
			workflowContext: [
				{ id: 'wf-1', name: 'Send Reminder', description: 'Sends a reminder email' },
			],
		});

		const [, message] = vi.mocked(delegate.streamBuild).mock.calls[0];
		expect(message).toContain('Attach the workflow');
		expect(message).toContain('<session-workflows>');
		expect(message).toContain(
			'Workflows built in this session (attachable as {"type":"workflow"} tools):',
		);
		expect(message).toContain('- Send Reminder (id: wf-1): Sends a reminder email');
		expect(message).toContain('</session-workflows>');
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

	it('reports that the agent is not available on this instance when no builder delegate is configured', async () => {
		const { context } = makeContext();
		context.domainContext!.builderDelegate = undefined;

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result).toEqual({
			ok: false,
			error: 'Agent building is not available on this instance.',
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
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-existing',
				projectId: 'proj-1',
			});
			expect(context.domainContext!.agentBuilderTarget).toEqual({
				agentId: 'agent-existing',
				projectId: 'proj-1',
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

			expect(delegate.createAgent).toHaveBeenCalledWith('Fresh Agent');
		});

		it('persists the deferred agentId-path bind when the first turn suspends', async () => {
			const { context, delegate } = makeContext();
			const suspend: Mock = vi.fn().mockResolvedValue(undefined);
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
			expect(result).toMatchObject({ ok: true, agentId: 'agent-existing' });
			expect(result.agentName).toBe('Existing Agent');
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

			expect(result).toMatchObject({ ok: true, agentId: 'agent-1', agentName: 'Renamed Agent' });
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

			expect(result).toMatchObject({ ok: true, agentId: 'agent-1', agentName: 'New Agent' });
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
					target: { agentId: 'agent-1', projectId: 'proj-1', name: 'Renamed Agent' },
				},
			});
		});
	});

	describe('multi-agent target switching', () => {
		it('creates and rebinds to a second agent when a different name is given while a target is bound', async () => {
			const { context, delegate } = makeContext();
			// The domain-context field's declared type omits `name`; assign via a
			// separately-typed variable to keep the excess-property check (which
			// applies to fresh object literals) from firing.
			const boundTarget: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'First',
			};
			context.domainContext!.agentBuilderTarget = boundTarget;
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-2',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

			await runTool(context, { message: 'Build me another agent', name: 'Second' });

			expect(findSessionAgentByName).toHaveBeenCalledWith(context.domainContext, 'Second');
			expect(delegate.createAgent).toHaveBeenCalledWith('Second');
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-2',
				projectId: 'proj-1',
				name: 'Second',
			});
			expect(delegate.streamBuild).toHaveBeenCalledWith('agent-2', 'Build me another agent', {
				threadId: 'ia-builder:thread-1:agent-2',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: context.modelId,
			});
		});

		it('returns the target agentId and name so the orchestrator can switch back by id', async () => {
			const { context, delegate } = makeContext();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-2',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

			const result = await runTool(context, { message: 'Build me another agent', name: 'Second' });

			expect(result).toEqual({
				ok: true,
				builderReply: 'Created it.',
				configUpdated: false,
				agentId: 'agent-2',
				agentName: 'Second',
			});
		});

		it('switches back to a session agent whose name matches the registry instead of creating a duplicate', async () => {
			const { context, delegate } = makeContext();
			const boundTarget: AgentBuilderTarget = {
				agentId: 'agent-2',
				projectId: 'proj-1',
				name: 'Docs Helper',
			};
			context.domainContext!.agentBuilderTarget = boundTarget;
			const sessionAgent: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Platform Cycle Tracker',
			};
			vi.mocked(findSessionAgentByName).mockResolvedValue(sessionAgent);
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Switched back.'));

			await runTool(context, {
				message: 'Go back to the tracker agent',
				name: 'Platform Cycle Tracker',
			});

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith('agent-1', 'Go back to the tracker agent', {
				threadId: 'ia-builder:thread-1:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: context.modelId,
			});
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, sessionAgent);
		});

		it('does not clobber the binding when the registry switch-back turn fails before settling', async () => {
			const { context, delegate } = makeContext();
			const boundTarget: AgentBuilderTarget = {
				agentId: 'agent-2',
				projectId: 'proj-1',
				name: 'Docs Helper',
			};
			context.domainContext!.agentBuilderTarget = boundTarget;
			const sessionAgent: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Platform Cycle Tracker',
			};
			vi.mocked(findSessionAgentByName).mockResolvedValue(sessionAgent);
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

		it('skips the registry lookup when the name matches the bound target', async () => {
			const { context, delegate } = makeContext();
			const boundTarget: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Helper',
			};
			context.domainContext!.agentBuilderTarget = boundTarget;
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, { message: 'Add a tool', name: 'Helper' });

			expect(findSessionAgentByName).not.toHaveBeenCalled();
		});

		it("continues the bound build when the given name matches the bound target's name", async () => {
			const { context, delegate } = makeContext();
			const boundTarget: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Helper',
			};
			context.domainContext!.agentBuilderTarget = boundTarget;
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, { message: 'Add a tool', name: 'Helper' });

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith('agent-1', 'Add a tool', {
				threadId: 'ia-builder:thread-1:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: context.modelId,
			});
		});

		it('continues the bound build when the given name matches case- and whitespace-insensitively', async () => {
			const { context, delegate } = makeContext();
			const boundTarget: AgentBuilderTarget = {
				agentId: 'agent-1',
				projectId: 'proj-1',
				name: 'Helper',
			};
			context.domainContext!.agentBuilderTarget = boundTarget;
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Continuing.'));

			await runTool(context, { message: 'Add a tool', name: 'helper' });

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(findSessionAgentByName).not.toHaveBeenCalled();
		});

		it('switches to a different existing agentId with deferred persistence', async () => {
			const { context, delegate } = makeContext();
			context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
			vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

			await runTool(context, { message: 'Now edit this one', agentId: 'agent-2' });

			expect(delegate.createAgent).not.toHaveBeenCalled();
			expect(delegate.streamBuild).toHaveBeenCalledWith('agent-2', 'Now edit this one', {
				threadId: 'ia-builder:thread-1:agent-2',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: context.modelId,
			});
			expect(saveAgentBuilderTarget).toHaveBeenCalledWith(context.domainContext, {
				agentId: 'agent-2',
				projectId: 'proj-1',
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
			expect(delegate.streamBuild).toHaveBeenCalledWith('agent-1', 'Add a tool', {
				threadId: 'ia-builder:thread-1:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: context.modelId,
			});
		});
	});

	describe('interactive suspension cascade', () => {
		it.each([
			['ask_questions', askQuestionsSuspendPayload],
			['ask_credential', askCredentialSuspendPayload],
			['configure_channel', configureChannelSuspendPayload],
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
				const { requestId: originalRequestId, ...basePayload } = buildPayload();
				expect(payload).toMatchObject(basePayload);
				expect(payload).toMatchObject({
					builderCheckpoint: {
						runId: 'builder-run-1',
						toolCallId: 'builder-call-1',
						configUpdated: false,
						target: { agentId: 'agent-1', projectId: 'proj-1', name: 'New Agent' },
					},
				});
				expect(typeof payload.requestId).toBe('string');
				expect(payload.requestId).not.toBe(originalRequestId);
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
			});
			expect(delegate.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1', resumeData },
				{
					threadId: 'ia-builder:thread-1:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: context.modelId,
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
			});
			expect(delegate.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1', resumeData: { approved: true } },
				{
					threadId: 'ia-builder:thread-1:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: context.modelId,
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
		it('tracks one "Builder modified agent" event for a succeeded mutation call', async () => {
			const { context, delegate } = makeContext();
			context.trackTelemetry = vi.fn();
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

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(context.trackTelemetry).toHaveBeenCalledTimes(1);
			expect(context.trackTelemetry).toHaveBeenCalledWith('Builder modified agent', {
				thread_id: 'thread-1',
				agent_id: 'agent-1',
			});
		});

		it('tracks two events for two succeeded mutation calls in the same leg', async () => {
			const { context, delegate } = makeContext();
			context.trackTelemetry = vi.fn();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[
						toolCallChunk('call-1', 'write_config'),
						toolResultChunk('call-1'),
						toolCallChunk('call-2', 'patch_config'),
						toolResultChunk('call-2'),
					],
					'Updated twice.',
				),
			);

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(context.trackTelemetry).toHaveBeenCalledTimes(2);
			expect(context.trackTelemetry).toHaveBeenNthCalledWith(1, 'Builder modified agent', {
				thread_id: 'thread-1',
				agent_id: 'agent-1',
			});
			expect(context.trackTelemetry).toHaveBeenNthCalledWith(2, 'Builder modified agent', {
				thread_id: 'thread-1',
				agent_id: 'agent-1',
			});
		});

		it('does not track when the mutation call fails', async () => {
			const { context, delegate } = makeContext();
			context.trackTelemetry = vi.fn();
			vi.mocked(delegate.createAgent).mockResolvedValue({
				agentId: 'agent-1',
				projectId: 'proj-1',
			});
			vi.mocked(delegate.streamBuild).mockResolvedValue(
				fakeStream(
					[
						toolCallChunk('call-1', 'write_config'),
						{ type: 'tool-result', toolCallId: 'call-1', output: {}, isError: true },
					],
					'',
				),
			);

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(context.trackTelemetry).not.toHaveBeenCalled();
		});

		it('does not track for a non-mutation tool call', async () => {
			const { context, delegate } = makeContext();
			context.trackTelemetry = vi.fn();
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

			await runTool(context, { message: 'Build it', name: 'New Agent' });

			expect(context.trackTelemetry).not.toHaveBeenCalled();
		});

		it('still tracks a prior succeeded mutation when the leg suspends', async () => {
			const { context, delegate } = makeContext();
			context.trackTelemetry = vi.fn();
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

			expect(context.trackTelemetry).toHaveBeenCalledTimes(1);
			expect(context.trackTelemetry).toHaveBeenCalledWith('Builder modified agent', {
				thread_id: 'thread-1',
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
