import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { CREDENTIAL_BLANKING_VALUE, jsonParse } from 'n8n-workflow';

import { OtelConfig } from './otel.config';
import { OTEL_ENV_VARS } from './otel.constants';

export const OTEL_SETTINGS_KEY = 'features.otel';

export type OtelSettingsResponse = OtelConfig & {
	envManagedFields: Array<keyof OtelConfig>;
};

export type OtelConnectionParams = Pick<
	OtelConfig,
	| 'exporterProtocol'
	| 'exporterEndpoint'
	| 'exporterTracingPath'
	| 'exporterServiceName'
	| 'exporterHeaders'
	| 'startupConnectivityTimeoutMs'
>;

type HeaderEntry = [key: string, value: string];

export type InvalidHeaderEntry = {
	position: number;
	problem: 'missing "=" separator' | 'empty key';
};

export function parseOtlpHeaders(raw: string): {
	headers: Record<string, string>;
	invalidEntries: InvalidHeaderEntry[];
} {
	const headers: Record<string, string> = {};
	const invalidEntries: InvalidHeaderEntry[] = [];
	for (const [index, pair] of raw.split(',').entries()) {
		const trimmedPair = pair.trim();
		if (!trimmedPair) continue;

		const position = index + 1;
		if (!trimmedPair.includes('=')) {
			invalidEntries.push({ position, problem: 'missing "=" separator' });
			continue;
		}

		const [key, ...rest] = trimmedPair.split('=');
		const trimmedKey = key.trim();
		if (!trimmedKey) {
			invalidEntries.push({ position, problem: 'empty key' });
			continue;
		}

		headers[trimmedKey] = rest.join('=').trim();
	}
	return { headers, invalidEntries };
}

@Service()
export class OtelSettingsService {
	private currentSettings: OtelConfig | null = null;

	private envManagedFields: Array<keyof OtelConfig> = [];

	constructor(
		private readonly config: OtelConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly logger: Logger,
	) {}

	getSettings(): OtelSettingsResponse {
		if (!this.currentSettings) throw new Error('OTel settings not yet initialized');
		return {
			...this.currentSettings,
			// Header keys stay visible; values never leave the server. A blanked
			// value marks a stored value; an empty value means unset.
			exporterHeaders: this.redactHeaders(this.currentSettings.exporterHeaders),
			envManagedFields: this.envManagedFields,
		};
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
		return this.parsePersisted(row?.value);
	}

	private parsePersisted(value: string | null | undefined): Partial<OtelConfig> | undefined {
		if (!value) return undefined;
		try {
			const persisted: unknown = jsonParse(value);
			// The DB row is not shape-checked, so validate before it reaches any consumer
			if (!isRecord(persisted)) {
				this.logger.warn(
					'Persisted OTel settings are not a settings object; using defaults instead',
				);
				return undefined;
			}
			const settings = persisted as Partial<OtelConfig>;
			if ('exporterHeaders' in settings && typeof settings.exporterHeaders !== 'string') {
				this.logger.warn(
					'Persisted OTel settings contain a non-string exporterHeaders value; using the default instead',
				);
				delete settings.exporterHeaders;
			}
			return settings;
		} catch (error) {
			this.logger.warn('Persisted OTel settings contain invalid JSON; using defaults instead', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	async saveSettings(incoming: OtelConfig): Promise<void> {
		const existing = await this.settingsRepository.findByKey(OTEL_SETTINGS_KEY);
		const persisted = this.parsePersisted(existing?.value);
		// Env-var fields always win — override any frontend-submitted values with
		// the canonical env-var value so the DB stays consistent even if a client
		// sends a stale or tampered payload.
		const sanitized = this.buildConfig((key) =>
			this.isEnvManaged(key) ? this.config[key] : incoming[key],
		);
		// Blanked values echoed back by a client mean "keep the stored value"
		if (!this.isEnvManaged('exporterHeaders')) {
			sanitized.exporterHeaders = this.resolveHeaders(
				incoming.exporterHeaders,
				persisted?.exporterHeaders ?? '',
			);
		}
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
			exporterProtocol: pick('exporterProtocol'),
			exporterEndpoint: pick('exporterEndpoint'),
			exporterTracingPath: pick('exporterTracingPath'),
			exporterServiceName: pick('exporterServiceName'),
			// A client that echoes a redacted response cannot supply stored values,
			// so blanked values resolve against the effective settings
			exporterHeaders: this.isEnvManaged('exporterHeaders')
				? this.config.exporterHeaders
				: this.resolveHeaders(
						incoming.exporterHeaders,
						this.currentSettings?.exporterHeaders ?? '',
					),
			startupConnectivityTimeoutMs: pick('startupConnectivityTimeoutMs'),
		};
	}

	/** Keys stay visible in API responses; header values never leave the server. */
	private redactHeaders(headers: string): string {
		return this.serializeHeaders(
			this.headerEntries(headers).map(([key, value]) => [
				key,
				value ? CREDENTIAL_BLANKING_VALUE : '',
			]),
		);
	}

	/**
	 * Resolves client-submitted headers against stored ones: a blanked value
	 * means "keep the stored value for this key"; a blanked value with no
	 * stored counterpart has nothing to keep, so the pair is dropped.
	 */
	private resolveHeaders(incoming: string, stored: string): string {
		const storedByKey = new Map(this.headerEntries(stored));
		return this.serializeHeaders(
			this.headerEntries(incoming).flatMap(([key, value]): HeaderEntry[] => {
				if (value !== CREDENTIAL_BLANKING_VALUE) return [[key, value]];
				const storedValue = storedByKey.get(key);
				return storedValue === undefined ? [] : [[key, storedValue]];
			}),
		);
	}

	private headerEntries(headers: string): HeaderEntry[] {
		return Object.entries(parseOtlpHeaders(headers).headers);
	}

	private serializeHeaders(entries: HeaderEntry[]): string {
		return entries.map(([key, value]) => `${key}=${value}`).join(',');
	}

	private isEnvManaged(key: keyof OtelConfig): boolean {
		const envVar = OTEL_ENV_VARS[key];
		// Mirror readEnv() in @n8n/config: a value supplied via `${envVar}_FILE`
		// is env-managed in the same way as one set directly
		return process.env[envVar] !== undefined || !!process.env[`${envVar}_FILE`];
	}

	private buildConfig(pick: <K extends keyof OtelConfig>(key: K) => OtelConfig[K]): OtelConfig {
		return {
			enabled: pick('enabled'),
			exporterProtocol: pick('exporterProtocol'),
			exporterEndpoint: pick('exporterEndpoint'),
			exporterTracingPath: pick('exporterTracingPath'),
			exporterServiceName: pick('exporterServiceName'),
			exporterHeaders: pick('exporterHeaders'),
			tracesSampleRate: pick('tracesSampleRate'),
			startupConnectivityTimeoutMs: pick('startupConnectivityTimeoutMs'),
			includeNodeSpans: pick('includeNodeSpans'),
			emitWorkflowStartSpan: pick('emitWorkflowStartSpan'),
			emitNodeStartSpan: pick('emitNodeStartSpan'),
			injectOutbound: pick('injectOutbound'),
			productionExecutionsOnly: pick('productionExecutionsOnly'),
		};
	}
}
