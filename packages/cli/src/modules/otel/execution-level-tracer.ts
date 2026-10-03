import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { RunProfile } from '@n8n/nodes-base-next';
import type { Attributes, Context, Exception, Span } from '@opentelemetry/api';
import {
	context,
	defaultTextMapGetter,
	defaultTextMapSetter,
	isSpanContextValid,
	ROOT_CONTEXT,
	SpanKind,
	SpanStatusCode,
	trace,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import type { ExecutionStatus } from 'n8n-workflow';

import { WorkflowCrashedError } from '@/errors/workflow-crashed.error';

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
type TrackedWorkflowSpan = TrackedSpan & { projectAttributes: Record<string, string> };

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
			const parentCtx = this.parseTraceParentHeaders(params.tracingContext);
			const links = this.buildContinuationLinks(params.linkTo);
			const projectAttributes = buildProjectAttributes(params.project);

			const span = this.tracer.startSpan(
				'workflow.execute',
				{
					attributes: {
						[ATTR.WORKFLOW_ID]: params.workflow.id,
						[ATTR.WORKFLOW_NAME]: params.workflow.name,
						[ATTR.WORKFLOW_VERSION_ID]: params.workflow.versionId ?? '',
						[ATTR.WORKFLOW_NODE_COUNT]: params.workflow.nodeCount,
						[ATTR.EXECUTION_ID]: params.executionId,
						...buildCustomAttributes(
							ATTR.WORKFLOW_CUSTOM_PREFIX,
							params.workflow?.customAttributes,
						),
						...projectAttributes,
					},
					links,
				},
				parentCtx,
			);

			this.activeWorkflowSpans.set(params.executionId, { span, projectAttributes });
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
		return this.tracer.startSpan(
			'workflow.execute',
			{
				startTime: params.startedAt,
				attributes: {
					[ATTR.WORKFLOW_ID]: params.workflowId,
					...(params.workflowName && { [ATTR.WORKFLOW_NAME]: params.workflowName }),
					...(params.workflowVersionId && {
						[ATTR.WORKFLOW_VERSION_ID]: params.workflowVersionId,
					}),
					[ATTR.EXECUTION_ID]: params.executionId,
					...(params.project?.id && { [ATTR.PROJECT_ID]: params.project.id }),
					...buildCustomAttributes(ATTR.WORKFLOW_CUSTOM_PREFIX, params.workflow?.customAttributes),
					...buildCustomAttributes(ATTR.PROJECT_CUSTOM_PREFIX, params.project?.customAttributes),
				},
			},
			this.parseTraceParentHeaders(params.tracingContext),
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

			const span = this.tracer.startSpan(
				'node.execute',
				{
					attributes: {
						[ATTR.NODE_ID]: params.node.id,
						[ATTR.NODE_NAME]: params.node.name,
						[ATTR.NODE_TYPE]: params.node.type,
						[ATTR.NODE_TYPE_VERSION]: params.node.typeVersion,
						...tracked.projectAttributes,
					},
				},
				trace.setSpan(context.active(), tracked.span),
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

	/**
	 * Adds a `contract.run` span under the node span, with a span for each phase, each JSON-RPC
	 * message and each HTTP attempt of the profile. A guest request goes under the span of the
	 * guest call that sent it. Without an active node span (tracing off, node spans off, or a
	 * run that is not traced) it adds nothing: a workflow span is not a parent for these spans.
	 */
	recordContractRun(executionId: string, nodeName: string, profile: RunProfile): void {
		try {
			const nodeSpan = this.activeNodeSpansByExecutionId.get(executionId)?.get(nodeName)?.span;
			if (!nodeSpan) return;

			const run = this.tracer.startSpan(
				'contract.run',
				{ startTime: profile.startMs, attributes: contractRunAttributes(profile) },
				trace.setSpan(context.active(), nodeSpan),
			);
			const parent = trace.setSpan(context.active(), run);
			profile.phases.forEach((phase) => {
				this.tracer
					.startSpan(
						PHASE_SPAN_NAMES[phase.name],
						{ startTime: phase.startMs, attributes: phaseAttributes(phase) },
						parent,
					)
					.end(phase.endMs);
			});
			const rpcContexts = new Map(
				profile.rpcs.map((rpc): [number, Context] => {
					const span = this.tracer.startSpan(
						`rpc ${rpc.method}`,
						{
							kind: rpc.direction === 'host_to_guest' ? SpanKind.CLIENT : SpanKind.SERVER,
							startTime: rpc.startMs,
							attributes: rpcAttributes(rpc),
						},
						parent,
					);
					if (rpc.errorType !== undefined) span.setStatus({ code: SpanStatusCode.ERROR });
					span.end(rpc.endMs);
					return [rpc.id, trace.setSpan(context.active(), span)];
				}),
			);
			profile.requests.forEach((request) => {
				const span = this.tracer.startSpan(
					request.template ? `${request.method} ${request.template}` : request.method,
					{
						kind: SpanKind.CLIENT,
						startTime: request.startMs,
						attributes: requestAttributes(request),
					},
					// A guest call past the cap has no span, so its request goes under `contract.run`.
					(request.rpc === undefined ? undefined : rpcContexts.get(request.rpc)) ?? parent,
				);
				if (request.errorType !== undefined) span.setStatus({ code: SpanStatusCode.ERROR });
				span.end(request.endMs);
			});
			run.setStatus({
				code: profile.errorType === undefined ? SpanStatusCode.OK : SpanStatusCode.ERROR,
			});
			run.end(profile.endMs);
		} catch (error) {
			this.logger.warn('Failed to record contract run spans', {
				executionId,
				nodeName,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	hasWorkflowSpan(executionId: string): boolean {
		return this.activeWorkflowSpans.has(executionId);
	}

	/** The trace id of the workflow span; outbound `traceparent` headers carry the same id. */
	traceId(executionId: string): string | undefined {
		const spanContext = this.activeWorkflowSpans.get(executionId)?.span.spanContext();
		return spanContext && isSpanContextValid(spanContext) ? spanContext.traceId : undefined;
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

function buildProjectAttributes(project: StartWorkflowParams['project']): Record<string, string> {
	if (!project) return {};
	return {
		[ATTR.PROJECT_ID]: project.id,
		...buildCustomAttributes(ATTR.PROJECT_CUSTOM_PREFIX, project.customAttributes),
	};
}

function buildNodeEndAttributes(params: EndNodeParams): Record<string, string | number> {
	const attrs: Record<string, string | number> = {
		[ATTR.NODE_ITEMS_INPUT]: params.inputItemCount,
		[ATTR.NODE_ITEMS_OUTPUT]: params.outputItemCount,
		...buildCustomAttributes(ATTR.NODE_CUSTOM_PREFIX, params.customAttributes),
	};
	return attrs;
}

const PHASE_SPAN_NAMES: Record<RunProfile['phases'][number]['name'], string> = {
	load: 'contract.load',
	credential: 'contract.credential',
	sandboxStart: 'sandbox.start',
};

function contractRunAttributes(profile: RunProfile): Attributes {
	const dropped =
		profile.requestCount - profile.requests.length + (profile.rpcCount - profile.rpcs.length);
	// The SDK drops an attribute that is undefined.
	return {
		[ATTR.CONTRACT_ACTION]: profile.action,
		[ATTR.CONTRACT_ACTION_VERSION]: profile.version,
		[ATTR.CONTRACT_BUNDLE_HASH]: profile.bundleHash,
		[ATTR.CONTRACT_NODE_CONTRACT]: profile.nodeContract,
		[ATTR.CONTRACT_PATH]: profile.path,
		[ATTR.CONTRACT_ITEMS_INPUT]: profile.inputItems,
		[ATTR.CONTRACT_OUTPUT_ITEMS]: profile.outputItems,
		[ATTR.CONTRACT_REQUESTS]: profile.requestCount,
		[ATTR.CONTRACT_PAGES]: profile.pageCount,
		[ATTR.CONTRACT_RETRIES]: profile.retryCount,
		[ATTR.CONTRACT_INPUT_MS]: profile.inputMs,
		[ATTR.CONTRACT_OUTPUT_VALIDATE_MS]: profile.outputValidateMs,
		[ATTR.CONTRACT_DRIFT_ISSUES]: profile.driftIssues,
		[ATTR.CONTRACT_SPANS_DROPPED]: dropped > 0 ? dropped : undefined,
		[ATTR.ERROR_TYPE]: profile.errorType,
	};
}

function phaseAttributes(phase: RunProfile['phases'][number]): Attributes {
	switch (phase.name) {
		case 'load':
			return { [ATTR.CONTRACT_LOAD_CACHED]: phase.cached };
		case 'credential':
			return {
				[ATTR.CREDENTIAL_TYPE]: phase.credentialType,
				[ATTR.CREDENTIAL_SCHEME]: phase.scheme,
			};
		case 'sandboxStart':
			return { [ATTR.SANDBOX_COMPILE_CACHED]: phase.compileCached };
	}
}

function rpcAttributes(rpc: RunProfile['rpcs'][number]): Attributes {
	return {
		[ATTR.RPC_SYSTEM_NAME]: 'jsonrpc',
		[ATTR.RPC_METHOD]: rpc.method,
		[ATTR.RPC_DIRECTION]: rpc.direction,
		[ATTR.RPC_REQUEST_BYTES]: rpc.requestBytes,
		[ATTR.RPC_RESPONSE_BYTES]: rpc.responseBytes,
		[ATTR.RPC_ENCODE_MS]: rpc.encodeMs,
		[ATTR.RPC_DECODE_MS]: rpc.decodeMs,
		// `errorType` is the JSON-RPC error code, or an error name when no answer came.
		[ATTR.RPC_RESPONSE_STATUS_CODE]:
			rpc.errorType !== undefined && /^-?\d+$/.test(rpc.errorType) ? rpc.errorType : undefined,
		[ATTR.ERROR_TYPE]: rpc.errorType,
	};
}

function requestAttributes(request: RunProfile['requests'][number]): Attributes {
	return {
		[ATTR.HTTP_REQUEST_METHOD]: request.method,
		[ATTR.SERVER_ADDRESS]: request.host,
		[ATTR.SERVER_PORT]: request.port,
		[ATTR.URL_SCHEME]: request.scheme,
		[ATTR.URL_TEMPLATE]: request.template,
		[ATTR.HTTP_PAGE]: request.page,
		// Semconv sets the resend count on retries only.
		[ATTR.HTTP_REQUEST_RESEND_COUNT]: request.resendCount > 0 ? request.resendCount : undefined,
		[ATTR.HTTP_RESPONSE_STATUS_CODE]: request.status,
		[ATTR.ERROR_TYPE]: request.errorType,
		[ATTR.HTTP_REQUEST_BODY_SIZE]: request.requestBytes,
		[ATTR.HTTP_RESPONSE_BODY_SIZE]: request.responseBytes,
	};
}

function toTracingParentContext(span: Span): TracingContext {
	const carrier: Record<string, string> = {};
	propagator.inject(trace.setSpan(ROOT_CONTEXT, span), carrier, defaultTextMapSetter);
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
