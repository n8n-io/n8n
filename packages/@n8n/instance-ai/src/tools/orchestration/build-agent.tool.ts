/**
 * build-agent — orchestration tool that drives the agents-module builder
 * (`AgentsBuilderService`) as an embedded sub-agent, one conversational turn
 * per invocation.
 *
 * This is the interactive contract: the delegate session includes the
 * builder's full standard toolset, so it may suspend on `ask_questions`,
 * `ask_credential`, `ask_embedding_credential`, or `configure_channel`. When
 * it does, this tool cascades the suspension through its own `ctx.suspend()`
 * — using payloads derived from the shared interaction contract in
 * `@n8n/api-types` — so the question renders as a card in the calling
 * assistant's chat and the orchestrator's own checkpoint survives a process
 * restart. On resume, the target agent and the builder's open suspension are
 * both re-derived from persistence (no in-memory state carried across the
 * suspend boundary) and checked for identity against the `builderCheckpoint`
 * ref persisted in the cascaded payload before the answer is routed back.
 *
 * The builder session is keyed to an instance-AI-scoped thread id
 * (`ia-builder:<threadId>:<agentId>`) so nothing appears in the agents-module
 * builder UI — it is a private sub-agent conversation.
 */
import type { InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import {
	BUILDER_NOT_CONFIGURED_CODE,
	CONFIG_MUTATION_TOOL_NAMES,
	channelSuspendPayloadSchema,
	credentialSuspendPayloadSchema,
	questionsSuspendPayloadSchema,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import {
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from './agent-target-binding';
import {
	consumeStreamCascading,
	type ConsumeStreamCascadingResult,
} from '../../stream/consume-with-hitl';
import type { WorkSummary } from '../../stream/work-summary-accumulator';
import type {
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
	SessionWorkflowRef,
} from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

function isBuilderNotConfiguredError(error: unknown): boolean {
	return isRecord(error) && error.code === BUILDER_NOT_CONFIGURED_CODE;
}

function didUpdateConfig(workSummary: WorkSummary): boolean {
	const mutationToolNames = new Set<string>(CONFIG_MUTATION_TOOL_NAMES);
	return workSummary.toolCalls.some(
		(call) => call.succeeded && mutationToolNames.has(call.toolName),
	);
}

function formatWorkflowContextEnvelope(workflowContext: SessionWorkflowRef[]): string {
	const lines = workflowContext.map(
		(workflow) =>
			`- ${workflow.name} (id: ${workflow.id})${workflow.description ? `: ${workflow.description}` : ''}`,
	);
	return [
		'<session-workflows>',
		'Workflows built in this session (attachable as {"type":"workflow"} tools):',
		...lines,
		'</session-workflows>',
	].join('\n');
}

function buildOutboundMessage(message: string, workflowContext?: SessionWorkflowRef[]): string {
	if (!workflowContext || workflowContext.length === 0) return message;
	return `${message}\n\n${formatWorkflowContextEnvelope(workflowContext)}`;
}

const buildAgentInputSchema = z.object({
	message: z
		.string()
		.min(1)
		.describe(
			'The instruction or user message to forward to the agent builder. The builder cannot ' +
				'see this chat — include every requirement, decision, and user answer already ' +
				'gathered in this conversation, not just the latest message.',
		),
	name: z.string().optional().describe('Name for a NEW agent (first call only)'),
	agentId: z.string().optional().describe('Existing agent id to edit (first call only)'),
	workflowContext: z
		.array(z.object({ id: z.string(), name: z.string(), description: z.string().optional() }))
		.optional()
		.describe('Workflows built in this session the builder may attach as tools'),
});

const buildAgentOutputSchema = z.object({
	ok: z.boolean(),
	builderReply: z.string().optional(),
	configUpdated: z.boolean().optional(),
	error: z.string().optional(),
});

type BuildAgentOutput = z.infer<typeof buildAgentOutputSchema>;

/** Durable reference to the builder's own suspended checkpoint, carried inside the
 *  cascaded suspend payload (persisted in the orchestrator's checkpoint) so the resume
 *  leg can verify it resumes the same suspension it cascaded. */
const builderCheckpointRefSchema = z.object({
	runId: z.string(),
	toolCallId: z.string(),
	/** Whether any builder pass before this suspension already mutated the agent config. */
	configUpdated: z.boolean(),
});

/** Envelope derived from the shared interaction contract (agent-interaction.schema.ts):
 *  only payloads the assistant FE can render may cascade. */
const builderSuspendPayloadSchema = z.union([
	questionsSuspendPayloadSchema,
	credentialSuspendPayloadSchema,
	channelSuspendPayloadSchema,
]);

const buildAgentSuspendSchema = z.union([
	questionsSuspendPayloadSchema.extend({ builderCheckpoint: builderCheckpointRefSchema }),
	credentialSuspendPayloadSchema.extend({ builderCheckpoint: builderCheckpointRefSchema }),
	channelSuspendPayloadSchema.extend({ builderCheckpoint: builderCheckpointRefSchema }),
]);

/**
 * Resume data is NOT semantically validated at this level — it passes through
 * byte-for-byte to the builder's suspended interactive tool, which validates
 * it against its own shared-contract resume schema (`agent-interaction.schema.ts`).
 * A zod union of the shared resume schemas would be wrong here: its first
 * member (`questionsResumeSchema`) is all-optional, so it matches any object
 * and the SDK's resume validation would strip every non-questions field
 * (e.g. a `credentials` map) before the handler sees it.
 */
const buildAgentResumeSchema = z.object({}).passthrough();

type BuildAgentSuspendPayload = z.infer<typeof buildAgentSuspendSchema>;
type BuildAgentResumeData = z.infer<typeof buildAgentResumeSchema>;
type BuildAgentToolContext = InterruptibleToolContext<
	BuildAgentSuspendPayload,
	BuildAgentResumeData
>;

/**
 * Publish the `agent-spawned` event announcing the builder sub-agent to the FE.
 * Published on the first call that constructs the builder session, and
 * republished (idempotently) on resume — the FE may have lost the builder
 * node across a page reload or process restart, so the resume leg re-sends it
 * defensively.
 */
function publishAgentSpawned(
	context: OrchestrationContext,
	builderAgentId: string,
	target: AgentBuilderTarget,
): void {
	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: builderAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: 'agent-builder',
			tools: [],
			kind: 'agent-builder',
			title: 'Building agent',
			// name/projectId make the FE render the agent as a conversation artifact
			// (artifact list + preview both require projectId).
			targetResource: {
				type: 'agent',
				id: target.agentId,
				projectId: target.projectId,
				...(target.name ? { name: target.name } : {}),
			},
		},
	});
}

