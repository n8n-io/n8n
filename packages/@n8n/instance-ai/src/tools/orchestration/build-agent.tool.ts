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
import { createAbortError, Tool } from '@n8n/agents';
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
	getSessionAgentByRef,
	normalizeAgentRef,
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

const BUILDER_SUB_AGENT_ROLE = 'agent-builder';
const BUILDER_SUB_AGENT_KIND = 'agent-builder';
const BUILDER_RUN_CANCELLED_MESSAGE = 'The agent builder run was cancelled.';

function getErrorCode(error: unknown): string | undefined {
	if (!isRecord(error)) return undefined;
	const code = error.code;
	return typeof code === 'string' ? code : undefined;
}

function isBuilderNotConfiguredError(error: unknown): boolean {
	return getErrorCode(error) === BUILDER_NOT_CONFIGURED_CODE;
}

/** `AgentsBuilderService.resumeBuild` throws `BuilderCheckpointUnavailableError`
 *  (stable `code`, shared via `@n8n/api-types`) when the checkpoint being
 *  resumed has expired or no longer exists. */
function isBuilderCheckpointUnavailableError(error: unknown): boolean {
	return getErrorCode(error) === BUILDER_CHECKPOINT_UNAVAILABLE_CODE;
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
		'Workflows built in this session (attachable as {"type":"workflow"} tools — reference by workflow name, never by id):',
		...lines,
		'</session-workflows>',
	].join('\n');
}

function buildOutboundMessage(message: string, workflowContext?: SessionWorkflowRef[]): string {
	if (!workflowContext || workflowContext.length === 0) return message;
	return `${message}\n\n${formatWorkflowContextEnvelope(workflowContext)}`;
}

/** Builder sessions are keyed per assistant thread + target agent; the resume
 *  leg must reconstruct the same `threadId` byte-identically after a restart. */
function builderSessionFor(context: OrchestrationContext, agentId: string) {
	const telemetry = context.tracing?.getTelemetry?.({
		agentRole: BUILDER_SUB_AGENT_ROLE,
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
		abortSignal: context.abortSignal,
	};
}

function builderAgentIdFor(agentId: string): string {
	return `${BUILDER_SUB_AGENT_ROLE}:${agentId}`;
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
	agentRef: z
		.string()
		.optional()
		.describe(
			'Short stable key you choose once for an agent in this conversation and repeat on ' +
				'every later call for that same agent (like a workflow source filePath). Prefer a ' +
				'slug of the display name. A repeated key continues that agent; a fresh key creates ' +
				'a new one. Omit on follow-ups for the current agent when neither switching nor ' +
				'creating — the active target is used. When omitted on a create/switch call, the ' +
				'key is derived from `name`.',
		),
	name: z
		.string()
		.optional()
		.describe(
			'Display name for a new agent (required when creating). Also used as the addressing ' +
				'key when `agentRef` is omitted. Omit on follow-up calls for the current agent.',
		),
	agentId: z
		.string()
		.optional()
		.describe(
			'Existing agent id to adopt — use when editing an agent that was not built in this ' +
				'conversation (e.g. from the project list). Once adopted, omit on retries and prefer ' +
				'`agentRef`. NEVER pass for a request to build a NEW agent. Agents the request merely ' +
				'references — as sub-agents, delegation targets, or examples — are not the build ' +
				'target: mention them in `message` instead.',
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
			'Id of the agent this turn targeted. Prefer `agentRef` for follow-ups in this conversation; use `agentId` when the ref is unknown.',
		),
	agentRef: z
		.string()
		.optional()
		.describe(
			'Addressing key for this agent in this conversation. Pass it back as `agentRef` on later calls for the same agent.',
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
		.object({
			agentId: z.string(),
			projectId: z.string(),
			name: z.string().optional(),
			ref: z.string().optional(),
		})
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
			role: BUILDER_SUB_AGENT_ROLE,
			tools: [],
			kind: BUILDER_SUB_AGENT_KIND,
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
		payload: { role: BUILDER_SUB_AGENT_ROLE, result: '', error: message },
	});
	return message;
}

/** Publish the terminal `agent-completed` event for a stopped builder turn: no
 *  `error`, so the tree stays quiet and the run-level stopped indicator speaks. */
function publishAgentBuilderCancelled(context: OrchestrationContext, builderAgentId: string): void {
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: BUILDER_SUB_AGENT_ROLE, result: '', status: 'cancelled' },
	});
}

/** Publish the terminal `agent-completed` event and map the result to the tool output.
 *  A cancelled turn is intercepted by the caller, so that status never arrives here. */
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
			payload: { role: BUILDER_SUB_AGENT_ROLE, result: text.slice(0, 200) },
		});
		return { ok: true, builderReply: text, configUpdated };
	}

	const error = `The agent builder run ${result.status}.`;
	const configUpdated = carriedConfigUpdated || didUpdateConfig(result.workSummary);
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: BUILDER_SUB_AGENT_ROLE, result: '', error },
	});
	return { ok: false, error, configUpdated };
}

/** Target identity stamped on every output of a dispatched builder turn so the
 *  orchestrator learns the addressing key (and agentId as a fallback). */
