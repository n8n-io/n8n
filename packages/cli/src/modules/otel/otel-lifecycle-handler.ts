import { Logger } from '@n8n/backend-common';
import { OnLifecycleEvent } from '@n8n/decorators';
import type {
	WorkflowExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	NodeExecuteBeforeContext,
	NodeExecuteAfterContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';

import { ExecutionLevelTracer } from './execution-level-tracer';
import { OtelConfig } from './otel.config';
import { TraceContextService } from './tracing-context';

@Service()
export class OtelLifecycleHandler {
	constructor(
		private readonly tracer: ExecutionLevelTracer,
		private readonly traceContextService: TraceContextService,
		private readonly config: OtelConfig,
		private readonly logger: Logger,
	) {}

	@OnLifecycleEvent('workflowExecuteBefore')
	async onWorkflowStart(ctx: WorkflowExecuteBeforeContext): Promise<void> {
		try {
			// For webhooks: tracingContext was persisted at creation from HTTP headers.
			// For everything else: null — workflow.execute becomes the root span.
			const tracingContext = await this.traceContextService.get(ctx.executionId);

			this.tracer.startWorkflow({
				executionId: ctx.executionId,
				tracingContext: tracingContext ?? undefined,
				workflow: {
					id: ctx.workflow.id,
					name: ctx.workflow.name,
					versionId: ctx.workflow.versionId,
					nodeCount: ctx.workflow.nodes.length,
				},
			});

			// For root spans (non-webhook), persist the OTEL-generated traceparent
			// so the trace is findable via the execution entity.
			if (!tracingContext) {
				const generated = this.tracer.getWorkflowTraceparent(ctx.executionId);
				if (generated) {
					await this.traceContextService.seed(ctx.executionId, generated);
				}
			}
		} catch (error) {
			this.logger.error('Failed to handle workflow start for OTEL', {
				executionId: ctx.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
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
		} catch (error) {
			this.logger.error('Failed to handle workflow end for OTEL', {
				executionId: ctx.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	@OnLifecycleEvent('nodeExecuteBefore')
	onNodeStart(ctx: NodeExecuteBeforeContext): void {
		if (!this.config.includeNodeSpans) return;

		try {
			const node = ctx.workflow.nodes.find((n) => n.name === ctx.nodeName);
			if (!node) return;

			this.tracer.startNode({
				executionId: ctx.executionId,
				node: {
					id: node.id,
					name: node.name,
					type: node.type,
					typeVersion: node.typeVersion,
				},
			});
		} catch (error) {
			this.logger.error('Failed to handle node start for OTEL', {
				executionId: ctx.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	@OnLifecycleEvent('nodeExecuteAfter')
	onNodeEnd(ctx: NodeExecuteAfterContext): void {
		if (!this.config.includeNodeSpans) return;

		try {
			const customAttributes = ctx.taskData.metadata?.tracing
				? Object.fromEntries(
						Object.entries(ctx.taskData.metadata.tracing).map(([key, value]) => [
							key,
							String(value),
						]),
					)
				: undefined;

			this.tracer.endNode({
				executionId: ctx.executionId,
				nodeName: ctx.nodeName,
				inputItemCount: countInputItems(ctx),
				outputItemCount: countOutputItems(ctx.taskData.data),
				error: ctx.taskData.error ?? undefined,
				customAttributes,
			});
		} catch (error) {
			this.logger.error('Failed to handle node end for OTEL', {
				executionId: ctx.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

function countOutputItems(data: NodeExecuteAfterContext['taskData']['data']): number {
	if (!data?.main) return 0;
	return data.main.reduce((sum, branch) => sum + (branch?.length ?? 0), 0);
}

function countInputItems(ctx: NodeExecuteAfterContext): number {
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
