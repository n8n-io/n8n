import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { SpanStatusCode } from '@opentelemetry/api';

import { ATTR } from '../otel.constants';
import type { SpanHandler } from './interfaces';
import type { SpanRegistry } from '../span-registry';

@Service()
export class WorkflowEndHandler implements SpanHandler<WorkflowExecuteAfterContext> {
	handle(ctx: WorkflowExecuteAfterContext, spans: SpanRegistry) {
		const span = spans.removeWorkflow(ctx.executionId);
		if (!span) return;

		const attributes: Record<string, string | boolean> = {
			[ATTR.EXECUTION_MODE]: ctx.runData.mode,
			[ATTR.EXECUTION_STATUS]: ctx.runData.status,
			[ATTR.EXECUTION_IS_RETRY]: ctx.runData.mode === 'retry',
		};
		if (ctx.retryOf) {
			attributes[ATTR.EXECUTION_RETRY_OF] = ctx.retryOf;
		}
		span.setAttributes(attributes);

		if (['error', 'crashed'].includes(ctx.runData.status)) {
			span.setStatus({ code: SpanStatusCode.ERROR });

			const error = ctx.runData.data.resultData.error;
			if (error) {
				span.setAttribute(ATTR.EXECUTION_ERROR_TYPE, error.constructor.name);
			}
		} else {
			span.setStatus({ code: SpanStatusCode.OK });
		}

		span.end();
		spans.cleanup(ctx.executionId);
	}
}
