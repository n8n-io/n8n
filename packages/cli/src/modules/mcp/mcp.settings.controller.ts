import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest, WorkflowEntity } from '@n8n/db';
import {
	Body,
	Post,
	Get,
	Patch,
	RestController,
	GlobalScope,
	Param,
	ProjectScope,
} from '@n8n/decorators';
import type { Response } from 'express';

import { UpdateMcpSettingsDto } from './dto/update-mcp-settings.dto';
import { UpdateWorkflowAvailabilityDto } from './dto/update-workflow-availability.dto';
import { McpServerApiKeyService } from './mcp-api-key.service';
import { SUPPORTED_MCP_TRIGGERS } from './mcp.constants';
import { McpSettingsService } from './mcp.settings.service';
import { findMcpSupportedTrigger } from './mcp.utils';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { listQueryMiddleware } from '@/middlewares';
import type { ListQuery } from '@/requests';
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

	@Get('/workflows', { middlewares: listQueryMiddleware })
	async getMcpEligibleWorkflows(req: ListQuery.Request, res: Response) {
		const supportedTriggerNodeTypes = Object.keys(SUPPORTED_MCP_TRIGGERS);

		const options: ListQuery.Options = {
			...req.listQueryOptions,
			filter: {
				...req.listQueryOptions?.filter,
				active: true,
				isArchived: false,
				availableInMCP: false,
				triggerNodeTypes: supportedTriggerNodeTypes,
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

	@ProjectScope('workflow:update')
	@Patch('/workflows/:workflowId/toggle-access')
	async toggleWorkflowMCPAccess(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body dto: UpdateWorkflowAvailabilityDto,
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			req.user,
			['workflow:update'],
			{ includeActiveVersion: true },
		);

		if (!workflow) {
			this.logger.warn('User attempted to update MCP availability without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Could not load the workflow - you can only access workflows available to you',
			);
		}

		if (dto.availableInMCP) {
			if (!workflow.activeVersionId) {
				throw new BadRequestError('MCP access can only be set for published workflows');
			}
			const nodes = workflow.activeVersion?.nodes ?? [];
			const supportedTrigger = findMcpSupportedTrigger(nodes);

			if (!supportedTrigger) {
				throw new BadRequestError(
					`MCP access can only be set for published workflows with one of the following trigger nodes: ${Object.values(SUPPORTED_MCP_TRIGGERS).join(', ')}.`,
				);
			}
		}

		const workflowUpdate = new WorkflowEntity();
		const currentSettings = workflow.settings ?? {};
		workflowUpdate.settings = {
			...currentSettings,
			availableInMCP: dto.availableInMCP,
		};
		workflowUpdate.versionId = workflow.versionId;

		const updatedWorkflow = await this.workflowService.update(req.user, workflowUpdate, workflowId);

		return {
			id: updatedWorkflow.id,
			settings: updatedWorkflow.settings,
			versionId: updatedWorkflow.versionId,
		};
	}
}
