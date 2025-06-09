import type { BannerName } from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import config from '@/config';

@Service()
export class BannerService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly errorReporter: ErrorReporter,
	) {}

	async dismissBanner(bannerName: BannerName) {
		const key = 'ui.banners.dismissed';
		const dismissedBannersSetting = await this.settingsRepository.findOneBy({ key });
		try {
			let value: string;
			if (dismissedBannersSetting) {
				const dismissedBanners = JSON.parse(dismissedBannersSetting.value) as string[];
				const updatedValue = [...new Set([...dismissedBanners, bannerName].sort())];
				value = JSON.stringify(updatedValue);
				await this.settingsRepository.update({ key }, { value, loadOnStartup: true });
			} else {
				value = JSON.stringify([bannerName]);
				await this.settingsRepository.save(
					{ key, value, loadOnStartup: true },
					{ transaction: false },
				);
			}
			config.set(key, value);
		} catch (error) {
			this.errorReporter.error(error);
		}
	}
}
