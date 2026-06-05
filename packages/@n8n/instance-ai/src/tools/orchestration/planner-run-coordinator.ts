import { Agent } from '@n8n/agents';
import { z } from 'zod';

import { createAddPlanItemTool, createRemovePlanItemTool } from './add-plan-item.tool';
import { createSubAgentPersistence } from './agent-persistence';
import { BlueprintAccumulator } from './blueprint-accumulator';
import { truncateLabel } from './display-utils';
import { getPlannerAgentPrompt } from './plan-agent-prompt';
import {
	buildPlannerBriefingContext,
	formatMessagesForBriefing,
	getPriorToolObservations,
	getRecentMessages,
	MESSAGE_HISTORY_COUNT,
} from './planner-briefing';
import { createSubmitPlanTool } from './submit-plan.tool';
import {
	failTraceRun,
	finishTraceRun,
	startSubAgentTrace,
	traceSubAgentTools,
	withTraceRun,
} from './tracing-utils';
import { attachRuntimeWorkspaceCapabilities } from '../../agent/runtime-workspace';
import { MAX_STEPS } from '../../constants/max-steps';
import { consumeStreamCascading } from '../../stream/consume-with-hitl';
import type { ConsumeStreamCascadingResult } from '../../stream/consume-with-hitl';
import { createToolRegistry, toolRegistryKeys, toolRegistryValues } from '../../tool-registry';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';
import { resumeAgentStream } from '../../utils/stream-helpers';
import { CREDENTIALS_TOOL_ID } from '../credentials.tool';
import { DATA_TABLES_TOOL_ID } from '../data-tables.tool';
import { ASK_USER_TOOL_ID } from '../shared/ask-user.tool';

/** Read-only discovery tools the planner gets from domainTools. */
const PLANNER_DOMAIN_TOOL_NAMES = [
	'nodes',
	CREDENTIALS_TOOL_ID,
	DATA_TABLES_TOOL_ID,
	'workflows',
	ASK_USER_TOOL_ID,
];

/** Research tools added when available. */
const PLANNER_RESEARCH_TOOL_NAMES = ['research'];

// ---------------------------------------------------------------------------
// Helper: clear draft checklist from taskStorage
// ---------------------------------------------------------------------------

/** Publish an empty tasks-update so the frontend clears stale plan items. */
function publishClearingEvent(context: OrchestrationContext): void {
	context.eventBus.publish(context.threadId, {
		type: 'tasks-update',
		runId: context.runId,
		agentId: context.orchestratorAgentId,
		payload: { tasks: { tasks: [] }, planItems: [] },
	});
}

async function clearDraftChecklist(context: OrchestrationContext): Promise<void> {
	try {
		await context.taskStorage.save(context.threadId, { tasks: [] });
	} catch {
		// Best-effort — don't let cleanup failures block the return path
	}
}

/**
 * Remove any persisted planned-task graph for this thread *if and only if* it
 * belongs to this planner run's unapproved plan. Called on planner give-up /
 * error paths to prevent a later schedulePlannedTasks() tick from dispatching
 * a plan the user never approved.
 *
 * Guarded because the thread may already carry an unrelated active graph (a
 * prior approved plan with pending checkpoints / in-flight tasks); an
 * unconditional `clear()` here would strand that work. We only touch the graph
 * when its `planRunId` matches this run AND its `status` is `awaiting_approval`
 * — the single window where submit-plan has persisted but approval hasn't
 * happened yet.
 */
export async function clearPlannedTaskGraph(context: OrchestrationContext): Promise<void> {
	if (!context.plannedTaskService) return;
	try {
		const graph = await context.plannedTaskService.getGraph(context.threadId);
		if (!graph) return;
		if (graph.planRunId !== context.runId) return;
		if (graph.status !== 'awaiting_approval') return;
		await context.plannedTaskService.clear(context.threadId);
	} catch {
		// Best-effort — don't let cleanup failures block the return path
	}
}

