import { Service } from '@n8n/di';
import { SettingsRepository } from '@n8n/db';

const KEY = 'mcp.access.enabled';

@Service()
export class McpSettingsService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async getEnabled(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(KEY);
		// Enabled by default
		if (!row) return true;
		// Values are stored as strings in the settings table
		return row.value === 'true';
	}

	async setEnabled(enabled: boolean): Promise<void> {
		const value = enabled ? 'true' : 'false';
		const existing = await this.settingsRepository.findByKey(KEY);
		if (existing) {
			await this.settingsRepository.update({ key: KEY }, { value, loadOnStartup: true });
		} else {
			await this.settingsRepository.save(
				{ key: KEY, value, loadOnStartup: true },
				{ transaction: false },
			);
		}
	}
}
