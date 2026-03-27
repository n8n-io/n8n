import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

const KEY = 'mcp.access.enabled';
const REDIRECT_URIS_KEY = 'mcp.oauth.allowedRedirectUris';

@Service()
export class McpSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	async getEnabled(): Promise<boolean> {
		const isMcpAccessEnabled = await this.cacheService.get<string>(KEY);

		if (isMcpAccessEnabled !== undefined) {
			return isMcpAccessEnabled === 'true';
		}

		const row = await this.settingsRepository.findByKey(KEY);

		const enabled = row?.value === 'true';

		await this.cacheService.set(KEY, enabled.toString());

		return enabled;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(KEY, enabled.toString());
	}

	async getAllowedRedirectUris(): Promise<string[]> {
		const cachedUris = await this.cacheService.get<string>(REDIRECT_URIS_KEY);

		if (cachedUris !== undefined) {
			return jsonParse<string[]>(cachedUris, { fallbackValue: [] });
		}

		const row = await this.settingsRepository.findByKey(REDIRECT_URIS_KEY);

		const uris: string[] = row?.value ? jsonParse<string[]>(row.value, { fallbackValue: [] }) : [];

		await this.cacheService.set(REDIRECT_URIS_KEY, JSON.stringify(uris));

		return uris;
	}

	async setAllowedRedirectUris(uris: string[]): Promise<void> {
		// Validate URLs
		const validatedUris = this.validateRedirectUris(uris);

		await this.settingsRepository.upsert(
			{ key: REDIRECT_URIS_KEY, value: JSON.stringify(validatedUris), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(REDIRECT_URIS_KEY, JSON.stringify(validatedUris));
	}

	private validateRedirectUris(uris: string[]): string[] {
		// Filter out empty strings and trim whitespace
		const cleanedUris = uris.map((uri) => uri.trim()).filter((uri) => uri.length > 0);

		for (const uri of cleanedUris) {
			try {
				const url = new URL(uri);

				// Only allow http and https protocols
				if (url.protocol !== 'http:' && url.protocol !== 'https:') {
					throw new Error(
						`Invalid protocol for redirect URI: ${uri}. Only http and https are allowed.`,
					);
				}

				// In production, require https except for localhost
				const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
				const isDevelopment = process.env.NODE_ENV === 'development';

				if (!isDevelopment && !isLocalhost && url.protocol !== 'https:') {
					throw new Error(`HTTPS required for redirect URI in production: ${uri}`);
				}
			} catch (error) {
				if (error instanceof TypeError) {
					throw new Error(`Invalid URL format: ${uri}`);
				}
				throw error;
			}
		}

		return cleanedUris;
	}
}
