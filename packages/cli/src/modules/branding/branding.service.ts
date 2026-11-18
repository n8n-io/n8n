import type { BrandingSettings } from '@n8n/api-types';
import { CacheService } from '@n8n/backend-services';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

const ACCENT_COLOR_KEY = 'branding.accentColor';
const ACCENT_COLOR_DARK_KEY = 'branding.accentColorDark';

@Service()
export class BrandingService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	async getSettings(): Promise<BrandingSettings> {
		const [accentColor, accentColorDark] = await Promise.all([
			this.read(ACCENT_COLOR_KEY),
			this.read(ACCENT_COLOR_DARK_KEY),
		]);
		return { accentColor, accentColorDark };
	}

	async setBranding(branding: BrandingSettings): Promise<BrandingSettings> {
		const accentColorDark = branding.accentColorDark ?? null;
		await Promise.all([
			this.write(ACCENT_COLOR_KEY, branding.accentColor),
			this.write(ACCENT_COLOR_DARK_KEY, accentColorDark),
		]);
		return { accentColor: branding.accentColor, accentColorDark };
	}

	private async read(key: string): Promise<string | null> {
		// The cache holds an empty string for "no color", so a miss is `undefined`.
		const cached = await this.cacheService.get<string>(key);
		if (cached !== undefined) return cached || null;

		const row = await this.settingsRepository.findByKey(key);
		const value = row?.value || null;
		await this.cacheService.set(key, value ?? '');
		return value;
	}

	private async write(key: string, value: string | null): Promise<void> {
		await this.settingsRepository.upsertByKey(key, value ?? '', true, {});
		await this.cacheService.set(key, value ?? '');
	}
}
