import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Attributes, Context, Exception, Span, TimeInput } from '@opentelemetry/api';
import {
	context,
	defaultTextMapGetter,
	defaultTextMapSetter,
	ROOT_CONTEXT,
	SpanStatusCode,
	trace,
} from '@opentelemetry/api';
import { isTimeInputHrTime, W3CTraceContextPropagator } from '@opentelemetry/core';
import type { ExecutionStatus } from 'n8n-workflow';

import { WorkflowCrashedError } from '@/errors/workflow-crashed.error';

import {
	buildExecutionIdentity,
	type ExecutionIdentity,
	toExecutionIdentity,
	withExecutionIdentity,
} from './execution-identity';
import {
	type StartWorkflowParams,
	type EndWorkflowParams,
	type EndCrashedWorkflowParams,
	type StartNodeParams,
	type EndNodeParams,
	isEndNodeError,
} from './execution-level-tracer.types';
import { OtelSettingsService } from './otel-settings.service';
import { ATTR } from './otel.constants';
import { OtelService } from './otel.service';
import type { TracingContext } from './tracing-context';

const TRACER_NAME = 'n8n-workflow';
const propagator = new W3CTraceContextPropagator();
const UNKNOWN_ERROR_TYPE = 'UnknownError';
const OBJECT_ERROR_TYPE = 'Object';

function isError(status: ExecutionStatus): boolean {
	return status === 'error' || status === 'crashed';
}

type TrackedSpan = { span: Span };
type TrackedWorkflowSpan = TrackedSpan & {
	context: Context;
	projectCustomAttributes: Record<string, string>;
};

@Service()
export class ExecutionLevelTracer {
	private readonly activeWorkflowSpans = new Map<string, TrackedWorkflowSpan>();
	private readonly activeNodeSpansByExecutionId = new Map<string, Map<string, TrackedSpan>>();

	constructor(
		private readonly otelService: OtelService,
		private readonly otelSettingsService: OtelSettingsService,
		private readonly logger: Logger,
	) {}

	private get tracer() {
		return this.otelService.getTracer(TRACER_NAME);
	}

