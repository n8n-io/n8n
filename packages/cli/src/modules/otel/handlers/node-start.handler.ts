import type { NodeExecuteBeforeContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { context, trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';

import { ATTR } from '../otel.constants';
import type { SpanHandler } from './interfaces';
import type { SpanRegistry } from '../span-registry';

@Service()
export class NodeStartHandler implements SpanHandler<NodeExecuteBeforeContext> {
	handle(ctx: NodeExecuteBeforeContext, spans: SpanRegistry, tracer: Tracer) {
		const node = ctx.workflow.nodes.find((n) => n.name === ctx.nodeName);
		if (!node) return;

		const workflowSpan = spans.getWorkflow(ctx.executionId);
		const parentCtx = workflowSpan
			? trace.setSpan(context.active(), workflowSpan)
			: context.active();

		const span = tracer.startSpan(
			'node.execute',
			{
				attributes: {
					[ATTR.NODE_ID]: node.id,
					[ATTR.NODE_NAME]: node.name,
					[ATTR.NODE_TYPE]: node.type,
					[ATTR.NODE_TYPE_VERSION]: node.typeVersion,
				},
			},
			parentCtx,
		);

		spans.addNode(ctx.executionId, node.id, span);
	}
}
