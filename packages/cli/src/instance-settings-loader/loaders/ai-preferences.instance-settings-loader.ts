import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

@Service()
export class AiPreferencesInstanceSettingsLoader {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly aiPreferenceSettingsService: AiPreferenceSettingsService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		const { preferencesManagedByEnv, preferencesEnabled } = this.instanceSettingsLoaderConfig;
		if (!preferencesManagedByEnv) {
			this.logger.debug('preferencesManagedByEnv is disabled — skipping preferences env vars');
			return 'skipped';
		}

		this.logger.info('preferencesManagedByEnv is enabled — applying preferences env vars');

		await this.aiPreferenceSettingsService.setEnabled(preferencesEnabled);

		return 'created';
	}
}
