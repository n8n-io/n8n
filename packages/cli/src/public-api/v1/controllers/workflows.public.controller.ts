import {
	GetWorkflowQueryDto,
	ListWorkflowHistoryQueryDto,
	TagIdsPublicDto,
	WorkflowPublicDto,
	WorkflowTagsPublicDto,
	WorkflowVersionHistoryListPublicDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type {
	AuthenticatedRequest,
	SharedWorkflow,
	TagEntity,
	WorkflowEntity,
	WorkflowHistory,
	WorkflowPublishHistory,
} from '@n8n/db';
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
import { EventService } from '@/events/event.service';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';
import { TagService } from '@/services/tag.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

function toPublicJson(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function toPublicTag(tag: TagEntity) {
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	};
}

function toPublicSharedWorkflow(sharedWorkflow: SharedWorkflow) {
	return {
		role: sharedWorkflow.role,
		workflowId: sharedWorkflow.workflowId,
		projectId: sharedWorkflow.projectId,
		project: {
			id: sharedWorkflow.project.id,
			name: sharedWorkflow.project.name,
			type: sharedWorkflow.project.type,
			icon: sharedWorkflow.project.icon,
			description: sharedWorkflow.project.description,
			customTelemetryTags: sharedWorkflow.project.customTelemetryTags,
			creatorId: sharedWorkflow.project.creatorId,
			createdAt: sharedWorkflow.project.createdAt.toISOString(),
			updatedAt: sharedWorkflow.project.updatedAt.toISOString(),
		},
		createdAt: sharedWorkflow.createdAt.toISOString(),
		updatedAt: sharedWorkflow.updatedAt.toISOString(),
	};
}

function toPublicWorkflowPublishHistory(entry: WorkflowPublishHistory) {
	return {
		id: entry.id,
		workflowId: entry.workflowId,
		versionId: entry.versionId,
		event: entry.event,
		userId: entry.userId,
		createdAt: entry.createdAt.toISOString(),
	};
}

function toPublicActiveVersion(activeVersion: WorkflowHistory) {
	return {
		versionId: activeVersion.versionId,
		workflowId: activeVersion.workflowId,
		nodes: activeVersion.nodes,
		connections: activeVersion.connections,
		nodeGroups: activeVersion.nodeGroups,
		authors: activeVersion.authors,
		name: activeVersion.name,
		description: activeVersion.description,
		autosaved: activeVersion.autosaved,
		createdAt: activeVersion.createdAt.toISOString(),
		updatedAt: activeVersion.updatedAt.toISOString(),
		workflowPublishHistory: activeVersion.workflowPublishHistory.map(
			toPublicWorkflowPublishHistory,
		),
	};
}

@PublicApiController('/workflows')
export class WorkflowsPublicController {
	constructor(
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly tagService: TagService,
		private readonly workflowService: WorkflowService,
	) {}

	private assertWorkflowTagsEnabled() {
		if (this.globalConfig.tags.disabled) {
			throw new BadRequestError('Workflow Tags Disabled');
		}
	}

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

	/** Builds the public response shape for a single workflow, from the internal entity n8n stores. */
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
			versionCounter: workflow.versionCounter,
			sourceWorkflowId: workflow.sourceWorkflowId,
			triggerCount: workflow.triggerCount,
			nodes: workflow.nodes,
			connections: workflow.connections,
			nodeGroups: workflow.nodeGroups,
			settings: toPublicJson(workflow.settings),
			staticData: toPublicJson(workflow.staticData),
			meta: toPublicJson(workflow.meta),
			...(options.excludePinnedData ? {} : { pinData: toPublicJson(workflow.pinData) }),
			...(workflow.tags ? { tags: workflow.tags.map(toPublicTag) } : {}),
			shared: workflow.shared.map(toPublicSharedWorkflow),
			activeVersion: workflow.activeVersion ? toPublicActiveVersion(workflow.activeVersion) : null,
		};
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

		return tags.map(toPublicTag);
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

		return tags.map(toPublicTag);
	}
}
