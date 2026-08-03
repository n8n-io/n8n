import { Logger } from '@n8n/backend-common';
import { ExpressionEngineConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	LogsAPI,
	MetricDef,
	MetricsAPI,
	ObservabilityProvider,
	Span,
	TracesAPI,
} from '@n8n/expression-runtime';
import { EXPRESSION_METRICS, NoOpProvider } from '@n8n/expression-runtime';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';
import { UnexpectedError } from 'n8n-workflow';
import promClient, { type Counter, type Gauge, type Histogram } from 'prom-client';

import {
	ATTRIBUTE,
	DURATION_BUCKETS_SECONDS,
	TRACER_NAME,
} from './expression-observability.constants';
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

	private readonly scopedLogger: Logger;

	private readonly prefix!: string;

	private tracer?: Tracer;

	private readonly metricDefs = new Map<string, MetricDef>(
		(Object.values(EXPRESSION_METRICS) as MetricDef[]).map((def) => [def.name, def]),
	);

	constructor(
		private readonly config: ExpressionEngineConfig,
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
	) {
		this.scopedLogger = this.logger.scoped('expression-engine');

		if (!this.config.observabilityEnabled || this.config.engine !== 'vm') {
			this.metrics = NoOpProvider.metrics;
			this.traces = NoOpProvider.traces;
			this.logs = NoOpProvider.logs;
			return;
		}

		this.prefix = globalConfig.endpoints.metrics.prefix;

		for (const metric of this.metricDefs.values()) {
			this.getOrRegisterMetric(metric);
		}

		this.metrics = {
			counter: (name, value, tags) => this.counter(name, value, tags),
			gauge: (name, value, tags) => this.gauge(name, value, tags),
			histogram: (name, value, tags) => this.histogram(name, value, tags),
		};

		this.traces = {
			startSpan: (name, attributes) => this.startSpan(name, attributes),
		};

		this.logs = {
			error: (message, error, context) => this.scopedLogger.error(message, { error, ...context }),
			warn: (message, context) => this.scopedLogger.warn(message, context),
			info: (message, context) => this.scopedLogger.info(message, context),
			debug: (message, context) => this.scopedLogger.debug(message, context),
		};
	}

	private getOrRegisterMetric(def: MetricDef) {
		const promName = toPromName(def.name, def.kind, this.prefix);
		const existing = promClient.register.getSingleMetric(promName);
		if (existing) return existing;

		switch (def.kind) {
			case 'counter':
				return new promClient.Counter({
					name: promName,
					help: def.help,
					labelNames: def.labels,
				});
			case 'gauge':
				return new promClient.Gauge({
					name: promName,
					help: def.help,
					labelNames: def.labels,
				});
			case 'histogram':
				return new promClient.Histogram({
					name: promName,
					help: def.help,
					labelNames: def.labels,
					buckets: DURATION_BUCKETS_SECONDS,
				});
			default: {
				const _exhaustive: never = def.kind;
				throw new UnexpectedError(`Unknown metric kind: ${String(_exhaustive)}`);
			}
		}
	}

	private getMetricDef(name: string, kind: MetricDef['kind']) {
		const def = this.metricDefs.get(name);
		if (def?.kind === kind) return def;
		this.scopedLogger.warn('Emitted unknown expression metric', { name });
		return undefined;
	}

	private counter(name: string, value: number, tags?: Record<string, string>): void {
		const def = this.getMetricDef(name, 'counter');
		if (!def) return;
		const counter = this.getOrRegisterMetric(def) as Counter<string>;
		if (tags) counter.inc(tags, value);
		else counter.inc(value);
	}

	private gauge(name: string, value: number, tags?: Record<string, string>): void {
		const def = this.getMetricDef(name, 'gauge');
		if (!def) return;
		const gauge = this.getOrRegisterMetric(def) as Gauge<string>;
		if (tags) gauge.set(tags, value);
		else gauge.set(value);
	}

	private histogram(name: string, value: number, tags?: Record<string, string>): void {
		const def = this.getMetricDef(name, 'histogram');
		if (!def) return;
		const histogram = this.getOrRegisterMetric(def) as Histogram<string>;
		if (tags) histogram.observe(tags, value);
		else histogram.observe(value);

		if (name === EXPRESSION_METRICS.evaluationDuration.name) this.maybeRecordSpan(value, tags);
	}

	private maybeRecordSpan(durationSeconds: number, tags?: Record<string, string>): void {
		const { tracesEnabled, slowEvaluationThresholdMs } = this.config;
		if (!tracesEnabled) return;

		const decision = this.tailSample(durationSeconds, tags);
		if (decision === 'drop') return;

		const slowThresholdSeconds = slowEvaluationThresholdMs / 1000;
		const outcome =
			tags?.status === 'error'
				? 'error'
				: durationSeconds > slowThresholdSeconds
					? 'slow'
					: 'healthy';

		const tracer = this.getTracer();
		const errorType = tags?.type && tags.type !== 'none' ? tags.type : undefined;
		const span = tracer.startSpan('expression.evaluate', {
			attributes: {
				[ATTRIBUTE.EXPRESSION_ENGINE]: 'vm',
				[ATTRIBUTE.EXPRESSION_DURATION_SECONDS]: durationSeconds,
				[ATTRIBUTE.EXPRESSION_OUTCOME]: outcome,
				...(errorType ? { [ATTRIBUTE.EXPRESSION_ERROR_TYPE]: errorType } : {}),
			},
		});

		if (tags?.status === 'error') span.setStatus({ code: SpanStatusCode.ERROR });

		span.end();
	}

	private tailSample(durationSeconds: number, tags?: Record<string, string>): TailSampleDecision {
		if (tags?.status === 'error') return 'keep';
		const { slowEvaluationThresholdMs, tracesSampleRate } = this.config;
		if (durationSeconds > slowEvaluationThresholdMs / 1000) return 'keep';
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
