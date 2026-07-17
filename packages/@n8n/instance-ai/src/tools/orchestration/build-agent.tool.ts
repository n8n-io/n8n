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
 * If the user abandons a cascaded question (cancel, steering message, or
 * confirmation timeout), the builder-side checkpoint is not cleaned up
 * eagerly — it expires via the agents module's checkpoint TTL pruning.
 *
 * The builder session is keyed to an instance-AI-scoped thread id
 * (`ia-builder:<threadId>:<agentId>`) so nothing appears in the agents-module
 * builder UI — it is a private sub-agent conversation.
 */
import type { InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import {
	BUILDER_CHECKPOINT_UNAVAILABLE_CODE,
	BUILDER_NOT_CONFIGURED_CODE,
	CONFIG_MUTATION_TOOL_NAMES,
	channelSuspendPayloadSchema,
	credentialSuspendPayloadSchema,
	questionAnswerSchema,
	questionsResumeSchema,
	questionsSuspendPayloadSchema,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import {
	agentNamesMatch,
	findSessionAgentByName,
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from './agent-target-binding';
import { instanceAiBuilderThreadPrefix } from './builder-thread-id';
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
import { failTraceRun, finishTraceRun, startSubAgentTrace, withTraceRun } from './tracing-utils';

function isBuilderNotConfiguredError(error: unknown): boolean {
	return isRecord(error) && error.code === BUILDER_NOT_CONFIGURED_CODE;
}

/** `AgentsBuilderService.resumeBuild` throws `BuilderCheckpointUnavailableError`
 *  (stable `code`, shared via `@n8n/api-types`) when the checkpoint being
 *  resumed has expired or no longer exists. */
function isBuilderCheckpointUnavailableError(error: unknown): boolean {
	return isRecord(error) && error.code === BUILDER_CHECKPOINT_UNAVAILABLE_CODE;
}

/** Either friendly-mappable failure this tool recognizes mid-stream. */
function isFriendlyMappableBuilderError(error: unknown): boolean {
	return isBuilderNotConfiguredError(error) || isBuilderCheckpointUnavailableError(error);
}

function didUpdateConfig(workSummary: WorkSummary): boolean {
	const mutationToolNames = new Set<string>(CONFIG_MUTATION_TOOL_NAMES);
	return workSummary.toolCalls.some(
		(call) => call.succeeded && mutationToolNames.has(call.toolName),
	);
}

/** One event per succeeded config-mutation call — parity with `Builder modified workflow`, which fires once per save. */
function trackConfigMutations(
	context: OrchestrationContext,
	agentId: string,
	workSummary: WorkSummary,
): void {
	const mutationToolNames = new Set<string>(CONFIG_MUTATION_TOOL_NAMES);
	for (const call of workSummary.toolCalls) {
		if (!call.succeeded || !mutationToolNames.has(call.toolName)) continue;
		context.trackTelemetry?.('Builder modified agent', {
			thread_id: context.threadId,
			agent_id: agentId,
		});
	}
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

/** Builder sessions are keyed per assistant thread + target agent; the resume
 *  leg must reconstruct this byte-identically after a restart. */
function builderSessionFor(context: OrchestrationContext, agentId: string) {
	const telemetry = context.tracing?.getTelemetry?.({
		agentRole: 'agent-builder',
		functionId: 'instance-ai.subagent.agent-builder',
		executionMode: 'foreground',
		metadata: { agent_id: builderAgentIdFor(agentId), target_agent_id: agentId },
	});
	return {
		threadId: `${instanceAiBuilderThreadPrefix(context.threadId)}${agentId}`,
		hostThreadId: context.threadId,
		runId: context.runId,
		modelConfig: context.modelId,
		...(telemetry ? { telemetry } : {}),
		...(context.tracing?.onMemoryTaskEvent
			? { memoryTaskObserver: context.tracing.onMemoryTaskEvent }
			: {}),
	};
}

function builderAgentIdFor(agentId: string): string {
	return `agent-builder:${agentId}`;
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
	name: z
		.string()
		.optional()
		.describe(
			'Agent name. A name matching an agent already built in this conversation switches back ' +
				'to that agent; a new name creates a new agent and makes it the active target. Omit on ' +
				'follow-up calls for the current agent.',
		),
	agentId: z
		.string()
		.optional()
		.describe(
			'Existing agent id to edit — use the `agentId` returned by earlier build-agent ' +
				'results. Pass to start editing that agent or to switch the active build target; ' +
				'omit on follow-up calls.',
		),
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
	agentId: z
		.string()
		.optional()
		.describe(
			'Id of the agent this turn targeted. Record it and pass it as `agentId` when switching back to this agent later.',
		),
	agentName: z.string().optional().describe('Display name of the targeted agent, when known.'),
	answers: z
		.array(questionAnswerSchema)
		.optional()
		.describe('Answers submitted when resuming a cascaded questions request.'),
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
	/** Target the suspended build belongs to; optional for checkpoints persisted before this field existed. */
	target: z
		.object({ agentId: z.string(), projectId: z.string(), name: z.string().optional() })
		.optional(),
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
	const configUpdated = carriedConfigUpdated || didUpdateConfig(result.workSummary);
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: 'agent-builder', result: '', error },
	});
	return { ok: false, error, configUpdated };
}

/** Target identity stamped on every output of a dispatched builder turn so the
 *  orchestrator learns the agentId and can switch back by id instead of name. */
function targetIdentity(target: AgentBuilderTarget): { agentId: string; agentName?: string } {
	return { agentId: target.agentId, ...(target.name ? { agentName: target.name } : {}) };
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
	/** Trace inputs recorded on the child run (distinct per leg: outbound message vs. resume marker). */
	traceInputs?: unknown;
	/** Deterministic per-leg claim id base (result.agentRunId is always '' for builder streams). */
	dedupeBase: string;
}): Promise<BuildAgentOutput> {
	const {
		context,
		delegate,
		ctx,
		target,
		builderAgentId,
		turn,
		carriedConfigUpdated,
		onSettled,
		traceInputs,
		dedupeBase,
	} = params;

	const traceRun = await startSubAgentTrace(context, {
		agentId: builderAgentId,
		role: 'agent-builder',
		kind: 'agent-builder',
		metadata: { target_agent_id: target.agentId },
		...(traceInputs !== undefined ? { inputs: traceInputs } : {}),
	});

	let result: ConsumeStreamCascadingResult;
	try {
		result = await withTraceRun(
			context,
			traceRun,
			async () =>
				await consumeStreamCascading({
					agent: undefined,
					stream: turn,
					runId: context.runId,
					agentId: builderAgentId,
					eventBus: context.eventBus,
					logger: context.logger,
					threadId: context.threadId,
					abortSignal: context.abortSignal,
				}),
		);
	} catch (error) {
		await failTraceRun(context, traceRun, error);
		// `buildAgent`/`resumeBuild` on the delegate are async generators: calling
		// them never throws, so errors from their bodies (builder-not-configured,
		// an expired/missing checkpoint) only surface here, during consumption —
		// not from the `delegate.streamBuild`/`resumeBuild` call sites.
		const message = publishAgentBuilderFailure(context, builderAgentId, error);
		if (isFriendlyMappableBuilderError(error)) {
			return {
				ok: false,
				error: message,
				configUpdated: carriedConfigUpdated,
				...targetIdentity(target),
			};
		}
		throw error;
	}

	// Reaching a settled stream result (any status, including suspended) means
	// the builder agent was constructed — scope check and existence check both
	// passed — so a deferred agentId-path bind is now safe to persist.
	await onSettled?.();
	trackConfigMutations(context, target.agentId, result.workSummary);

	// The builder names (and renames) the target agent via its config tools, so
	// the orchestrator-supplied name can be missing or stale by the time the
	// turn settles. Refresh it so the tool output (`targetIdentity`), the
	// republished agent-spawned event, and the thread binding all carry the
	// agent's real display name. Best-effort: a stale title is cosmetic and
	// must not fail an otherwise-successful turn.
	try {
		const freshName = await delegate.resolveAgentName(target.agentId);
		if (freshName && freshName !== target.name) {
			target.name = freshName;
			publishAgentSpawned(context, builderAgentId, target);
			if (context.domainContext) {
				await saveAgentBuilderTarget(context.domainContext, target);
			}
		}
	} catch (error) {
		context.logger.warn('Failed to refresh agent name after builder turn', {
			agentId: target.agentId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	if (result.status !== 'suspended') {
		const output = await finishTurn(context, builderAgentId, result, carriedConfigUpdated);
		if (output.ok) {
			await finishTraceRun(context, traceRun, { outputs: output });
		} else {
			await failTraceRun(context, traceRun, new Error(output.error ?? 'builder run failed'));
		}
		await context.claimSubAgentUsage?.(dedupeBase, result.usage?.usage ?? [], result.status);
		return { ...output, ...targetIdentity(target) };
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
		await failTraceRun(context, traceRun, new Error(message));
		publishAgentBuilderFailure(context, builderAgentId, new Error(message));
		await context.claimSubAgentUsage?.(
			`${dedupeBase}:s:invalid`,
			result.usage?.usage ?? [],
			'errored',
		);
		return {
			ok: false,
			error: message,
			configUpdated: configUpdatedSoFar,
			...targetIdentity(target),
		};
	}

	// The builder-level requestId must not leak up: the FE confirms against the
	// orchestrator's own suspension, so a fresh one is minted here.
	await finishTraceRun(context, traceRun, { metadata: { outcome: 'suspended' } });
	await context.claimSubAgentUsage?.(
		`${dedupeBase}:s:${result.suspension.toolCallId}`,
		result.usage?.usage ?? [],
		'suspended',
	);
	return await ctx.suspend({
		...parsedSuspendPayload.data,
		requestId: nanoid(),
		builderCheckpoint: {
			runId: builderRunId,
			toolCallId: result.suspension.toolCallId,
			configUpdated: configUpdatedSoFar,
			target: {
				agentId: target.agentId,
				projectId: target.projectId,
				...(target.name ? { name: target.name } : {}),
			},
		},
	});
}

/** Discriminate via the suspend payload because questionsResumeSchema accepts unrelated objects. */
function getResumedQuestionAnswers(
	ctx: BuildAgentToolContext,
): Array<z.infer<typeof questionAnswerSchema>> | undefined {
	const isQuestionsSuspension = questionsSuspendPayloadSchema.safeParse(ctx.suspendPayload);
	if (!isQuestionsSuspension.success) return undefined;

	const resume = questionsResumeSchema.safeParse(ctx.resumeData);
	if (!resume.success || !resume.data.answers) return undefined;

	return resume.data.answers;
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

	// The ref-carried target routes the resume to the agent that actually asked
	// the question, even if the active binding switched to another agent in the
	// meantime. Fall back to the active binding only for checkpoints persisted
	// before `target` existed on the ref.
	const target = ref.target ?? (await resolveAgentBuilderTarget(domainContext));
	if (!target) {
		return {
			ok: false,
			error: 'No agent build in progress for this conversation.',
			configUpdated: ref.configUpdated,
		};
	}

	const session = builderSessionFor(context, target.agentId);

	const openSuspensions = await delegate.findOpenSuspensions(target.agentId, session);
	if (openSuspensions.length === 0) {
		return {
			ok: false,
			error: 'The builder question this answer belongs to is no longer open.',
			configUpdated: ref.configUpdated,
			...targetIdentity(target),
		};
	}

	const matches = openSuspensions.some(
		(open) => open.runId === ref.runId && open.toolCallId === ref.toolCallId,
	);
	if (!matches) {
		return {
			ok: false,
			error:
				"The answer does not match the builder's open question (stale or superseded suspension). Ask the user again with a fresh build-agent call.",
			configUpdated: ref.configUpdated,
			...targetIdentity(target),
		};
	}

	const builderAgentId = builderAgentIdFor(target.agentId);
	let turn: BuilderTurnStream;
	try {
		turn = await delegate.resumeBuild(
			target.agentId,
			{ runId: ref.runId, toolCallId: ref.toolCallId, resumeData: ctx.resumeData },
			session,
		);
	} catch (error) {
		// Only genuinely call-time-reachable errors land here (e.g. the scope
		// check in the delegate adapter) — see the comment in
		// `runBuilderConsumeLoop`'s catch for why builder-not-configured/expired-
		// checkpoint errors can't surface at this call site.
		publishAgentBuilderFailure(context, builderAgentId, error);
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
		traceInputs: { resumed: true },
		dedupeBase: `${context.runId}:${ctx.toolCallId ?? builderAgentId}:${ref.toolCallId}`,
	});
}

type TargetResolution =
	| { ok: true; target: AgentBuilderTarget; bindAfterTurn: boolean }
	| { ok: false; error: string };

const NO_TARGET_INPUT_ERROR = 'Pass name to create a new agent or agentId to edit an existing one.';
const AGENT_ID_NEEDS_PROJECT_ERROR =
	'Cannot bind to agentId without an active project context. Start this conversation from within a project.';

/**
 * Resolve which agent this call should build/edit. A bound target stays
 * active by default; passing `name` or `agentId` can create a new target or
 * switch to a different existing one. `agentId` wins when both are given.
 * agentId-path binds are always deferred (`bindAfterTurn: true`) — persisting
 * before the builder run settles would let a hallucinated/forbidden/missing
 * agentId permanently poison the thread (no unbind path exists). A name-path
 * switch-back to a session-registry agent is deferred for the same reason;
 * a name-path create binds immediately since `delegate.createAgent` already
 * proves the agent exists.
 */
async function resolveTargetForCall(
	domainContext: InstanceAiContext,
	delegate: InstanceAiBuilderDelegate,
	input: z.infer<typeof buildAgentInputSchema>,
	boundTarget: AgentBuilderTarget | undefined,
): Promise<TargetResolution> {
	if (input.agentId) {
		if (boundTarget && input.agentId === boundTarget.agentId) {
			return { ok: true, target: boundTarget, bindAfterTurn: false };
		}
		if (!domainContext.projectId) {
			return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
		}
		// Best-effort name lookup so the first agent-spawned event already labels
		// the artifact with the existing agent's display name.
		let name: string | undefined;
		try {
			name = await delegate.resolveAgentName(input.agentId);
		} catch {
			name = undefined;
		}
		return {
			ok: true,
			target: {
				agentId: input.agentId,
				projectId: domainContext.projectId,
				...(name ? { name } : {}),
			},
			bindAfterTurn: true,
		};
	}

	if (input.name) {
		// Guards against the orchestrator redundantly repeating `name` on a
		// follow-up call for the agent already being built.
		if (boundTarget && agentNamesMatch(input.name, boundTarget.name)) {
			return { ok: true, target: boundTarget, bindAfterTurn: false };
		}
		// A name matching an agent already built/targeted this conversation is a
		// switch-back, not a creation — the duplicate-agent failure mode this
		// registry exists to prevent. Deferred persist like the agentId path: the
		// agent may have been deleted since, and a failed turn must not clobber
		// the current binding.
		const sessionAgent = await findSessionAgentByName(domainContext, input.name);
		if (sessionAgent) {
			return { ok: true, target: sessionAgent, bindAfterTurn: true };
		}
		const created = await delegate.createAgent(input.name);
		const target: AgentBuilderTarget = {
			agentId: created.agentId,
			projectId: created.projectId,
			name: input.name,
		};
		domainContext.agentBuilderTarget = target;
		await saveAgentBuilderTarget(domainContext, target);
		return { ok: true, target, bindAfterTurn: false };
	}

	if (boundTarget) return { ok: true, target: boundTarget, bindAfterTurn: false };
	return { ok: false, error: NO_TARGET_INPUT_ERROR };
}

export function createBuildAgentTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.BUILD_AGENT)
		.description(
			'Delegate agent building to the agents-module builder, running as a sub-agent. ' +
				'Pass `name` to start a new agent or `agentId` to edit an existing one; calls ' +
				'without either keep editing the current agent. To build ANOTHER agent in the same ' +
				'conversation, pass its `name` or `agentId` — a name matching an agent already built ' +
				'in this conversation switches back to it; an unmatched name creates a new agent and ' +
				'switches the active target. The builder can also publish or unpublish the target ' +
				'agent when the user asks to publish, activate, make it live/usable, or unpublish — ' +
				'forward that intent in `message`; never tell the user to open the agent editor and ' +
				'click Publish. When the builder needs user input (a choice, a ' +
				'credential, or a chat channel), it surfaces automatically as an interactive card in ' +
				'this chat — do not relay those questions yourself; this tool call resumes with the ' +
				'user’s answer and returns the builder’s reply. Returns the builder’s reply, the ' +
				'target `agentId`, and whether it updated the agent config. Record the returned ' +
				'`agentId` and prefer passing it as `agentId` when switching back to that agent — ' +
				'the `name` path is a fallback for when the id is unknown.',
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
				const output = await handleResume(context, domainContext, delegate, ctx);
				const answers = getResumedQuestionAnswers(ctx);
				return answers ? { ...output, answers } : output;
			}

			const existingTarget = await resolveAgentBuilderTarget(domainContext);
			const resolution = await resolveTargetForCall(domainContext, delegate, input, existingTarget);
			if (!resolution.ok) {
				return { ok: false, error: resolution.error };
			}
			const boundTarget = resolution.target;
			const bindAfterTurn = resolution.bindAfterTurn;

			const session = builderSessionFor(context, boundTarget.agentId);
			const outboundMessage = buildOutboundMessage(input.message, input.workflowContext);
			const builderAgentId = builderAgentIdFor(boundTarget.agentId);

			publishAgentSpawned(context, builderAgentId, boundTarget);

			let turn: BuilderTurnStream;
			try {
				turn = await delegate.streamBuild(boundTarget.agentId, outboundMessage, session);
			} catch (error) {
				// Only genuinely call-time-reachable errors land here (e.g. the scope
				// check in the delegate adapter) — see the comment in
				// `runBuilderConsumeLoop`'s catch for why builder-not-configured/expired-
				// checkpoint errors can't surface at this call site.
				publishAgentBuilderFailure(context, builderAgentId, error);
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
				traceInputs: { message: outboundMessage },
				dedupeBase: `${context.runId}:${ctx.toolCallId ?? builderAgentId}`,
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