/**
 * Seed a freshly-built accumulator from the persisted plan before a planner
 * resume. The parent plan-tool handler exits on every cascade-suspend, so the
 * first-call accumulator is gone by the time an "ask for edits" revision
 * resumes the planner — without this, remove-plan-item can't touch the
 * original items, add-plan-item only carries the newly-added ones, and the
 * re-submit's createPlan (which overwrites unconditionally) replaces the graph
 * with a partial plan.
 *
 * Only rehydrates while the plan is still `awaiting_approval` (the revision
 * window) — an already-approved/active graph with in-flight tasks must not be
 * reopened here. Best-effort: a getGraph failure leaves the accumulator empty
 * rather than blocking the resume.
 */
export async function rehydrateAccumulatorFromGraph(
	context: OrchestrationContext,
	accumulator: BlueprintAccumulator,
): Promise<void> {
	if (!context.plannedTaskService) return;
	try {
		const graph = await context.plannedTaskService.getGraph(context.threadId);
		if (graph?.status === 'awaiting_approval' && graph.tasks.length > 0) {
			accumulator.loadFromTasks(graph.tasks);
		}
	} catch {
		// Best-effort — fall back to an empty accumulator rather than block resume.
	}
}

/**
 * The plan tool cascades sub-agent HITL suspensions UP through the SDK's
 * native suspend/resume mechanism: when the planner sub-agent (or any tool
 * inside it) emits a `tool-call-suspended` chunk, the plan tool catches it
 * via `consumeStreamCascading` and calls its own `ctx.suspend()` with the
 * same payload. This checkpoints the orchestrator's full state alongside the
 * planner's, so a process restart between user prompt and click can resume
 * the planner without losing any state.
 *
 * The schemas below are permissive on purpose: the plan tool just forwards
 * whatever the inner tool emitted (submit-plan's plan-review payload OR
 * ask-user's questions payload) and accepts whatever the frontend sent back
 * for that card. Validation already happened on the inner tool.
 */
export const planToolSuspendSchema = z
	.object({
		requestId: z.string(),
		message: z.string(),
		severity: z.string(),
		// Only submit-plan + ask-user carry an `inputType`; cascaded suspensions
		// from other planner tools (credentials, data-tables, ...) don't, and a
		// strict `inputType: string` would reject otherwise-valid payloads.
		inputType: z.string().optional(),
	})
	.passthrough();

/** Assemble the planner sub-agent's tool registry: read-only discovery +
 *  research tools from the orchestrator's domain set, plus the plan-building
 *  tools (add/remove/submit) wired to this run's accumulator. */
function buildPlannerTools(context: OrchestrationContext, accumulator: BlueprintAccumulator) {
	const plannerTools = createToolRegistry();

	for (const name of PLANNER_DOMAIN_TOOL_NAMES) {
		const tool = context.domainTools.get(name);
		if (tool) plannerTools.set(name, tool);
	}

	for (const name of PLANNER_RESEARCH_TOOL_NAMES) {
		const tool = context.domainTools.get(name);
		if (tool) plannerTools.set(name, tool);
	}

	plannerTools.set('add-plan-item', createAddPlanItemTool(accumulator, context));
	plannerTools.set('remove-plan-item', createRemovePlanItemTool(accumulator, context));
	plannerTools.set('submit-plan', createSubmitPlanTool(accumulator, context));

	return plannerTools;
}

/** Construct the planner sub-agent with workspace capabilities + telemetry. */
function buildPlannerSubAgent(
	context: OrchestrationContext,
	tracedPlannerTools: ReturnType<typeof traceSubAgentTools>,
	subAgentId: string,
	plannerPrompt: string,
) {
	const subAgent = new Agent('Workflow Planner Agent')
		.model(context.modelId)
		.instructions(plannerPrompt, {
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		})
		.tool(toolRegistryValues(tracedPlannerTools))
		.checkpoint(context.checkpointStore ?? 'memory');
	attachRuntimeWorkspaceCapabilities(subAgent, {
		workspace: context.workspace,
		runtimeSkills: context.runtimeSkills,
	});
	const telemetry = context.tracing?.getTelemetry?.({
		agentRole: 'planner',
		functionId: 'instance-ai.subagent.planner',
		executionMode: 'background',
		metadata: { agent_id: subAgentId },
	});
	if (telemetry) {
		subAgent.telemetry(telemetry);
	}
	return subAgent;
}

