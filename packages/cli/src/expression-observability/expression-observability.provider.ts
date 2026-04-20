import { Logger } from '@n8n/backend-common';
import { ExpressionEngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	LogsAPI,
	MetricsAPI,
	ObservabilityProvider,
	Span,
	TracesAPI,
} from '@n8n/expression-runtime';
import { EVALUATION_DURATION_METRIC, NoOpProvider } from '@n8n/expression-runtime';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';
import promClient, { type Counter, type Gauge, type Histogram } from 'prom-client';

import { ATTRIBUTE, DURATION_BUCKETS_MS, TRACER_NAME } from './expression-observability.constants';
import {
	normalizeAttributes,
	normalizeAttributeValue,
	toPromName,
} from './expression-observability.formatters';

type TailSampleDecision = 'drop' | 'keep';

@Service()
export class ExpressionObservabilityProvider implements ObservabilityProvider {
	readonly metrics: MetricsAPI;

	readonly traces: TracesAPI;

	readonly logs: LogsAPI;

	private readonly counters = new Map<string, Counter<string>>();

	private readonly gauges = new Map<string, Gauge<string>>();

	private readonly histograms = new Map<string, Histogram<string>>();

	private tracer?: Tracer;

	constructor(
		private readonly config: ExpressionEngineConfig,
		private readonly logger: Logger,
	) {
		if (!this.config.observabilityEnabled) {
			this.metrics = NoOpProvider.metrics;
			this.traces = NoOpProvider.traces;
			this.logs = NoOpProvider.logs;
			return;
		}

		const scopedLogger = this.logger.scoped('expression-engine');

		this.metrics = {
			counter: (name, value, tags) => this.counter(name, value, tags),
			gauge: (name, value, tags) => this.gauge(name, value, tags),
			histogram: (name, value, tags) => this.histogram(name, value, tags),
		};

		this.traces = {
			startSpan: (name, attributes) => this.startSpan(name, attributes),
		};

		this.logs = {
			error: (message, error, context) => scopedLogger.error(message, { error, ...context }),
			warn: (message, context) => scopedLogger.warn(message, context),
			info: (message, context) => scopedLogger.info(message, context),
			debug: (message, context) => scopedLogger.debug(message, context),
		};
	}

	private counter(name: string, value: number, tags?: Record<string, string>): void {
		const promName = toPromName(name, 'counter');
		let counter = this.counters.get(promName);
		if (!counter) {
			counter = new promClient.Counter({
				name: promName,
				help: `Total ${name} events.`,
				labelNames: tags ? Object.keys(tags) : [],
			});
			this.counters.set(promName, counter);
		}
		if (tags) counter.inc(tags, value);
		else counter.inc(value);
	}

	private gauge(name: string, value: number, tags?: Record<string, string>): void {
		const promName = toPromName(name, 'gauge');
		let gauge = this.gauges.get(promName);
		if (!gauge) {
			gauge = new promClient.Gauge({
				name: promName,
				help: `Current ${name}.`,
				labelNames: tags ? Object.keys(tags) : [],
			});
			this.gauges.set(promName, gauge);
		}
		if (tags) gauge.set(tags, value);
		else gauge.set(value);
	}

	private histogram(name: string, value: number, tags?: Record<string, string>): void {
		const promName = toPromName(name, 'histogram');
		let histogram = this.histograms.get(promName);
		if (!histogram) {
			histogram = new promClient.Histogram({
				name: promName,
				help: `Distribution of ${name}.`,
				labelNames: tags ? Object.keys(tags) : [],
				buckets: DURATION_BUCKETS_MS,
			});
			this.histograms.set(promName, histogram);
		}
		if (tags) histogram.observe(tags, value);
		else histogram.observe(value);

		if (name === EVALUATION_DURATION_METRIC) this.maybeRecordSpan(value, tags);
	}

	private maybeRecordSpan(durationMs: number, tags?: Record<string, string>): void {
		const { tracesEnabled, slowEvaluationThresholdMs } = this.config;
		if (!tracesEnabled) return;

		const decision = this.tailSample(durationMs, tags);
		if (decision === 'drop') return;

		const outcome =
			tags?.status === 'error'
				? 'error'
				: durationMs > slowEvaluationThresholdMs
					? 'slow'
					: 'healthy';

		const tracer = this.getTracer();
		const span = tracer.startSpan('expression.evaluate', {
			attributes: {
				[ATTRIBUTE.EXPRESSION_ENGINE]: 'vm',
				[ATTRIBUTE.EXPRESSION_DURATION_MS]: durationMs,
				[ATTRIBUTE.EXPRESSION_OUTCOME]: outcome,
				...(tags?.type ? { [ATTRIBUTE.EXPRESSION_ERROR_TYPE]: tags.type } : {}),
			},
		});

		if (tags?.status === 'error') span.setStatus({ code: SpanStatusCode.ERROR });

		span.end();
	}

	private tailSample(durationMs: number, tags?: Record<string, string>): TailSampleDecision {
		if (tags?.status === 'error') return 'keep';
		const { slowEvaluationThresholdMs, tracesSampleRate } = this.config;
		if (durationMs > slowEvaluationThresholdMs) return 'keep';
		if (tracesSampleRate > 0 && Math.random() < tracesSampleRate) return 'keep';
		return 'drop';
	}

	private startSpan(name: string, attributes?: Record<string, unknown>): Span {
		if (!this.config.tracesEnabled) return NoOpProvider.traces.startSpan(name, attributes);

		const tracer = this.getTracer();
		const otelSpan = tracer.startSpan(name, {
			attributes: normalizeAttributes(attributes),
		});

		return {
			setStatus: (status) =>
				otelSpan.setStatus({
					code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR,
				}),
			setAttribute: (key, value) => {
				const normalized = normalizeAttributeValue(value);
				if (normalized !== undefined) otelSpan.setAttribute(key, normalized);
			},
			recordException: (error) => otelSpan.recordException(error),
			end: () => otelSpan.end(),
		};
	}

	private getTracer(): Tracer {
		this.tracer ??= trace.getTracer(TRACER_NAME);
		return this.tracer;
	}
}
