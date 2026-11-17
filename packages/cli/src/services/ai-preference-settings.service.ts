import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Publisher } from '@n8n/backend-services';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { AiPreferenceRepository, SettingsRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { License } from '@/license';

export const AI_PREFERENCES_ENABLED_KEY = 'aiPreferences.enabled';

@Service()
export class AiPreferenceSettingsService {
	private saved: boolean | undefined;

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly aiPreferenceRepository: AiPreferenceRepository,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly license: License,
		private readonly publisher: Publisher,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly logger: Logger,
	) {}

	get isSwitchOn(): boolean {
		return this.saved ?? !this.license.isEnterprisePlan();
	}

	get isEnabled(): boolean {
		const { settings } = this.moduleRegistry;
		return (
			this.isSwitchOn &&
			(settings.get('instance-ai')?.enabled === true ||
				settings.get('mcp')?.mcpAccessEnabled === true)
		);
	}

	get isManagedByEnv(): boolean {
		return this.instanceSettingsLoaderConfig.preferencesManagedByEnv;
	}

	async init(): Promise<void> {
		await this.reload();
		if (this.saved !== undefined || !this.license.isEnterprisePlan()) return;
		if (!(await this.aiPreferenceRepository.hasAny())) return;
		await this.settingsRepository.insertIfAbsent(AI_PREFERENCES_ENABLED_KEY, 'true');
		await this.reload();
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsertByKey(
			AI_PREFERENCES_ENABLED_KEY,
			String(enabled),
			false,
			{},
		);
		this.saved = enabled;
		try {
			await this.publisher.publishCommand({ command: 'reload-ai-preference-settings' });
		} catch (error) {
			this.logger.warn('Failed to notify other main processes of the preferences setting', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}
	}

	@OnPubSubEvent('reload-ai-preference-settings', { instanceType: 'main' })
	@OnPubSubEvent('pubsub-reconnected', { instanceType: 'main' })
	async reload(): Promise<void> {
		const row = await this.settingsRepository.findByKey(AI_PREFERENCES_ENABLED_KEY);
		this.saved = row ? row.value === 'true' : undefined;
	}
}
