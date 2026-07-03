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
import { createSubAgent, SUB_AGENT_PROTOCOL } from '../../agent/sub-agent-factory';
import { MAX_STEPS } from '../../constants/max-steps';
import { consumeStreamWithHitl, requireCompletedHitlText } from '../../stream/consume-with-hitl';
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

async function buildSyncSubAgentBriefing(
	context: OrchestrationContext,
	role: string,
	briefing: string,
	artifacts?: unknown,
	conversationContext?: string,
): Promise<string> {
	const structured = await buildSubAgentBriefing({
		task: briefing,
		conversationContext,
		artifacts: artifacts as Record<string, unknown> | undefined,
		iteration: context.iterationLog
			? { log: context.iterationLog, threadId: context.threadId, taskKey: `sync-sub-agent:${role}` }
			: undefined,
		runningTasks: context.getRunningTaskSummaries?.(),
	});

	return `${structured}\n\nRemember: ${SUB_AGENT_PROTOCOL}`;
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
}

export interface SyncSubAgentOutput {
	result: string;
	toolCallCount?: number;
	toolErrorCount?: number;
	durationMs?: number;
	blockers?: string[];
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
			kind: 'delegate',
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
			const maxIterations = MAX_STEPS.RESEARCH;
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

		const resultText = await requireCompletedHitlText(consumeResult, 'Sync sub-agent');
		const debriefing = buildDebriefing({
			agentId: subAgentId,
			role: input.role,
			result: resultText,
			workSummary: consumeResult.workSummary,
			startTime,
		});

		await finishTraceRun(context, traceRun, {
			outputs: {
				result: resultText,
				agentId: subAgentId,
				role: input.role,
				toolCallCount: debriefing.toolCallCount,
				toolErrorCount: debriefing.toolErrorCount,
				durationMs: debriefing.durationMs,
			},
		});

		context.eventBus.publish(context.threadId, {
			type: 'agent-completed',
			runId: context.runId,
			agentId: subAgentId,
			payload: {
				role: input.role,
				result: resultText,
			},
		});

		return {
			result: resultText,
			toolCallCount: debriefing.toolCallCount,
			toolErrorCount: debriefing.toolErrorCount,
			durationMs: debriefing.durationMs,
			blockers: debriefing.blockers,
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
