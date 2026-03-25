import { SpanStatusCode } from '@opentelemetry/api';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';

import { ATTR } from '../otel.constants';
import type { SpanHandler } from './interfaces';
import type { SpanRegistry } from '../span-registry';

export class WorkflowEndHandler implements SpanHandler<WorkflowExecuteAfterContext> {
	handle(ctx: WorkflowExecuteAfterContext, spans: SpanRegistry) {
		const span = spans.removeWorkflow(ctx.executionId);
		if (!span) return;

		span.setAttributes({
			[ATTR.EXECUTION_MODE]: ctx.runData.mode,
			[ATTR.EXECUTION_STATUS]: ctx.runData.status,
			[ATTR.EXECUTION_IS_RETRY]: ctx.runData.mode === 'retry',
		});

		if (ctx.runData.status === 'error' || ctx.runData.status === 'crashed') {
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
