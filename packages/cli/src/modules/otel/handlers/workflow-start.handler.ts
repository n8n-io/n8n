import type { WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { context as otelContext, trace, type Tracer } from '@opentelemetry/api';
import { registerOtelExecutionWrapper } from 'n8n-core';

import { ATTR } from '../otel.constants';
import type { SpanHandler } from './interfaces';
import type { SpanRegistry } from '../span-registry';

@Service()
export class WorkflowStartHandler implements SpanHandler<WorkflowExecuteBeforeContext> {
	handle(ctx: WorkflowExecuteBeforeContext, spans: SpanRegistry, tracer: Tracer) {
		const span = tracer.startSpan('workflow.execute', {
			attributes: {
				[ATTR.WORKFLOW_ID]: ctx.workflow.id,
				[ATTR.WORKFLOW_VERSION_ID]: ctx.workflow.versionId,
				[ATTR.WORKFLOW_NAME]: ctx.workflow.name,
				[ATTR.WORKFLOW_NODE_COUNT]: ctx.workflow.nodes.length,
				[ATTR.EXECUTION_ID]: ctx.executionId,
			},
		});

		spans.addWorkflow(ctx.executionId, span);

		// Build a context with the new span active and store it so that:
		//  1. WorkflowEndHandler can end the span under the same context if needed.
		//  2. WorkflowExecute can propagate the context through the execution loop
		//     (via the registered wrapper) so that trace.getActiveSpan() returns this
		//     span during log writes and node executions.
		const activeCtx = trace.setSpan(otelContext.active(), span);
		spans.addWorkflowContext(ctx.executionId, activeCtx);
		registerOtelExecutionWrapper(ctx.executionId, async (fn: () => Promise<void>) =>
			otelContext.with(activeCtx, fn),
		);
	}
}
