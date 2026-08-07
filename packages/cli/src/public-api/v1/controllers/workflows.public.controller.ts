import {
	CreateWorkflowPublicDto,
	GetWorkflowQueryDto,
	ListWorkflowHistoryQueryDto,
	UpdateWorkflowPublicDto,
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
	Delete,
	Get,
	Param,
	Post,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';
import { PROJECT_ROOT } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { EventService } from '@/events/event.service';
import { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

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
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly workflowService: WorkflowService,
		private readonly redactionEnforcementService: RedactionEnforcementService,
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

		return this.toWorkflowPublicDto(workflow, { includePinData: !query.excludePinnedData });
	}

	@Post('/')
	@ApiKeyScope('workflow:create')
	@ApiSummary('Create a workflow')
	@ApiDescription('Create a workflow in your instance.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	async createWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateWorkflowPublicDto,
	): Promise<WorkflowPublicDto> {
		const { projectId, parentFolderId, ...rest } = body;

		if (rest.settings?.binaryMode !== undefined) {
			delete rest.settings.binaryMode;
		}
		if (rest.settings?.credentialResolverId !== undefined) {
			delete rest.settings.credentialResolverId;
		}

		const workflow = createWorkflowEntityFromPayload(rest);

		await this.redactionEnforcementService.assertNewPolicyAllowed(
			workflow.settings?.redactionPolicy,
		);

		const createdWorkflow = await this.workflowCreationService.createWorkflow(req.user, workflow, {
			projectId,
			parentFolderId: parentFolderId ?? undefined,
			publicApi: true,
			source: 'api',
		});

		return this.toWorkflowPublicDto(createdWorkflow);
	}

	@Put('/:workflowId')
	@ApiKeyScope('workflow:update')
	@ProjectScope('workflow:update')
	@ApiSummary('Update a workflow')
	@ApiDescription(
		'Update a workflow. If the workflow is published, the updated version will be automatically re-published.',
	)
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: UpdateWorkflowPublicDto,
	): Promise<WorkflowPublicDto> {
		const { parentFolderId, ...rest } = body;

		// null moves the workflow to the project root, (undefined) leaves the current folder untouched
		const resolvedParentFolderId = parentFolderId === null ? PROJECT_ROOT : parentFolderId;

		if (rest.settings?.binaryMode !== undefined) {
			delete rest.settings.binaryMode;
		}
		if (rest.settings?.credentialResolverId !== undefined) {
			delete rest.settings.credentialResolverId;
		}

		const updateData = createWorkflowEntityFromPayload(rest);

		try {
			// Credential tamper protection is enforced centrally in WorkflowService.update
			const updatedWorkflow = await this.workflowService.update(req.user, updateData, workflowId, {
				parentFolderId: resolvedParentFolderId,
				forceSave: true, // Skip version conflict check for public API
				publicApi: true,
				publishIfActive: true,
				source: 'api',
			});

			return this.toWorkflowPublicDto(updatedWorkflow);
		} catch (error) {
			if (error instanceof FolderNotFoundError) {
				throw new NotFoundError(error.message);
			}
			if (error instanceof ResponseError) {
				throw error;
			}
			if (error instanceof Error) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}

	@Delete('/:workflowId')
	@ApiKeyScope('workflow:delete')
	@ProjectScope('workflow:delete')
	@ApiSummary('Delete a workflow')
	@ApiDescription('Delete a workflow.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async deleteWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowPublicDto> {
		const workflow = await this.workflowService.delete(req.user, workflowId, true);

		if (!workflow) {
			// user trying to access a workflow they do not own, or workflow does not exist
			throw new NotFoundError('Not Found');
		}

		return this.toWorkflowPublicDto(workflow);
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

	private toWorkflowPublicDto(
		workflow: WorkflowEntity,
		options: { includePinData?: boolean } = {},
	): WorkflowPublicDto {
		const { includePinData = true } = options;

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
			...(includePinData ? { pinData: toPublicJson(workflow.pinData) } : {}),
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
			// `WorkflowService.update` doesn't load the `shared` relation on its returned
			// entity, unlike the finder service create/read/delete go through - default to
			// empty rather than throwing on the update path.
			shared: (workflow.shared ?? []).map((sharedWorkflow) => ({
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
