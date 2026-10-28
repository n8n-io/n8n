import { Logger } from '@n8n/backend-common';
import { TracingSourcesConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DiagLogLevel, diag, type DiagLogger } from '@opentelemetry/api';
import { diagLogLevelFromString, getBooleanFromEnv, getStringFromEnv } from '@opentelemetry/core';
import { NodeSDK } from '@opentelemetry/sdk-node';

import {
	SwappablePropagator,
	SwappableSampler,
	SwappableSpanProcessor,
	type ShutdownErrors,
	type TracingPipeline,
} from './swappable-pipeline';
import {
	applyTracerConfigurator,
	createTracerConfigurator,
	isTracerProviderRegistered,
} from './tracer-gate';
import {
	AGENTS_TRACER_NAME,
	DAYTONA_TRACER_NAME,
	EXPRESSION_TRACER_NAME,
	MICROSOFT_AGENT_365_TRACER_NAME,
	MICROSOFT_AGENTS_TRACER_NAME,
	WORKFLOW_TRACER_NAME,
} from './tracer-names';

type TracerSource = { tracerNames: string[]; enabled: boolean };

@Service()
export class OtelSdk {
	private readonly spanProcessor = new SwappableSpanProcessor();

	private readonly sampler = new SwappableSampler();

	private readonly propagator = new SwappablePropagator();

	private sdk?: NodeSDK;

	constructor(
		private readonly logger: Logger,
		private readonly tracingSourcesConfig: TracingSourcesConfig,
	) {}

	get isRunning(): boolean {
		return this.sdk !== undefined;
	}

	start(): void {
		if (getBooleanFromEnv('OTEL_SDK_DISABLED')) {
			this.logger.warn('OTEL_SDK_DISABLED is true, so n8n sends no OpenTelemetry spans');
			return;
		}

		if (isTracerProviderRegistered()) {
			this.logger.warn(
				'Another OpenTelemetry setup is already registered, so n8n sends its spans there and ignores its own OpenTelemetry settings',
			);
			return;
		}

		const sdk = new NodeSDK({
			sampler: this.sampler,
			textMapPropagator: this.propagator,
			spanProcessors: [this.spanProcessor],
			metricReaders: [],
			logRecordProcessors: [],
		});
		diag.setLogger(this.diagnosticsLogger(), {
			logLevel: diagLogLevelFromString(getStringFromEnv('OTEL_LOG_LEVEL')) ?? DiagLogLevel.WARN,
			suppressOverrideMessage: true,
		});
		sdk.start();

		applyTracerConfigurator(createTracerConfigurator(this.enabledTracerNames()));
		this.sdk = sdk;
	}

	async apply({ spanProcessors, sampler, propagator }: TracingPipeline): Promise<ShutdownErrors> {
		if (!this.sdk) return [];

		this.sampler.replace(sampler);
		this.propagator.replace(propagator);
		return await this.spanProcessor.replace(spanProcessors);
	}

	async shutdown(): Promise<void> {
		await this.sdk?.shutdown();
	}

	private enabledTracerNames(): Set<string> {
		const sources: TracerSource[] = [
			{
				tracerNames: [WORKFLOW_TRACER_NAME, AGENTS_TRACER_NAME, EXPRESSION_TRACER_NAME],
				enabled: true,
			},
			{
				tracerNames: [DAYTONA_TRACER_NAME],
				enabled: this.tracingSourcesConfig.daytonaTracingEnabled,
			},
			{
				tracerNames: [MICROSOFT_AGENTS_TRACER_NAME, MICROSOFT_AGENT_365_TRACER_NAME],
				enabled: this.tracingSourcesConfig.microsoftAgent365TracingEnabled,
			},
		];

		return new Set(
			sources.filter(({ enabled }) => enabled).flatMap(({ tracerNames }) => tracerNames),
		);
	}

	private diagnosticsLogger(): DiagLogger {
		return {
			error: (...args: unknown[]) => this.logger.error('OpenTelemetry diagnostics error', { args }),
			warn: (...args: unknown[]) => this.logger.warn('OpenTelemetry diagnostics warning', { args }),
			info: (...args: unknown[]) => this.logger.info('OpenTelemetry diagnostics info', { args }),
			debug: (...args: unknown[]) => this.logger.debug('OpenTelemetry diagnostics debug', { args }),
			verbose: (...args: unknown[]) =>
				this.logger.debug('OpenTelemetry diagnostics verbose', { args }),
		};
	}
}
