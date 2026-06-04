import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { OtelConfig } from './otel.config';
import { OTEL_ENV_VARS } from './otel.constants';

export const OTEL_SETTINGS_KEY = 'features.otel';

@Service()
export class OtelSettingsService {
	/**
	 * Runtime cache — the active config used everywhere (lifecycle handler, tracer,
	 * controller responses, module settings). Populated by `loadEffective()` on
	 * startup and refreshed by `loadSaved()` after a UI save or PubSub reload.
	 */
	currentSettings: OtelConfig | null = null;

	constructor(
		private readonly config: OtelConfig,
		private readonly settingsRepository: SettingsRepository,
	) {}

	async getPersistedSettings(): Promise<Partial<OtelConfig> | undefined> {
		const row = await this.settingsRepository.findByKey(OTEL_SETTINGS_KEY);
		if (!row?.value) return undefined;
		return jsonParse<Partial<OtelConfig>>(row.value, { fallbackValue: undefined });
	}

	/**
	 * Refreshes currentSettings from DB only (env override skipped). Used after a
	 * UI save or PubSub reload — the user explicitly set values via the UI.
	 */
	async loadSaved(): Promise<OtelConfig> {
		const persisted = await this.getPersistedSettings();
		this.currentSettings = this.buildConfig((key) => persisted?.[key] ?? this.config[key]);
		return this.currentSettings;
	}

	/**
	 * Refreshes currentSettings from DB + env override. Used only on initial
	 * startup; after that, UI/pubsub reloads use `loadSaved()` (DB only).
	 */
	async loadEffective(): Promise<OtelConfig> {
		const persisted = await this.getPersistedSettings();
		this.currentSettings = this.buildConfig((key) =>
			process.env[OTEL_ENV_VARS[key]] !== undefined
				? this.config[key]
				: (persisted?.[key] ?? this.config[key]),
		);
		return this.currentSettings;
	}

	private buildConfig(pick: <K extends keyof OtelConfig>(key: K) => OtelConfig[K]): OtelConfig {
		return {
			enabled: pick('enabled'),
			exporterEndpoint: pick('exporterEndpoint'),
			exporterTracingPath: pick('exporterTracingPath'),
			exporterServiceName: pick('exporterServiceName'),
			exporterHeaders: pick('exporterHeaders'),
			tracesSampleRate: pick('tracesSampleRate'),
			startupConnectivityTimeoutMs: pick('startupConnectivityTimeoutMs'),
			includeNodeSpans: pick('includeNodeSpans'),
			injectOutbound: pick('injectOutbound'),
			productionExecutionsOnly: pick('productionExecutionsOnly'),
		};
	}

	async saveSettings(settings: OtelConfig): Promise<void> {
		const existing = await this.settingsRepository.findByKey(OTEL_SETTINGS_KEY);
		const value = JSON.stringify(settings);
		if (existing) {
			existing.value = value;
			await this.settingsRepository.save(existing, { transaction: false });
		} else {
			await this.settingsRepository.save(
				{ key: OTEL_SETTINGS_KEY, value, loadOnStartup: true },
				{ transaction: false },
			);
		}
	}
}
