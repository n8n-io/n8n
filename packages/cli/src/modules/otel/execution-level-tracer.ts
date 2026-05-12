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

import type {
	StartWorkflowParams,
	EndWorkflowParams,
	StartNodeParams,
	EndNodeParams,
} from './execution-level-tracer.types';
import { OtelConfig } from './otel.config';
import { ATTR } from './otel.constants';
import type { TracingContext } from './tracing-context';

const TRACER_NAME = 'n8n-workflow';
function isError(status: ExecutionStatus): boolean {
	return status === 'error' || status === 'crashed';
}

type TrackedSpan = { span: Span };

@Service()
export class ExecutionLevelTracer {
	private readonly activeWorkflowSpans = new Map<string, TrackedSpan>();
	private readonly activeNodeSpansByExecutionId = new Map<string, Map<string, TrackedSpan>>();
	private readonly tracer = trace.getTracer(TRACER_NAME);

	constructor(
		private readonly config: OtelConfig,
		private readonly logger: Logger,
	) {}

	startWorkflow(params: StartWorkflowParams) {
		try {
			const parentCtx = this.parseTraceParentHeaders(params.tracingContext);
			const links = this.buildContinuationLinks(params.linkTo);
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
					links,
				},
				parentCtx,
			);

			this.activeWorkflowSpans.set(params.executionId, { span });
			return toTracingParentContext(span);
		} catch (error) {
			this.logger.warn('Failed to start workflow span', {
				executionId: params.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
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

			//	We don't expect any to be open but we should close any children still running
			this.endDanglingNodeSpans(params.executionId);
			span.end();
		} catch (error) {
			this.logger.warn('Failed to end workflow span', {
				executionId: params.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		} finally {
			this.activeWorkflowSpans.delete(params.executionId);
		}
	}

	startNode(params: StartNodeParams): void {
		try {
			//	We should always have the node running in a workflow so parentCtx shuold never be null
			const parentCtx = this.findWorkflowSpanContext(params.executionId);

			if (!parentCtx) {
				this.logger.warn(
					'Trying to start a node without a pre-existing parent workflow trace - ignoring',
				);
				return;
			}

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

			let executionNodes = this.activeNodeSpansByExecutionId.get(params.executionId);

			if (!executionNodes) {
				executionNodes = new Map();
				this.activeNodeSpansByExecutionId.set(params.executionId, executionNodes);
			}

			// Keyed by node name — names are unique within a workflow and this is what
			// the outbound header injection path passes (see `findMostSpecificSpan`).
			executionNodes.set(params.node.name, { span });
		} catch (error) {
			this.logger.warn('Failed to start node span', {
				executionId: params.executionId,
				nodeName: params.node.name,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	endNode(params: EndNodeParams): void {
		try {
			const executionNodes = this.activeNodeSpansByExecutionId.get(params.executionId);
			const nodeStart = executionNodes?.get(params.node.name);
			if (!nodeStart) return;

			const { span: activeNodeSpan } = nodeStart;
			activeNodeSpan.setAttributes(buildNodeEndAttributes(params));
			activeNodeSpan.setStatus({ code: SpanStatusCode.OK });

			if (params.error) {
				activeNodeSpan.setStatus({ code: SpanStatusCode.ERROR });
				activeNodeSpan.addEvent('exception', {
					[ATTR_EXCEPTION_MESSAGE]: params.error.message,
					[ATTR_EXCEPTION_TYPE]: params.error.constructor.name,
					[ATTR_EXCEPTION_STACKTRACE]: params.error.stack,
				});
			}

			activeNodeSpan.end();
			executionNodes?.delete(params.node.name);
		} catch (error) {
			this.logger.warn('Failed to end node span', {
				executionId: params.executionId,
				nodeName: params.node.name,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
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
			this.logger.warn('Failed to inject trace headers', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private parseTraceParentHeaders(tracingContext?: TracingContext) {
		return tracingContext
			? propagation.extract(context.active(), tracingContext)
			: context.active();
	}

	private buildContinuationLinks(linkTo?: TracingContext) {
		if (!linkTo) return undefined;
		const extracted = propagation.extract(context.active(), linkTo);
		const spanContext = trace.getSpanContext(extracted);
		if (!spanContext) return undefined;
		return [
			{
				context: spanContext,
				attributes: { [ATTR.CONTINUATION_REASON]: 'resume' },
			},
		];
	}

	private findWorkflowSpanContext(executionId: string) {
		const tracked = this.activeWorkflowSpans.get(executionId);
		return tracked ? trace.setSpan(context.active(), tracked.span) : undefined;
	}

	private findMostSpecificSpan(executionId: string, nodeName?: string): Span | undefined {
		return (
			(nodeName
				? this.activeNodeSpansByExecutionId.get(executionId)?.get(nodeName)?.span
				: undefined) ?? this.activeWorkflowSpans.get(executionId)?.span
		);
	}

	private endDanglingNodeSpans(executionId: string): void {
		const executionNodes = this.activeNodeSpansByExecutionId.get(executionId);
		if (!executionNodes) return;

		for (const tracked of executionNodes.values()) {
			terminateSpan(tracked.span, 'workflow_cancelled');
		}

		this.activeNodeSpansByExecutionId.delete(executionId);
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

function toTracingParentContext(span: Span): TracingContext {
	const carrier: Record<string, string> = {};
	propagation.inject(trace.setSpan(context.active(), span), carrier);
	return { traceparent: carrier.traceparent, tracestate: carrier.tracestate };
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
