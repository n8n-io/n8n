import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest, WorkflowEntity } from '@n8n/db';
import { Body, Post, Get, Patch, RestController, GlobalScope, Param } from '@n8n/decorators';
import type { Response } from 'express';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import { UpdateMcpSettingsDto } from './dto/update-mcp-settings.dto';
import { UpdateWorkflowAvailabilityDto } from './dto/update-workflow-availability.dto';
import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpSettingsService } from './mcp.settings.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

@RestController('/mcp')
export class McpSettingsController {
	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly mcpServerApiKeyService: McpServerApiKeyService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
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
		return await this.mcpServerApiKeyService.getOrCreateApiKey(req.user);
	}

	@GlobalScope('mcpApiKey:rotate')
	@Post('/api-key/rotate')
	async rotateApiKeyForMcpServer(req: AuthenticatedRequest) {
		return await this.mcpServerApiKeyService.rotateMcpServerApiKey(req.user);
	}

	@GlobalScope('mcp:manage')
	@Patch('/workflows/:workflowId/toggle-access')
	async toggleWorkflowMCPAccess(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body dto: UpdateWorkflowAvailabilityDto,
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:update',
		]);

		if (!workflow) {
			this.logger.warn('User attempted to update MCP availability without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Could not load the workflow - you can only access workflows available to you',
			);
		}

		if (!workflow.active) {
			throw new BadRequestError('MCP access can only be set for active workflows');
		}

		const hasWebhooks = workflow.nodes.some(
			(node) => node.type === WEBHOOK_NODE_TYPE && node.disabled !== true,
		);

		if (!hasWebhooks) {
			throw new BadRequestError('MCP access can only be set for webhook-triggered workflows');
		}

		const workflowUpdate = new WorkflowEntity();
		const currentSettings = workflow.settings ?? {};
		workflowUpdate.settings = {
			...currentSettings,
			availableInMCP: dto.availableInMCP,
		};
		workflowUpdate.versionId = workflow.versionId;

		const updatedWorkflow = await this.workflowService.update(
			req.user,
			workflowUpdate,
			workflowId,
			undefined, // tags
			undefined, // parentFolderId
			false, // forceSave
		);

		return {
			id: updatedWorkflow.id,
			settings: updatedWorkflow.settings,
			versionId: updatedWorkflow.versionId,
		};
	}
}
