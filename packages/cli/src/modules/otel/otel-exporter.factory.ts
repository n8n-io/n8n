import type { Metadata } from '@grpc/grpc-js';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { OperationalError } from 'n8n-workflow';

import { parseOtlpHeaders, type OtelConnectionParams } from './otel-settings.service';

export type ExportField = Exclude<keyof OtelConnectionParams, 'startupConnectivityTimeoutMs'>;

export type ExportSettings = Pick<OtelConnectionParams, ExportField>;

@Service()
export class OtelExporterFactory {
	constructor(
		private readonly logger: Logger,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async createTraceExporter(
		connection: ExportSettings,
		timeoutMillis?: number,
	): Promise<SpanExporter> {
		if (connection.exporterProtocol === 'grpc') {
			return await this.createGrpcTraceExporter(connection, timeoutMillis);
		}

		return this.createHttpTraceExporter(connection, timeoutMillis);
	}

	private createHttpTraceExporter(
		connection: ExportSettings,
		timeoutMillis?: number,
	): SpanExporter {
		const headers = this.parseHeaders(connection.exporterHeaders);
		const url = this.resolveExporterUrl(connection);

		return new OTLPTraceExporter({ url, headers, timeoutMillis });
	}

	private async createGrpcTraceExporter(
		connection: ExportSettings,
		timeoutMillis?: number,
	): Promise<SpanExporter> {
		const headers = this.parseHeaders(connection.exporterHeaders);
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

	resolveExporterUrl(
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

	private toGrpcMetadata(headers: Record<string, string>, metadata: Metadata): Metadata {
		for (const [key, value] of Object.entries(headers)) {
			try {
				metadata.set(key.toLowerCase(), value);
			} catch {
				this.logger.warn(
					`Skipping invalid OTEL exporter header "${key}": gRPC metadata does not accept this key or its value.`,
				);
			}
		}
		return metadata;
	}

	private parseHeaders(raw: string): Record<string, string> {
		const { headers, invalidEntries } = parseOtlpHeaders(raw);
		for (const { position, problem } of invalidEntries) {
			this.logger.warn(
				`Skipping invalid OTEL exporter header entry ${position}: ${problem}. Expected format: "key=value".`,
			);
		}
		return headers;
	}

	private buildOtlpTracesUrl(endpoint: string, path: string): string {
		const exporterEndpointWithoutTrailingSlash = endpoint.replace(/\/+$/, '');
		return `${exporterEndpointWithoutTrailingSlash}${path}`;
	}

	async probeEndpoint(connection: OtelConnectionParams): Promise<void> {
		const url = this.resolveExporterUrl(connection);
		const timeoutMs = connection.startupConnectivityTimeoutMs;

		if (connection.exporterProtocol === 'grpc') {
			await this.probeGrpcEndpoint(url, timeoutMs);
		} else {
			await this.probeHttpEndpoint(url, timeoutMs);
		}
	}

	private async probeHttpEndpoint(url: string, timeoutMs: number): Promise<void> {
		// SSRF is disabled: the OTLP endpoint is admin-configured observability
		// infrastructure and is commonly an internal/localhost collector.
		await this.outboundHttp.transport({ useDefaultSsrfPolicy: 'unsafe' }).asCustomFetch()(url, {
			method: 'HEAD',
			signal: AbortSignal.timeout(timeoutMs),
		});
	}

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
