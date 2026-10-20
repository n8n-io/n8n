import {
	UpdatePublicApiRateLimitSettingsDto,
	type PublicApiRateLimitSettings,
	type PublicApiRateLimitSettingsResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, PublicApiRateLimitConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { jsonParse } from 'n8n-workflow';

export const PUBLIC_API_RATE_LIMIT_SETTINGS_KEY = 'features.publicApiRateLimit';

const ENV_VARS: Record<keyof PublicApiRateLimitSettings, string> = {
	enabled: 'N8N_PUBLIC_API_RATE_LIMIT_ENABLED',
	globalReadLimit: 'N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT',
	globalReadWindowSeconds: 'N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_WINDOW_SECONDS',
	globalWriteLimit: 'N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_LIMIT',
	globalWriteWindowSeconds: 'N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_WRITE_WINDOW_SECONDS',
	endpointReadLimit: 'N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_LIMIT',
	endpointReadWindowSeconds: 'N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_READ_WINDOW_SECONDS',
	endpointWriteLimit: 'N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_LIMIT',
	endpointWriteWindowSeconds: 'N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_WINDOW_SECONDS',
};

const FIELDS = Object.keys(ENV_VARS) as Array<keyof PublicApiRateLimitSettings>;

const LIMIT_FIELDS = [
	'globalReadLimit',
	'globalWriteLimit',
	'endpointReadLimit',
	'endpointWriteLimit',
] as const;

/**
 * Keeps the Public API rate-limit settings in the settings table. An environment variable takes
 * priority over a stored value, and locks its field.
 */
@Service()
export class PublicApiRateLimitSettingsService {
	private loaded: PublicApiRateLimitSettings | undefined;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly logger: Logger,
	) {}

	private get config() {
		return this.globalConfig.publicApi.rateLimit;
	}

	/** The values that the limiter uses. Stored values apply only after `load()`. */
	get settings(): PublicApiRateLimitSettings {
		return this.loaded ?? this.config;
	}

	/** Call once at startup, before the Public API routes are registered. */
	async load() {
		this.loaded = await this.resolveSettings();
	}

	async getSettings(): Promise<PublicApiRateLimitSettingsResponse> {
		return this.toResponse(await this.resolveSettings());
	}

	async saveSettings(
		incoming: PublicApiRateLimitSettings,
	): Promise<PublicApiRateLimitSettingsResponse> {
		const settings = this.buildSettings((field) =>
			this.isEnvManaged(field) ? this.config[field] : incoming[field],
		);

		if (settings.enabled && LIMIT_FIELDS.every((field) => settings[field] === 0)) {
			throw new BadRequestError('Set at least one limit to turn on rate limiting');
		}

		await this.settingsRepository.upsertByKey(
			PUBLIC_API_RATE_LIMIT_SETTINGS_KEY,
			JSON.stringify(settings),
			false,
			{},
		);

		return this.toResponse(settings);
	}

	private toResponse(settings: PublicApiRateLimitSettings): PublicApiRateLimitSettingsResponse {
		return {
			...settings,
			defaults: { ...new PublicApiRateLimitConfig() },
			envManagedFields: FIELDS.filter((field) => this.isEnvManaged(field)),
		};
	}

	private async resolveSettings(): Promise<PublicApiRateLimitSettings> {
		const stored = await this.readStoredSettings();
		return this.buildSettings((field) =>
			this.isEnvManaged(field) ? this.config[field] : (stored?.[field] ?? this.config[field]),
		);
	}

	private async readStoredSettings(): Promise<Partial<PublicApiRateLimitSettings> | undefined> {
		const row = await this.settingsRepository.findByKey(PUBLIC_API_RATE_LIMIT_SETTINGS_KEY);
		if (!row?.value) return undefined;

		try {
			return UpdatePublicApiRateLimitSettingsDto.schema.partial().parse(jsonParse(row.value));
		} catch (error) {
			this.logger.warn('Stored Public API rate-limit settings are invalid. Using the config.', {
				error: ensureError(error),
			});
			return undefined;
		}
	}

	/** Mirrors how `@n8n/config` reads env vars: `_FILE` counts, a blank or quoted blank does not. */
	private isEnvManaged(field: keyof PublicApiRateLimitSettings): boolean {
		const envVar = ENV_VARS[field];
		const value = process.env[envVar]?.trim().replace(/^(['"])(.*)\1$/, '$2');
		return !!value?.trim() || !!process.env[`${envVar}_FILE`];
	}

	private buildSettings(
		pick: <K extends keyof PublicApiRateLimitSettings>(field: K) => PublicApiRateLimitSettings[K],
	): PublicApiRateLimitSettings {
		return {
			enabled: pick('enabled'),
			globalReadLimit: pick('globalReadLimit'),
			globalReadWindowSeconds: pick('globalReadWindowSeconds'),
			globalWriteLimit: pick('globalWriteLimit'),
			globalWriteWindowSeconds: pick('globalWriteWindowSeconds'),
			endpointReadLimit: pick('endpointReadLimit'),
			endpointReadWindowSeconds: pick('endpointReadWindowSeconds'),
			endpointWriteLimit: pick('endpointWriteLimit'),
			endpointWriteWindowSeconds: pick('endpointWriteWindowSeconds'),
		};
	}
}
