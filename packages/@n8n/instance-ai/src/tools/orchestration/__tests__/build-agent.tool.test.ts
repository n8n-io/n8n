import { BUILDER_CHECKPOINT_UNAVAILABLE_CODE, type InstanceAiEvent } from '@n8n/api-types';
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
	OrchestrationContext,
} from '../../../types';
import type * as AgentTargetBindingModule from '../agent-target-binding';
import { resolveAgentBuilderTarget, saveAgentBuilderTarget } from '../agent-target-binding';
import { createBuildAgentTool } from '../build-agent.tool';

vi.mock('../agent-target-binding', async () => {
	const actual = await vi.importActual<typeof AgentTargetBindingModule>('../agent-target-binding');
	return {
		...actual,
		resolveAgentBuilderTarget: vi.fn(
			async (ctx: InstanceAiContext) => await Promise.resolve(ctx.agentBuilderTarget),
		),
		saveAgentBuilderTarget: vi.fn(),
	};
});

interface BuildAgentOutput {
	ok: boolean;
	builderReply?: string;
	configUpdated?: boolean;
	error?: string;
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
	});

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

		expect(result).toEqual({ ok: false, error: friendlyMessage, configUpdated: false });
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
		it.each(['write_config', 'patch_config'])(
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

			expect(delegate.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				{ runId: 'builder-run-1', toolCallId: 'builder-call-1', resumeData },
				{ threadId: 'ia-builder:thread-1:agent-1', modelConfig: context.modelId },
			);
			expect(result).toEqual({ ok: true, builderReply: 'Using Slack.', configUpdated: false });
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
				{ threadId: 'ia-builder:thread-1:agent-1', modelConfig: context.modelId },
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
});
