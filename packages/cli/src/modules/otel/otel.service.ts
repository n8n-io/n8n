import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';

import { OtelConfig } from './otel.config';
import { ATTR } from './otel.constants';

@Service()
export class OtelService {
	private sdk?: NodeSDK;

	constructor(
		private readonly config: OtelConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	init() {
		if (!this.config.enabled) return;

		this.sdk = new NodeSDK({
			resource: resourceFromAttributes({
				[ATTR.OTEL_SERVICE_NAME]: this.config.exporterServiceName,
				[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
				[ATTR.INSTANCE_ID]: this.instanceSettings.instanceId,
				[ATTR.INSTANCE_ROLE]: this.instanceSettings.instanceType,
			}),
			traceExporter: new OTLPTraceExporter({
				url: `${this.config.exporterEndpoint}${this.config.exporterTracingPath}`,
				headers: this.config.exporterHeaders ? this.parseHeaders(this.config.exporterHeaders) : {},
			}),
			sampler: new TraceIdRatioBasedSampler(this.config.tracesSampleRate),
		});

		this.sdk.start();
	}

	async shutdown(): Promise<void> {
		await this.sdk?.shutdown();
	}

	parseHeaders(exporterHeaders: string): Record<string, string> {
		const headers: Record<string, string> = {};
		for (const pair of exporterHeaders.split(',')) {
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
}