	startWorkflow(params: StartWorkflowParams) {
		try {
			const identity = resolveWorkflowIdentity(params);
			const parentCtx = withExecutionIdentity(
				this.parseTraceParentHeaders(params.tracingContext),
				identity,
			);
			const links = this.buildContinuationLinks(params.linkTo);
			const projectCustomAttributes = buildCustomAttributes(
				ATTR.PROJECT_CUSTOM_PREFIX,
				params.project?.customAttributes,
			);

			const attributes = {
				[ATTR.WORKFLOW_NAME]: params.workflow.name,
				[ATTR.WORKFLOW_VERSION_ID]: params.workflow.versionId ?? '',
				[ATTR.WORKFLOW_NODE_COUNT]: params.workflow.nodeCount,
				...buildCustomAttributes(ATTR.WORKFLOW_CUSTOM_PREFIX, params.workflow?.customAttributes),
				...(params.project && { [ATTR.PROJECT_ID]: params.project.id }),
				...projectCustomAttributes,
				...identity,
			};

			const span = this.tracer.startSpan('workflow.execute', { attributes, links }, parentCtx);
			const workflowContext = trace.setSpan(parentCtx, span);

			this.activeWorkflowSpans.set(params.executionId, {
				span,
				context: workflowContext,
				projectCustomAttributes,
			});

			if (params.emitStartSpan) {
				this.emitStartMarker(
					'workflow.execute.started',
					attributes,
					workflowContext,
					params.executionId,
				);
			}

			return toTracingParentContext(span, identity);
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

	endCrashedWorkflow(params: EndCrashedWorkflowParams): void {
		try {
			const tracked = this.activeWorkflowSpans.get(params.executionId);
			const span = tracked?.span ?? this.reconstructWorkflowSpan(params);
			span.setAttributes({
				[ATTR.EXECUTION_MODE]: params.mode,
				[ATTR.EXECUTION_STATUS]: 'crashed',
				[ATTR.EXECUTION_ERROR_TYPE]: WorkflowCrashedError.name,
				[ATTR.EXECUTION_CRASH_DETECTOR]: params.detector,
				[ATTR.EXECUTION_RECONSTRUCTED]: tracked === undefined,
				[ATTR.EXECUTION_IS_RETRY]: params.mode === 'retry',
				...(params.retryOf ? { [ATTR.EXECUTION_RETRY_OF]: params.retryOf } : {}),
			});
			span.setStatus({ code: SpanStatusCode.ERROR });
			span.recordException(new WorkflowCrashedError());
			this.endDanglingNodeSpans(params.executionId, 'workflow_crashed');
			span.end(params.stoppedAt);
		} catch (error) {
			this.logger.warn('Failed to end crashed workflow span', {
				executionId: params.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			this.activeWorkflowSpans.delete(params.executionId);
		}
	}

	private reconstructWorkflowSpan(params: EndCrashedWorkflowParams) {
		const identity = resolveCrashedWorkflowIdentity(params);
		return this.tracer.startSpan(
			'workflow.execute',
			{
				startTime: params.startedAt,
				attributes: {
					...(params.workflowName && { [ATTR.WORKFLOW_NAME]: params.workflowName }),
					...(params.workflowVersionId && {
						[ATTR.WORKFLOW_VERSION_ID]: params.workflowVersionId,
					}),
					...(params.project?.id && { [ATTR.PROJECT_ID]: params.project.id }),
					...buildCustomAttributes(ATTR.WORKFLOW_CUSTOM_PREFIX, params.workflow?.customAttributes),
					...buildCustomAttributes(ATTR.PROJECT_CUSTOM_PREFIX, params.project?.customAttributes),
					...identity,
				},
			},
			withExecutionIdentity(this.parseTraceParentHeaders(params.tracingContext), identity),
		);
	}

	startNode(params: StartNodeParams): void {
		try {
			//	We should always have the node running in a workflow so the tracked span should never be missing
			const tracked = this.activeWorkflowSpans.get(params.executionId);

			if (!tracked) {
				this.logger.warn(
					'Trying to start a node without a pre-existing parent workflow trace - ignoring',
				);
				return;
			}

			const attributes = {
				[ATTR.NODE_ID]: params.node.id,
				[ATTR.NODE_NAME]: params.node.name,
				[ATTR.NODE_TYPE]: params.node.type,
				[ATTR.NODE_TYPE_VERSION]: params.node.typeVersion,
				...tracked.projectCustomAttributes,
			};

			const span = this.tracer.startSpan('node.execute', { attributes }, tracked.context);

			if (params.emitStartSpan) {
				this.emitStartMarker(
					'node.execute.started',
					attributes,
					trace.setSpan(tracked.context, span),
					params.executionId,
				);
			}

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

			propagator.inject(trace.setSpan(ROOT_CONTEXT, span), headers, defaultTextMapSetter);
		} catch (error) {
			this.logger.warn('Failed to inject trace headers', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private emitStartMarker(
		name: string,
		attributes: Attributes,
		parentCtx: Context,
		executionId: string,
	): void {
		try {
			const startTime = getStartTime(trace.getSpan(parentCtx));
			this.tracer.startSpan(name, { startTime, attributes }, parentCtx).end(startTime);
		} catch (error) {
			this.logger.warn('Failed to emit start marker span', {
				executionId,
				spanName: name,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private parseTraceParentHeaders(tracingContext?: TracingContext): Context {
		if (!tracingContext) return ROOT_CONTEXT;
		return propagator.extract(ROOT_CONTEXT, tracingContext, defaultTextMapGetter);
	}

	private buildContinuationLinks(linkTo?: TracingContext) {
		if (!linkTo) return undefined;
		const extracted = propagator.extract(ROOT_CONTEXT, linkTo, defaultTextMapGetter);
		const spanContext = trace.getSpanContext(extracted);
		if (!spanContext) return undefined;
		return [
			{
				context: spanContext,
				attributes: { [ATTR.CONTINUATION_REASON]: 'resume' },
			},
		];
	}

	private findMostSpecificSpan(executionId: string, nodeName?: string): Span | undefined {
		return (
			(nodeName
				? this.activeNodeSpansByExecutionId.get(executionId)?.get(nodeName)?.span
				: undefined) ?? this.activeWorkflowSpans.get(executionId)?.span
		);
	}

	private endDanglingNodeSpans(executionId: string, reason = 'workflow_cancelled'): void {
		const executionNodes = this.activeNodeSpansByExecutionId.get(executionId);
		if (!executionNodes) return;

		for (const tracked of executionNodes.values()) {
			terminateSpan(tracked.span, reason);
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

function resolveWorkflowIdentity(params: StartWorkflowParams): ExecutionIdentity {
	const saved = params.savedIdentity;
	return buildExecutionIdentity({
		executionId: params.executionId,
		workflowId: params.workflow.id,
		workflowName: params.workflow.name,
		projectId: params.project ? params.project.id : saved?.[ATTR.PROJECT_ID],
		projectName: params.project ? params.project.name : saved?.[ATTR.PROJECT_NAME],
	});
}

function resolveCrashedWorkflowIdentity(params: EndCrashedWorkflowParams): ExecutionIdentity {
	return (
		toExecutionIdentity(params.tracingContext?.identity) ??
		buildExecutionIdentity({
			executionId: params.executionId,
			workflowId: params.workflowId,
			workflowName: params.workflowName,
			projectId: params.project?.id,
		})
	);
}

function buildNodeEndAttributes(params: EndNodeParams): Record<string, string | number> {
	const attrs: Record<string, string | number> = {
		[ATTR.NODE_ITEMS_INPUT]: params.inputItemCount,
		[ATTR.NODE_ITEMS_OUTPUT]: params.outputItemCount,
		...buildCustomAttributes(ATTR.NODE_CUSTOM_PREFIX, params.customAttributes),
	};
	return attrs;
}

function toTracingParentContext(span: Span, identity: ExecutionIdentity): TracingContext {
	const carrier: Record<string, string> = {};
	propagator.inject(trace.setSpan(ROOT_CONTEXT, span), carrier, defaultTextMapSetter);
	return { traceparent: carrier.traceparent, tracestate: carrier.tracestate, identity };
}

// Only a recorded SDK span has a start time. The API span type does not expose it.
function getStartTime(span: Span | undefined): TimeInput {
	const startTime = span && 'startTime' in span ? span.startTime : undefined;
	return isTimeInputHrTime(startTime) ? startTime : new Date();
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
