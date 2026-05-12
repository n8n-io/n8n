import { Logger } from '@n8n/backend-common';
import { OnLifecycleEvent } from '@n8n/decorators';
import type {
	WorkflowExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	WorkflowExecuteResumeContext,
	NodeExecuteBeforeContext,
	NodeExecuteAfterContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import type {
	IExecuteData,
	INode,
	INodeExecutionData,
	IRunExecutionData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { ExecutionLevelTracer } from './execution-level-tracer';
import { OtelConfig } from './otel.config';
import { TraceContextService } from './tracing-context';

type CachedExecution = { workflowInstance: Workflow; mode: WorkflowExecuteMode };

@Service()
export class OtelLifecycleHandler {
	private readonly executionWorkflows = new Map<string, CachedExecution>();

	constructor(
		private readonly tracer: ExecutionLevelTracer,
		private readonly traceContextService: TraceContextService,
		private readonly config: OtelConfig,
		private readonly logger: Logger,
	) {}

	@OnLifecycleEvent('workflowExecuteBefore')
	async onWorkflowStart(ctx: WorkflowExecuteBeforeContext): Promise<void> {
		this.cacheExecutionWorkflow(ctx.executionId, ctx.workflowInstance, ctx.mode);

		const parentExecutionId = ctx.executionData?.parentExecution?.executionId;
		const tracingContext = parentExecutionId
			? // This will only be set when we are a "sub-workflow"
				await this.traceContextService.get(parentExecutionId)
			: // This will return "null" if there is no traceparent header in the trigger node. (e.g. webhook)
				await this.traceContextService.get(ctx.executionId);

		const spanContext = this.tracer.startWorkflow({
			executionId: ctx.executionId,
			tracingContext,
			workflow: {
				id: ctx.workflow.id,
				name: ctx.workflow.name,
				versionId: ctx.workflow.versionId,
				nodeCount: ctx.workflow.nodes.length,
			},
		});

		// Given we have now started a "workflow" we should persist the traceparent - it will change the
		// "parent-id" part of the traceparent header when we start the `workflow`
		await this.traceContextService.persist(ctx.executionId, spanContext);
	}

	@OnLifecycleEvent('workflowExecuteResume')
	async onWorkflowResume(ctx: WorkflowExecuteResumeContext): Promise<void> {
		this.cacheExecutionWorkflow(ctx.executionId, ctx.workflowInstance, ctx.mode);

		const previousWorkflowExecution = await this.traceContextService.get(ctx.executionId);

		this.tracer.startWorkflow({
			executionId: ctx.executionId,
			linkTo: previousWorkflowExecution,
			workflow: {
				id: ctx.workflow.id,
				name: ctx.workflow.name,
				versionId: ctx.workflow.versionId,
				nodeCount: ctx.workflow.nodes.length,
			},
		});
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowEnd(ctx: WorkflowExecuteAfterContext): void {
		try {
			this.tracer.endWorkflow({
				executionId: ctx.executionId,
				status: ctx.runData.status,
				mode: ctx.runData.mode,
				error: ctx.runData.data.resultData.error,
				isRetry: ctx.runData.mode === 'retry',
				retryOf: ctx.retryOf,
			});
		} finally {
			this.executionWorkflows.delete(ctx.executionId);
		}
	}

	@OnLifecycleEvent('nodeExecuteBefore')
	onNodeStart(ctx: NodeExecuteBeforeContext): void {
		if (!this.config.includeNodeSpans) return;

		const node = ctx.workflow.nodes.find((n) => n.name === ctx.nodeName);
		if (!node) return;

		this.tracer.startNode({
			executionId: ctx.executionId,
			node,
		});
	}

	@OnLifecycleEvent('nodeExecuteAfter')
	onNodeEnd(ctx: NodeExecuteAfterContext): void {
		if (!this.config.includeNodeSpans) return;

		const node = ctx.workflow.nodes.find((n) => n.name === ctx.nodeName);
		if (!node) return;

		const fromMetadata = ctx.taskData.metadata?.tracing
			? Object.fromEntries(
					Object.entries(ctx.taskData.metadata.tracing).map(([key, value]) => [key, String(value)]),
				)
			: {};

		const fromSettings = this.evaluateUserTelemetryTags(node, ctx);

		// setMetadata({tracing:...}) values win on key collision — node authors set the semantic meaning.
		const merged = { ...fromSettings, ...fromMetadata };

		this.tracer.endNode({
			executionId: ctx.executionId,
			node,
			inputItemCount: countInputItems(ctx),
			outputItemCount: countOutputItems(ctx.taskData.data),
			error: ctx.taskData.error ?? undefined,
			customAttributes: Object.keys(merged).length ? merged : undefined,
		});
	}

	private cacheExecutionWorkflow(
		executionId: string,
		workflowInstance: Workflow | undefined,
		mode: WorkflowExecuteMode,
	): void {
		if (!workflowInstance) return;
		this.executionWorkflows.set(executionId, { workflowInstance, mode });
	}

	private evaluateUserTelemetryTags(
		node: INode,
		ctx: NodeExecuteAfterContext,
	): Record<string, string> {
		const tags = node.customTelemetryTags?.tag;
		if (!tags || tags.length === 0) return {};

		const cached = this.executionWorkflows.get(ctx.executionId);
		if (!cached) return {};

		const { workflowInstance, mode } = cached;
		const runExecutionData = ctx.executionData;
		const runs = runExecutionData.resultData.runData[node.name] ?? [];
		const runIndex = Math.max(runs.length - 1, 0);
		const itemIndex = 0;

		const connectionInputData = getConnectionInputData(ctx, runExecutionData);
		const executeData: IExecuteData = {
			data: { main: [connectionInputData] },
			node,
			source: null,
		};
		const additionalKeys = {
			$execution: {
				id: ctx.executionId,
				mode: mode === 'manual' ? ('test' as const) : ('production' as const),
				resumeUrl: '',
				resumeFormUrl: '',
			},
		};

		const result: Record<string, string> = {};
		for (const tag of tags) {
			const key = tag.key?.trim();
			if (!key) continue;

			try {
				const evaluated = workflowInstance.expression.getParameterValue(
					tag.value,
					runExecutionData,
					runIndex,
					itemIndex,
					node.name,
					connectionInputData,
					mode,
					additionalKeys,
					executeData,
					false,
					{},
				);
				if (evaluated === undefined || evaluated === null) continue;
				result[key] = String(evaluated);
			} catch (error) {
				this.logger.warn('Failed to evaluate customTelemetryTags expression', {
					executionId: ctx.executionId,
					nodeName: node.name,
					tagKey: key,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return result;
	}
}

function getConnectionInputData(
	ctx: NodeExecuteAfterContext,
	runExecutionData: IRunExecutionData,
): INodeExecutionData[] {
	const items: INodeExecutionData[] = [];
	for (const source of ctx.taskData.source ?? []) {
		if (!source) continue;
		const sourceRuns = runExecutionData.resultData.runData[source.previousNode];
		if (!sourceRuns) continue;
		const run = sourceRuns[source.previousNodeRun ?? 0];
		if (!run?.data?.main) continue;
		const branch = run.data.main[source.previousNodeOutput ?? 0];
		if (!branch) continue;
		items.push(...branch);
	}
	return items;
}

export function countOutputItems(data: NodeExecuteAfterContext['taskData']['data']): number {
	if (!data?.main) return 0;
	return data.main.reduce((sum, branch) => sum + (branch?.length ?? 0), 0);
}

export function countInputItems(ctx: NodeExecuteAfterContext): number {
	const runData = ctx.executionData.resultData.runData;
	let total = 0;

	for (const source of ctx.taskData.source) {
		if (!source) continue;
		const sourceRuns = runData[source.previousNode];
		if (!sourceRuns) continue;

		const run = sourceRuns[source.previousNodeRun ?? 0];
		if (!run?.data?.main) continue;

		const branch = run.data.main[source.previousNodeOutput ?? 0];
		total += branch?.length ?? 0;
	}

	return total;
}
