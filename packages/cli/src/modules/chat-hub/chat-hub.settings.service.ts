import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

const KEY = 'chat.access.enabled';

@Service()
export class ChatHubSettingsService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async getEnabled(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(KEY);
		// Allowed by default
		if (!row) return true;
		return row.value === 'true';
	}

	async setEnabled(enabled: boolean): Promise<void> {
		const value = enabled ? 'true' : 'false';
		await this.settingsRepository.upsert({ key: KEY, value, loadOnStartup: true }, ['key']);
	}
}
