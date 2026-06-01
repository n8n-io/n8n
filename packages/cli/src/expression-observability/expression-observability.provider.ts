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

		this.registerMetrics();

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

	private registerMetrics(): void {
		for (const def of Object.values(EXPRESSION_METRICS) as MetricDef[]) {
			const promName = toPromName(def.name, def.kind, this.prefix);
			switch (def.kind) {
				case 'counter':
					new promClient.Counter({
						name: promName,
						help: def.help,
						labelNames: def.labels,
					});
					break;
				case 'gauge':
					new promClient.Gauge({
						name: promName,
						help: def.help,
						labelNames: def.labels,
					});
					break;
				case 'histogram':
					new promClient.Histogram({
						name: promName,
						help: def.help,
						labelNames: def.labels,
						buckets: DURATION_BUCKETS_SECONDS,
					});
					break;
				default: {
					const _exhaustive: never = def.kind;
					throw new UnexpectedError(`Unknown metric kind: ${String(_exhaustive)}`);
				}
			}
		}
	}

	private counter(name: string, value: number, tags?: Record<string, string>): void {
		const promName = toPromName(name, 'counter', this.prefix);
		const counter = promClient.register.getSingleMetric(promName) as Counter<string> | undefined;
		if (!counter) {
			this.scopedLogger.warn('Emitted unknown expression metric', { name });
			return;
		}
		if (tags) counter.inc(tags, value);
		else counter.inc(value);
	}

	private gauge(name: string, value: number, tags?: Record<string, string>): void {
		const promName = toPromName(name, 'gauge', this.prefix);
		const gauge = promClient.register.getSingleMetric(promName) as Gauge<string> | undefined;
		if (!gauge) {
			this.scopedLogger.warn('Emitted unknown expression metric', { name });
			return;
		}
		if (tags) gauge.set(tags, value);
		else gauge.set(value);
	}

	private histogram(name: string, value: number, tags?: Record<string, string>): void {
		const promName = toPromName(name, 'histogram', this.prefix);
		const histogram = promClient.register.getSingleMetric(promName) as
			| Histogram<string>
			| undefined;
		if (!histogram) {
			this.scopedLogger.warn('Emitted unknown expression metric', { name });
			return;
		}
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
