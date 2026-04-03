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
				span.setAttribute(ATTR.EXECUTION_ERROR_TYPE, this.getErrorType(error));
			}
		} else {
			span.setStatus({ code: SpanStatusCode.OK });
		}

		span.end();
		this.endDanglingNodeSpans(ctx.executionId, spans);
		spans.cleanup(ctx.executionId);
	}

	private endDanglingNodeSpans(executionId: string, spans: SpanRegistry) {
		for (const span of spans.findUnendedNodeSpans(executionId)) {
			span.setAttribute(ATTR.NODE_TERMINATION_REASON, 'workflow_cancelled');
			span.setStatus({ code: SpanStatusCode.ERROR });
			span.end();
		}
	}

	private getErrorType(error: unknown): string {
		if (!isRecord(error)) return 'UnknownError';

		const errorName = error.name;
		if (typeof errorName === 'string' && errorName.trim() !== '') return errorName;

		const constructor = error.constructor;
		if (typeof constructor !== 'function') return 'UnknownError';

		const constructorName = constructor.name;
		if (
			typeof constructorName === 'string' &&
			constructorName.trim() !== '' &&
			constructorName !== 'Object'
		) {
			return constructorName;
		}

		return 'UnknownError';
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
