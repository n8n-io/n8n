import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
	cancellationResumeSchema,
	channelConfigSchema,
	channelSuspendPayloadSchema,
	credentialSuspendPayloadSchema,
	questionsSuspendPayloadSchema,
	type InstanceAiEvent,
} from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type {
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { createBuildAgentTool } from '../build-agent.tool';

interface BuildAgentOutput {
	ok: boolean;
	builderReply?: string;
	configUpdated?: boolean;
	error?: string;
}

// Fixtures built via `.parse()` on the shared instance-AI-compatible contract
// the builder's interactive tools now natively emit (`@n8n/api-types`
// `agent-interaction.schema.ts`) — proves the fixtures conform to the same
// schemas the tools themselves are typed against.
const askQuestionsSuspendPayload = (overrides: Record<string, unknown> = {}) =>
	questionsSuspendPayloadSchema.parse({
		requestId: 'tool-req-1',
		message: 'The agent builder has questions',
		severity: 'info',
		inputType: 'questions',
		questions: [
			{
				id: 'q1',
				question: 'Which service should send the alert?',
				type: 'single',
				options: ['Slack', 'Email'],
			},
		],
		...overrides,
	});

const askCredentialSuspendPayload = (overrides: Record<string, unknown> = {}) =>
	credentialSuspendPayloadSchema.parse({
		requestId: 'tool-req-2',
		message: 'Connect to Slack to send messages',
		severity: 'info',
		credentialRequests: [
			{
				credentialType: 'slackApi',
				reason: 'Connect to Slack to send messages',
				existingCredentials: [],
			},
		],
		credentialFlow: { stage: 'generic' },
		...overrides,
	});

const configureChannelSuspendPayload = (overrides: Record<string, unknown> = {}) =>
	channelSuspendPayloadSchema.parse({
		requestId: 'tool-req-3',
		message: 'Set up the Slack channel',
		severity: 'info',
		channelConfig: channelConfigSchema.parse({ integrationType: 'slack', agentId: 'agent-1' }),
		projectId: 'proj-1',
		...overrides,
	});

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

/** Mirrors the `suspensionChunk` fixture in resumable-stream-executor.test.ts. */
function suspensionChunk(input: {
	toolCallId: string;
	toolName?: string;
	suspendPayload?: Record<string, unknown>;
}) {
	return {
		type: 'tool-call-suspended',
		toolCallId: input.toolCallId,
		...(input.toolName ? { toolName: input.toolName } : {}),
		suspendPayload: input.suspendPayload ?? {},
	};
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
	// `mock<InstanceAiContext>()`'s auto-deep-mock doesn't reliably produce a
	// callable nested mock for interface-typed properties accessed through
	// another mock — mock the credential service explicitly so a test can
	// assert it's never called now that the tool no longer enriches/resolves
	// credentials itself (the builder's own ask_credential tool does that).
	domainContext.credentialService = mock<InstanceAiContext['credentialService']>();
	// Force resolveAgentBuilderTarget/saveAgentBuilderTarget onto the in-memory
	// fallback path (no thread-persistence plumbing needed for these tests).
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

	return { context, delegate, publishedEvents };
}

async function runTool(context: OrchestrationContext, input: Record<string, unknown>) {
	const tool = createBuildAgentTool(context);
	return await executeTool<BuildAgentOutput>(tool, input);
}

/** Like `runTool`, but with an explicit `{ resumeData, suspend }` tool ctx for the suspend/resume tests. */
async function runToolWithCtx(
	context: OrchestrationContext,
	input: Record<string, unknown>,
	ctx: {
		resumeData: Record<string, unknown> | undefined;
		suspend: (payload: unknown) => Promise<never>;
	},
) {
	const tool = createBuildAgentTool(context);
	return await executeTool<BuildAgentOutput>(tool, input, ctx);
}

describe('build-agent tool', () => {
	it('creates and binds a new agent when name is given, keying the session to the instance thread', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

		await runTool(context, { message: 'Build me a support agent', name: 'Support Agent' });

		expect(delegate.createAgent).toHaveBeenCalledWith('Support Agent');
		expect(delegate.streamBuild).toHaveBeenCalledWith('agent-1', 'Build me a support agent', {
			threadId: 'ia-builder:thread-1:agent-1',
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

	it('publishes agent-spawned, then stream chunk events, then agent-completed in order', async () => {
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

	it('maps a thrown builder-not-configured error to a friendly message', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockRejectedValue(
			Object.assign(new Error('not configured'), { code: 'BUILDER_NOT_CONFIGURED' }),
		);

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result).toEqual({
			ok: false,
			error: 'The agent builder model is not configured. Set it up in the agents module settings.',
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
			modelConfig: context.modelId,
		});
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

	it('publishes agent-completed when the builder is not configured', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockRejectedValue(
			Object.assign(new Error('not configured'), { code: 'BUILDER_NOT_CONFIGURED' }),
		);

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result).toEqual({
			ok: false,
			error: 'The agent builder model is not configured. Set it up in the agents module settings.',
		});
		expect(publishedEvents.map((event) => event.type)).toEqual([
			'agent-spawned',
			'agent-completed',
		]);
		const completed = publishedEvents[1];
		expect(completed).toMatchObject({ type: 'agent-completed', agentId: 'agent-builder:agent-1' });
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: 'The agent builder model is not configured. Set it up in the agents module settings.',
		});
	});

	it('publishes agent-completed when streamBuild throws an unknown error', async () => {
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
		expect(completed).toMatchObject({ type: 'agent-completed', agentId: 'agent-builder:agent-1' });
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: 'boom',
		});
	});

	it('errors without persisting a target when agentId is given but no projectId', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		context.domainContext!.projectId = undefined;
		const threadMemory = {
			getThread: vi.fn(),
			patchThread: vi.fn(),
		};
		context.domainContext!.threadMemory =
			threadMemory as unknown as InstanceAiContext['threadMemory'];
		context.domainContext!.threadId = 'thread-1';

		const result = await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

		expect(result).toEqual({
			ok: false,
			error:
				'Cannot bind to agentId without an active project context. Start this conversation from within a project.',
		});
		expect(threadMemory.patchThread).not.toHaveBeenCalled();
		expect(delegate.streamBuild).not.toHaveBeenCalled();
		expect(publishedEvents).toEqual([]);
	});
});

