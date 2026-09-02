import type { Metadata } from '@grpc/grpc-js';
import { exporterEndpointSchema, otlpProtocolSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import type { DiagLogger } from '@opentelemetry/api';
import { DiagLogLevel, diag, context, metrics, propagation, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
	BasicTracerProvider,
	type ReadableSpan,
	type SpanExporter,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import type { OtelConnectionParams } from './otel-settings.service';
import { OtelSettingsService } from './otel-settings.service';
import { OtelConfig } from './otel.config';
import { ATTR, OTEL_ENV_VARS, OTEL_TEST_SPAN_NAME } from './otel.constants';

import { N8N_VERSION } from '@/constants';

export type OtelTestTraceResult = { success: true } | { success: false; error: string };

@Service()
export class OtelService {
	private static isDiagnosticsLoggerConfigured = false;
	private sdk?: NodeSDK;
	private hasLoggedStartupConnectivityFailure = false;

	/** Incremented by every start, so a probe from an earlier start can be discarded. */
	private startGeneration = 0;

	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async init(): Promise<void> {
		const settings = await this.otelSettingsService.loadSettings();
		this.warnAboutInvalidEnvValues(settings);
		await this.start(settings);
	}

	async restart(): Promise<void> {
		await this.shutdown();
		const settings = await this.otelSettingsService.loadSettings();
		await this.start(settings);
	}

	/**
	 * Sends a single `n8n.test_trace` span to the given OTLP endpoint and waits
	 * for the exporter's result. Unlike the long-running SDK (which batches spans
	 * fire-and-forget), this uses a throwaway provider/exporter so the collector's
	 * response — success, a rejection (HTTP status or gRPC status code), or a
	 * network error — can be reported back to the caller. Runs independently of
	 * the active OTel configuration.
	 */
	async sendTestTrace(connection: OtelConnectionParams): Promise<OtelTestTraceResult> {
		let provider: BasicTracerProvider | undefined;
		try {
			const exporter = await this.createTraceExporter(
				connection,
				connection.startupConnectivityTimeoutMs,
			);

			try {
				return await new Promise<OtelTestTraceResult>((resolve) => {
					const processor: SpanProcessor = {
						onStart: () => {},
						onEnd: (span: ReadableSpan) =>
							exporter.export([span], (result) =>
								resolve(
									result.error
										? { success: false, error: result.error.message }
										: { success: true },
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
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	private async start(settings: OtelConfig): Promise<void> {
		const generation = ++this.startGeneration;
		this.hasLoggedStartupConnectivityFailure = false;
		if (!settings.enabled) return;

		this.configureDiagnosticsLogger();
		try {
			await this.startSdk(settings);
		} catch (error) {
			this.logger.error('Failed to start OpenTelemetry tracing, so tracing stays off', {
				error: error instanceof Error ? error.message : String(error),
			});
			// `NodeSDK.start()` can throw after it installed some global providers.
			await this.shutdown();
			return;
		}

		void this.checkEndpointReachability(settings, generation);
	}

	async shutdown(): Promise<void> {
		// A probe that fails during teardown must not log for the endpoint n8n is leaving.
		this.startGeneration++;
		try {
			await this.sdk?.shutdown();
		} catch (error) {
			this.logger.warn(
				'Failed to cleanly shut down OpenTelemetry SDK (exporter flush may have failed)',
				{ error: error instanceof Error ? error.message : String(error) },
			);
		} finally {
			this.sdk = undefined;

			// Unregister the global providers so the next NodeSDK.start() can register
			// new ones. Without this, OTel's allowOverride=false guard blocks
			// re-registration and the restart silently fails.
			trace?.disable();
			context?.disable();
			propagation?.disable();
			metrics?.disable();
		}
	}

	private async startSdk(settings: OtelConfig): Promise<void> {
		const traceExporter = await this.createTraceExporter(settings);

		this.sdk = new NodeSDK({
			resource: resourceFromAttributes({
				[ATTR.OTEL_SERVICE_NAME]: settings.exporterServiceName,
				[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
				[ATTR.INSTANCE_ID]: this.instanceSettings.instanceId,
				[ATTR.INSTANCE_ROLE]: this.instanceSettings.instanceType,
			}),
			traceExporter,
			sampler: new TraceIdRatioBasedSampler(settings.tracesSampleRate),
		});

		this.sdk.start();
	}

	private async createTraceExporter(
		connection: OtelConnectionParams,
		timeoutMillis?: number,
	): Promise<SpanExporter> {
		if (connection.exporterProtocol === 'grpc') {
			return await this.createGrpcTraceExporter(connection, timeoutMillis);
		}

		return this.createHttpTraceExporter(connection, timeoutMillis);
	}

	private createHttpTraceExporter(
		connection: OtelConnectionParams,
		timeoutMillis?: number,
	): SpanExporter {
		const headers = this.parseOtlpHeaders(connection.exporterHeaders);
		const url = this.resolveExporterUrl(connection);

		return new OTLPTraceExporter({ url, headers, timeoutMillis });
	}

	/** Imports lazily, so the default protocol never loads grpc-js and its HTTP/2 stack. */
	private async createGrpcTraceExporter(
		connection: OtelConnectionParams,
		timeoutMillis?: number,
	): Promise<SpanExporter> {
		const headers = this.parseOtlpHeaders(connection.exporterHeaders);
		const url = this.resolveExporterUrl(connection);

		const [{ OTLPTraceExporter: OTLPGrpcTraceExporter }, { Metadata }] = await Promise.all([
			import('@opentelemetry/exporter-trace-otlp-grpc'),
			import('@grpc/grpc-js'),
		]);

		return new OTLPGrpcTraceExporter({
			url,
			metadata: this.toGrpcMetadata(headers, new Metadata()),
			timeoutMillis,
		});
	}

	private resolveExporterUrl(
		connection: Pick<
			OtelConnectionParams,
			'exporterProtocol' | 'exporterEndpoint' | 'exporterTracingPath'
		>,
	): string {
		// The gRPC exporter selects TLS with a raw-string `startsWith('http://')`, so
		// an uppercase scheme silently picks TLS against a plaintext collector.
		const endpoint = connection.exporterEndpoint.replace(/^https?:\/\//i, (scheme) =>
			scheme.toLowerCase(),
		);

		return connection.exporterProtocol === 'grpc'
			? endpoint
			: this.buildOtlpTracesUrl(endpoint, connection.exporterTracingPath);
	}

	/**
	 * gRPC metadata keys must be lowercase ASCII, and grpc-js throws on an illegal
	 * key. Headers can come from an env var, so skip and warn instead of failing startup.
	 */
	private toGrpcMetadata(headers: Record<string, string>, metadata: Metadata): Metadata {
		for (const [key, value] of Object.entries(headers)) {
			try {
				metadata.set(key.toLowerCase(), value);
			} catch (error) {
				this.logger.warn(
					`Skipping invalid OTEL exporter header "${key}": ${error instanceof Error ? error.message : String(error)}.`,
				);
			}
		}
		return metadata;
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

	/**
	 * `@n8n/config` only prints to the console when an env var fails its schema, and
	 * the field still reads as env-managed in the UI. Repeat it through the n8n logger.
	 */
	private warnAboutInvalidEnvValues(settings: OtelConfig): void {
		const checks = [
			{
				envVar: OTEL_ENV_VARS.exporterProtocol,
				parse: (value: string) => otlpProtocolSchema.safeParse(value),
				valueInUse: settings.exporterProtocol,
			},
			{
				envVar: OTEL_ENV_VARS.exporterEndpoint,
				parse: (value: string) => exporterEndpointSchema.safeParse(value),
				valueInUse: settings.exporterEndpoint,
			},
		];

		for (const { envVar, parse, valueInUse } of checks) {
			const rawValue = process.env[envVar];
			if (rawValue === undefined) continue;

			const result = parse(rawValue);
			if (result.success) continue;

			this.logger.warn(
				`Ignoring the invalid value "${rawValue}" of ${envVar}. n8n uses "${valueInUse}" instead. ${result.error.issues[0].message}`,
			);
		}
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

	private async checkEndpointReachability(settings: OtelConfig, generation: number): Promise<void> {
		const url = this.resolveExporterUrl(settings);
		const timeoutMs = settings.startupConnectivityTimeoutMs;

		try {
			if (settings.exporterProtocol === 'grpc') {
				await this.probeGrpcEndpoint(url, timeoutMs);
			} else {
				await this.probeHttpEndpoint(url, timeoutMs);
			}
		} catch (error) {
			// A probe of a previous start can settle after a restart. Its result
			// describes an endpoint that the instance no longer exports to.
			if (generation !== this.startGeneration) return;
			if (this.hasLoggedStartupConnectivityFailure) return;
			this.hasLoggedStartupConnectivityFailure = true;

			this.logger.error('Failed to connect to OpenTelemetry OTLP endpoint during startup', {
				endpoint: url,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async probeHttpEndpoint(url: string, timeoutMs: number): Promise<void> {
		// OTLP endpoints are POST-only, so a 4xx still means the server is reachable.
		// SSRF is disabled: the OTLP endpoint is admin-configured observability
		// infrastructure and is commonly an internal/localhost collector.
		await this.outboundHttp.transport({ useDefaultSsrfPolicy: 'unsafe' }).asCustomFetch()(url, {
			method: 'HEAD',
			signal: AbortSignal.timeout(timeoutMs),
		});
	}

	/**
	 * Channel readiness proves TCP, the TLS handshake, and HTTP/2. The probe stays
	 * advisory: only "Send test trace" proves that the endpoint serves OTLP.
	 */
	private async probeGrpcEndpoint(endpoint: string, timeoutMs: number): Promise<void> {
		const { host, port, protocol } = new URL(endpoint);
		const { Client, credentials } = await import('@grpc/grpc-js');
		const client = new Client(
			host,
			protocol === 'https:' ? credentials.createSsl() : credentials.createInsecure(),
			{},
		);

		try {
			await new Promise<void>((resolve, reject) => {
				client.waitForReady(Date.now() + timeoutMs, (error) => {
					if (!error) return resolve();

					const portHint = port
						? ''
						: ' The endpoint has no port, so grpc-js dials its default 443, not 4317.';
					const tlsHint =
						protocol === 'https:'
							? ' This check ignores the OTEL_EXPORTER_OTLP_CERTIFICATE, client key and client certificate variables, so a private-CA or mTLS collector can fail it and still receive spans.'
							: '';

					reject(
						new OperationalError(
							`gRPC channel to "${host}" was not ready after ${timeoutMs}ms (${error.message}): nothing listens there, or it does not speak gRPC, or its TLS mode does not match the "${protocol}" scheme.${portHint}${tlsHint}`,
						),
					);
				});
			});
		} finally {
			client.close();
		}
	}
}
