import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

const KEY = 'mcp.access.enabled';

@Service()
export class McpSettingsService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async getEnabled(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(KEY);
		// Disabled by default
		if (!row) return false;
		return row.value === 'true';
	}

	async setEnabled(enabled: boolean): Promise<void> {
		const value = enabled ? 'true' : 'false';
		await this.settingsRepository.upsert({ key: KEY, value, loadOnStartup: true }, ['key']);
	}
}
