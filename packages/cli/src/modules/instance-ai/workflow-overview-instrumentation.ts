import type { WorkflowOverview } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	createInternalOperationTraceContext,
	generateWorkflowOverview,
	releaseTraceClient,
	type GenerateWorkflowOverviewOptions,
	type ModelConfig,
	type ServiceProxyConfig,
	type WorkflowOverviewBundle,
	type WorkflowOverviewUsage,
} from '@n8n/instance-ai';
import { nanoid } from 'nanoid';

export interface WorkflowOverviewGenerationContext {
	/** Trace-grouping key: the threadId, or a synthetic key for on-demand generations. */
	conversationKey: string;
	userId: string;
	modelId: ModelConfig;
	/** Cost/trace attribution: 't1-user-message' | 't2-qa-answers' | 't3-plan-review' | 'on-demand'. */
	source: string;
	/** Routes traces through the AI service proxy when the instance uses it. */
	proxyConfig?: ServiceProxyConfig;
	logger: Logger;
}

/**
 * Run one workflow-overview generation wrapped in a LangSmith
 * internal-operation trace (`operation_name: 'workflow_overview'`) with token
 * usage attached — the same pattern as thread-title refinement. When tracing
 * is disabled the call still runs and the outcome lands in a debug log, so
 * cost stays observable locally without LangSmith.
 */
export async function generateWorkflowOverviewTraced(
	ctx: WorkflowOverviewGenerationContext,
	bundle: WorkflowOverviewBundle,
	options: GenerateWorkflowOverviewOptions,
): Promise<WorkflowOverview | null> {
	const startedAt = Date.now();
	let usage: WorkflowOverviewUsage | undefined;
	const wrapped: GenerateWorkflowOverviewOptions = {
		...options,
		onUsage: (report) => {
			usage = report;
			options.onUsage?.(report);
		},
	};

	const logOutcome = (overview: WorkflowOverview | null) => {
		ctx.logger.debug('Workflow overview generation finished', {
			source: ctx.source,
			conversationKey: ctx.conversationKey,
			generated: overview !== null,
			inputTokens: usage?.inputTokens,
			outputTokens: usage?.outputTokens,
			totalTokens: usage?.totalTokens,
			durationMs: Date.now() - startedAt,
		});
	};

	const tracing = await createInternalOperationTraceContext({
		threadId: ctx.conversationKey,
		conversationId: ctx.conversationKey,
		runId: `overview-${nanoid()}`,
		userId: ctx.userId,
		modelId: ctx.modelId,
		operationName: 'workflow_overview',
		input: { source: ctx.source },
		proxyConfig: ctx.proxyConfig,
		metadata: { operation_name: 'workflow_overview', source: ctx.source },
	});

	if (!tracing) {
		// Distinguishes "flag off / gate failed / init threw" from "traced but not visible in LangSmith".
		ctx.logger.debug('Workflow overview tracing inactive; generating untraced', {
			source: ctx.source,
			internalFlag: process.env.N8N_INSTANCE_AI_TRACE_INTERNAL,
		});
		const overview = await generateWorkflowOverview(ctx.modelId, bundle, wrapped);
		logOutcome(overview);
		return overview;
	}

	ctx.logger.debug('Workflow overview tracing active', {
		source: ctx.source,
		project: tracing.projectName,
		traceId: tracing.rootRun.traceId,
	});

	const telemetry = tracing.getTelemetry?.({
		agentRole: 'workflow_overview',
		functionId: 'instance-ai.workflow-overview',
		executionMode: 'internal',
		metadata: { operation_name: 'workflow_overview' },
	});
	if (telemetry) wrapped.telemetry = telemetry;

	try {
		return await tracing.withActiveSpan(tracing.rootRun, async () => {
			const overview = await generateWorkflowOverview(ctx.modelId, bundle, wrapped);
			await tracing.finishRun(tracing.rootRun, {
				outputs: {
					generated: overview !== null,
					...(overview ? { overview } : {}),
					...(usage ? { usage } : {}),
				},
				metadata: {
					final_status: overview !== null ? 'completed' : 'skipped',
					source: ctx.source,
				},
			});
			logOutcome(overview);
			return overview;
		});
	} finally {
		releaseTraceClient(tracing.rootRun.traceId);
	}
}
