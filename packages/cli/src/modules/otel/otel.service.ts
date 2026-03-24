import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';

import { N8N_VERSION } from '@/constants';
import { OtelConfig } from './otel.config';

@Service()
export class OtelService {
	private sdk?: NodeSDK;

	constructor(
		private readonly config: OtelConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	init() {
		if (!this.config.enabled) return;

		this.sdk = new NodeSDK({
			resource: resourceFromAttributes({
				[ATTR_SERVICE_NAME]: 'n8n',
				[ATTR_SERVICE_VERSION]: N8N_VERSION,
				'n8n.instance.id': this.instanceSettings.instanceId,
				'n8n.instance.role': this.instanceSettings.instanceType,
			}),
			traceExporter: new OTLPTraceExporter({
				url: `${this.config.exporterOtlpEndpoint}/v1/traces`,
				headers: this.parseHeaders(),
			}),
			sampler: new TraceIdRatioBasedSampler(this.config.tracesSampleRate),
		});

		this.sdk.start();
	}

	async shutdown(): Promise<void> {
		await this.sdk?.shutdown();
	}

	private parseHeaders(): Record<string, string> {
		if (!this.config.exporterOtlpHeaders) return {};

		const headers: Record<string, string> = {};
		for (const pair of this.config.exporterOtlpHeaders.split(',')) {
			const [key, ...rest] = pair.split('=');
			const trimmedKey = key.trim();
			if (trimmedKey) {
				headers[trimmedKey] = rest.join('=').trim();
			}
		}
		return headers;
	}
}
