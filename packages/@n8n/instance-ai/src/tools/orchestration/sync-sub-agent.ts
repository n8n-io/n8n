import { nanoid } from 'nanoid';

import { createSubAgentPersistence } from './agent-persistence';
import { truncateLabel } from './display-utils';
import {
	failTraceRun,
	finishTraceRun,
	startSubAgentTrace,
	traceSubAgentTools,
	withTraceRun,
} from './tracing-utils';
import { buildSubAgentBriefing } from '../../agent/sub-agent-briefing';
import { buildDebriefing } from '../../agent/sub-agent-debriefing';
import { createSubAgent } from '../../agent/sub-agent-factory';
import { MAX_STEPS } from '../../constants/max-steps';
import {
	consumeStreamWithHitl,
	requireCompletedHitlText,
	resolveSubAgentParentResult,
} from '../../stream/consume-with-hitl';
import type { RunTokenUsage } from '../../stream/usage-accumulator';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../../types';

function buildSubAgentWorkspaceOptions(context: OrchestrationContext): {
	workspace?: OrchestrationContext['workspace'];
	workspaceRoot?: string;
} {
	if (!context.workspace) {
		return {};
	}

	return {
		workspace: context.workspace,
		workspaceRoot: context.workspaceRoot,
	};
}

function generateAgentId(): string {
	return `agent-${nanoid(6)}`;
}

/**
 * The sub-agent's system prompt already bakes in `SUB_AGENT_PROTOCOL` (see
 * `buildSubAgentPrompt`), so the briefing does not repeat it — doing so on
 * every sync sub-agent run only inflated the input with no behavioral effect.
 */
async function buildSyncSubAgentBriefing(
	context: OrchestrationContext,
	role: string,
	briefing: string,
	artifacts?: unknown,
	conversationContext?: string,
): Promise<string> {
	return await buildSubAgentBriefing({
		task: briefing,
		conversationContext,
		artifacts: artifacts as Record<string, unknown> | undefined,
		iteration: context.iterationLog
			? { log: context.iterationLog, threadId: context.threadId, taskKey: `sync-sub-agent:${role}` }
			: undefined,
		runningTasks: context.getRunningTaskSummaries?.(),
	});
}

/** Input for {@link runSyncSubAgent} — tools are already resolved by the caller. */
export interface RunSyncSubAgentInput {
	role: string;
	instructions: string;
	briefing: string;
	validTools: InstanceAiToolRegistry;
	toolNames: string[];
	artifacts?: unknown;
	conversationContext?: string;
	/** Max LLM steps for this sub-agent run. Defaults to {@link MAX_STEPS.RESEARCH}. */
	maxIterations?: number;
}

/** Token usage/cost for a sync sub-agent run, in the shape callers (e.g. the delegate tool) expect. */
export interface SyncSubAgentUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	cost?: number;
}

export interface SyncSubAgentOutput {
	result: string;
	toolCallCount?: number;
	toolErrorCount?: number;
	durationMs?: number;
	blockers?: string[];
	usage?: SyncSubAgentUsage;
}

function toSyncSubAgentUsage(usage: RunTokenUsage | undefined): SyncSubAgentUsage | undefined {
	if (!usage) return undefined;
	return {
		promptTokens: usage.promptTokens,
		completionTokens: usage.completionTokens,
		totalTokens: usage.totalTokens,
		...(usage.costUsd > 0 ? { cost: usage.costUsd } : {}),
	};
}

/**
 * Run a focused sub-agent synchronously: spawn it, stream with HITL support, and
 * return a synthesized debrief in the same turn.
 */
export async function runSyncSubAgent(
	context: OrchestrationContext,
	input: RunSyncSubAgentInput,
): Promise<SyncSubAgentOutput> {
	const subAgentId = generateAgentId();
	const startTime = Date.now();

	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: subAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: input.role,
			tools: input.toolNames,
			subtitle: truncateLabel(input.briefing),
			goal: input.briefing,
		},
	});
	const traceRun = await startSubAgentTrace(context, {
		agentId: subAgentId,
		role: input.role,
		kind: 'delegate',
		inputs: {
			briefing: input.briefing,
			instructions: input.instructions,
			tools: input.toolNames,
			conversationContext: input.conversationContext,
		},
	});
	const tracedTools = traceSubAgentTools(context, input.validTools, input.role);

	try {
		const subAgent = createSubAgent({
			agentId: subAgentId,
			role: input.role,
			instructions: input.instructions,
			tools: tracedTools,
			modelId: context.subAgentModelId ?? context.modelId,
			traceRun,
			tracing: context.tracing,
			...buildSubAgentWorkspaceOptions(context),
			runtimeSkills: context.runtimeSkills,
			timeZone: context.timeZone,
			checkpointStore: context.checkpointStore,
		});

		const briefingMessage = await buildSyncSubAgentBriefing(
			context,
			input.role,
			input.briefing,
			input.artifacts,
			input.conversationContext,
		);

		const consumeResult = await withTraceRun(context, traceRun, async () => {
			const maxIterations = input.maxIterations ?? MAX_STEPS.RESEARCH;
			const persistence = await createSubAgentPersistence(context, {
				agentKind: input.role,
			});
			const stream = await subAgent.stream(briefingMessage, {
				maxIterations,
				abortSignal: context.abortSignal,
				persistence,
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			});

			return await consumeStreamWithHitl({
				agent: subAgent,
				stream,
				runId: context.runId,
				agentId: subAgentId,
				eventBus: context.eventBus,
				logger: context.logger,
				threadId: context.threadId,
				outputRedaction: context.outputRedaction,
				abortSignal: context.abortSignal,
				waitForConfirmation: context.waitForConfirmation,
				maxIterations,
				persistence,
			});
		});

		const fullText = await requireCompletedHitlText(consumeResult, 'Sync sub-agent');
		const parentResult = resolveSubAgentParentResult(fullText, consumeResult.workSummary);
		const debriefing = buildDebriefing({
			agentId: subAgentId,
			role: input.role,
			result: parentResult,
			workSummary: consumeResult.workSummary,
			startTime,
		});
		const usage = toSyncSubAgentUsage(consumeResult.usage);

		await finishTraceRun(context, traceRun, {
			outputs: {
				result: parentResult,
				fullText,
				agentId: subAgentId,
				role: input.role,
				toolCallCount: debriefing.toolCallCount,
				toolErrorCount: debriefing.toolErrorCount,
				durationMs: debriefing.durationMs,
				...(usage ? { usage } : {}),
			},
		});

		context.eventBus.publish(context.threadId, {
			type: 'agent-completed',
			runId: context.runId,
			agentId: subAgentId,
			payload: {
				role: input.role,
				result: parentResult,
			},
		});

		return {
			result: parentResult,
			toolCallCount: debriefing.toolCallCount,
			toolErrorCount: debriefing.toolErrorCount,
			durationMs: debriefing.durationMs,
			blockers: debriefing.blockers,
			...(usage ? { usage } : {}),
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		await failTraceRun(context, traceRun, error, {
			agent_id: subAgentId,
			agent_role: input.role,
		});

		context.eventBus.publish(context.threadId, {
			type: 'agent-completed',
			runId: context.runId,
			agentId: subAgentId,
			payload: {
				role: input.role,
				result: '',
				error: errorMessage,
			},
		});

		return { result: `Sub-agent error: ${errorMessage}` };
	}
}
