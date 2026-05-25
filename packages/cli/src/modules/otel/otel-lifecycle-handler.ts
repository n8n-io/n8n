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

import { ExecutionLevelTracer } from './execution-level-tracer';
import { OtelConfig } from './otel.config';
import { TraceContextService } from './tracing-context';
import { OwnershipService } from '../../services/ownership.service';

@Service()
export class OtelLifecycleHandler {
	constructor(
		private readonly tracer: ExecutionLevelTracer,
		private readonly traceContextService: TraceContextService,
		private readonly config: OtelConfig,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {}

	@OnLifecycleEvent('workflowExecuteBefore')
	async onWorkflowStart(ctx: WorkflowExecuteBeforeContext): Promise<void> {
		const parentExecutionId = ctx.executionData?.parentExecution?.executionId;
		const tracingContext = parentExecutionId
			? // This will only be set when we are a "sub-workflow"
				await this.traceContextService.get(parentExecutionId)
			: // This will return "null" if there is no traceparent header in the trigger node. (e.g. webhook)
				await this.traceContextService.get(ctx.executionId);

		const project = await this.ownershipService
			.getWorkflowProjectCached(ctx.workflow.id)
			.catch((error: unknown) => {
				this.logger.warn('Failed to fetch project for OTEL span', {
					workflowId: ctx.workflow.id,
					executionId: ctx.executionId,
					error: error instanceof Error ? error.message : String(error),
				});
				return undefined;
			});

		const spanContext = this.tracer.startWorkflow({
			executionId: ctx.executionId,
			tracingContext,
			project: project
				? {
						id: project.id,
						customAttributes: buildProjectCustomAttributes(project.customTelemetryTags),
					}
				: undefined,
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
		const previousWorkflowExecution = await this.traceContextService.get(ctx.executionId);

		const project = await this.ownershipService
			.getWorkflowProjectCached(ctx.workflow.id)
			.catch((error: unknown) => {
				this.logger.warn('Failed to fetch project for OTEL span', {
					workflowId: ctx.workflow.id,
					executionId: ctx.executionId,
					error: error instanceof Error ? error.message : String(error),
				});
				return undefined;
			});

		this.tracer.startWorkflow({
			executionId: ctx.executionId,
			linkTo: previousWorkflowExecution,
			project: project
				? {
						id: project.id,
						customAttributes: buildProjectCustomAttributes(project.customTelemetryTags),
					}
				: undefined,
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
		this.tracer.endWorkflow({
			executionId: ctx.executionId,
			status: ctx.runData.status,
			mode: ctx.runData.mode,
			error: ctx.runData.data.resultData.error,
			isRetry: ctx.runData.mode === 'retry',
			retryOf: ctx.retryOf,
		});
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

		const customAttributes = ctx.taskData.metadata?.tracing
			? Object.fromEntries(
					Object.entries(ctx.taskData.metadata.tracing).map(([key, value]) => [key, String(value)]),
				)
			: undefined;

		this.tracer.endNode({
			executionId: ctx.executionId,
			node,
			inputItemCount: countInputItems(ctx),
			outputItemCount: countOutputItems(ctx.taskData.data),
			error: ctx.taskData.error ?? undefined,
			customAttributes,
		});
	}
}

function buildProjectCustomAttributes(
	tags: Array<{ key: string; value: string }>,
): Record<string, string> | undefined {
	if (!tags?.length) return undefined;
	const attrs: Record<string, string> = {};
	for (const { key, value } of tags) {
		attrs[key] = value;
	}
	return attrs;
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
