import { getN8nVersion, Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	CallerContext,
	ExecutionObserver,
	IStepExecutor,
	LifecycleEvent,
	StepExecutionRequest,
	StepExecutionResult,
} from '@n8n/engine';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import {
	type Context,
	context,
	propagation,
	ROOT_CONTEXT,
	type SpanContext,
	SpanKind,
	SpanStatusCode,
	trace,
	TraceFlags,
} from '@opentelemetry/api';
import { hrTimeDuration, millisToHrTime } from '@opentelemetry/core';
import {
	BatchSpanProcessor,
	RandomIdGenerator,
	type ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import type { ExecutionTracingContext } from 'n8n-workflow';
import { InstanceSettings } from 'n8n-core';

import { OtelSdk } from '@/observability/otel-sdk';
import { outboundPropagatorFromEnv } from '@/observability/outbound-propagator';
import { TRACING_OFF } from '@/observability/swappable-pipeline';
import { WORKFLOW_TRACER_NAME } from '@/observability/tracer-names';

import { toCallerBaggage } from './caller-baggage';
import {
	buildExecutionIdentity,
	ExecutionIdentitySpanProcessor,
	withExecutionIdentity,
} from './execution-identity';
import { OtelConfigureHook } from './otel-configure-hook';
import { OtelExporterFactory } from './otel-exporter.factory';
import { OtelSettingsService } from './otel-settings.service';
import { OtelConfig } from './otel.config';
import { ATTR } from './otel.constants';
import { withHookAttributes } from './otel-span-exporter';

const KEY = {
	TRACE_ID: 'traceId',
	WORKFLOW_SPAN_ID: 'workflowSpanId',
	PARENT_SPAN_ID: 'parentSpanId',
	SAMPLED: 'sampled',
	TRACESTATE: 'tracestate',
	BAGGAGE: 'baggage',
	STARTED_AT: 'startedAt',
	EXECUTION_ID: 'executionId',
	WORKFLOW_ID: 'workflowId',
	WORKFLOW_NAME: 'workflowName',
	PROJECT_ID: 'projectId',
} as const;

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

const idGenerator = new RandomIdGenerator();

type TraceContextSource = {
	executionId: string;
	workflowId: string;
	workflowName?: string;
	projectId?: string;
	inbound?: Omit<ExecutionTracingContext, 'identity'>;
};

/**
 * Control plane side: mints the workflow span context at dispatch, so that every
 * step worker can parent its node spans under one span that does not exist yet.
 */
@Service()
export class EngineV2TraceContextBuilder {
	constructor(private readonly settings: OtelSettingsService) {}

	build(source: TraceContextSource): Record<string, string> | undefined {
		if (!this.settings.getSettings()?.enabled) return undefined;

		const inbound = TRACEPARENT.exec(source.inbound?.traceparent ?? '');
		const entries: Record<string, string | undefined> = {
			[KEY.TRACE_ID]: inbound?.[1] ?? idGenerator.generateTraceId(),
			[KEY.WORKFLOW_SPAN_ID]: idGenerator.generateSpanId(),
			[KEY.PARENT_SPAN_ID]: inbound?.[2],
			[KEY.SAMPLED]: inbound
				? String((parseInt(inbound[3], 16) & TraceFlags.SAMPLED) === 1)
				: 'true',
			[KEY.TRACESTATE]: source.inbound?.tracestate,
			[KEY.BAGGAGE]: source.inbound?.baggage,
			[KEY.STARTED_AT]: String(Date.now()),
			[KEY.EXECUTION_ID]: source.executionId,
			[KEY.WORKFLOW_ID]: source.workflowId,
			[KEY.WORKFLOW_NAME]: source.workflowName,
			[KEY.PROJECT_ID]: source.projectId,
		};

		return Object.fromEntries(
			Object.entries(entries).filter((entry): entry is [string, string] => entry[1] !== undefined),
		);
	}
}

/**
 * Data plane side: runs in the process that runs the steps. It makes the node
 * spans around each step, gives outbound requests the trace headers of the node
 * span, and exports the workflow span when the execution ends.
 */
@Service()
export class EngineV2Tracing {
	constructor(
		private readonly otelSdk: OtelSdk,
		private readonly config: OtelConfig,
		private readonly exporterFactory: OtelExporterFactory,
		private readonly configureHook: OtelConfigureHook,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/** The engine process has no database, so its export settings come from the environment. */
	async startExport(): Promise<void> {
		if (!this.config.enabled || !this.otelSdk.isRunning) return;

		try {
			const exporter = withHookAttributes(
				await this.exporterFactory.createTraceExporter(this.config),
				{
					[ATTR.OTEL_SERVICE_NAME]: this.config.exporterServiceName,
					[ATTR.OTEL_SERVICE_VERSION]: getN8nVersion(),
					[ATTR.INSTANCE_ID]: this.instanceSettings.hostId,
					[ATTR.INSTANCE_ROLE]: this.instanceSettings.instanceType,
				},
				this.configureHook,
			);
			await this.otelSdk.apply({
				spanProcessors: [new ExecutionIdentitySpanProcessor(), new BatchSpanProcessor(exporter)],
				sampler: new ParentBasedSampler({
					root: new TraceIdRatioBasedSampler(this.config.tracesSampleRate),
				}),
				propagator: this.config.injectOutbound
					? outboundPropagatorFromEnv().propagator
					: TRACING_OFF.propagator,
			});
		} catch (error) {
			this.logger.error('Failed to start OpenTelemetry tracing in the engine process', {
				error: getErrorMessage(error),
			});
		}
	}

	wrapStepExecutor(inner: IStepExecutor): IStepExecutor {
		return {
			execute: async (request) => await this.executeInNodeSpan(inner, request),
		};
	}

	readonly observe: ExecutionObserver = (event, { callerContext }) => {
		if (event.type !== 'execution:completed' && event.type !== 'execution:failed') return;

		const traceContext = callerContext.traceContext;
		if (!traceContext) return;

		this.exportWorkflowSpan(traceContext, event);
	};

	injectTraceHeaders(headers: Record<string, string>): void {
		propagation.inject(context.active(), headers);
	}

	private async executeInNodeSpan(
		inner: IStepExecutor,
		request: StepExecutionRequest,
	): Promise<StepExecutionResult> {
		const parent = this.parentContext(request.context.callerContext);
		if (!parent) return await inner.execute(request);

		const tracer = trace.getTracer(WORKFLOW_TRACER_NAME);
		return await tracer.startActiveSpan(
			'node.execute',
			{
				kind: SpanKind.INTERNAL,
				attributes: {
					[ATTR.NODE_ID]: request.node.id,
					[ATTR.NODE_NAME]: request.node.name,
					'n8n.step.id': request.context.stepId,
					'n8n.step.iteration': request.context.iteration,
					'n8n.engine.host_id': this.instanceSettings.hostId,
				},
			},
			parent,
			async (span) => {
				try {
					const result = await inner.execute(request);
					if (result.wait) span.setAttribute(ATTR.NODE_TERMINATION_REASON, 'wait');
					span.setStatus({ code: SpanStatusCode.OK });
					return result;
				} catch (error) {
					span.setStatus({ code: SpanStatusCode.ERROR, message: getErrorMessage(error) });
					throw error;
				} finally {
					span.end();
				}
			},
		);
	}

	private parentContext(callerContext: CallerContext): Context | undefined {
		const traceContext = callerContext.traceContext;
		const workflowSpan = traceContext && this.workflowSpanContext(traceContext);
		if (!traceContext || !workflowSpan) return undefined;

		let ctx = trace.setSpanContext(ROOT_CONTEXT, workflowSpan);
		ctx = withExecutionIdentity(ctx, this.identity(traceContext));
		const baggage = toCallerBaggage(traceContext[KEY.BAGGAGE]);
		return baggage ? propagation.setBaggage(ctx, baggage) : ctx;
	}

	private workflowSpanContext(traceContext: Record<string, string>): SpanContext | undefined {
		const traceId = traceContext[KEY.TRACE_ID];
		const spanId = traceContext[KEY.WORKFLOW_SPAN_ID];
		if (!traceId || !spanId) return undefined;

		return {
			traceId,
			spanId,
			traceFlags: traceContext[KEY.SAMPLED] === 'true' ? TraceFlags.SAMPLED : TraceFlags.NONE,
			isRemote: true,
		};
	}

	private identity(traceContext: Record<string, string>) {
		return buildExecutionIdentity({
			executionId: traceContext[KEY.EXECUTION_ID],
			workflowId: traceContext[KEY.WORKFLOW_ID],
			workflowName: traceContext[KEY.WORKFLOW_NAME],
			projectId: traceContext[KEY.PROJECT_ID],
		});
	}

	private exportWorkflowSpan(traceContext: Record<string, string>, event: LifecycleEvent): void {
		const spanContext = this.workflowSpanContext(traceContext);
		const resource = this.otelSdk.resource;
		if (!spanContext || !resource) return;

		const parentSpanId = traceContext[KEY.PARENT_SPAN_ID];
		const startTime = millisToHrTime(Number(traceContext[KEY.STARTED_AT]));
		const endTime = millisToHrTime(Date.parse(event.at));
		const failed = event.type === 'execution:failed';

		const span: ReadableSpan = {
			name: 'workflow.execute',
			kind: SpanKind.INTERNAL,
			spanContext: () => ({ ...spanContext, isRemote: false }),
			parentSpanContext: parentSpanId
				? {
						traceId: spanContext.traceId,
						spanId: parentSpanId,
						traceFlags: spanContext.traceFlags,
						isRemote: true,
					}
				: undefined,
			startTime,
			endTime,
			duration: hrTimeDuration(startTime, endTime),
			status: { code: failed ? SpanStatusCode.ERROR : SpanStatusCode.OK },
			attributes: {
				...this.identity(traceContext),
				[ATTR.EXECUTION_STATUS]: failed ? 'error' : 'success',
				'n8n.engine.host_id': this.instanceSettings.hostId,
			},
			links: [],
			events: [],
			ended: true,
			resource,
			instrumentationScope: { name: WORKFLOW_TRACER_NAME },
			droppedAttributesCount: 0,
			droppedEventsCount: 0,
			droppedLinksCount: 0,
		};

		this.otelSdk.exportEndedSpan(span);
	}
}
