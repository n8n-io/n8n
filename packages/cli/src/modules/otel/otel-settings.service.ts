import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { OtelConfig } from './otel.config';
import { OTEL_ENV_VARS } from './otel.constants';

export const OTEL_SETTINGS_KEY = 'features.otel';

export type OtelSettingsResponse = OtelConfig & {
	envManagedFields: Array<keyof OtelConfig>;
};

export type OtelConnectionParams = Pick<
	OtelConfig,
	| 'exporterEndpoint'
	| 'exporterTracingPath'
	| 'exporterServiceName'
	| 'exporterHeaders'
	| 'startupConnectivityTimeoutMs'
>;

@Service()
export class OtelSettingsService {
	private currentSettings: OtelConfig | null = null;

	private envManagedFields: Array<keyof OtelConfig> = [];

	constructor(
		private readonly config: OtelConfig,
		private readonly settingsRepository: SettingsRepository,
	) {}

	getSettings(): OtelSettingsResponse {
		if (!this.currentSettings) throw new Error('OTel settings not yet initialized');
		return { ...this.currentSettings, envManagedFields: this.envManagedFields };
	}

	/**
	 * Reloads settings from DB with env-var priority applied.
	 */
	async loadSettings(): Promise<OtelConfig> {
		const persisted = await this.getPersistedSettings();

		this.envManagedFields = (Object.keys(OTEL_ENV_VARS) as Array<keyof OtelConfig>).filter((key) =>
			this.isEnvManaged(key),
		);

		this.currentSettings = this.buildConfig((key) =>
			this.isEnvManaged(key) ? this.config[key] : (persisted?.[key] ?? this.config[key]),
		);

		return this.currentSettings;
	}

	private async getPersistedSettings(): Promise<Partial<OtelConfig> | undefined> {
		const row = await this.settingsRepository.findByKey(OTEL_SETTINGS_KEY);
		if (!row?.value) return undefined;
		return jsonParse<Partial<OtelConfig>>(row.value, { fallbackValue: undefined });
	}

	async saveSettings(incoming: OtelConfig): Promise<void> {
		// Env-var fields always win — override any frontend-submitted values with
		// the canonical env-var value so the DB stays consistent even if a client
		// sends a stale or tampered payload.
		const sanitized = this.buildConfig((key) =>
			this.isEnvManaged(key) ? this.config[key] : incoming[key],
		);
		const existing = await this.settingsRepository.findByKey(OTEL_SETTINGS_KEY);
		const value = JSON.stringify(sanitized);
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

	resolveTestConnection(incoming: OtelConnectionParams): OtelConnectionParams {
		const pick = <K extends keyof OtelConnectionParams>(key: K): OtelConnectionParams[K] =>
			this.isEnvManaged(key) ? this.config[key] : incoming[key];
		return {
			exporterEndpoint: pick('exporterEndpoint'),
			exporterTracingPath: pick('exporterTracingPath'),
			exporterServiceName: pick('exporterServiceName'),
			exporterHeaders: pick('exporterHeaders'),
			startupConnectivityTimeoutMs: pick('startupConnectivityTimeoutMs'),
		};
	}

	private isEnvManaged(key: keyof OtelConfig): boolean {
		return process.env[OTEL_ENV_VARS[key]] !== undefined;
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
}
