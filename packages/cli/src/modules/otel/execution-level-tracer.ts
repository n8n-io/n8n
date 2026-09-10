import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Attributes, Context, Exception, Span } from '@opentelemetry/api';
import { context, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import type { ExecutionStatus } from 'n8n-workflow';

import {
	type StartWorkflowParams,
	type EndWorkflowParams,
	type StartNodeParams,
	type EndNodeParams,
	isEndNodeError,
} from './execution-level-tracer.types';
import { OtelSettingsService } from './otel-settings.service';
import { ATTR } from './otel.constants';
import type { TracingContext } from './tracing-context';

const TRACER_NAME = 'n8n-workflow';
const UNKNOWN_ERROR_TYPE = 'UnknownError';
const OBJECT_ERROR_TYPE = 'Object';

/**
 * Marker span emitted (and ended) at execution start. A span is only exported once it
 * ends, so without this nothing identifiable reaches the collector until the first node
 * or the workflow itself finishes.
 */
const WORKFLOW_START_SPAN_NAME = 'workflow.execute.started';

function isError(status: ExecutionStatus): boolean {
	return status === 'error' || status === 'crashed';
}

type TrackedSpan = { span: Span };

/**
 * The workflow's root span plus the identity attributes copied onto each of its node
 * spans, so a node span can be tied back to its workflow/execution/project on its own.
 */
type TrackedWorkflowSpan = TrackedSpan & { identity: Attributes };

@Service()
export class ExecutionLevelTracer {
	private readonly activeWorkflowSpans = new Map<string, TrackedWorkflowSpan>();
	private readonly activeNodeSpansByExecutionId = new Map<string, Map<string, TrackedSpan>>();
	private tracer = trace.getTracer(TRACER_NAME);

	/**
	 * Called by OtelService after a SDK restart so this instance picks up the
	 * new NodeTracerProvider. Without this, the cached NodeTracer stays bound
	 * to the old (shutdown) provider and all spans are silently dropped.
	 */
	refreshTracer(): void {
		this.tracer = trace.getTracer(TRACER_NAME);
	}

	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly logger: Logger,
	) {}

	startWorkflow(params: StartWorkflowParams) {
		try {
			const parentCtx = this.parseTraceParentHeaders(params.tracingContext);
			const links = this.buildContinuationLinks(params.linkTo);

			// Kept deliberately small: only what identifies the execution, so it stays cheap to
			// repeat on every node span. Custom (license-gated) attributes stay root-only.
			const identity: Attributes = {
				[ATTR.WORKFLOW_ID]: params.workflow.id,
				[ATTR.WORKFLOW_NAME]: params.workflow.name,
				[ATTR.EXECUTION_ID]: params.executionId,
				...(params.project?.id && { [ATTR.PROJECT_ID]: params.project.id }),
			};

			const span = this.tracer.startSpan(
				'workflow.execute',
				{
					attributes: {
						...identity,
						[ATTR.WORKFLOW_VERSION_ID]: params.workflow.versionId ?? '',
						[ATTR.WORKFLOW_NODE_COUNT]: params.workflow.nodeCount,
						...buildCustomAttributes(
							ATTR.WORKFLOW_CUSTOM_PREFIX,
							params.workflow?.customAttributes,
						),
						...buildCustomAttributes(ATTR.PROJECT_CUSTOM_PREFIX, params.project?.customAttributes),
					},
					links,
				},
				parentCtx,
			);

			this.activeWorkflowSpans.set(params.executionId, { span, identity });
			this.emitStartMarker(span, identity);

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
				const recordableException = toRecordableException(params.error);
				if (recordableException) {
					span.recordException(recordableException);
				}
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
			//	We should always have the node running in a workflow so this should never be missing
			const trackedWorkflow = this.activeWorkflowSpans.get(params.executionId);

			if (!trackedWorkflow) {
				this.logger.warn(
					'Trying to start a node without a pre-existing parent workflow trace - ignoring',
				);
				return;
			}

			const parentCtx = trace.setSpan(context.active(), trackedWorkflow.span);

			const span = this.tracer.startSpan(
				'node.execute',
				{
					attributes: {
						// Repeated from the root span, which is not exported until the workflow ends.
						...trackedWorkflow.identity,
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

			if (params.error) {
				activeNodeSpan.setStatus({ code: SpanStatusCode.ERROR });
				const recordableException = toRecordableException(params.error);
				if (recordableException) {
					activeNodeSpan.recordException(recordableException);
				}
			} else {
				activeNodeSpan.setStatus({ code: SpanStatusCode.OK });
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

	/**
	 * Returns the OTel context of the most specific active span for an
	 * execution — its running node, falling back to the workflow span — so
	 * callers outside this module (e.g. an agent run invoked from a workflow
	 * node) can nest their own spans under it instead of starting a
	 * disconnected trace. Undefined when neither span is active (e.g. otel
	 * disabled, or the execution/node isn't tracked here).
	 */
	getActiveContext(executionId: string, nodeName?: string): Context | undefined {
		const span = this.findMostSpecificSpan(executionId, nodeName);
		return span ? trace.setSpan(context.active(), span) : undefined;
	}

	injectTraceHeaders(
		executionId: string,
		nodeName: string | undefined,
		headers: Record<string, string>,
	): void {
		try {
			if (!this.otelSettingsService.getSettings().injectOutbound) return;

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

	/**
	 * Starts and immediately ends a child of the workflow span, so one identified span is
	 * exported at execution start rather than at execution end. Being a child keeps it in
	 * the same trace and inherits the root's sampling decision; it does not affect the
	 * traceparent handed back to callers, which still points at the root span.
	 */
	private emitStartMarker(workflowSpan: Span, identity: Attributes): void {
		const marker = this.tracer.startSpan(
			WORKFLOW_START_SPAN_NAME,
			{ attributes: identity },
			trace.setSpan(context.active(), workflowSpan),
		);
		marker.end();
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

function buildCustomAttributes(
	prefix: string,
	attrs: Record<string, string> | undefined,
): Record<string, string> {
	if (!attrs) return {};
	const result: Record<string, string> = {};
	for (const [k, v] of Object.entries(attrs)) {
		result[`${prefix}${k}`] = v;
	}
	return result;
}

function buildNodeEndAttributes(params: EndNodeParams): Record<string, string | number> {
	const attrs: Record<string, string | number> = {
		[ATTR.NODE_ITEMS_INPUT]: params.inputItemCount,
		[ATTR.NODE_ITEMS_OUTPUT]: params.outputItemCount,
		...buildCustomAttributes(ATTR.NODE_CUSTOM_PREFIX, params.customAttributes),
	};
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
	if (error instanceof Error) return error.constructor.name;

	if (typeof error !== 'object' || error === null) return UNKNOWN_ERROR_TYPE;

	const record = error as Record<string, unknown>;

	const name = getNonEmptyString(record.name);
	if (name) return name;

	const constructorName = getConstructorName(record);
	if (constructorName && constructorName !== OBJECT_ERROR_TYPE) return constructorName;

	const description = getNonEmptyString(record.description);
	if (description && looksLikeErrorType(description)) return description;

	return UNKNOWN_ERROR_TYPE;
}

function toRecordableException(error: unknown): Exception | undefined {
	if (error instanceof Error || typeof error === 'string') return error;
	if (isEndNodeError(error)) {
		return {
			message: error.message,
			name: getErrorType(error),
			stack: error.stack,
		};
	}

	return undefined;
}

function getNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;

	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

function getConstructorName(record: Record<string, unknown>): string | undefined {
	const constructor = record.constructor;
	if (typeof constructor === 'function') return getNonEmptyString(constructor.name);
	if (typeof constructor !== 'object' || constructor === null) return undefined;

	return getNonEmptyString((constructor as Record<string, unknown>).name);
}

function looksLikeErrorType(value: string): boolean {
	return /^[A-Z][\w.]*(Error|Exception)$/.test(value);
}