describe('build-agent tool — interactive suspend/resume cascade', () => {
	it('cascades an ask_questions suspension into ctx.suspend, passing the payload through byte-for-byte apart from requestId', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		const payload = askQuestionsSuspendPayload();
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: ASK_QUESTIONS_TOOL_NAME,
						suspendPayload: payload,
					}),
				],
				'',
			),
		);
		const suspendFn = vi.fn();

		await runToolWithCtx(
			context,
			{ message: 'Build it', name: 'New Agent' },
			{ resumeData: undefined, suspend: suspendFn },
		);

		expect(suspendFn).toHaveBeenCalledTimes(1);
		const suspended = suspendFn.mock.calls[0][0] as Record<string, unknown>;
		expect(suspended).toEqual({ ...payload, requestId: expect.any(String) as unknown });
		expect(suspended.requestId).not.toBe(payload.requestId);
		expect(publishedEvents.map((event) => event.type)).toEqual(['agent-spawned']);
	});

	it('cascades an ask_credential suspension through unchanged apart from requestId, without looking up credentials itself', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		const payload = askCredentialSuspendPayload({
			credentialRequests: [
				{
					credentialType: 'slackApi',
					reason: 'Connect to Slack',
					existingCredentials: [{ id: 'cred-1', name: 'My Slack account' }],
				},
			],
		});
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: ASK_CREDENTIAL_TOOL_NAME,
						suspendPayload: payload,
					}),
				],
				'',
			),
		);
		const suspendFn = vi.fn();

		await runToolWithCtx(
			context,
			{ message: 'Build it', name: 'New Agent' },
			{ resumeData: undefined, suspend: suspendFn },
		);

		expect(suspendFn.mock.calls[0][0]).toEqual({
			...payload,
			requestId: expect.any(String) as unknown,
		});
		// The builder's own ask_credential tool now looks up existing credentials
		// itself — this tool must not do it (no enrichment, no lookup call).
		expect(context.domainContext!.credentialService.list).not.toHaveBeenCalled();
	});

	it('cascades a configure_channel suspension through unchanged apart from requestId, preserving channelConfig byte-for-byte', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		const payload = configureChannelSuspendPayload();
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: CONFIGURE_CHANNEL_TOOL_NAME,
						suspendPayload: payload,
					}),
				],
				'',
			),
		);
		const suspendFn = vi.fn();

		await runToolWithCtx(
			context,
			{ message: 'Build it', name: 'New Agent' },
			{ resumeData: undefined, suspend: suspendFn },
		);

		expect(suspendFn.mock.calls[0][0]).toEqual({
			...payload,
			requestId: expect.any(String) as unknown,
		});
		expect(
			channelConfigSchema.parse(
				(suspendFn.mock.calls[0][0] as { channelConfig: unknown }).channelConfig,
			),
		).toEqual(payload.channelConfig);
	});

	it('fails the turn with a friendly error when the builder suspension payload is malformed', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: ASK_QUESTIONS_TOOL_NAME,
						// Missing the required `message`/`severity` fields.
						suspendPayload: { foo: 'bar' },
					}),
				],
				'',
			),
		);
		const suspendFn = vi.fn();

		const result = await runToolWithCtx(
			context,
			{ message: 'Build it', name: 'New Agent' },
			{ resumeData: undefined, suspend: suspendFn },
		);

		expect(suspendFn).not.toHaveBeenCalled();
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/malformed/);
		const completed = publishedEvents.find((event) => event.type === 'agent-completed');
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: result.error,
		});
	});

	it('resumes a suspension by passing ctx.resumeData through to delegate.resumeBuild unchanged (questions shape)', async () => {
		const { context, delegate } = makeContext();
		context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue({
			runId: 'builder-run-1',
			toolCallId: 'call-1',
			toolName: ASK_QUESTIONS_TOOL_NAME,
			suspendPayload: askQuestionsSuspendPayload(),
		});
		vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Using Slack.'));
		// Exactly the shape `toConfirmationData` (cli instance-ai.service.ts) flattens
		// a questions-wizard confirm to — no `values`-flattening on this side anymore.
		const resumeData = {
			approved: true,
			answers: [{ questionId: 'q1', selectedOptions: ['slack'] }],
		};

		const result = await runToolWithCtx(
			context,
			{ message: 'anything' },
			{ resumeData, suspend: vi.fn() },
		);

		expect(delegate.resumeBuild).toHaveBeenCalledWith(
			'agent-1',
			{ runId: 'builder-run-1', toolCallId: 'call-1', resumeData },
			{ threadId: 'ia-builder:thread-1:agent-1', modelConfig: context.modelId },
		);
		expect(result).toEqual({ ok: true, builderReply: 'Using Slack.', configUpdated: false });
	});

	it('resumes a credential suspension by passing ctx.resumeData through unchanged, without resolving a display name itself', async () => {
		const { context, delegate } = makeContext();
		context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue({
			runId: 'builder-run-1',
			toolCallId: 'call-1',
			toolName: ASK_CREDENTIAL_TOOL_NAME,
			suspendPayload: askCredentialSuspendPayload(),
		});
		vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Connected.'));
		const resumeData = { credentials: { slackApi: 'cred-1' } };

		await runToolWithCtx(context, { message: 'anything' }, { resumeData, suspend: vi.fn() });

		expect(delegate.resumeBuild).toHaveBeenCalledWith(
			'agent-1',
			{ runId: 'builder-run-1', toolCallId: 'call-1', resumeData },
			{ threadId: 'ia-builder:thread-1:agent-1', modelConfig: context.modelId },
		);
		// No credential-name lookup on this side anymore — the builder's own
		// ask_credential tool resolves the display name from the raw id.
		expect(context.domainContext!.credentialService.list).not.toHaveBeenCalled();
	});

	it('resumes a configure_channel suspension by passing ctx.resumeData through unchanged', async () => {
		const { context, delegate } = makeContext();
		context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue({
			runId: 'builder-run-1',
			toolCallId: 'call-1',
			toolName: CONFIGURE_CHANNEL_TOOL_NAME,
			suspendPayload: configureChannelSuspendPayload(),
		});
		vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Connected.'));
		const resumeData = { approved: false };

		await runToolWithCtx(context, { message: 'anything' }, { resumeData, suspend: vi.fn() });

		expect(delegate.resumeBuild).toHaveBeenCalledWith(
			'agent-1',
			{ runId: 'builder-run-1', toolCallId: 'call-1', resumeData },
			{ threadId: 'ia-builder:thread-1:agent-1', modelConfig: context.modelId },
		);
	});

	it('publishes agent-spawned before any chunk events and exactly one agent-completed on the resume leg', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue({
			runId: 'builder-run-1',
			toolCallId: 'call-1',
			toolName: ASK_QUESTIONS_TOOL_NAME,
			suspendPayload: askQuestionsSuspendPayload(),
		});
		vi.mocked(delegate.resumeBuild).mockResolvedValue(
			fakeStream([{ type: 'text-delta', id: 'a', delta: 'Using Slack.' }], 'Using Slack.'),
		);

		await runToolWithCtx(
			context,
			{ message: 'anything' },
			{
				resumeData: { approved: true, answers: [{ questionId: 'q1', selectedOptions: ['slack'] }] },
				suspend: vi.fn(),
			},
		);

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
			targetResource: { type: 'agent', id: 'agent-1' },
		});
		expect(publishedEvents.filter((event) => event.type === 'agent-completed')).toHaveLength(1);
	});

	it('bounces an ask_llm suspension back into the builder with a cancellation resume, without suspending', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					// `agentRunId` on cascading suspension results is always '' for
					// builder turns — the stream never carries a real run id (see
					// resumable-stream-executor.ts). Resume routing must come from
					// `findOpenSuspension`, not this chunk.
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: ASK_LLM_TOOL_NAME,
						suspendPayload: { purpose: 'Main LLM' },
					}),
				],
				'',
			),
		);
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue({
			runId: 'builder-run-1',
			toolCallId: 'tc-1',
			toolName: ASK_LLM_TOOL_NAME,
			suspendPayload: {},
		});
		vi.mocked(delegate.resumeBuild).mockResolvedValue(fakeStream([], 'Got it, using Anthropic.'));
		const suspendFn = vi.fn();

		const result = await runToolWithCtx(
			context,
			{ message: 'Build it', name: 'New Agent' },
			{ resumeData: undefined, suspend: suspendFn },
		);

		expect(delegate.resumeBuild).toHaveBeenCalledWith(
			'agent-1',
			{
				runId: 'builder-run-1',
				toolCallId: 'tc-1',
				resumeData: {
					_type: 'agent.cancellation',
					// Steers the builder to the ask_questions HITL card instead of a
					// plain-text question that would end the turn.
					message: expect.stringContaining('via the ask_questions tool') as string,
				},
			},
			{ threadId: 'ia-builder:thread-1:agent-1', modelConfig: context.modelId },
		);
		const [, resumeCall] = vi.mocked(delegate.resumeBuild).mock.calls[0];
		expect(cancellationResumeSchema.parse(resumeCall.resumeData)).toEqual(resumeCall.resumeData);
		expect(suspendFn).not.toHaveBeenCalled();
		expect(result).toEqual({
			ok: true,
			builderReply: 'Got it, using Anthropic.',
			configUpdated: false,
		});
	});

	it('returns a friendly error and stops the loop when the ask_llm bounce cannot recover an open suspension', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: ASK_LLM_TOOL_NAME,
						suspendPayload: { purpose: 'Main LLM' },
					}),
				],
				'',
			),
		);
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue(null);
		const suspendFn = vi.fn();

		const result = await runToolWithCtx(
			context,
			{ message: 'Build it', name: 'New Agent' },
			{ resumeData: undefined, suspend: suspendFn },
		);

		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/builder's question could not be recovered/);
		expect(delegate.resumeBuild).not.toHaveBeenCalled();
		expect(suspendFn).not.toHaveBeenCalled();
		expect(publishedEvents.filter((event) => event.type === 'agent-spawned')).toHaveLength(1);
		const completedEvents = publishedEvents.filter((event) => event.type === 'agent-completed');
		expect(completedEvents).toHaveLength(1);
		expect('payload' in completedEvents[0] ? completedEvents[0].payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: result.error,
		});
	});

	it('stops bouncing ask_llm after 3 cancellations and returns a friendly error, publishing one agent-spawned and one agent-completed', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		const askLlmSuspension = () =>
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: ASK_LLM_TOOL_NAME,
						suspendPayload: { purpose: 'Main LLM' },
					}),
				],
				'',
			);
		vi.mocked(delegate.streamBuild).mockResolvedValue(askLlmSuspension());
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue({
			runId: 'builder-run-1',
			toolCallId: 'tc-1',
			toolName: ASK_LLM_TOOL_NAME,
			suspendPayload: {},
		});
		// A delegate that never accepts the "ask in plain text" cancellation and
		// keeps re-suspending ask_llm on every resume.
		vi.mocked(delegate.resumeBuild).mockImplementation(async () => {
			await Promise.resolve();
			return askLlmSuspension();
		});

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(delegate.resumeBuild).toHaveBeenCalledTimes(3);
		expect(result).toEqual({
			ok: false,
			error:
				'The agent builder repeatedly requested a model picker this chat cannot show. ' +
				'Tell the user to configure the builder model in the agents module settings.',
		});
		expect(publishedEvents.filter((event) => event.type === 'agent-spawned')).toHaveLength(1);
		const completedEvents = publishedEvents.filter((event) => event.type === 'agent-completed');
		expect(completedEvents).toHaveLength(1);
		expect(completedEvents[0]).toMatchObject({
			type: 'agent-completed',
			agentId: 'agent-builder:agent-1',
		});
		expect('payload' in completedEvents[0] ? completedEvents[0].payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: result.error,
		});
	});

	it('returns a friendly error when resuming and the builder question is no longer open', async () => {
		const { context, delegate } = makeContext();
		context.domainContext!.agentBuilderTarget = { agentId: 'agent-1', projectId: 'proj-1' };
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue(null);

		const result = await runToolWithCtx(
			context,
			{ message: 'anything' },
			{ resumeData: { approved: true }, suspend: vi.fn() },
		);

		expect(result).toEqual({
			ok: false,
			error: 'The builder question this answered is no longer open.',
		});
		expect(delegate.resumeBuild).not.toHaveBeenCalled();
	});

	it('returns a friendly error when resuming without a build in progress for this conversation', async () => {
		const { context, delegate } = makeContext();

		const result = await runToolWithCtx(
			context,
			{ message: 'anything' },
			{ resumeData: { approved: true }, suspend: vi.fn() },
		);

		expect(result).toEqual({
			ok: false,
			error: 'No agent build in progress for this conversation.',
		});
		expect(delegate.findOpenSuspension).not.toHaveBeenCalled();
	});

	it('suspends on a second interactive question after bouncing an ask_llm suspension internally', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-1',
						toolName: ASK_LLM_TOOL_NAME,
						suspendPayload: {},
					}),
				],
				'',
			),
		);
		vi.mocked(delegate.findOpenSuspension).mockResolvedValue({
			runId: 'builder-run-1',
			toolCallId: 'tc-1',
			toolName: ASK_LLM_TOOL_NAME,
			suspendPayload: {},
		});
		const secondPayload = askQuestionsSuspendPayload({
			message: 'Continue?',
			questions: [{ id: 'q1', question: 'Continue?', type: 'text' }],
		});
		vi.mocked(delegate.resumeBuild).mockResolvedValue(
			fakeStream(
				[
					suspensionChunk({
						toolCallId: 'call-2',
						toolName: ASK_QUESTIONS_TOOL_NAME,
						suspendPayload: secondPayload,
					}),
				],
				'',
			),
		);
		const suspendFn = vi.fn();

		await runToolWithCtx(
			context,
			{ message: 'Build it', name: 'New Agent' },
			{ resumeData: undefined, suspend: suspendFn },
		);

		expect(delegate.resumeBuild).toHaveBeenCalledTimes(1);
		expect(suspendFn).toHaveBeenCalledTimes(1);
		expect(suspendFn.mock.calls[0][0]).toEqual({
			...secondPayload,
			requestId: expect.any(String) as unknown,
		});
	});

	it('publishes agent-completed and rethrows when consumeStreamCascading itself throws mid-loop', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(throwingStream(new Error('stream exploded')));

		await expect(
			runToolWithCtx(
				context,
				{ message: 'Build it', name: 'New Agent' },
				{ resumeData: undefined, suspend: vi.fn() },
			),
		).rejects.toThrow('stream exploded');

		expect(publishedEvents.map((event) => event.type)).toEqual([
			'agent-spawned',
			'agent-completed',
		]);
		const completed = publishedEvents[1];
		expect(completed).toMatchObject({ type: 'agent-completed', agentId: 'agent-builder:agent-1' });
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: 'stream exploded',
		});
	});
});
