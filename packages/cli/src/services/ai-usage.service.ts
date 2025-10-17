import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import config from '@/config';

@Service()
export class AiUsageService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly errorReporter: ErrorReporter,
	) {}

	/**
	 * Get the current value of the AI usage (privacy) setting for sending parameter data.
	 */
	async getAllowSendingActualData(): Promise<boolean> {
		const key = 'ai.allowSendingActualData';
		try {
			// Try to get from config cache first
			const cachedValue = config.getEnv(key);
			if (cachedValue !== undefined) {
				return cachedValue;
			}

			// Otherwise load from database
			const setting = await this.settingsRepository.findOneBy({ key });
			if (setting) {
				const value = JSON.parse(setting.value) as boolean;
				config.set(key, value);
				return value;
			}

			return false;
		} catch (error) {
			this.errorReporter.error(error);
			return false;
		}
	}

	/**
	 * Update the AI usage setting for sending parameter data.
	 */
	async updateAllowSendingActualData(allowSendingActualData: boolean): Promise<void> {
		const key = 'ai.allowSendingActualData';
		try {
			const value = JSON.stringify(allowSendingActualData);
			const existingSetting = await this.settingsRepository.findOneBy({ key });

			if (existingSetting) {
				await this.settingsRepository.update({ key }, { value, loadOnStartup: true });
			} else {
				await this.settingsRepository.save(
					{ key, value, loadOnStartup: true },
					{ transaction: false },
				);
			}

			// Update the config cache
			config.set(key, allowSendingActualData);
		} catch (error) {
			this.errorReporter.error(error);
			throw error;
		}
	}
}
