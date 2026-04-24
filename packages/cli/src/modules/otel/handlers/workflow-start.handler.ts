import type { WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Tracer } from '@opentelemetry/api';

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
	}
}
