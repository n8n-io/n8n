import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { DiagLogger } from '@opentelemetry/api';
import { DiagLogLevel, diag, context, metrics, propagation, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';

import { OtelSettingsService } from './otel-settings.service';
import { OtelConfig } from './otel.config';
import { ATTR } from './otel.constants';

@Service()
export class OtelService {
	private static isDiagnosticsLoggerConfigured = false;
	private sdk?: NodeSDK;
	private hasLoggedStartupConnectivityFailure = false;

	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	async init(): Promise<void> {
		const settings = await this.otelSettingsService.loadEffective();
		this.start(settings);
	}

	async restart(): Promise<void> {
		await this.shutdown();
		const settings = await this.otelSettingsService.loadSaved();
		this.start(settings);
	}

	private start(settings: OtelConfig): void {
		this.hasLoggedStartupConnectivityFailure = false;
		if (!settings.enabled) return;

		this.configureDiagnosticsLogger();
		void this.checkEndpointReachability(this.startSdk(settings));
	}

	async shutdown(): Promise<void> {
		await this.sdk?.shutdown();
		this.sdk = undefined;

		// Unregister the global providers so the next NodeSDK.start() can register
		// new ones. Without this, OTel's allowOverride=false guard blocks
		// re-registration and the restart silently fails.
		trace.disable();
		context.disable();
		propagation.disable();
		metrics.disable();
	}

	private startSdk(settings: OtelConfig): string {
		const otlpTracesUrl = this.buildOtlpTracesUrl(
			settings.exporterEndpoint,
			settings.exporterTracingPath,
		);
		const otlpHeaders = this.parseOtlpHeaders(settings.exporterHeaders);

		this.sdk = new NodeSDK({
			resource: resourceFromAttributes({
				[ATTR.OTEL_SERVICE_NAME]: settings.exporterServiceName,
				[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
				[ATTR.INSTANCE_ID]: this.instanceSettings.instanceId,
				[ATTR.INSTANCE_ROLE]: this.instanceSettings.instanceType,
			}),
			traceExporter: new OTLPTraceExporter({
				url: otlpTracesUrl,
				headers: otlpHeaders,
			}),
			sampler: new TraceIdRatioBasedSampler(settings.tracesSampleRate),
		});

		this.sdk.start();
		return otlpTracesUrl;
	}

	parseOtlpHeaders(headersToSplit: string): Record<string, string> {
		const headers: Record<string, string> = {};
		for (const pair of headersToSplit.split(',')) {
			const trimmedPair = pair.trim();
			if (!trimmedPair) continue;

			if (!trimmedPair.includes('=')) {
				this.logger.warn(
					`Skipping invalid OTEL exporter header "${trimmedPair}": missing "=" separator. Expected format: "key=value".`,
				);
				continue;
			}

			const [key, ...rest] = trimmedPair.split('=');
			const trimmedKey = key.trim();
			if (!trimmedKey) {
				this.logger.warn(
					`Skipping invalid OTEL exporter header "${trimmedPair}": empty key. Expected format: "key=value".`,
				);
				continue;
			}

			headers[trimmedKey] = rest.join('=').trim();
		}
		return headers;
	}

	private configureDiagnosticsLogger() {
		if (OtelService.isDiagnosticsLoggerConfigured) return;

		const diagnosticsLogger: DiagLogger = {
			error: (...args: unknown[]) => this.logger.error('OpenTelemetry diagnostics error', { args }),
			warn: (...args: unknown[]) => this.logger.warn('OpenTelemetry diagnostics warning', { args }),
			info: (...args: unknown[]) => this.logger.info('OpenTelemetry diagnostics info', { args }),
			debug: (...args: unknown[]) => this.logger.debug('OpenTelemetry diagnostics debug', { args }),
			verbose: (...args: unknown[]) =>
				this.logger.debug('OpenTelemetry diagnostics verbose', { args }),
		};
		diag.setLogger(diagnosticsLogger, DiagLogLevel.WARN);
		OtelService.isDiagnosticsLoggerConfigured = true;
	}

	private buildOtlpTracesUrl(endpoint: string, path: string): string {
		const exporterEndpointWithoutTrailingSlash = endpoint.replace(/\/+$/, '');
		return `${exporterEndpointWithoutTrailingSlash}${path}`;
	}

	private async checkEndpointReachability(url: string): Promise<void> {
		try {
			// HEAD is used for a cheap connectivity check (no request/response body).
			// OTLP endpoints are POST-only, so this will often return 4xx, but any
			// HTTP response means the server is reachable. We only catch network errors.
			await fetch(url, {
				method: 'HEAD',
				signal: AbortSignal.timeout(
					this.otelSettingsService.currentSettings?.startupConnectivityTimeoutMs ?? 2_000,
				),
			});
		} catch (error) {
			if (this.hasLoggedStartupConnectivityFailure) return;
			this.hasLoggedStartupConnectivityFailure = true;

			this.logger.error('Failed to connect to OpenTelemetry OTLP endpoint during startup', {
				endpoint: url,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
