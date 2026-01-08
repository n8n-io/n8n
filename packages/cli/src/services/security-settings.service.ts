import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { PERSONAL_SPACE_PUBLISHING_SETTING_KEY } from '@n8n/permissions';

@Service()
export class SecuritySettingsService {
	private readonly SETTING_KEY = PERSONAL_SPACE_PUBLISHING_SETTING_KEY;

	constructor(
		private readonly settingsRepository: SettingsRepository,
	) {}

	async setPersonalSpacePublishing(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: this.SETTING_KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);
	}

	async getPersonalSpacePublishing(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(this.SETTING_KEY);
		return row?.value === 'true' || row === null; // Default to true
	}
}
