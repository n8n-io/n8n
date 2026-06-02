import { Service } from '@n8n/di';
import { SettingsRepository } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { trace } from '@opentelemetry/api';

import { OtelConfig } from './otel.config';

export interface OtelDbSettings {
	enabled: boolean;
	exporterEndpoint: string;
	exporterTracingPath: string;
	exporterHeaders: Array<{ key: string; value: string }>;
	exporterServiceName: string;
	tracesSampleRate: number;
	startupConnectivityTimeoutMs: number;
	includeNodeSpans: boolean;
	injectOutbound: boolean;
	publishedOnly: boolean;
}

const DB_KEY = 'features.opentelemetry';

// Maps each OtelDbSettings field to the env var that controls it in OtelConfig.
const ENV_KEYS: Record<keyof OtelDbSettings, string> = {
	enabled: 'N8N_OTEL_ENABLED',
	exporterEndpoint: 'N8N_OTEL_EXPORTER_OTLP_ENDPOINT',
	exporterTracingPath: 'N8N_OTEL_EXPORTER_OTLP_TRACING_PATH',
	exporterHeaders: 'N8N_OTEL_EXPORTER_OTLP_HEADERS',
	exporterServiceName: 'N8N_OTEL_EXPORTER_SERVICE_NAME',
	tracesSampleRate: 'N8N_OTEL_TRACES_SAMPLE_RATE',
	startupConnectivityTimeoutMs: 'N8N_OTEL_STARTUP_CONNECTIVITY_TIMEOUT_MS',
	includeNodeSpans: 'N8N_OTEL_TRACES_INCLUDE_NODE_SPANS',
	injectOutbound: 'N8N_OTEL_TRACES_INJECT_OUTBOUND',
	publishedOnly: 'N8N_OTEL_TRACES_PUBLISHED_ONLY',
};

