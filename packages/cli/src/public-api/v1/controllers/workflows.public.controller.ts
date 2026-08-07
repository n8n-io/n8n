import {
	GetWorkflowQueryDto,
	ListWorkflowHistoryQueryDto,
	TransferWorkflowPublicDto,
	WorkflowPublicDto,
	WorkflowVersionHistoryListPublicDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest, WorkflowEntity } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	Param,
	Post,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { EventService } from '@/events/event.service';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

function toPublicJson(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

@PublicApiController('/workflows')
export class WorkflowsPublicController {
	constructor(
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
	) {}

	@Get('/:workflowId')
	@ApiKeyScope('workflow:read')
	@ProjectScope('workflow:read')
	@ApiSummary('Retrieve a workflow')
	@ApiDescription('Retrieve a workflow.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	async getWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Query query: GetWorkflowQueryDto,
	): Promise<WorkflowPublicDto> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			req.user,
			['workflow:read'],
			{
				includeTags: !this.globalConfig.tags.disabled,
				includeActiveVersion: true,
			},
		);

		if (!workflow) {
			throw new NotFoundError('Not Found');
		}

		this.eventService.emit('user-retrieved-workflow', {
			userId: req.user.id,
			publicApi: true,
		});

		return this.toWorkflowPublicDto(workflow, { excludePinnedData: query.excludePinnedData });
	}

	@Post('/:workflowId/archive')
	@ApiKeyScope('workflow:delete')
	@ProjectScope('workflow:delete')
	@ApiSummary('Archive a workflow')
	@ApiDescription(
		'Soft-deletes a workflow by archiving it. Idempotent: archiving an already ' +
			'archived workflow returns 200 with the current workflow.',
	)
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	async archiveWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowPublicDto> {
		let workflow: WorkflowEntity | undefined;
		try {
			workflow = await this.workflowService.archiveForPublicApi(req.user, workflowId);
		} catch (error) {
			this.rethrowWorkflowServiceError(error);
		}

		if (!workflow) {
			throw new NotFoundError('Workflow not found');
		}

		return this.toWorkflowPublicDto(workflow);
	}

	@Post('/:workflowId/unarchive')
	@ApiKeyScope('workflow:delete')
	@ProjectScope('workflow:delete')
	@ApiSummary('Unarchive a workflow')
	@ApiDescription('Restores an archived workflow.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	async unarchiveWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowPublicDto> {
		let workflow: WorkflowEntity | undefined;
		try {
			workflow = await this.workflowService.unarchiveForPublicApi(req.user, workflowId);
		} catch (error) {
			this.rethrowWorkflowServiceError(error);
		}

		if (!workflow) {
			throw new NotFoundError('Workflow not found');
		}

		return this.toWorkflowPublicDto(workflow);
	}

	@Put('/:workflowId/transfer')
	@ApiKeyScope('workflow:move')
	@ProjectScope('workflow:move')
	@ApiSummary('Transfer a workflow to another project')
	@ApiDescription('Transfer a workflow to another project.')
	@ApiTags(['Workflow'])
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async transferWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: TransferWorkflowPublicDto,
	): Promise<void> {
		await this.enterpriseWorkflowService.transferWorkflow(
			req.user,
			workflowId,
			body.destinationProjectId,
		);
	}

	@Get('/:workflowId/history')
	@ApiKeyScope('workflow:read')
	@ProjectScope('workflow:read')
	@ApiSummary('Retrieve workflow version history')
	@ApiDescription(
		'Returns a paginated list of workflow versions (version IDs and metadata) for a workflow.',
	)
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowVersionHistoryListPublicDto)
	@ApiErrorResponse(404)
	async getWorkflowHistory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Query query: ListWorkflowHistoryQueryDto,
	): Promise<WorkflowVersionHistoryListPublicDto> {
		let { limit, offset } = query;

		if (query.cursor) {
			try {
				const decoded = decodeCursor(query.cursor);
				if (!('offset' in decoded)) {
					throw new BadRequestError('An invalid cursor was provided');
				}
				offset = decoded.offset;
				limit = decoded.limit;
			} catch (error) {
				if (error instanceof BadRequestError) throw error;
				throw new BadRequestError('An invalid cursor was provided');
			}
		}

		try {
			const versions = await this.workflowHistoryService.getList(
				req.user,
				workflowId,
				limit + 1,
				offset,
			);
			const hasMore = versions.length > limit;
			const data = hasMore ? versions.slice(0, limit) : versions;

			return {
				data: data.map((version) => ({
					...version,
					createdAt: version.createdAt.toISOString(),
					updatedAt: version.updatedAt.toISOString(),
				})),
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: hasMore ? offset + limit + 1 : offset + data.length,
				}),
			};
		} catch (error) {
			if (error instanceof SharedWorkflowNotFoundError) {
				throw new NotFoundError('Not Found');
			}
			throw error;
		}
	}

	private rethrowWorkflowServiceError(error: unknown): never {
		if (error instanceof ResponseError) {
			throw error;
		}
		if (error instanceof Error) {
			throw new BadRequestError(error.message);
		}
		throw error;
	}

	private toWorkflowPublicDto(
		workflow: WorkflowEntity,
		options: { excludePinnedData?: boolean } = {},
	): WorkflowPublicDto {
		return {
			id: workflow.id,
			name: workflow.name,
			description: workflow.description,
			active: workflow.active,
			activeVersionId: workflow.activeVersionId,
			createdAt: workflow.createdAt.toISOString(),
			updatedAt: workflow.updatedAt.toISOString(),
			isArchived: workflow.isArchived,
			versionId: workflow.versionId,
			triggerCount: workflow.triggerCount,
			nodes: workflow.nodes,
			connections: workflow.connections,
			nodeGroups: workflow.nodeGroups,
			settings: toPublicJson(workflow.settings),
			staticData: toPublicJson(workflow.staticData),
			meta: toPublicJson(workflow.meta),
			...(options.excludePinnedData ? {} : { pinData: toPublicJson(workflow.pinData) }),
			...(workflow.tags
				? {
						tags: workflow.tags.map((tag) => ({
							id: tag.id,
							name: tag.name,
							createdAt: tag.createdAt.toISOString(),
							updatedAt: tag.updatedAt.toISOString(),
						})),
					}
				: {}),
			shared: workflow.shared.map((sharedWorkflow) => ({
				role: sharedWorkflow.role,
				workflowId: sharedWorkflow.workflowId,
				projectId: sharedWorkflow.projectId,
				project: {
					id: sharedWorkflow.project.id,
					name: sharedWorkflow.project.name,
					type: sharedWorkflow.project.type,
				},
				createdAt: sharedWorkflow.createdAt.toISOString(),
				updatedAt: sharedWorkflow.updatedAt.toISOString(),
			})),
			activeVersion: workflow.activeVersion
				? {
						versionId: workflow.activeVersion.versionId,
						workflowId: workflow.activeVersion.workflowId,
						nodes: workflow.activeVersion.nodes,
						connections: workflow.activeVersion.connections,
						nodeGroups: workflow.activeVersion.nodeGroups,
						authors: workflow.activeVersion.authors,
						name: workflow.activeVersion.name,
						description: workflow.activeVersion.description,
						autosaved: workflow.activeVersion.autosaved,
						createdAt: workflow.activeVersion.createdAt.toISOString(),
						updatedAt: workflow.activeVersion.updatedAt.toISOString(),
					}
				: null,
		};
	}
}
