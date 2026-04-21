import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Span } from '@opentelemetry/api';
import { context, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import {
	ATTR_EXCEPTION_MESSAGE,
	ATTR_EXCEPTION_TYPE,
	ATTR_EXCEPTION_STACKTRACE,
} from '@opentelemetry/semantic-conventions';
import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import { ATTR } from './otel.constants';
import { OtelConfig } from './otel.config';
import type { TracingContext } from './tracing-context';

const TRACER_NAME = 'n8n-workflow';
const EVICTION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const SPAN_TTL_MS = 90 * 60 * 1000; // 90 minutes

type TrackedSpan = { span: Span; createdAt: number };

@Service()
export class ExecutionLevelTracer {
	private readonly workflowSpans = new Map<string, TrackedSpan>();

	private readonly nodeSpans = new Map<string, TrackedSpan>();

	private evictionTimer: ReturnType<typeof setInterval> | undefined;

	private readonly tracer = trace.getTracer(TRACER_NAME);

	constructor(
		private readonly config: OtelConfig,
		private readonly logger: Logger,
	) {}

	// -- Workflow span lifecycle --

	startWorkflow(params: {
		executionId: string;
		tracingContext?: TracingContext;
		workflow: { id: string; name: string; versionId?: string; nodeCount: number };
	}): TracingContext | undefined {
		try {
			// Webhook: use inbound traceparent as parent. Everything else: root span.
			const parentCtx = params.tracingContext
				? propagation.extract(context.active(), params.tracingContext)
				: context.active();

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

			this.workflowSpans.set(params.executionId, { span, createdAt: Date.now() });

			const headers: Record<string, string> = {};
			propagation.inject(trace.setSpan(context.active(), span), headers);
			return headers.traceparent
				? { traceparent: headers.traceparent, tracestate: headers.tracestate }
				: undefined;
		} catch (error) {
			this.logger.error('Failed to start workflow span', {
				executionId: params.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	endWorkflow(params: {
		executionId: string;
		status: ExecutionStatus;
		mode: WorkflowExecuteMode;
		error?: unknown;
		isRetry: boolean;
		retryOf?: string;
	}): void {
		try {
			const tracked = this.workflowSpans.get(params.executionId);
			if (!tracked) return;

			const { span } = tracked;

			const attributes: Record<string, string | boolean> = {
				[ATTR.EXECUTION_MODE]: params.mode,
				[ATTR.EXECUTION_STATUS]: params.status,
				[ATTR.EXECUTION_IS_RETRY]: params.isRetry,
			};
			if (params.retryOf) {
				attributes[ATTR.EXECUTION_RETRY_OF] = params.retryOf;
			}
			span.setAttributes(attributes);

			if (['error', 'crashed'].includes(params.status)) {
				span.setStatus({ code: SpanStatusCode.ERROR });

				if (params.error) {
					span.setAttribute(ATTR.EXECUTION_ERROR_TYPE, getErrorType(params.error));
				}
			} else {
				span.setStatus({ code: SpanStatusCode.OK });
			}

			this.endDanglingNodeSpans(params.executionId);
			span.end();
			this.workflowSpans.delete(params.executionId);
		} catch (error) {
			this.logger.error('Failed to end workflow span', {
				executionId: params.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// -- Node span lifecycle --

	startNode(params: {
		executionId: string;
		node: { id: string; name: string; type: string; typeVersion: number };
	}): void {
		try {
			if (!this.config.includeNodeSpans) return;

			const workflowTracked = this.workflowSpans.get(params.executionId);
			const parentCtx = workflowTracked
				? trace.setSpan(context.active(), workflowTracked.span)
				: context.active();

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

			this.nodeSpans.set(`${params.executionId}:${params.node.name}`, {
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

	endNode(params: {
		executionId: string;
		nodeName: string;
		inputItemCount: number;
		outputItemCount: number;
		error?: { message: string; constructor: { name: string }; stack?: string };
		customAttributes?: Record<string, string>;
	}): void {
		try {
			if (!this.config.includeNodeSpans) return;

			const key = `${params.executionId}:${params.nodeName}`;
			const tracked = this.nodeSpans.get(key);
			if (!tracked) return;

			const { span } = tracked;

			span.setAttribute(ATTR.NODE_ITEMS_INPUT, params.inputItemCount);
			span.setAttribute(ATTR.NODE_ITEMS_OUTPUT, params.outputItemCount);

			if (params.customAttributes) {
				for (const [attrKey, value] of Object.entries(params.customAttributes)) {
					span.setAttribute(`n8n.node.custom.${attrKey}`, value);
				}
			}

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
			this.nodeSpans.delete(key);
		} catch (error) {
			this.logger.error('Failed to end node span', {
				executionId: params.executionId,
				nodeName: params.nodeName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// -- Outbound trace injection --

	injectTraceHeaders(
		executionId: string,
		nodeName: string | undefined,
		headers: Record<string, string>,
	): void {
		try {
			if (!this.config.injectOutbound) return;

			// Look up the most specific active span: node → workflow → no-op
			const span =
				(nodeName ? this.nodeSpans.get(`${executionId}:${nodeName}`)?.span : undefined) ??
				this.workflowSpans.get(executionId)?.span;

			if (!span) return;

			const spanCtx = trace.setSpan(context.active(), span);
			propagation.inject(spanCtx, headers);
		} catch (error) {
			this.logger.error('Failed to inject trace headers', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// -- Cleanup --

	cleanup(executionId: string): void {
		this.workflowSpans.delete(executionId);
		for (const key of this.nodeSpans.keys()) {
			if (key.startsWith(`${executionId}:`)) {
				this.nodeSpans.delete(key);
			}
		}
	}

	// -- Eviction --

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

	private evictStaleSpans(): void {
		const now = Date.now();

		for (const [key, tracked] of this.workflowSpans) {
			if (now - tracked.createdAt > SPAN_TTL_MS) {
				tracked.span.setStatus({ code: SpanStatusCode.ERROR });
				tracked.span.end();
				this.workflowSpans.delete(key);
			}
		}

		for (const [key, tracked] of this.nodeSpans) {
			if (now - tracked.createdAt > SPAN_TTL_MS) {
				tracked.span.setAttribute(ATTR.NODE_TERMINATION_REASON, 'evicted');
				tracked.span.setStatus({ code: SpanStatusCode.ERROR });
				tracked.span.end();
				this.nodeSpans.delete(key);
			}
		}
	}

	private endDanglingNodeSpans(executionId: string): void {
		for (const [key, tracked] of this.nodeSpans) {
			if (key.startsWith(`${executionId}:`)) {
				tracked.span.setAttribute(ATTR.NODE_TERMINATION_REASON, 'workflow_cancelled');
				tracked.span.setStatus({ code: SpanStatusCode.ERROR });
				tracked.span.end();
				this.nodeSpans.delete(key);
			}
		}
	}
}

function getErrorType(error: unknown): string {
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
