import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Post, Get, Patch, RestController, GlobalScope } from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { listQueryMiddleware } from '@/middlewares';
import type { ListQuery } from '@/requests';
import { WorkflowService } from '@/workflows/workflow.service';

import { UpdateMcpSettingsDto } from './dto/update-mcp-settings.dto';
import { UpdateWorkflowsAvailabilityDto } from './dto/update-workflows-availability.dto';
import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpSettingsService } from './mcp.settings.service';

@RestController('/mcp')
export class McpSettingsController {
	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
		private readonly workflowService: WorkflowService,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
	) {}

	@GlobalScope('mcp:manage')
	@Patch('/settings')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateMcpSettingsDto,
	) {
		if (this.instanceSettingsLoaderConfig.mcpManagedByEnv) {
			throw new ForbiddenError('MCP settings are managed via environment variables');
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

	@GlobalScope('mcpApiKey:create')
	@Get('/api-key')
	async getApiKeyForMcpServer(req: AuthenticatedRequest) {
		return await this.mcpServerApiKeyService.getOrCreateApiKey(req.user);
	}

	@GlobalScope('mcpApiKey:rotate')
	@Post('/api-key/rotate')
	async rotateApiKeyForMcpServer(req: AuthenticatedRequest) {
		return await this.mcpServerApiKeyService.rotateMcpServerApiKey(req.user);
	}

	@Get('/workflows', { middlewares: listQueryMiddleware })
	async getMcpEligibleWorkflows(req: ListQuery.Request, res: Response) {
		const options: ListQuery.Options = {
			...req.listQueryOptions,
			filter: {
				...req.listQueryOptions?.filter,
				isArchived: false,
				availableInMCP: false,
			},
		};

		const { workflows, count } = await this.workflowService.getMany(
			req.user,
			options,
			false, // includeScopes
			false, // includeFolders
			false, // onlySharedWithMe
			['workflow:update'], // requiredScopes - only return workflows the user can edit
		);

		res.json({ count, data: workflows });
	}

	// Ideally we would use ProjectScope here but it only works if projectId is a URL parameter
	@Patch('/workflows/toggle-access')
	async toggleWorkflowsMCPAccess(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateWorkflowsAvailabilityDto,
	) {
		const { changedWorkflows, ...result } = await this.mcpSettingsService.bulkSetAvailableInMCP(
			req.user,
			dto,
		);

		void this.mcpSettingsService.broadcastWorkflowMCPAvailabilityChanged(changedWorkflows);

		return result;
	}
}