/** Publish the standard failure `agent-completed` event; returns the resolved message. */
function publishAgentBuilderFailure(
	context: OrchestrationContext,
	builderAgentId: string,
	error: unknown,
): string {
	const message = isBuilderNotConfiguredError(error)
		? 'The agent builder model is not configured. Set it up in the agents module settings.'
		: error instanceof Error
			? error.message
			: 'The agent builder run failed unexpectedly.';
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: 'agent-builder', result: '', error: message },
	});
	return message;
}

/** Publish the terminal `agent-completed` event and map the result to the tool output. */
async function finishTurn(
	context: OrchestrationContext,
	builderAgentId: string,
	result: Extract<ConsumeStreamCascadingResult, { status: 'completed' | 'cancelled' | 'errored' }>,
	carriedConfigUpdated: boolean,
): Promise<BuildAgentOutput> {
	if (result.status === 'completed') {
		const text = await result.text;
		const configUpdated = carriedConfigUpdated || didUpdateConfig(result.workSummary);
		context.eventBus.publish(context.threadId, {
			type: 'agent-completed',
			runId: context.runId,
			agentId: builderAgentId,
			payload: { role: 'agent-builder', result: text.slice(0, 200) },
		});
		return { ok: true, builderReply: text, configUpdated };
	}

	const error = `The agent builder run ${result.status}.`;
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: 'agent-builder', result: '', error },
	});
	return { ok: false, error };
}

/**
 * Consume a builder turn stream to completion or suspension, and either
 * finish the tool call or cascade the suspension through `ctx.suspend()`.
 * Shared by the first-call and resume legs of the handler.
 */
