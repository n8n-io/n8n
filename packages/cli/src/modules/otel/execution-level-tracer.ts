import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Span } from '@opentelemetry/api';
import { context, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import {
	ATTR_EXCEPTION_MESSAGE,
	ATTR_EXCEPTION_TYPE,
	ATTR_EXCEPTION_STACKTRACE,
} from '@opentelemetry/semantic-conventions';
import type { ExecutionStatus } from 'n8n-workflow';

import { ATTR } from './otel.constants';
import { OtelConfig } from './otel.config';
import type { TracingContext } from './tracing-context';
import type {
	StartWorkflowParams,
	EndWorkflowParams,
	StartNodeParams,
	EndNodeParams,
} from './execution-level-tracer.types';

const TRACER_NAME = 'n8n-workflow';
const EVICTION_INTERVAL_MS = 10 * 60 * 1000;
const SPAN_TTL_MS = 90 * 60 * 1000;
function isError(status: ExecutionStatus): boolean {
	return status === 'error' || status === 'crashed';
}

type TrackedSpan = { span: Span; createdAt: number };

@Service()
export class ExecutionLevelTracer {
	private readonly activeWorkflowSpans = new Map<string, TrackedSpan>();
	private readonly activeNodeSpans = new Map<string, TrackedSpan>();
	private readonly tracer = trace.getTracer(TRACER_NAME);

	private evictionTimer: ReturnType<typeof setInterval> | undefined;

	constructor(
		private readonly config: OtelConfig,
		private readonly logger: Logger,
	) {}

	startWorkflow(params: StartWorkflowParams): TracingContext | undefined {
		try {
			const parentCtx = this.findParentContext(params.tracingContext);
			const span = this.tracer.startSpan(
				'workflow.execute',
				{
					attributes: {
						[ATTR.WORKFLOW_ID]: params.workflow.id,
						[ATTR.WORKFLOW_NAME]: params.workflow.name,
						[ATTR.WORKFLOW_VERSION_ID]: params.workflow.versionId ?? '',
						[ATTR.WORKFLOW_NODE_COUNT]: params.workflow.nodeCount,
						[ATTR.EXECUTION_ID]: params.executionId,
					},
				},
				parentCtx,
			);

			this.activeWorkflowSpans.set(params.executionId, { span, createdAt: Date.now() });
			return toTracingParentContext(span);
		} catch (error) {
			this.logger.error('Failed to start workflow span', {
				executionId: params.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	endWorkflow(params: EndWorkflowParams): void {
		try {
			const tracked = this.activeWorkflowSpans.get(params.executionId);
			if (!tracked) return;

			const { span } = tracked;
			span.setAttributes({
				[ATTR.EXECUTION_MODE]: params.mode,
				[ATTR.EXECUTION_STATUS]: params.status,
				[ATTR.EXECUTION_IS_RETRY]: params.isRetry,
				...(params.retryOf ? { [ATTR.EXECUTION_RETRY_OF]: params.retryOf } : {}),
			});

			span.setStatus({ code: isError(params.status) ? SpanStatusCode.ERROR : SpanStatusCode.OK });
			if (isError(params.status) && params.error) {
				span.setAttribute(ATTR.EXECUTION_ERROR_TYPE, getErrorType(params.error));
			}

			this.endDanglingNodeSpans(params.executionId);
			span.end();
			this.activeWorkflowSpans.delete(params.executionId);
		} catch (error) {
			this.logger.error('Failed to end workflow span', {
				executionId: params.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	startNode(params: StartNodeParams): void {
		try {
			if (!this.config.includeNodeSpans) return;

			const parentCtx = this.resolveWorkflowSpanContext(params.executionId);
			const span = this.tracer.startSpan(
				'node.execute',
				{
					attributes: {
						[ATTR.NODE_ID]: params.node.id,
						[ATTR.NODE_NAME]: params.node.name,
						[ATTR.NODE_TYPE]: params.node.type,
						[ATTR.NODE_TYPE_VERSION]: params.node.typeVersion,
					},
				},
				parentCtx,
			);

			this.activeNodeSpans.set(nodeSpanKey(params.executionId, params.node.name), {
				span,
				createdAt: Date.now(),
			});
		} catch (error) {
			this.logger.error('Failed to start node span', {
				executionId: params.executionId,
				nodeName: params.node.name,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	endNode(params: EndNodeParams): void {
		try {
			if (!this.config.includeNodeSpans) return;

			const key = nodeSpanKey(params.executionId, params.nodeName);
			const tracked = this.activeNodeSpans.get(key);
			if (!tracked) return;

			const { span } = tracked;
			span.setAttributes(buildNodeEndAttributes(params));

			if (params.error) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				span.addEvent('exception', {
					[ATTR_EXCEPTION_MESSAGE]: params.error.message,
					[ATTR_EXCEPTION_TYPE]: params.error.constructor.name,
					[ATTR_EXCEPTION_STACKTRACE]: params.error.stack,
				});
			} else {
				span.setStatus({ code: SpanStatusCode.OK });
			}

			span.end();
			this.activeNodeSpans.delete(key);
		} catch (error) {
			this.logger.error('Failed to end node span', {
				executionId: params.executionId,
				nodeName: params.nodeName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	injectTraceHeaders(
		executionId: string,
		nodeName: string | undefined,
		headers: Record<string, string>,
	): void {
		try {
			if (!this.config.injectOutbound) return;

			const span = this.findMostSpecificSpan(executionId, nodeName);
			if (!span) return;

			propagation.inject(trace.setSpan(context.active(), span), headers);
		} catch (error) {
			this.logger.error('Failed to inject trace headers', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	startEvictionTimer(): void {
		this.evictionTimer = setInterval(() => this.evictStaleSpans(), EVICTION_INTERVAL_MS);
		this.evictionTimer.unref();
	}

	stopEvictionTimer(): void {
		if (this.evictionTimer) {
			clearInterval(this.evictionTimer);
			this.evictionTimer = undefined;
		}
	}

	private findParentContext(tracingContext?: TracingContext) {
		return tracingContext
			? propagation.extract(context.active(), tracingContext)
			: context.active();
	}

	private resolveWorkflowSpanContext(executionId: string) {
		const tracked = this.activeWorkflowSpans.get(executionId);
		return tracked ? trace.setSpan(context.active(), tracked.span) : context.active();
	}

	private findMostSpecificSpan(executionId: string, nodeName?: string): Span | undefined {
		return (
			(nodeName ? this.activeNodeSpans.get(nodeSpanKey(executionId, nodeName))?.span : undefined) ??
			this.activeWorkflowSpans.get(executionId)?.span
		);
	}

	private evictStaleSpans(): void {
		const now = Date.now();

		for (const [key, tracked] of this.activeWorkflowSpans) {
			if (now - tracked.createdAt > SPAN_TTL_MS) {
				terminateSpan(tracked.span, 'evicted');
				this.activeWorkflowSpans.delete(key);
			}
		}

		for (const [key, tracked] of this.activeNodeSpans) {
			if (now - tracked.createdAt > SPAN_TTL_MS) {
				terminateSpan(tracked.span, 'evicted');
				this.activeNodeSpans.delete(key);
			}
		}
	}

	private endDanglingNodeSpans(executionId: string): void {
		const prefix = `${executionId}:`;
		for (const [key, tracked] of this.activeNodeSpans) {
			if (key.startsWith(prefix)) {
				terminateSpan(tracked.span, 'workflow_cancelled');
				this.activeNodeSpans.delete(key);
			}
		}
	}
}

function buildNodeEndAttributes(params: EndNodeParams): Record<string, string | number> {
	const attrs: Record<string, string | number> = {
		[ATTR.NODE_ITEMS_INPUT]: params.inputItemCount,
		[ATTR.NODE_ITEMS_OUTPUT]: params.outputItemCount,
	};

	if (params.customAttributes) {
		for (const [key, value] of Object.entries(params.customAttributes)) {
			attrs[`n8n.node.custom.${key}`] = value;
		}
	}

	return attrs;
}

function toTracingParentContext(span: Span): TracingContext | undefined {
	const carrier: Record<string, string> = {};
	propagation.inject(trace.setSpan(context.active(), span), carrier);
	return carrier.traceparent
		? { traceparent: carrier.traceparent, tracestate: carrier.tracestate }
		: undefined;
}

function nodeSpanKey(executionId: string, nodeName: string): string {
	return `${executionId}:${nodeName}`;
}

function terminateSpan(span: Span, reason: string): void {
	span.setAttribute(ATTR.NODE_TERMINATION_REASON, reason);
	span.setStatus({ code: SpanStatusCode.ERROR });
	span.end();
}

function getErrorType(error: unknown): string {
	if (typeof error !== 'object' || error === null) return 'UnknownError';

	const record = error as Record<string, unknown>;

	const name = record.name;
	if (typeof name === 'string' && name.trim() !== '') return name;

	const ctor = record.constructor;
	if (typeof ctor === 'function' && ctor.name && ctor.name !== 'Object') return ctor.name;

	return 'UnknownError';
}
