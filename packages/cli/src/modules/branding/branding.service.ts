import type { BrandingSettings } from '@n8n/api-types';
import { CacheService } from '@n8n/backend-services';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

const ACCENT_COLOR_KEY = 'branding.accentColor';

@Service()
export class BrandingService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	async getSettings(): Promise<BrandingSettings> {
		// The cache holds an empty string for "no accent color", so a miss is `undefined`.
		const cached = await this.cacheService.get<string>(ACCENT_COLOR_KEY);
		if (cached !== undefined) return { accentColor: cached || null };

		const row = await this.settingsRepository.findByKey(ACCENT_COLOR_KEY);
		const accentColor = row?.value || null;
		await this.cacheService.set(ACCENT_COLOR_KEY, accentColor ?? '');

		return { accentColor };
	}

	async setAccentColor(accentColor: string | null): Promise<BrandingSettings> {
		await this.settingsRepository.upsertByKey(ACCENT_COLOR_KEY, accentColor ?? '', true, {});
		await this.cacheService.set(ACCENT_COLOR_KEY, accentColor ?? '');

		return { accentColor };
	}
}