async function runBuilderConsumeLoop(params: {
	context: OrchestrationContext;
	delegate: InstanceAiBuilderDelegate;
	ctx: BuildAgentToolContext;
	target: AgentBuilderTarget;
	builderAgentId: string;
	turn: BuilderTurnStream;
	/** configUpdated already accumulated by passes before this one (false on the first leg; carried from the suspend payload on resume). */
	carriedConfigUpdated: boolean;
	/** Runs once the stream settles (any status) — used to persist a deferred agentId-path bind. */
	onSettled?: () => Promise<void>;
}): Promise<BuildAgentOutput> {
	const { context, delegate, ctx, target, builderAgentId, turn, carriedConfigUpdated, onSettled } =
		params;

	let result: ConsumeStreamCascadingResult;
	try {
		result = await consumeStreamCascading({
			agent: undefined,
			stream: turn,
			runId: context.runId,
			agentId: builderAgentId,
			eventBus: context.eventBus,
			logger: context.logger,
			threadId: context.threadId,
			abortSignal: context.abortSignal,
		});
	} catch (error) {
		publishAgentBuilderFailure(context, builderAgentId, error);
		throw error;
	}

	// Reaching a settled stream result (any status, including suspended) means
	// the builder agent was constructed — scope check and existence check both
	// passed — so a deferred agentId-path bind is now safe to persist.
	await onSettled?.();

	if (result.status !== 'suspended') {
		return await finishTurn(context, builderAgentId, result, carriedConfigUpdated);
	}

	const configUpdatedSoFar = carriedConfigUpdated || didUpdateConfig(result.workSummary);
	const builderRunId = result.suspension.runId;
	const parsedSuspendPayload = builderRunId
		? builderSuspendPayloadSchema.safeParse(result.suspension.suspendPayload)
		: undefined;

	if (!builderRunId || !parsedSuspendPayload?.success) {
		if (builderRunId) {
			try {
				await delegate.cancelOpenSuspension(target.agentId, builderRunId);
			} catch (error) {
				context.logger.warn('Failed to cancel orphaned builder checkpoint', {
					builderRunId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		const message =
			"The agent builder's confirmation request could not be shown in this chat; the build turn was cancelled.";
		publishAgentBuilderFailure(context, builderAgentId, new Error(message));
		return { ok: false, error: message };
	}

	// The builder-level requestId must not leak up: the FE confirms against the
	// orchestrator's own suspension, so a fresh one is minted here.
	return await ctx.suspend({
		...parsedSuspendPayload.data,
		requestId: nanoid(),
		builderCheckpoint: {
			runId: builderRunId,
			toolCallId: result.suspension.toolCallId,
			configUpdated: configUpdatedSoFar,
		},
	});
}

/**
 * Resume leg: re-derive the target agent and the builder's open suspension
 * from persistence, verify they match the `builderCheckpoint` ref carried in
 * the cascaded suspend payload, then resume the builder with the user's
 * answer passed through unchanged.
 */
async function handleResume(
	context: OrchestrationContext,
	domainContext: InstanceAiContext,
	delegate: InstanceAiBuilderDelegate,
	ctx: BuildAgentToolContext,
): Promise<BuildAgentOutput> {
	const refParse = z
		.object({ builderCheckpoint: builderCheckpointRefSchema })
		.safeParse(ctx.suspendPayload);
	if (!refParse.success) {
		return {
			ok: false,
			error:
				'The suspended build state is missing its builder checkpoint reference; the answer cannot be routed. Start a new build-agent call.',
		};
	}
	const ref = refParse.data.builderCheckpoint;

	const target = await resolveAgentBuilderTarget(domainContext);
	if (!target) {
		return { ok: false, error: 'No agent build in progress for this conversation.' };
	}

	const session = {
		threadId: `ia-builder:${context.threadId}:${target.agentId}`,
		modelConfig: context.modelId,
	};

	const openSuspensions = await delegate.findOpenSuspensions(target.agentId, session);
	if (openSuspensions.length === 0) {
		return { ok: false, error: 'The builder question this answer belongs to is no longer open.' };
	}

	const matches = openSuspensions.some(
		(open) => open.runId === ref.runId && open.toolCallId === ref.toolCallId,
	);
	if (!matches) {
		return {
			ok: false,
			error:
				"The answer does not match the builder's open question (stale or superseded suspension). Ask the user again with a fresh build-agent call.",
		};
	}

	const builderAgentId = `agent-builder:${target.agentId}`;
	let turn: BuilderTurnStream;
	try {
		turn = await delegate.resumeBuild(
			target.agentId,
			{ runId: ref.runId, toolCallId: ref.toolCallId, resumeData: ctx.resumeData },
			session,
		);
	} catch (error) {
		const message = publishAgentBuilderFailure(context, builderAgentId, error);
		if (isBuilderNotConfiguredError(error)) {
			return { ok: false, error: message };
		}
		throw error;
	}

	publishAgentSpawned(context, builderAgentId, target);

	return await runBuilderConsumeLoop({
		context,
		delegate,
		ctx,
		target,
		builderAgentId,
		turn,
		carriedConfigUpdated: ref.configUpdated,
	});
}

export function createBuildAgentTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.BUILD_AGENT)
		.description(
			'Delegate agent building to the agents-module builder, running as a sub-agent. ' +
				'Pass `name` to start a new agent or `agentId` to edit an existing one on the first ' +
				'call; subsequent calls keep editing the same agent. When the builder needs user ' +
				'input (a choice, a credential, or a chat channel), it surfaces automatically as an ' +
				'interactive card in this chat — do not relay those questions yourself; this tool ' +
				'call resumes with the user’s answer and returns the builder’s reply. Returns the ' +
				'builder’s reply and whether it updated the agent config.',
		)
		.input(buildAgentInputSchema)
		.output(buildAgentOutputSchema)
		.suspend(buildAgentSuspendSchema)
		.resume(buildAgentResumeSchema)
		.handler(async (input: z.infer<typeof buildAgentInputSchema>, ctx: BuildAgentToolContext) => {
			const domainContext = context.domainContext;
			const delegate = domainContext?.builderDelegate;
			if (!domainContext || !delegate) {
				return { ok: false, error: 'Agent building is not available on this instance.' };
			}

			if (ctx.resumeData !== undefined && ctx.resumeData !== null) {
				return await handleResume(context, domainContext, delegate, ctx);
			}

			let target = await resolveAgentBuilderTarget(domainContext);
			// Deferred for the agentId path: binding before the builder run settles
			// would let a hallucinated/forbidden/missing agentId permanently poison
			// the thread (no unbind path exists). The name path binds immediately
			// below since `createAgent` already proves the agent exists.
			let bindAfterTurn = false;
			if (!target) {
				if (input.name) {
					const created = await delegate.createAgent(input.name);
					target = { agentId: created.agentId, projectId: created.projectId, name: input.name };
					domainContext.agentBuilderTarget = target;
					await saveAgentBuilderTarget(domainContext, target);
				} else if (input.agentId) {
					if (!domainContext.projectId) {
						return {
							ok: false,
							error:
								'Cannot bind to agentId without an active project context. Start this conversation from within a project.',
						};
					}
					target = { agentId: input.agentId, projectId: domainContext.projectId };
					bindAfterTurn = true;
				} else {
					return {
						ok: false,
						error: 'Pass name to create a new agent or agentId to edit an existing one.',
					};
				}
			}
			const boundTarget: AgentBuilderTarget = target;

			const session = {
				threadId: `ia-builder:${context.threadId}:${boundTarget.agentId}`,
				modelConfig: context.modelId,
			};
			const outboundMessage = buildOutboundMessage(input.message, input.workflowContext);
			const builderAgentId = `agent-builder:${boundTarget.agentId}`;

			publishAgentSpawned(context, builderAgentId, boundTarget);

			let turn: BuilderTurnStream;
			try {
				turn = await delegate.streamBuild(boundTarget.agentId, outboundMessage, session);
			} catch (error) {
				const message = publishAgentBuilderFailure(context, builderAgentId, error);
				if (isBuilderNotConfiguredError(error)) {
					return { ok: false, error: message };
				}
				throw error;
			}

			return await runBuilderConsumeLoop({
				context,
				delegate,
				ctx,
				target: boundTarget,
				builderAgentId,
				turn,
				carriedConfigUpdated: false,
				onSettled: bindAfterTurn
					? async () => {
							domainContext.agentBuilderTarget = boundTarget;
							await saveAgentBuilderTarget(domainContext, boundTarget);
						}
					: undefined,
			});
		})
		.build();
}
