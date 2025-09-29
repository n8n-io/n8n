import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Patch, RestController } from '@n8n/decorators';

import { UpdateMcpSettingsDto } from './dto/update-mcp-settings.dto';
import { McpSettingsService } from './mcp.settings.service';
import { ForbiddenError } from '../../errors/response-errors/forbidden.error';

@RestController('/mcp')
export class McpSettingsController {
	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	@Get('/settings')
	async getSettings() {
		const mcpAccessEnabled = await this.mcpSettingsService.getEnabled();
		return { mcpAccessEnabled };
	}

	@Patch('/settings')
	async updateSettings(req: AuthenticatedRequest, _res: Response, @Body dto: UpdateMcpSettingsDto) {
		if (req.user.role?.slug !== GLOBAL_OWNER_ROLE.slug) {
			throw new ForbiddenError('Only the instance owner can update MCP settings');
		}
		const enabled = dto.mcpAccessEnabled;
		await this.mcpSettingsService.setEnabled(enabled);
		try {
			await this.moduleRegistry.refreshModuleSettings('mcp');
		} catch (error) {
			this.logger.warn('Failed to sync MCP settings to module registry', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}
		return { mcpAccessEnabled: enabled };
	}
}
