import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { Settings } from '../entities/Settings';
import config from '@/config';

@Service()
export class SettingsRepository extends Repository<Settings> {
	constructor(dataSource: DataSource) {
		super(Settings, dataSource.manager);
	}

	async dismissNewBanner({ bannerName }: { bannerName: string }): Promise<{ success: boolean }> {
		const dismissedBannersSetting = await this.findOneBy({ key: 'ui.banners.dismissed' });

		if (dismissedBannersSetting) {
			try {
				const dismissedBanners = JSON.parse(dismissedBannersSetting.value) as string[];
				await this.saveSetting(
					'ui.banners.dismissed',
					JSON.stringify([...dismissedBanners, bannerName]),
				);
				return { success: true };
			} catch (error) {
				return { success: false };
			}
		}
		return { success: false };
	}

	async saveSetting(key: string, value: string, loadOnStartup = true) {
		const setting = await this.findOneBy({ key });

		if (setting) {
			await this.update({ key }, { value, loadOnStartup });
		} else {
			await this.save({ key, value, loadOnStartup });
		}

		if (loadOnStartup) config.set('ui.banners.dismissed', value);
	}
}
