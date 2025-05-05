import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';

import { Settings } from '../entities';

const EXTERNAL_SECRETS_DB_KEY = 'feature.externalSecrets';

@Service()
export class SettingsRepository extends Repository<Settings> {
	constructor(
		dataSource: DataSource,
		private readonly errorReporter: ErrorReporter,
	) {
		super(Settings, dataSource.manager);
	}

	async getEncryptedSecretsProviderSettings(): Promise<string | null> {
		return (await this.findByKey(EXTERNAL_SECRETS_DB_KEY))?.value ?? null;
	}

	async findByKey(key: string): Promise<Settings | null> {
		return await this.findOneBy({ key });
	}

	async saveEncryptedSecretsProviderSettings(data: string): Promise<void> {
		await this.upsert(
			{
				key: EXTERNAL_SECRETS_DB_KEY,
				value: data,
				loadOnStartup: false,
			},
			['key'],
		);
	}

	async dismissBanner({
		bannerName,
	}: { bannerName: string }): Promise<{ success: boolean; value: string } | { success: false }> {
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
				await this.save({ key, value, loadOnStartup: true }, { transaction: false });
			}
			return { success: true, value };
		} catch (error) {
			this.errorReporter.error(error);
		}
		return { success: false };
	}
}
