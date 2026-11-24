import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import config from '@/config';
import { License } from '@/license';
import { CacheService } from '@n8n/backend-services';

const KEY = 'ai.allowSendingParameterValues';
const MODEL_TRAINING_KEY = 'ai.allowModelTraining';
/** Cached when no admin choice is stored, so the plan default is resolved on each read. */
const NO_CHOICE = 'unset';

@Service()
export class AiUsageService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
		private readonly globalConfig: GlobalConfig,
		private readonly license: License,
	) {}

	/**
	 * Whether AI features may send parameter values. Both the
	 * `N8N_AI_ALLOW_SENDING_PARAMETER_VALUES` env var and the stored setting must allow it.
	 */
	async isParameterValueSharingAllowed(): Promise<boolean> {
		if (!this.globalConfig.ai.allowSendingParameterValues) return false;
		return await this.getAiUsageSettings();
	}

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

	/**
	 * Whether n8n may use this instance's Assistant traces to train models.
	 * Without an admin choice, Enterprise plans are opted out and all other plans are opted in.
	 */
	async isModelTrainingAllowed(): Promise<boolean> {
		let choice = await this.cacheService.get<string>(MODEL_TRAINING_KEY);
		if (choice === undefined) {
			const row = await this.settingsRepository.findByKey(MODEL_TRAINING_KEY);
			choice = row?.value ?? NO_CHOICE;
			await this.cacheService.set(MODEL_TRAINING_KEY, choice);
		}
		if (choice === NO_CHOICE) return !this.license.isEnterprisePlan();
		return choice === 'true';
	}

	async updateModelTrainingSetting(allowModelTraining: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: MODEL_TRAINING_KEY, value: allowModelTraining.toString(), loadOnStartup: false },
			['key'],
		);
		await this.cacheService.set(MODEL_TRAINING_KEY, allowModelTraining.toString());
	}
}