@Service()
export class OtelSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly otelConfig: OtelConfig,
	) {}

	async getSettings(): Promise<OtelDbSettings | null> {
		const row = await this.settingsRepository.findByKey(DB_KEY);
		if (!row) return null;
		return jsonParse<OtelDbSettings | null>(row.value, { fallbackValue: null });
	}

	/**
	 * Returns the effective settings for the current run:
	 * env var (explicitly set) > DB value > OtelConfig default.
	 */
	async getEffectiveSettings(): Promise<OtelDbSettings> {
		const dbSettings = await this.getSettings();
		const cfg = this.otelConfig;
		const dbHeaders = dbSettings?.exporterHeaders ?? [];

		return {
			enabled: this.effectiveValue('enabled', dbSettings?.enabled, cfg.enabled),
			exporterEndpoint: this.effectiveValue(
				'exporterEndpoint',
				dbSettings?.exporterEndpoint,
				cfg.exporterEndpoint,
			),
			exporterTracingPath: this.effectiveValue(
				'exporterTracingPath',
				dbSettings?.exporterTracingPath,
				cfg.exporterTracingPath,
			),
			// Headers: env var wins as a whole if set; otherwise use DB array; otherwise parse config default.
			exporterHeaders:
				process.env[ENV_KEYS.exporterHeaders] !== undefined
					? this.parseHeadersString(cfg.exporterHeaders)
					: dbHeaders,
			exporterServiceName: this.effectiveValue(
				'exporterServiceName',
				dbSettings?.exporterServiceName,
				cfg.exporterServiceName,
			),
			tracesSampleRate: this.effectiveValue(
				'tracesSampleRate',
				dbSettings?.tracesSampleRate,
				cfg.tracesSampleRate,
			),
			startupConnectivityTimeoutMs: this.effectiveValue(
				'startupConnectivityTimeoutMs',
				dbSettings?.startupConnectivityTimeoutMs,
				cfg.startupConnectivityTimeoutMs,
			),
			includeNodeSpans: this.effectiveValue(
				'includeNodeSpans',
				dbSettings?.includeNodeSpans,
				cfg.includeNodeSpans,
			),
			injectOutbound: this.effectiveValue(
				'injectOutbound',
				dbSettings?.injectOutbound,
				cfg.injectOutbound,
			),
			publishedOnly: this.effectiveValue(
				'publishedOnly',
				dbSettings?.publishedOnly,
				cfg.publishedOnly,
			),
		};
	}

	async saveSettings(patch: Partial<OtelDbSettings>): Promise<OtelDbSettings> {
		const current = await this.getSettings();
		const updated: OtelDbSettings = {
			...(current ?? this.configDefaults()),
			...patch,
		};
		await this.settingsRepository.upsert(
			{ key: DB_KEY, value: JSON.stringify(updated), loadOnStartup: false },
			['key'],
		);
		return updated;
	}

	/**
	 * Applies effective settings onto the OtelConfig singleton so that
	 * OtelService / OtelLifecycleHandler / ExecutionLevelTracer pick them up
	 * without modification.
	 */
	async applyToConfig(): Promise<void> {
		const effective = await this.getEffectiveSettings();
		const cfg = this.otelConfig;

		cfg.enabled = effective.enabled;
		cfg.exporterEndpoint = effective.exporterEndpoint;
		cfg.exporterTracingPath = effective.exporterTracingPath;
		cfg.exporterHeaders = this.headersToString(effective.exporterHeaders);
		cfg.exporterServiceName = effective.exporterServiceName;
		cfg.tracesSampleRate = effective.tracesSampleRate;
		cfg.startupConnectivityTimeoutMs = effective.startupConnectivityTimeoutMs;
		cfg.includeNodeSpans = effective.includeNodeSpans;
		cfg.injectOutbound = effective.injectOutbound;
		cfg.publishedOnly = effective.publishedOnly;
	}

	/**
	 * Sends a single test span to the currently-saved OTLP endpoint.
	 * Creates a temporary SDK instance — does not require OTEL to be running.
	 */
	async sendTestTrace(settings: OtelDbSettings): Promise<{ sentAt: string }> {
		const endpoint = settings.exporterEndpoint.replace(/\/+$/, '') + settings.exporterTracingPath;

		const headers: Record<string, string> = {};
		for (const { key, value } of settings.exporterHeaders) {
			if (key.trim()) headers[key.trim()] = value;
		}

		const exporter = new OTLPTraceExporter({ url: endpoint, headers });
		const sdk = new NodeSDK({
			resource: resourceFromAttributes({ 'service.name': settings.exporterServiceName }),
			traceExporter: exporter,
			sampler: new TraceIdRatioBasedSampler(1),
		});

		sdk.start();
		const sentAt = new Date().toISOString();

		try {
			const tracer = trace.getTracer('n8n-otel-test');
			const span = tracer.startSpan('n8n.test_trace');
			span.end();
			// Allow the SDK's internal queue to flush before shutting down.
			await sdk.shutdown();
		} catch {
			await sdk.shutdown().catch(() => {});
		}

		return { sentAt };
	}

	// ---- helpers ----------------------------------------------------------------

	private effectiveValue<K extends keyof OtelDbSettings>(
		field: K,
		dbValue: OtelDbSettings[K] | undefined,
		configDefault: OtelDbSettings[K],
	): OtelDbSettings[K] {
		const envKey = ENV_KEYS[field];
		// If the env var is explicitly present in the environment, the OtelConfig
		// already holds the parsed value (it was set via @Env decorator) — use it.
		if (process.env[envKey] !== undefined) return configDefault;
		// Otherwise prefer DB, fall back to OtelConfig default.
		return dbValue !== undefined ? dbValue : configDefault;
	}

	parseHeadersString(raw: string): Array<{ key: string; value: string }> {
		const result: Array<{ key: string; value: string }> = [];
		for (const pair of raw.split(',')) {
			const trimmed = pair.trim();
			if (!trimmed) continue;
			const idx = trimmed.indexOf('=');
			if (idx === -1) continue;
			result.push({ key: trimmed.slice(0, idx).trim(), value: trimmed.slice(idx + 1).trim() });
		}
		return result;
	}

	headersToString(headers: Array<{ key: string; value: string }>): string {
		return headers
			.filter((h) => h.key.trim())
			.map((h) => `${h.key}=${h.value}`)
			.join(',');
	}

	private configDefaults(): OtelDbSettings {
		const cfg = this.otelConfig;
		return {
			enabled: cfg.enabled,
			exporterEndpoint: cfg.exporterEndpoint,
			exporterTracingPath: cfg.exporterTracingPath,
			exporterHeaders: [],
			exporterServiceName: cfg.exporterServiceName,
			tracesSampleRate: cfg.tracesSampleRate,
			startupConnectivityTimeoutMs: cfg.startupConnectivityTimeoutMs,
			includeNodeSpans: cfg.includeNodeSpans,
			injectOutbound: cfg.injectOutbound,
			publishedOnly: cfg.publishedOnly,
		};
	}
}
