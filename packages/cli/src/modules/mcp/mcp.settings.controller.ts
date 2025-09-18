import { Get, Patch, RestController } from '@n8n/decorators';
import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest } from '@n8n/db';
import { ForbiddenError } from '../../errors/response-errors/forbidden.error';

import { McpSettingsService } from './mcp.settings.service';

@RestController('/mcp')
export class McpSettingsController {
	constructor(private readonly mcpSettingsService: McpSettingsService) {}

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
		const enabled = req.body?.mcpAccessEnabled === true;
		await this.mcpSettingsService.setEnabled(enabled);
		// Keep module settings in sync so /module-settings reflects the latest without restart
		try {
			Container.get(ModuleRegistry).settings.set('mcp', { mcpAccessEnabled: enabled });
		} catch {}
		return { mcpAccessEnabled: enabled };
	}
}