/** Outcome of starting/resuming a planner run: either the cascading-stream
 *  result, or a sentinel that the run could not be resumed (checkpoint state
 *  was lost across a restart). */
type PlannerRunOutcome =
	| { kind: 'consumed'; consumeResult: ConsumeStreamCascadingResult }
	| { kind: 'lost-state' };

/**
 * Owns one planner sub-agent run end-to-end: tool/agent construction, the
 * first-call and resume legs, the LangSmith trace span (held as a field so it
 * spans the run's try/catch), and the terminal/suspension/error transitions.
 *
 * The tool handler stays a thin orchestrator: build the coordinator, run
 * first-call or resume, then route the result to the matching `handle*` method.
 */
export class PlannerRunCoordinator {
	private readonly accumulator = new BlueprintAccumulator();

	// runId-derived id so a resume reuses the same event-stream identity.
	private readonly subAgentId: string;

	private readonly plannerTools: ReturnType<typeof buildPlannerTools>;

	private readonly tracedPlannerTools: ReturnType<typeof traceSubAgentTools>;

	private readonly subAgent: ReturnType<typeof buildPlannerSubAgent>;

	private readonly plannerPrompt: string;

	// Held as a field so finishTrace/failTrace can finalise the span whether the
	// run ends in handleTerminalResult or in the handler's catch.
	private traceRun: Awaited<ReturnType<typeof startSubAgentTrace>>;

	constructor(private readonly context: OrchestrationContext) {
		this.subAgentId = `agent-planner-${context.runId}`;
		this.plannerPrompt = getPlannerAgentPrompt({
			workspaceRoot: context.workspace && context.workspaceRoot ? context.workspaceRoot : undefined,
		});
		this.plannerTools = buildPlannerTools(context, this.accumulator);
		this.tracedPlannerTools = traceSubAgentTools(context, this.plannerTools, 'planner');
		this.subAgent = buildPlannerSubAgent(
			context,
			this.tracedPlannerTools,
			this.subAgentId,
			this.plannerPrompt,
		);
	}

	/** First-call leg: persist the in-flight user message, brief the planner,
	 *  publish agent-spawned, and consume the cascading stream. */
	async startFirstRun(guidance?: string): Promise<PlannerRunOutcome> {
		const { context, subAgent, subAgentId, plannerTools, tracedPlannerTools } = this;

		// The planner is the most common inline HITL entry point — when it
		// suspends the orchestrator cascades-suspends too, and the SDK does not
		// flush the user-message row to memory until a clean loop end (which a
		// suspended run never reaches). Persist eagerly so the user's bubble is
		// visible if they reload during the suspend window.
		if (context.persistInFlightUserMessage) {
			await context.persistInFlightUserMessage();
		}

		const messages = await getRecentMessages(context, MESSAGE_HISTORY_COUNT);
		const briefingContext = buildPlannerBriefingContext(getPriorToolObservations(context));
		const briefing = formatMessagesForBriefing(
			messages,
			guidance,
			context.timeZone,
			briefingContext,
		);

		const subtitle = guidance ?? messages.find((m) => m.role === 'user')?.content ?? 'Planning...';

		context.eventBus.publish(context.threadId, {
			type: 'agent-spawned',
			runId: context.runId,
			agentId: subAgentId,
			payload: {
				parentId: context.orchestratorAgentId,
				role: 'planner',
				tools: toolRegistryKeys(plannerTools),
				kind: 'planner' as const,
				title: 'Planning',
				subtitle: truncateLabel(subtitle),
				goal: briefing,
			},
		});

		this.traceRun = await startSubAgentTrace(context, {
			agentId: subAgentId,
			role: 'planner',
			kind: 'planner',
			inputs: { guidance, messageCount: messages.length },
		});
		mergeTraceRunInputs(
			this.traceRun,
			buildAgentTraceInputs({
				systemPrompt: this.plannerPrompt,
				tools: tracedPlannerTools,
				modelId: context.modelId,
			}),
		);

		const consumeResult = await withTraceRun(context, this.traceRun, async () => {
			const persistence = await createSubAgentPersistence(context, { agentKind: 'planner' });
			const stream = await subAgent.stream(briefing, {
				maxIterations: MAX_STEPS.PLANNER,
				abortSignal: context.abortSignal,
				persistence,
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			});

			return await consumeStreamCascading({
				agent: subAgent,
				stream,
				runId: context.runId,
				agentId: subAgentId,
				eventBus: context.eventBus,
				logger: context.logger,
				threadId: context.threadId,
				abortSignal: context.abortSignal,
			});
		});

		return { kind: 'consumed', consumeResult };
	}

