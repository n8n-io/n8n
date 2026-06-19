import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { DiagLogger } from '@opentelemetry/api';
import { DiagLogLevel, diag, context, metrics, propagation, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
	BasicTracerProvider,
	type ReadableSpan,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { InstanceSettings } from 'n8n-core';

import type { OtelConnectionParams } from './otel-settings.service';
import { OtelSettingsService } from './otel-settings.service';
import { OtelConfig } from './otel.config';
import { ATTR, OTEL_TEST_SPAN_NAME } from './otel.constants';

import { N8N_VERSION } from '@/constants';

export type OtelTestTraceResult = { success: true } | { success: false; error: string };

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
		const settings = await this.otelSettingsService.loadSettings();
		this.start(settings);
	}

	async restart(): Promise<void> {
		await this.shutdown();
		const settings = await this.otelSettingsService.loadSettings();
		this.start(settings);
	}

	/**
	 * Sends a single `n8n.test_trace` span to the given OTLP endpoint and waits
	 * for the exporter's result. Unlike the long-running SDK (which batches spans
	 * fire-and-forget), this uses a throwaway provider/exporter so the collector's
	 * response — success, an HTTP rejection, or a network error — can be reported
	 * back to the caller. Runs independently of the active OTel configuration.
	 */
	async sendTestTrace(connection: OtelConnectionParams): Promise<OtelTestTraceResult> {
		const url = this.buildOtlpTracesUrl(
			connection.exporterEndpoint,
			connection.exporterTracingPath,
		);
		const exporter = new OTLPTraceExporter({
			url,
			headers: this.parseOtlpHeaders(connection.exporterHeaders),
			timeoutMillis: connection.startupConnectivityTimeoutMs,
		});

		let provider: BasicTracerProvider | undefined;
		try {
			return await new Promise<OtelTestTraceResult>((resolve) => {
				const processor: SpanProcessor = {
					onStart: () => {},
					onEnd: (span: ReadableSpan) =>
						exporter.export([span], (result) =>
							resolve(
								result.error ? { success: false, error: result.error.message } : { success: true },
							),
						),
					forceFlush: async () => {},
					shutdown: async () => {},
				};
				provider = new BasicTracerProvider({
					resource: resourceFromAttributes({
						[ATTR.OTEL_SERVICE_NAME]: connection.exporterServiceName,
						[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
						[ATTR.INSTANCE_ID]: this.instanceSettings.instanceId,
						[ATTR.INSTANCE_ROLE]: this.instanceSettings.instanceType,
					}),
					sampler: new TraceIdRatioBasedSampler(1),
					spanProcessors: [processor],
				});
				const span = provider
					.getTracer('n8n-otel-test')
					.startSpan(OTEL_TEST_SPAN_NAME, { attributes: { [ATTR.IS_TEST_TRACE]: true } });
				span.end();
			});
		} finally {
			await provider?.shutdown().catch(() => {});
			await exporter.shutdown().catch(() => {});
		}
	}

	private start(settings: OtelConfig): void {
		this.hasLoggedStartupConnectivityFailure = false;
		if (!settings.enabled) return;

		this.configureDiagnosticsLogger();
		void this.checkEndpointReachability(
			this.startSdk(settings),
			settings.startupConnectivityTimeoutMs,
		);
	}

	async shutdown(): Promise<void> {
		await this.sdk?.shutdown();
		this.sdk = undefined;

		// Unregister the global providers so the next NodeSDK.start() can register
		// new ones. Without this, OTel's allowOverride=false guard blocks
		// re-registration and the restart silently fails.
		trace?.disable();
		context?.disable();
		propagation?.disable();
		metrics?.disable();
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

	private async checkEndpointReachability(url: string, timeoutMs: number): Promise<void> {
		try {
			// HEAD is used for a cheap connectivity check (no request/response body).
			// OTLP endpoints are POST-only, so this will often return 4xx, but any
			// HTTP response means the server is reachable. We only catch network errors.
			await fetch(url, {
				method: 'HEAD',
				signal: AbortSignal.timeout(timeoutMs),
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
