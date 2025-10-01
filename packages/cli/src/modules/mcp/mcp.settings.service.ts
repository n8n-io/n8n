import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';

const KEY = 'mcp.access.enabled';

@Service()
export class McpSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	async getEnabled(): Promise<boolean> {
		const isMcpAccessEnabled = await this.cacheService.get<boolean>(KEY);

		if (isMcpAccessEnabled) return isMcpAccessEnabled;

		const row = await this.settingsRepository.findByKey(KEY);

		// Disabled by default
		if (!row?.value) return false;
		await this.cacheService.set(KEY, row.value === 'true');
		return row.value === 'true';
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);
		await this.cacheService.set(KEY, enabled);
	}
}
