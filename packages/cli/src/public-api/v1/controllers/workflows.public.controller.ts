import {
	ActivateWorkflowPublicDto,
	CreatedWorkflowPublicDto,
	CreateWorkflowPublicDto,
	DeletedWorkflowPublicDto,
	GetWorkflowQueryDto,
	ListWorkflowHistoryQueryDto,
	ListWorkflowsQueryDto,
	PublishWorkflowPublicDto,
	TagIdsPublicDto,
	TransferWorkflowPublicDto,
	UpdatedWorkflowPublicDto,
	UpdateWorkflowPublicDto,
	UpdateWorkflowQueryDto,
	WorkflowListPublicDto,
	WorkflowPublicDto,
	WorkflowPublishBlockedErrorPublicDto,
	WorkflowPublishPublicDto,
	WorkflowTagsPublicDto,
	WorkflowVersionHistoryListPublicDto,
	WorkflowVersionPublicDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type {
	AuthenticatedRequest,
	Folder,
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
	Delete,
	Deprecated,
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
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { EventService } from '@/events/event.service';
import { RedactionEnforcementService } from '@/modules/redaction/redaction-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import {
	decodeCursor,
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { TagService } from '@/services/tag.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

const DEPRECATED_ALIAS_SINCE = new Date('2026-07-23T00:00:00Z');

const UPDATE_CONFLICT_DESCRIPTION =
	'Conflict, e.g. re-publication blocked by an open workflow review (then `reason` and ' +
	'`workflowReviewRequestId` are present; the update itself is still saved as a draft) or a ' +
	'webhook path conflict.';

const PUBLISH_CONFLICT_DESCRIPTION =
	'Conflict, e.g. publication blocked by an open workflow review (then `reason` and ' +
	'`workflowReviewRequestId` are present) or a webhook path conflict.';

function toPublicJson(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function parseTagNames(tags: string): string[] {
	return tags.split(',').map((tag) => tag.trim());
}

function toPublicTag(tag: TagEntity) {
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
		updatedAt: tag.updatedAt.toISOString(),
	};
}

function toPublicFolder(folder: Folder) {
	return {
		id: folder.id,
		name: folder.name,
		parentFolderId: folder.parentFolderId,
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt.toISOString(),
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

/** List rows come back without the joined project, so they map a share row without one. */
function toPublicListSharedWorkflow(sharedWorkflow: SharedWorkflow) {
	return {
		role: sharedWorkflow.role,
		workflowId: sharedWorkflow.workflowId,
		projectId: sharedWorkflow.projectId,
		createdAt: sharedWorkflow.createdAt.toISOString(),
		updatedAt: sharedWorkflow.updatedAt.toISOString(),
	};
}

function toPublicActiveVersionWithoutHistory(activeVersion: WorkflowHistory) {
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
	};
}

function toPublicWorkflowVersion(version: WorkflowHistory) {
	return {
		versionId: version.versionId,
		workflowId: version.workflowId,
		nodes: version.nodes,
		connections: version.connections,
		nodeGroups: version.nodeGroups,
		authors: version.authors,
		name: version.name,
		description: version.description,
		createdAt: version.createdAt.toISOString(),
		updatedAt: version.updatedAt.toISOString(),
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
		...toPublicActiveVersionWithoutHistory(activeVersion),
		workflowPublishHistory: activeVersion.workflowPublishHistory.map(
			toPublicWorkflowPublishHistory,
		),
	};
}

/** Update only loads the publish history when it republished, so both shapes reach the client. */
function toPublicUpdatedActiveVersion(activeVersion: WorkflowHistory) {
	return activeVersion.workflowPublishHistory
		? toPublicActiveVersion(activeVersion)
		: toPublicActiveVersionWithoutHistory(activeVersion);
}

@PublicApiController('/workflows')
export class WorkflowsPublicController {
	constructor(
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly workflowService: WorkflowService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly tagService: TagService,
		private readonly redactionEnforcementService: RedactionEnforcementService,
	) {}

	private get workflowTagsEnabled(): boolean {
		return !this.globalConfig.tags.disabled;
	}

	private assertWorkflowTagsEnabled() {
		if (!this.workflowTagsEnabled) {
			throw new BadRequestError('Workflow Tags Disabled');
		}
	}

	@Get('/')
	@ApiKeyScope('workflow:list')
	@ApiSummary('Retrieve all workflows')
	@ApiDescription('Retrieve all workflows from your instance.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowListPublicDto)
	async getWorkflows(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListWorkflowsQueryDto,
	): Promise<WorkflowListPublicDto> {
		let { offset, limit } = query;

		if (query.cursor) {
			try {
				const decoded = decodeCursor(query.cursor);
				if ('offset' in decoded) {
					offset = decoded.offset;
				}
				limit = decoded.limit ?? limit;
			} catch {
				throw new BadRequestError('An invalid cursor was provided');
			}
		}

		const { workflows, count } = await this.workflowFinderService.findWorkflowsForUser(
			req.user,
			['workflow:read'],
			{
				filters: {
					name: query.name,
					active: query.active,
					tagNames: query.tags ? parseTagNames(query.tags) : undefined,
					projectId: query.projectId,
				},
				offset,
				limit,
				includePinnedData: !query.excludePinnedData,
				includeTags: this.workflowTagsEnabled,
				includeActiveVersion: true,
			},
		);

		this.eventService.emit('user-retrieved-all-workflows', {
			userId: req.user.id,
			publicApi: true,
		});

		return {
			data: workflows.map((workflow) => ({
				id: workflow.id,
				name: workflow.name,
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
				...(query.excludePinnedData ? {} : { pinData: toPublicJson(workflow.pinData) }),
				...(workflow.tags ? { tags: workflow.tags.map(toPublicTag) } : {}),
				shared: workflow.shared.map(toPublicListSharedWorkflow),
				activeVersion: workflow.activeVersion
					? toPublicActiveVersionWithoutHistory(workflow.activeVersion)
					: null,
			})),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/')
	@ApiKeyScope('workflow:create')
	@ApiSummary('Create a workflow')
	@ApiDescription('Create a workflow in your instance.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, CreatedWorkflowPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(422)
	async createWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateWorkflowPublicDto,
	): Promise<CreatedWorkflowPublicDto> {
		const { projectId, parentFolderId, shared: _shared, ...rest } = body;

		const workflow = createWorkflowEntityFromPayload(rest);

		await this.redactionEnforcementService.assertNewPolicyAllowed(body.settings.redactionPolicy);

		const createdWorkflow = await this.workflowCreationService.createWorkflow(req.user, workflow, {
			projectId,
			parentFolderId: parentFolderId ?? undefined,
			publicApi: true,
			source: 'api',
		});

		return {
			...this.toWorkflowPublicDto(createdWorkflow),
			parentFolder: createdWorkflow.parentFolder
				? toPublicFolder(createdWorkflow.parentFolder)
				: null,
		};
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
				includeTags: this.workflowTagsEnabled,
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

	@Put('/:workflowId')
	@ApiKeyScope('workflow:update')
	@ProjectScope('workflow:update')
	@ApiSummary('Update a workflow')
	@ApiDescription(
		'Update a workflow. If the workflow is published, the updated version will be ' +
			'automatically re-published unless `publishIfActive` is set to `false`.',
	)
	@ApiTags(['Workflow'])
	@ApiResponse(200, UpdatedWorkflowPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(422)
	@ApiErrorResponse(409, {
		dto: WorkflowPublishBlockedErrorPublicDto,
		description: UPDATE_CONFLICT_DESCRIPTION,
	})
	async updateWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: UpdateWorkflowPublicDto,
		@Query query: UpdateWorkflowQueryDto,
	): Promise<UpdatedWorkflowPublicDto> {
		const { parentFolderId, shared: _shared, ...rest } = body;

		// null moves the workflow to the project root, absent leaves the current folder untouched
		const resolvedParentFolderId = parentFolderId === null ? PROJECT_ROOT : parentFolderId;

		let updatedWorkflow: WorkflowEntity;
		try {
			// Credential tamper protection is enforced centrally in WorkflowService.update
			updatedWorkflow = await this.workflowService.update(
				req.user,
				createWorkflowEntityFromPayload(rest),
				workflowId,
				{
					parentFolderId: resolvedParentFolderId,
					forceSave: true, // Skip version conflict check for public API
					publicApi: true,
					publishIfActive: query.publishIfActive,
					source: 'api',
				},
			);
		} catch (error) {
			if (error instanceof FolderNotFoundError) throw new NotFoundError(error.message);
			if (error instanceof ResponseError) throw error;
			if (error instanceof PolicyViolationError) throw error;
			if (error instanceof Error) throw new BadRequestError(error.message);
			throw error;
		}

		return this.toUpdatedWorkflowPublicDto(updatedWorkflow);
	}

	@Delete('/:workflowId')
	@ApiKeyScope('workflow:delete')
	@ProjectScope('workflow:delete')
	@ApiSummary('Delete a workflow')
	@ApiDescription('Delete a workflow.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, DeletedWorkflowPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async deleteWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<DeletedWorkflowPublicDto> {
		const workflow = await this.workflowService.deleteForPublicApi(req.user, workflowId);

		if (!workflow) {
			// the user cannot see this workflow, or it does not exist
			throw new NotFoundError('Not Found');
		}

		return this.toDeletedWorkflowPublicDto(workflow);
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
		const workflow = await this.workflowService.archiveForPublicApi(req.user, workflowId);

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
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async unarchiveWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowPublicDto> {
		const workflow = await this.workflowService.unarchiveForPublicApi(req.user, workflowId);

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

	/** Every public workflow field except the relations each route loads differently. */
	private toWorkflowFieldsPublicDto(
		workflow: WorkflowEntity,
		options: { excludePinnedData?: boolean } = {},
	): Omit<WorkflowPublishPublicDto, 'activeVersion'> {
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
		};
	}

	private toWorkflowPublishPublicDto(
		workflow: WorkflowEntity,
		options: { excludePinnedData?: boolean } = {},
	): WorkflowPublishPublicDto {
		return {
			...this.toWorkflowFieldsPublicDto(workflow, options),
			activeVersion: workflow.activeVersion ? toPublicActiveVersion(workflow.activeVersion) : null,
		};
	}

	private toUpdatedWorkflowPublicDto(workflow: WorkflowEntity): UpdatedWorkflowPublicDto {
		return {
			...this.toWorkflowFieldsPublicDto(workflow),
			activeVersion: workflow.activeVersion
				? toPublicUpdatedActiveVersion(workflow.activeVersion)
				: null,
		};
	}

	private toDeletedWorkflowPublicDto(workflow: WorkflowEntity): DeletedWorkflowPublicDto {
		return {
			...this.toWorkflowFieldsPublicDto(workflow),
			shared: workflow.shared.map(toPublicSharedWorkflow),
			...(workflow.activeVersion
				? { activeVersion: toPublicActiveVersion(workflow.activeVersion) }
				: {}),
		};
	}

	/** Builds the public response shape for a single workflow, from the internal entity n8n stores. */
	private toWorkflowPublicDto(
		workflow: WorkflowEntity,
		options: { excludePinnedData?: boolean } = {},
	): WorkflowPublicDto {
		return {
			...this.toWorkflowPublishPublicDto(workflow, options),
			shared: workflow.shared.map(toPublicSharedWorkflow),
		};
	}

	@Post('/:workflowId/publish')
	@ApiKeyScope('workflow:activate')
	@ProjectScope('workflow:publish')
	@ApiSummary('Publish a workflow')
	@ApiDescription('Publish a workflow. In n8n v1, this action was termed activating a workflow.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublishPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409, {
		dto: WorkflowPublishBlockedErrorPublicDto,
		description: PUBLISH_CONFLICT_DESCRIPTION,
	})
	async publishWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: PublishWorkflowPublicDto,
	): Promise<WorkflowPublishPublicDto> {
		const workflow = await this.workflowService.activateWorkflow(req.user, workflowId, {
			versionId: body.versionId,
			name: body.name,
			description: body.description,
			source: 'api',
		});

		return this.toWorkflowPublishPublicDto(workflow);
	}

	@Post('/:workflowId/unpublish')
	@ApiKeyScope('workflow:deactivate')
	@ProjectScope('workflow:unpublish')
	@ApiSummary('Unpublish a workflow')
	@ApiDescription(
		'Unpublish a workflow. In n8n v1, this action was termed deactivating a workflow.',
	)
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	async unpublishWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowPublicDto> {
		const workflow = await this.workflowService.deactivateWorkflow(req.user, workflowId, {
			source: 'api',
		});

		return this.toWorkflowPublicDto(workflow);
	}

	@Post('/:workflowId/activate')
	@Deprecated({ since: DEPRECATED_ALIAS_SINCE })
	@ApiKeyScope('workflow:activate')
	@ProjectScope('workflow:publish')
	@ApiSummary('Publish a workflow')
	@ApiDescription(
		'Deprecated: use POST /workflows/{id}/publish instead. Publish a workflow. In n8n v1, ' +
			'this action was termed activating a workflow.',
	)
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublishPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409, {
		dto: WorkflowPublishBlockedErrorPublicDto,
		description: PUBLISH_CONFLICT_DESCRIPTION,
	})
	async activateWorkflow(
		req: AuthenticatedRequest,
		res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: ActivateWorkflowPublicDto,
	): Promise<WorkflowPublishPublicDto> {
		return await this.publishWorkflow(req, res, workflowId, body);
	}

	@Post('/:workflowId/deactivate')
	@Deprecated({ since: DEPRECATED_ALIAS_SINCE })
	@ApiKeyScope('workflow:deactivate')
	@ProjectScope('workflow:unpublish')
	@ApiSummary('Deactivate a workflow')
	@ApiDescription('Deprecated: use POST /workflows/{id}/unpublish instead. Deactivate a workflow.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowPublicDto)
	@ApiErrorResponse(404)
	async deactivateWorkflow(
		req: AuthenticatedRequest,
		res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowPublicDto> {
		return await this.unpublishWorkflow(req, res, workflowId);
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
		const { offset, limit } = resolveOffsetPagination(query);

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

	@Get('/:workflowId/versions/:versionId')
	@ApiKeyScope('workflow:read')
	@ProjectScope('workflow:read')
	@ApiSummary('Retrieve a workflow version')
	@ApiDescription('Retrieve a single version of a workflow from its version history.')
	@ApiTags(['Workflow'])
	@ApiResponse(200, WorkflowVersionPublicDto)
	@ApiErrorResponse(404)
	async getWorkflowVersion(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Param('versionId') versionId: string,
	): Promise<WorkflowVersionPublicDto> {
		let version: WorkflowHistory;
		try {
			version = await this.workflowHistoryService.getVersion(req.user, workflowId, versionId, {
				includePublishHistory: false,
			});
		} catch (error) {
			if (error instanceof SharedWorkflowNotFoundError) {
				throw new NotFoundError('Workflow not found');
			}
			if (error instanceof WorkflowHistoryVersionNotFoundError) {
				throw new NotFoundError('Version not found');
			}
			throw error;
		}

		this.eventService.emit('user-retrieved-workflow-version', {
			userId: req.user.id,
			publicApi: true,
		});

		return toPublicWorkflowVersion(version);
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
