import {
	ListWorkflowHistoryQueryDto,
	TagIdsPublicDto,
	WorkflowTagsPublicDto,
	WorkflowVersionHistoryListPublicDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
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
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';
import { TagService } from '@/services/tag.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

@PublicApiController('/workflows')
export class WorkflowsPublicController {
	constructor(
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly tagService: TagService,
		private readonly workflowService: WorkflowService,
	) {}

	private assertWorkflowTagsEnabled() {
		if (this.globalConfig.tags.disabled) {
			throw new BadRequestError('Workflow Tags Disabled');
		}
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

	@Get('/:workflowId/tags')
	@ApiKeyScope('workflowTags:list')
	@ProjectScope('workflow:read')
	@ApiSummary('Get workflow tags')
	@ApiDescription('Get workflow tags.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowTagsPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async getWorkflowTags(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowTagsPublicDto> {
		this.assertWorkflowTagsEnabled();

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new NotFoundError('Not Found');
		}

		const tags = await this.tagService.getAllByWorkflowId(workflowId);

		return tags.map((tag) => ({
			...tag,
			createdAt: tag.createdAt.toISOString(),
			updatedAt: tag.updatedAt.toISOString(),
		}));
	}

	@Put('/:workflowId/tags')
	@ApiKeyScope('workflowTags:update')
	@ProjectScope('workflow:update')
	@ApiSummary('Update tags of a workflow')
	@ApiDescription('Update tags of a workflow.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowTagsPublicDto)
	@ApiErrorResponse(404)
	async updateWorkflowTags(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: TagIdsPublicDto,
	): Promise<WorkflowTagsPublicDto> {
		this.assertWorkflowTagsEnabled();

		const tagIds = body.map((tag) => tag.id);
		const tags = await this.workflowService.updateWorkflowTags(req.user, workflowId, tagIds);

		return tags.map((tag) => ({
			...tag,
			createdAt: tag.createdAt.toISOString(),
			updatedAt: tag.updatedAt.toISOString(),
		}));
	}
}