	/** Resume leg: locate the suspended planner, rehydrate the accumulator from
	 *  the persisted plan, open a fresh trace span, and resume the cascading
	 *  stream. Returns `lost-state` when the checkpoint can't be located. */
	async resume(resumeData: Record<string, unknown>): Promise<PlannerRunOutcome> {
		const { context, subAgent, subAgentId, tracedPlannerTools } = this;

		const resumeInfo = await context.findSubAgentResumeInfo?.('planner');
		if (!resumeInfo) return { kind: 'lost-state' };

		// Rehydrate the accumulator from the persisted plan so an "ask for edits"
		// revision operates on the full plan rather than an empty accumulator.
		await rehydrateAccumulatorFromGraph(context, this.accumulator);

		// Open a trace span for the resumed leg so a plan that suspended at HITL
		// and resumed still shows its continuation in LangSmith. The planner card
		// is already in the snapshot from the first call, so no agent-spawned
		// event is (re-)published here.
		this.traceRun = await startSubAgentTrace(context, {
			agentId: subAgentId,
			role: 'planner',
			kind: 'planner',
			inputs: { resumed: true },
		});
		mergeTraceRunInputs(
			this.traceRun,
			buildAgentTraceInputs({
				systemPrompt: this.plannerPrompt,
				tools: tracedPlannerTools,
				modelId: context.modelId,
			}),
		);

		const consumeResult = await withTraceRun(context, this.traceRun, async () => {
			const resumed = await resumeAgentStream(subAgent, resumeData, {
				runId: resumeInfo.runId,
				toolCallId: resumeInfo.toolCallId,
				persistence: resumeInfo.persistence,
				maxIterations: MAX_STEPS.PLANNER,
			});

			return await consumeStreamCascading({
				agent: subAgent,
				stream: resumed,
				runId: context.runId,
				agentId: subAgentId,
				eventBus: context.eventBus,
				logger: context.logger,
				threadId: context.threadId,
				abortSignal: context.abortSignal,
			});
		});

		return { kind: 'consumed', consumeResult };
	}

	/** Cascade a planner suspension up to the orchestrator. Validates the
	 *  forwarded payload; on a malformed payload it tears down the draft plan
	 *  (so a later schedulePlannedTasks tick can't dispatch it) and returns a
	 *  terminal result instead of suspending. */
	async cascadeSuspension(
		ctx: { suspend: (payload: z.infer<typeof planToolSuspendSchema>) => Promise<never> },
		consumeResult: Extract<ConsumeStreamCascadingResult, { status: 'suspended' }>,
	): Promise<{ result: string }> {
		const { context } = this;
		const parsed = planToolSuspendSchema.safeParse(consumeResult.suspension.suspendPayload);
		if (!parsed.success) {
			context.logger.warn('Planner emitted a suspension payload missing required fields', {
				threadId: context.threadId,
				runId: context.runId,
				toolName: consumeResult.suspension.toolName,
				zodIssues: parsed.error.issues,
			});
			await this.tearDownDraftPlan();
			return {
				result: 'Planner requested user input but the payload was malformed. Please try again.',
			};
		}
		return await ctx.suspend(parsed.data);
	}

