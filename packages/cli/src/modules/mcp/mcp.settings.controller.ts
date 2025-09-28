import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE, type AuthenticatedRequest } from '@n8n/db';
import { Body, Post, Get, Patch, RestController, GlobalScope } from '@n8n/decorators';

import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpSettingsService } from './mcp.settings.service';
import { UpdateMcpSettingsDto } from './update-mcp-settings.dto';
import { BadRequestError } from '../../errors/response-errors/bad-request.error';
import { ForbiddenError } from '../../errors/response-errors/forbidden.error';

@RestController('/mcp')
export class McpSettingsController {
	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
	) {}

	@GlobalScope('mcp:manage')
	@Get('/settings')
	async getSettings() {
		const mcpAccessEnabled = await this.mcpSettingsService.getEnabled();
		return { mcpAccessEnabled };
	}

	@GlobalScope('mcp:manage')
	@Patch('/settings')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateMcpSettingsDto,
	) {
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

	@GlobalScope('mcp:manage')
	@Get('/api-key')
	async getApiKeyForMcpServer(req: AuthenticatedRequest) {
		const apiKey = await this.mcpServerApiKeyService.findServerApiKeyForUser(req.user);

		if (!apiKey) {
			const newApiKey = await this.mcpServerApiKeyService.createMcpServerApiKey(req.user);
			return newApiKey;
		}

		return apiKey;
	}

	@GlobalScope('mcp:manage')
	@Post('/api-key/rotate')
	async rotateApiKeyForMcpServer(req: AuthenticatedRequest) {
		const apiKey = await this.mcpServerApiKeyService.findServerApiKeyForUser(req.user);

		if (!apiKey) {
			throw new BadRequestError('No existing MCP server API key to rotate');
		}

		await this.mcpServerApiKeyService.deleteApiKeyForUser(req.user);

		const newApiKey = await this.mcpServerApiKeyService.createMcpServerApiKey(req.user);

		return newApiKey;
	}
}
