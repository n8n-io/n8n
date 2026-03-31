import type { NodeExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { SpanStatusCode } from '@opentelemetry/api';
import {
	ATTR_EXCEPTION_MESSAGE,
	ATTR_EXCEPTION_TYPE,
	ATTR_EXCEPTION_STACKTRACE,
} from '@opentelemetry/semantic-conventions';

import { ATTR } from '../otel.constants';
import type { SpanHandler } from './interfaces';
import type { SpanRegistry } from '../span-registry';

@Service()
export class NodeEndHandler implements SpanHandler<NodeExecuteAfterContext> {
	handle(ctx: NodeExecuteAfterContext, spans: SpanRegistry) {
		const node = ctx.workflow.nodes.find((n) => n.name === ctx.nodeName);
		if (!node) return;

		const span = spans.removeNode(ctx.executionId, node.id);
		if (!span) return;

		const outputItems = this.countItems(ctx.taskData.data);
		span.setAttribute(ATTR.NODE_ITEMS_OUTPUT, outputItems);

		const inputItems = this.countInputItems(ctx);
		span.setAttribute(ATTR.NODE_ITEMS_INPUT, inputItems);

		if (ctx.taskData.metadata?.tracing) {
			for (const [key, value] of Object.entries(ctx.taskData.metadata.tracing)) {
				span.setAttribute(`n8n.node.custom.${key}`, value);
			}
		}

		if (ctx.taskData.error) {
			span.setStatus({ code: SpanStatusCode.ERROR });
			span.addEvent('exception', {
				[ATTR_EXCEPTION_MESSAGE]: ctx.taskData.error.message,
				[ATTR_EXCEPTION_TYPE]: ctx.taskData.error.constructor.name,
				[ATTR_EXCEPTION_STACKTRACE]: ctx.taskData.error.stack,
			});
		} else {
			span.setStatus({ code: SpanStatusCode.OK });
		}

		span.end();
	}

	private countItems(data: NodeExecuteAfterContext['taskData']['data']): number {
		if (!data?.main) return 0;
		return data.main.reduce((sum, branch) => sum + (branch?.length ?? 0), 0);
	}

	private countInputItems(ctx: NodeExecuteAfterContext): number {
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
}
