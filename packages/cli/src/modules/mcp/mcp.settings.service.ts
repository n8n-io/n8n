import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';

const KEY = 'mcp.access.enabled';

/**
 * Service for managing MCP (Model Context Protocol) access settings.
 * 
 * MCP access is controlled via database settings and can be toggled through the n8n UI
 * at Settings > MCP Access. This setting determines whether the MCP HTTP endpoint
 * (/mcp-server/http) accepts authenticated requests.
 * 
 * Note: There is no N8N_MCP_ENABLED environment variable. MCP access must be enabled
 * through the UI or API after n8n is running. The endpoint will return 403 Forbidden
 * if MCP access is disabled, even with valid authentication.
 */
@Service()
export class McpSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	/**
	 * Get the current MCP access enabled status.
	 * Checks cache first, then falls back to database.
	 * Defaults to false if no setting exists.
	 */
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

	/**
	 * Set the MCP access enabled status.
	 * Updates both database and cache.
	 */
	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(KEY, enabled.toString());
	}
}
