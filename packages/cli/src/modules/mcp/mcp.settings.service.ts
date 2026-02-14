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
		const isMcpAccessEnabled = await this.cacheService.get<string>(KEY);

		if (isMcpAccessEnabled !== undefined) {
			return isMcpAccessEnabled === 'true';
		}

		const row = await this.settingsRepository.findByKey(KEY);

		const enabled = row?.value === 'true';

		await this.cacheService.set(KEY, enabled.toString());

		return enabled;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(KEY, enabled.toString());
	}
}
