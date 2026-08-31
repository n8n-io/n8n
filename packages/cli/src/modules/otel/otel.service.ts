import type { Metadata } from '@grpc/grpc-js';
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
import { connect } from 'node:net';

import type { OtelConnectionParams } from './otel-settings.service';
import { OtelSettingsService } from './otel-settings.service';
import { OtelConfig } from './otel.config';
import type { OtlpProtocol } from './otel.constants';
import { ATTR, OTEL_TEST_SPAN_NAME } from './otel.constants';

import { N8N_VERSION } from '@/constants';

export type OtelTestTraceResult = { success: true } | { success: false; error: string };

/** Connection parameters plus an optional per-export deadline. */
type OtelExporterParams = OtelConnectionParams & { timeoutMillis?: number };

/** What the startup connectivity check dials, and how. */
type OtlpProbeTarget = { protocol: OtlpProtocol; url: string };

/**
 * Conventional OTLP/gRPC port, used by the startup probe when the endpoint URL
 * carries none. This deliberately diverges from the exporter, which hands
 * grpc-js `URL.host` and lets its resolver default to 443 — and since `URL.host`
 * elides a scheme's default port, `http://host:80` and `https://host:443` also
 * reach the probe port-less. The probe is advisory (an open port is not proof of
 * an OTLP service); the test trace is the real check, so don't align one side of
 * this divergence without the other.
 */
const DEFAULT_OTLP_GRPC_PORT = 4317;

@Service()
export class OtelService {
	private static isDiagnosticsLoggerConfigured = false;
	private sdk?: NodeSDK;
	private hasLoggedStartupConnectivityFailure = false;

	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async init(): Promise<void> {
		const settings = await this.otelSettingsService.loadSettings();
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
		const exporter = await this.createTraceExporter({
			...connection,
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

	private async start(settings: OtelConfig): Promise<void> {
		this.hasLoggedStartupConnectivityFailure = false;
		if (!settings.enabled) return;

		this.configureDiagnosticsLogger();
		const probeTarget = await this.startSdk(settings);
		void this.checkEndpointReachability(probeTarget, settings.startupConnectivityTimeoutMs);
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

	private async startSdk(settings: OtelConfig): Promise<OtlpProbeTarget> {
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
		return { protocol: settings.exporterProtocol, url: this.resolveExporterUrl(settings) };
	}

	/**
	 * Builds the OTLP trace exporter for the configured wire protocol. The gRPC
	 * exporter and grpc-js are imported lazily so instances on the default
	 * HTTP/protobuf protocol never load grpc-js and its HTTP/2 stack.
	 */
	private async createTraceExporter(connection: OtelExporterParams): Promise<SpanExporter> {
		const headers = this.parseOtlpHeaders(connection.exporterHeaders);
		const url = this.resolveExporterUrl(connection);

		if (connection.exporterProtocol === 'grpc') {
			const [{ OTLPTraceExporter: OTLPGrpcTraceExporter }, { Metadata }] = await Promise.all([
				import('@opentelemetry/exporter-trace-otlp-grpc'),
				import('@grpc/grpc-js'),
			]);

			return new OTLPGrpcTraceExporter({
				url,
				metadata: this.toGrpcMetadata(headers, new Metadata()),
				timeoutMillis: connection.timeoutMillis,
			});
		}

		return new OTLPTraceExporter({ url, headers, timeoutMillis: connection.timeoutMillis });
	}

	/**
	 * Where spans are sent: the traces path is appended for HTTP, while gRPC
	 * endpoints are used as-is — gRPC carries no URL path and the exporter
	 * derives TLS from the scheme (`https://` → SSL, `http://` → insecure).
	 */
	private resolveExporterUrl(
		connection: Pick<
			OtelConnectionParams,
			'exporterProtocol' | 'exporterEndpoint' | 'exporterTracingPath'
		>,
	): string {
		return connection.exporterProtocol === 'grpc'
			? connection.exporterEndpoint
			: this.buildOtlpTracesUrl(connection.exporterEndpoint, connection.exporterTracingPath);
	}

	/**
	 * Copies parsed OTLP headers into gRPC metadata. Keys are lowercased because
	 * gRPC metadata keys are lowercase ASCII, and grpc-js throws on anything it
	 * considers illegal — since headers can come from an env var, an unusable
	 * entry is skipped with a warning rather than failing startup.
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

	private async checkEndpointReachability(
		target: OtlpProbeTarget,
		timeoutMs: number,
	): Promise<void> {
		try {
			if (target.protocol === 'grpc') {
				await this.probeTcpPort(target.url, timeoutMs);
			} else {
				await this.probeHttpEndpoint(target.url, timeoutMs);
			}
		} catch (error) {
			if (this.hasLoggedStartupConnectivityFailure) return;
			this.hasLoggedStartupConnectivityFailure = true;

			this.logger.error('Failed to connect to OpenTelemetry OTLP endpoint during startup', {
				endpoint: target.url,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async probeHttpEndpoint(url: string, timeoutMs: number): Promise<void> {
		// HEAD is used for a cheap connectivity check (no request/response body).
		// OTLP endpoints are POST-only, so this will often return 4xx, but any
		// HTTP response means the server is reachable. We only catch network errors.
		// SSRF is disabled: the OTLP endpoint is admin-configured observability
		// infrastructure and is commonly an internal/localhost collector.
		await this.outboundHttp.transport({ useDefaultSsrfPolicy: 'unsafe' }).asCustomFetch()(url, {
			method: 'HEAD',
			signal: AbortSignal.timeout(timeoutMs),
		});
	}

	/**
	 * Opens and immediately closes a TCP connection to the collector. An HTTP HEAD
	 * request is useless against a gRPC server (fetch speaks HTTP/1.1, gRPC needs
	 * HTTP/2), so we only check that the port accepts connections. This does not
	 * prove OTLP/gRPC is served there — "Send test trace" remains the real check.
	 */
	private async probeTcpPort(endpoint: string, timeoutMs: number): Promise<void> {
		const { hostname, port } = new URL(endpoint);
		const socket = connect({
			host: hostname,
			port: port ? Number(port) : DEFAULT_OTLP_GRPC_PORT,
		});
		socket.setTimeout(timeoutMs);

		try {
			await new Promise<void>((resolve, reject) => {
				socket.once('connect', () => resolve());
				socket.once('error', (error: Error) => reject(error));
				socket.once('timeout', () =>
					reject(new OperationalError(`Connection timed out after ${timeoutMs}ms`)),
				);
			});
		} finally {
			socket.destroy();
		}
	}
}