function targetIdentity(target: AgentBuilderTarget): {
	agentId: string;
	agentRef?: string;
	agentName?: string;
} {
	return {
		agentId: target.agentId,
		...(target.ref ? { agentRef: target.ref } : {}),
		...(target.name ? { agentName: target.name } : {}),
	};
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
		role: BUILDER_SUB_AGENT_ROLE,
		kind: BUILDER_SUB_AGENT_KIND,
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

	if (result.status === 'cancelled') {
		const cancelled = createAbortError(BUILDER_RUN_CANCELLED_MESSAGE);
		publishAgentBuilderCancelled(context, builderAgentId);
		await failTraceRun(context, traceRun, cancelled);
		await context.claimSubAgentUsage?.(dedupeBase, result.usage?.usage ?? [], result.status);
		throw cancelled;
	}

	// The builder names (and renames) the target agent via its config tools, so
	// the orchestrator-supplied name can be missing or stale by the time the
	// turn settles. Refresh it so the tool output (`targetIdentity`), the
	// republished agent-spawned event, and the thread binding all carry the
	// agent's real display name. Best-effort: a stale title is cosmetic and
	// must not fail an otherwise-successful turn. Skipped on cancel — abort
	// should not wait on display-name I/O.
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
				...(target.ref ? { ref: target.ref } : {}),
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
	| { ok: true; target: AgentBuilderTarget; bindAfterTurn: boolean; mode: 'create' | 'edit' }
	| { ok: false; error: string };

const NO_TARGET_INPUT_ERROR =
	'Pass `name` (and optionally `agentRef`) to create a new agent, `agentId` to adopt an existing one, or omit both to continue the current agent.';
const UNKNOWN_REF_ERROR =
	'Unknown `agentRef`. Pass `name` to create a new agent under that key, or `agentId` to adopt an existing agent.';
const AGENT_ID_NEEDS_PROJECT_ERROR =
	'Cannot bind to agentId without an active project context. Start this conversation from within a project.';

/** Best-effort display-name lookup so the first agent-spawned event can label the
 *  artifact; a lookup failure must not fail the turn. */
async function resolveAgentNameSafely(
	delegate: InstanceAiBuilderDelegate,
	agentId: string,
): Promise<string | undefined> {
	try {
		return await delegate.resolveAgentName(agentId);
	} catch {
		return undefined;
	}
}

function agentRefConflictError(ref: string, boundAgentId: string, passedAgentId: string): string {
	return (
		`\`agentRef\` "${ref}" is already bound to agent ${boundAgentId} in this conversation, ` +
		`but \`agentId\` ${passedAgentId} was passed. Continue the bound agent (omit \`agentId\`, ` +
		'or pass its id), or pick a different `agentRef` for a new agent.'
	);
}

/**
 * Resolve which agent this call should build/edit. Identity is keyed by
 * `slug(agentRef ?? name)` in the session registry — a repeated key continues,
 * an unknown key creates (with `name`) or adopts (with `agentId`). A bound
 * target stays active when neither key nor id is given.
 * agentId-path binds are always deferred (`bindAfterTurn: true`) — persisting
 * before the builder run settles would let a hallucinated/forbidden/missing
 * agentId permanently poison the thread (no unbind path exists). A create
 * binds immediately since `delegate.createAgent` already proves the agent exists.
 */
async function resolveTargetForCall(
	domainContext: InstanceAiContext,
	delegate: InstanceAiBuilderDelegate,
	input: z.infer<typeof buildAgentInputSchema>,
	boundTarget: AgentBuilderTarget | undefined,
): Promise<TargetResolution> {
	const keySource = input.agentRef ?? input.name;
	const key = keySource ? normalizeAgentRef(keySource) : undefined;

	if (key) {
		const sessionAgent = await getSessionAgentByRef(domainContext, key);
		if (sessionAgent) {
			if (input.agentId && input.agentId !== sessionAgent.agentId) {
				return {
					ok: false,
					error: agentRefConflictError(key, sessionAgent.agentId, input.agentId),
				};
			}
			const target: AgentBuilderTarget = {
				...sessionAgent,
				ref: key,
				...(input.name ? { name: input.name } : {}),
			};
			// Same agent as the active binding — no re-persist needed.
			if (boundTarget && boundTarget.agentId === target.agentId) {
				return {
					ok: true,
					target: { ...boundTarget, ...target },
					bindAfterTurn: false,
					mode: 'edit',
				};
			}
			// Switch-back: deferred so a deleted-since-registry agent can't clobber
			// the current binding on a failed turn.
			return { ok: true, target, bindAfterTurn: true, mode: 'edit' };
		}

		// Active target already addresses this key (e.g. just created this turn,
		// or a handoff whose registry row isn't available) — continue without
		// creating a duplicate.
		const boundKey = boundTarget?.ref
			? normalizeAgentRef(boundTarget.ref)
			: boundTarget?.name
				? normalizeAgentRef(boundTarget.name)
				: undefined;
		if (boundTarget && boundKey === key) {
			if (input.agentId && input.agentId !== boundTarget.agentId) {
				return {
					ok: false,
					error: agentRefConflictError(key, boundTarget.agentId, input.agentId),
				};
			}
			return {
				ok: true,
				target: { ...boundTarget, ref: key, ...(input.name ? { name: input.name } : {}) },
				bindAfterTurn: false,
				mode: 'edit',
			};
		}

		if (input.agentId) {
			if (boundTarget && input.agentId === boundTarget.agentId) {
				return {
					ok: true,
					target: { ...boundTarget, ref: key, ...(input.name ? { name: input.name } : {}) },
					bindAfterTurn: false,
					mode: 'edit',
				};
			}
			if (!domainContext.projectId) {
				return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
			}
			const name = input.name ?? (await resolveAgentNameSafely(delegate, input.agentId));
			return {
				ok: true,
				target: {
					agentId: input.agentId,
					projectId: domainContext.projectId,
					ref: key,
					...(name ? { name } : {}),
				},
				bindAfterTurn: true,
				mode: 'edit',
			};
		}

		if (input.name) {
			const created = await delegate.createAgent(input.name);
			const target: AgentBuilderTarget = {
				agentId: created.agentId,
				projectId: created.projectId,
				name: input.name,
				ref: key,
			};
			domainContext.agentBuilderTarget = target;
			await saveAgentBuilderTarget(domainContext, target);
			return { ok: true, target, bindAfterTurn: false, mode: 'create' };
		}

		return { ok: false, error: UNKNOWN_REF_ERROR };
	}

	// No addressing key (`name` always produces one) — agentId alone adopts,
	// otherwise continue the bound target.
	if (input.agentId) {
		if (boundTarget && input.agentId === boundTarget.agentId) {
			return { ok: true, target: boundTarget, bindAfterTurn: false, mode: 'edit' };
		}
		if (!domainContext.projectId) {
			return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
		}
		const name = await resolveAgentNameSafely(delegate, input.agentId);
		return {
			ok: true,
			target: {
				agentId: input.agentId,
				projectId: domainContext.projectId,
				...(name ? { name, ref: normalizeAgentRef(name) } : {}),
			},
			bindAfterTurn: true,
			mode: 'edit',
		};
	}

	if (boundTarget) {
		return { ok: true, target: boundTarget, bindAfterTurn: false, mode: 'edit' };
	}
	return { ok: false, error: NO_TARGET_INPUT_ERROR };
}

export function createBuildAgentTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.BUILD_AGENT)
		.description(
			'Builds and edits n8n **Agent** artifacts only (instructions, model, tools, skills, ' +
				'tasks, integrations, sub-agents) by delegating to the agents-module builder. It is ' +
				'only for that purpose. When the request is workflow-anchored (via the intent gate / ' +
				'`intent-recognition`), stay on the `workflow-builder` path and do not call this tool ' +
				'at all — not to inspect nodes, not to list workflows, and not to compile custom ' +
				'tools. If a workflow build seems to need a utility tool the workspace does not ' +
				'provide, ask the user or use a placeholder; do not route around that by calling ' +
				'`build-agent`. ' +
				'Address agents in this conversation with `agentRef` (a short stable key you choose, ' +
				'like a workflow `filePath`). Pass `name` with a fresh key to create; repeat the same ' +
				'key to continue. Calls with neither key nor `agentId` keep editing the current agent. ' +
				'To build ANOTHER agent in the same conversation, use a different `agentRef` (and ' +
				'`name`). To edit an agent that was not built here, pass `agentId` (optionally with ' +
				'`agentRef`) once to adopt it. The builder can also publish or unpublish the target ' +
				'agent when the user asks to publish, activate, make it live/usable, or unpublish — ' +
				'forward that intent in `message`; never tell the user to open the agent editor and ' +
				'click Publish. When the builder needs user input (a choice, a ' +
				'credential, or a chat channel), it surfaces automatically as an interactive card in ' +
				'this chat — do not relay those questions yourself; this tool call resumes with the ' +
				'user’s answer and returns the builder’s reply. Returns the builder’s reply, the ' +
				'target `agentRef`/`agentId`, and whether it updated the agent config. Prefer the ' +
				'returned `agentRef` on later calls for that agent.',
		)
		.input(buildAgentInputSchema)
		.output(buildAgentOutputSchema)
		.suspend(buildAgentSuspendSchema)
		.resume(buildAgentResumeSchema)
		.handler(async (input: z.infer<typeof buildAgentInputSchema>, ctx: BuildAgentToolContext) => {
			if (context.abortSignal.aborted) {
				throw createAbortError(BUILDER_RUN_CANCELLED_MESSAGE);
			}

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
				context.trackTelemetry?.('instance_ai_agent_build_route', {
					thread_id: context.threadId,
					run_id: context.runId,
					user_id: context.userId,
					mode: 'resolution_failed',
				});
				return { ok: false, error: resolution.error };
			}
			context.trackTelemetry?.('instance_ai_agent_build_route', {
				thread_id: context.threadId,
				run_id: context.runId,
				user_id: context.userId,
				mode: resolution.mode,
				agent_id: resolution.target.agentId,
			});
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
