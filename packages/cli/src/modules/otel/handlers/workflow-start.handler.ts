import type { WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { context, trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';

import { ATTR } from '../otel.constants';
import type { SpanHandler } from './interfaces';
import type { SpanRegistry } from '../span-registry';

@Service()
export class WorkflowStartHandler implements SpanHandler<WorkflowExecuteBeforeContext> {
	handle(ctx: WorkflowExecuteBeforeContext, spans: SpanRegistry, tracer: Tracer) {
		// For sub-workflow executions invoked via the Execute Workflow node,
		// anchor the child workflow span to the parent workflow span so both
		// executions share a single trace with a correct parent/child chain.
		const parentSpan = ctx.parentExecution
			? spans.getWorkflow(ctx.parentExecution.executionId)
			: undefined;
		const parentCtx = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();

		const span = tracer.startSpan(
			'workflow.execute',
			{
				attributes: {
					[ATTR.WORKFLOW_ID]: ctx.workflow.id,
					[ATTR.WORKFLOW_VERSION_ID]: ctx.workflow.versionId,
					[ATTR.WORKFLOW_NAME]: ctx.workflow.name,
					[ATTR.WORKFLOW_NODE_COUNT]: ctx.workflow.nodes.length,
					[ATTR.EXECUTION_ID]: ctx.executionId,
				},
			},
			parentCtx,
		);

		spans.addWorkflow(ctx.executionId, span);
	}
}
