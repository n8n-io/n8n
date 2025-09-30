import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

const KEY = 'mcp.access.enabled';

@Service()
export class McpSettingsService {
	cacheIsEnabled: boolean | null = null;
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async getEnabled(): Promise<boolean> {
		if (this.cacheIsEnabled !== null) return this.cacheIsEnabled;

		const row = await this.settingsRepository.findByKey(KEY);
		// Disabled by default
		if (!row) return false;
		this.cacheIsEnabled = row.value === 'true';
		return this.cacheIsEnabled;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		const value = enabled ? 'true' : 'false';
		await this.settingsRepository.upsert({ key: KEY, value, loadOnStartup: true }, ['key']);
		this.cacheIsEnabled = value === 'true';
	}
}
