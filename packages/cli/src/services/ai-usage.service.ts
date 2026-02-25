import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import config from '@/config';
import { CacheService } from '@/services/cache/cache.service';

const KEY = 'ai.allowSendingParameterValues';

@Service()
export class AiUsageService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	/**
	 * Get the current value of the AI usage (privacy) setting for sending parameter data.
	 */
	async getAiUsageSettings(): Promise<boolean> {
		const allowSendingParameterValues = await this.cacheService.get<string>(KEY);

		if (allowSendingParameterValues !== undefined) {
			return allowSendingParameterValues === 'true';
		}

		const row = await this.settingsRepository.findByKey(KEY);
		const allowSending = (row?.value ?? 'true') === 'true';
		await this.cacheService.set(KEY, allowSending.toString());
		return allowSending;
	}

	/**
	 * Update the AI usage setting for sending parameter data.
	 */
	async updateAiUsageSettings(allowSendingActualData: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: KEY, value: allowSendingActualData.toString(), loadOnStartup: true },
			['key'],
		);
		await this.cacheService.set(KEY, allowSendingActualData.toString());
		config.set(KEY, allowSendingActualData);
	}
}
