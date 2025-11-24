import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import config from '@/config';

@Service()
export class AiUsageService {
	private hasLoadedFromDb = false;

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly errorReporter: ErrorReporter,
	) {}

	/**
	 * Get the current value of the AI usage (privacy) setting for sending parameter data.
	 */
	async getAiUsageSettings(): Promise<boolean> {
		const key = 'ai.allowSendingParameterValues';
		try {
			if (this.hasLoadedFromDb) {
				return config.getEnv(key);
			}

			const setting = await this.settingsRepository.findOneBy({ key });
			this.hasLoadedFromDb = true;

			if (setting) {
				const parsedValue = JSON.parse(setting.value);
				if (typeof parsedValue === 'boolean') {
					config.set(key, parsedValue);
					return parsedValue;
				}
				this.errorReporter.error(
					new Error(`Invalid boolean value in database for ${key}: ${setting.value}`),
				);
				return config.getEnv(key);
			}

			return config.getEnv(key);
		} catch (error) {
			this.errorReporter.error(error);
			return false;
		}
	}

	/**
	 * Update the AI usage setting for sending parameter data.
	 */
	async updateAiUsageSettings(allowSendingActualData: boolean): Promise<void> {
		const key = 'ai.allowSendingParameterValues';
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
			config.set(key, allowSendingActualData);
			this.hasLoadedFromDb = true;
		} catch (error) {
			this.errorReporter.error(error);
			throw error;
		}
	}
}
