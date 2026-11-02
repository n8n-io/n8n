import { Logger } from '@n8n/backend-common';
import { TracingSourcesConfig } from '@n8n/config';
import { LOWEST_SHUTDOWN_PRIORITY, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { raceAbort } from '@n8n/utils/race-abort';
import { DiagLogLevel, diag, type DiagLogger, type TracerProvider } from '@opentelemetry/api';
import {
	diagLogLevelFromString,
	getBooleanFromEnv,
	getStringFromEnv,
	getStringListFromEnv,
} from '@opentelemetry/core';
import {
	defaultResource,
	detectResources,
	envDetector,
	hostDetector,
	osDetector,
	processDetector,
	serviceInstanceIdDetector,
	type Resource,
	type ResourceDetector,
} from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { OperationalError } from 'n8n-workflow';

import { createAgent365TracerProvider } from './agent-365-provider';
import { SampledParentSampler, SampledSpanProcessor } from './customer-sampling';
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

const MICROSOFT_EXIT_FLUSH_TIMEOUT_MS = 5_000;

const RESOURCE_DETECTORS: Record<string, ResourceDetector> = {
	host: hostDetector,
	os: osDetector,
	serviceinstance: serviceInstanceIdDetector,
	process: processDetector,
	env: envDetector,
};

@Service()
export class OtelSdk {
	private readonly spanProcessor = new SwappableSpanProcessor();

	private readonly sampler = new SwappableSampler();

	private readonly propagator = new SwappablePropagator();

	private readonly customerDecisions = new WeakMap<object, boolean>();

	private sdk?: NodeSDK;

	private agent365Provider?: BasicTracerProvider;

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
				'Another OpenTelemetry setup is already registered, so n8n sends its spans there, ignores its own OpenTelemetry settings and sends no Microsoft Agent 365 spans to Microsoft',
			);
			return;
		}

		this.useDiagnosticsLogger();
		const resource = defaultResource().merge(detectResources({ detectors: resourceDetectors() }));
		const sdk = new NodeSDK({
			resource,
			autoDetectResources: false,
			sampler: new SampledParentSampler(this.customerDecisions, this.sampler),
			textMapPropagator: this.propagator,
			spanProcessors: [this.spanProcessor],
			metricReaders: [],
			logRecordProcessors: [],
		});
		// NodeSDK switches diagnostics to the console when OTEL_LOG_LEVEL is set.
		this.useDiagnosticsLogger();
		sdk.start();

		this.agent365Provider = this.createAgent365Provider(resource);
		applyTracerConfigurator(
			createTracerConfigurator(this.enabledTracerNames(), this.dedicatedProviders()),
		);
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

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async shutdownAgent365Provider(): Promise<void> {
		if (!this.agent365Provider) return;

		try {
			await raceAbort(
				this.agent365Provider.shutdown(),
				AbortSignal.timeout(MICROSOFT_EXIT_FLUSH_TIMEOUT_MS),
				() =>
					new OperationalError(
						`The Microsoft Agent 365 exporter did not finish its flush within ${MICROSOFT_EXIT_FLUSH_TIMEOUT_MS} ms`,
					),
			);
		} catch (error) {
			this.logger.warn('Failed to send the last Microsoft Agent 365 spans to Microsoft', {
				error: getErrorMessage(error),
			});
		}
	}

	private createAgent365Provider(resource: Resource): BasicTracerProvider | undefined {
		const { microsoftAgent365ExportEnabled, microsoftAgent365TracingEnabled } =
			this.tracingSourcesConfig;
		if (!microsoftAgent365ExportEnabled) return undefined;

		return createAgent365TracerProvider(resource, [
			new SampledSpanProcessor(
				this.customerDecisions,
				this.sampler,
				microsoftAgent365TracingEnabled ? this.spanProcessor : undefined,
			),
		]);
	}

	private dedicatedProviders(): Map<string, TracerProvider> {
		return new Map(
			this.agent365Provider ? [[MICROSOFT_AGENT_365_TRACER_NAME, this.agent365Provider]] : [],
		);
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

	private useDiagnosticsLogger(): void {
		diag.setLogger(this.diagnosticsLogger(), {
			logLevel: diagLogLevelFromString(getStringFromEnv('OTEL_LOG_LEVEL')) ?? DiagLogLevel.WARN,
			suppressOverrideMessage: true,
		});
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

function resourceDetectors(): ResourceDetector[] {
	const names = getStringListFromEnv('OTEL_NODE_RESOURCE_DETECTORS');
	if (!names) return [envDetector, processDetector, hostDetector];
	if (names.includes('all')) return Object.values(RESOURCE_DETECTORS);
	if (names.includes('none')) return [];

	return names.flatMap((name) => RESOURCE_DETECTORS[name] ?? []);
}
