import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest } from '@n8n/db';
import { Get, Patch, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { McpSettingsService } from './mcp.settings.service';
import { ForbiddenError } from '../../errors/response-errors/forbidden.error';

@RestController('/mcp')
export class McpSettingsController {
	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly logger: Logger,
	) {}

	@Get('/settings')
	async getSettings() {
		const mcpAccessEnabled = await this.mcpSettingsService.getEnabled();
		return { mcpAccessEnabled };
	}

	@Patch('/settings')
	async updateSettings(req: AuthenticatedRequest) {
		if (req.user.role?.slug !== GLOBAL_OWNER_ROLE.slug) {
			throw new ForbiddenError('Only the instance owner can update MCP settings');
		}
		const body = req.body as Partial<{ mcpAccessEnabled: boolean }>;
		const enabled = body.mcpAccessEnabled === true;
		await this.mcpSettingsService.setEnabled(enabled);
		// Keep module settings in sync so /module-settings reflects the latest without restart
		try {
			Container.get(ModuleRegistry).settings.set('mcp', { mcpAccessEnabled: enabled });
		} catch (error) {
			this.logger.warn('Failed to sync MCP settings to module registry', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}
		return { mcpAccessEnabled: enabled };
	}
}