	/** Finalise a completed/cancelled/errored planner run: close the trace,
	 *  publish agent-completed, then resolve to the orchestrator-facing result
	 *  based on approval / denial / no-plan. */
	async handleTerminalResult(
		consumeResult: ConsumeStreamCascadingResult,
	): Promise<{ result: string }> {
		const { context, accumulator, subAgentId } = this;
		const resultText = consumeResult.status === 'completed' ? await consumeResult.text : '';

		if (this.traceRun) {
			await finishTraceRun(context, this.traceRun, {
				outputs: {
					result: resultText,
					agentId: subAgentId,
					role: 'planner',
					hasItems: !accumulator.isEmpty(),
					itemCount: accumulator.getTaskItemsForEvent().length,
				},
			});
		}

		this.publishCompleted(resultText);

		// Approval is detected via the accumulator's flag, which submit-plan flips
		// in its resume handler. createPlan persisted the graph as
		// `awaiting_approval` on the first call; flip it to `active` and schedule.
		if (accumulator.isApproved()) {
			if (context.plannedTaskService) {
				await context.plannedTaskService.approvePlan(context.threadId);
			}
			if (context.schedulePlannedTasks) {
				await context.schedulePlannedTasks();
			}
			// On resume the accumulator is fresh and reports 0 — query the persisted
			// graph instead so the orchestrator gets accurate text.
			const persistedCount = await getPersistedTaskCount(context);
			const taskCount = persistedCount ?? accumulator.getTaskList().length;
			return {
				result: `Plan approved and ${taskCount} task${taskCount === 1 ? '' : 's'} dispatched.`,
			};
		}

		// User explicitly denied the plan. submit-plan already cancelled the
		// persisted graph, so the cancelled graph won't be picked up by the
		// scheduler. Return a terminal result so the orchestrator stops cleanly.
		if (accumulator.isDenied()) {
			publishClearingEvent(context);
			await clearDraftChecklist(context);
			return { result: 'Plan denied by user. No tasks were dispatched.' };
		}

		// Planner finished without approval (no submit-plan or user didn't approve).
		await this.tearDownDraftPlan();
		if (!accumulator.isEmpty()) {
			return {
				result: `Planner added ${accumulator.getTaskList().length} items but did not submit the plan for approval. The plan was not executed.`,
			};
		}
		return {
			result: `Planner finished without producing a plan. Agent output: ${resultText}`,
		};
	}

	/** Handle an exception thrown anywhere in the run: fail the trace, publish
	 *  agent-completed with the error, and tear down the draft plan unless it
	 *  was already approved (dispatched tasks must not be wiped). */
	async handleError(error: unknown): Promise<{ result: string }> {
		const { context, accumulator, subAgentId } = this;
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (this.traceRun) {
			await failTraceRun(context, this.traceRun, error, {
				agent_id: subAgentId,
				agent_role: 'planner',
			});
		}

		context.eventBus.publish(context.threadId, {
			type: 'agent-completed',
			runId: context.runId,
			agentId: subAgentId,
			payload: { role: 'planner', result: '', error: errorMessage },
		});

		if (!accumulator.isApproved()) {
			await this.tearDownDraftPlan();
		}

		return { result: `Planner error: ${errorMessage}` };
	}

	private publishCompleted(resultText: string): void {
		this.context.eventBus.publish(this.context.threadId, {
			type: 'agent-completed',
			runId: this.context.runId,
			agentId: this.subAgentId,
			payload: { role: 'planner', result: resultText },
		});
	}

	/** Clear the in-progress checklist UI + the unapproved persisted graph. */
	private async tearDownDraftPlan(): Promise<void> {
		publishClearingEvent(this.context);
		await clearDraftChecklist(this.context);
		await clearPlannedTaskGraph(this.context);
	}
}

async function getPersistedTaskCount(context: OrchestrationContext): Promise<number | undefined> {
	if (!context.plannedTaskService) return undefined;
	try {
		const graph = await context.plannedTaskService.getGraph(context.threadId);
		return graph?.tasks?.length;
	} catch {
		return undefined;
	}
}
