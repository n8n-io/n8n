import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import { Settings } from '../entities/Settings';
import config from '@/config';

@Service()
export class SettingsRepository extends Repository<Settings> {
	constructor(dataSource: DataSource) {
		super(Settings, dataSource.manager);
	}

	async dismissBanner({ bannerName }: { bannerName: string }): Promise<{ success: boolean }> {
		const key = 'ui.banners.dismissed';
		const dismissedBannersSetting = await this.findOneBy({ key });
		try {
			let value: string;
			if (dismissedBannersSetting) {
				const dismissedBanners = JSON.parse(dismissedBannersSetting.value) as string[];
				const updatedValue = [...new Set([...dismissedBanners, bannerName].sort())];
				value = JSON.stringify(updatedValue);
				await this.update({ key }, { value, loadOnStartup: true });
			} else {
				value = JSON.stringify([bannerName]);
				await this.save({ key, value, loadOnStartup: true });
			}
			config.set(key, value);
			return { success: true };
		} catch (error) {
			ErrorReporter.error(error);
		}
		return { success: false };
	}
}
