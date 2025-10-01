import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Post, Get, Patch, RestController, GlobalScope } from '@n8n/decorators';

import { UpdateMcpSettingsDto } from './dto/update-mcp-settings.dto';
import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpSettingsService } from './mcp.settings.service';
import { BadRequestError } from '../../errors/response-errors/bad-request.error';

@RestController('/mcp')
export class McpSettingsController {
	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
	) {}

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

	@GlobalScope('mcpApiKey:create')
	@Get('/api-key')
	async getApiKeyForMcpServer(req: AuthenticatedRequest) {
		const apiKey = await this.mcpServerApiKeyService.findServerApiKeyForUser(req.user);

		if (!apiKey) {
			const newApiKey = await this.mcpServerApiKeyService.createMcpServerApiKey(req.user);
			return newApiKey;
		}

		return apiKey;
	}

	@GlobalScope('mcpApiKey:rotate')
	@Post('/api-key/rotate')
	async rotateApiKeyForMcpServer(req: AuthenticatedRequest) {
		const apiKey = await this.mcpServerApiKeyService.findServerApiKeyForUser(req.user);

		if (!apiKey) {
			throw new BadRequestError('No existing MCP server API key to rotate');
		}

		const newApiKey = await this.mcpServerApiKeyService.rotateMcpServerApiKey(req.user);

		return newApiKey;
	}
}
