import {
	ImportWorkflowFromUrlDto,
	ManualRunQueryDto,
	TransferWorkflowBodyDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type FindOptionsRelations } from '@n8n/typeorm';
import axios from 'axios';
import express from 'express';
import { Logger } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { Project } from '@/databases/entities/project';
import { SharedWorkflow } from '@/databases/entities/shared-workflow';
import { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import * as Db from '@/db';
import {
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Patch,
	Post,
	ProjectScope,
	Put,
	Query,
	RestController,
} from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import type { IWorkflowResponse } from '@/interfaces';
import { License } from '@/license';
import { listQueryMiddleware } from '@/middlewares';
import { AuthenticatedRequest } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { FolderService } from '@/services/folder.service';
import { NamingService } from '@/services/naming.service';
import { ProjectService } from '@/services/project.service.ee';
import { TagService } from '@/services/tag.service';
import { UserManagementMailer } from '@/user-management/email';
import * as utils from '@/utils';
import * as WorkflowHelpers from '@/workflow-helpers';

import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowHistoryService } from './workflow-history.ee/workflow-history.service.ee';
import { WorkflowRequest } from './workflow.request';
import { WorkflowService } from './workflow.service';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import { CredentialsService } from '../credentials/credentials.service';

@RestController('/workflows')
export class WorkflowsController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly tagRepository: TagRepository,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly tagService: TagService,
		private readonly namingService: NamingService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowService: WorkflowService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly license: License,
		private readonly mailer: UserManagementMailer,
		private readonly credentialsService: CredentialsService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly folderService: FolderService,
	) {}

	@Post('/')
	async create(req: WorkflowRequest.Create) {
		delete req.body.id; // delete if sent
		// @ts-expect-error: We shouldn't accept this because it can
		// mess with relations of other workflows
		delete req.body.shared;

		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, req.body);

		newWorkflow.versionId = uuid();

		await validateEntity(newWorkflow);

		await this.externalHooks.run('workflow.create', [newWorkflow]);

		const { tags: tagIds } = req.body;

		if (tagIds?.length && !this.globalConfig.tags.disabled) {
			newWorkflow.tags = await this.tagRepository.findMany(tagIds);
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		if (this.license.isSharingEnabled()) {
			// This is a new workflow, so we simply check if the user has access to
			// all used credentials

			const allCredentials = await this.credentialsService.getMany(req.user);

			try {
				this.enterpriseWorkflowService.validateCredentialPermissionsToUser(
					newWorkflow,
					allCredentials,
				);
			} catch (error) {
				throw new BadRequestError(
					'The workflow you are trying to save contains credentials that are not shared with you',
				);
			}
		}

		let project: Project | null;
		const savedWorkflow = await Db.transaction(async (transactionManager) => {
			const workflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			const { projectId, parentFolderId } = req.body;
			project =
				projectId === undefined
					? await this.projectRepository.getPersonalProjectForUser(req.user.id, transactionManager)
					: await this.projectService.getProjectWithScope(
							req.user,
							projectId,
							['workflow:create'],
							transactionManager,
						);

			if (typeof projectId === 'string' && project === null) {
				throw new BadRequestError(
					"You don't have the permissions to save the workflow in this project.",
				);
			}

			// Safe guard in case the personal project does not exist for whatever reason.
			if (project === null) {
				throw new UnexpectedError('No personal project found');
			}

			if (parentFolderId) {
				try {
					const parentFolder = await this.folderService.findFolderInProjectOrFail(
						parentFolderId,
						project.id,
						transactionManager,
					);
					await transactionManager.update(WorkflowEntity, { id: workflow.id }, { parentFolder });
				} catch {}
			}

			const newSharedWorkflow = this.sharedWorkflowRepository.create({
				role: 'workflow:owner',
				projectId: project.id,
				workflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

			return await this.sharedWorkflowRepository.findWorkflowForUser(
				workflow.id,
				req.user,
				['workflow:read'],
				{ em: transactionManager, includeTags: true, includeParentFolder: true },
			);
		});

		if (!savedWorkflow) {
			this.logger.error('Failed to create workflow', { userId: req.user.id });
			throw new InternalServerError('Failed to save workflow');
		}

		await this.workflowHistoryService.saveVersion(req.user, savedWorkflow, savedWorkflow.id);

		if (tagIds && !this.globalConfig.tags.disabled && savedWorkflow.tags) {
			savedWorkflow.tags = this.tagService.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		const savedWorkflowWithMetaData =
			this.enterpriseWorkflowService.addOwnerAndSharings(savedWorkflow);

		// @ts-expect-error: This is added as part of addOwnerAndSharings but
		// shouldn't be returned to the frontend
		delete savedWorkflowWithMetaData.shared;

		await this.externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		this.eventService.emit('workflow-created', {
			user: req.user,
			workflow: newWorkflow,
			publicApi: false,
			projectId: project!.id,
			projectType: project!.type,
		});

		const scopes = await this.workflowService.getWorkflowScopes(req.user, savedWorkflow.id);

		return { ...savedWorkflowWithMetaData, scopes };
	}

	@Get('/', { middlewares: listQueryMiddleware })
	async getAll(req: WorkflowRequest.GetMany, res: express.Response) {
		try {
			const { workflows: data, count } = await this.workflowService.getMany(
				req.user,
				req.listQueryOptions,
				!!req.query.includeScopes,
				!!req.query.includeFolders,
			);

			res.json({ count, data });
		} catch (maybeError) {
			const error = utils.toError(maybeError);
			ResponseHelper.reportError(error);
			ResponseHelper.sendErrorResponse(res, error);
		}
	}

	@Get('/new')
	async getNewName(req: WorkflowRequest.NewName) {
		const requestedName = req.query.name ?? this.globalConfig.workflows.defaultName;

		const name = await this.namingService.getUniqueWorkflowName(requestedName);
		return { name };
	}

	@Get('/from-url')
	async getFromUrl(
		_req: AuthenticatedRequest,
		_res: express.Response,
		@Query query: ImportWorkflowFromUrlDto,
	) {
		let workflowData: IWorkflowResponse | undefined;
		try {
			const { data } = await axios.get<IWorkflowResponse>(query.url);
			workflowData = data;
		} catch (error) {
			throw new BadRequestError('The URL does not point to valid JSON file!');
		}

		// Do a very basic check if it is really a n8n-workflow-json
		if (
			workflowData?.nodes === undefined ||
			!Array.isArray(workflowData.nodes) ||
			workflowData.connections === undefined ||
			typeof workflowData.connections !== 'object' ||
			Array.isArray(workflowData.connections)
		) {
			throw new BadRequestError(
				'The data in the file does not seem to be a n8n workflow JSON file!',
			);
		}

		return workflowData;
	}

	@Get('/:workflowId')
	@ProjectScope('workflow:read')
	async getWorkflow(req: WorkflowRequest.Get) {
		const { workflowId } = req.params;

		if (this.license.isSharingEnabled()) {
			const relations: FindOptionsRelations<WorkflowEntity> = {
				shared: {
					project: {
						projectRelations: true,
					},
				},
			};

			if (!this.globalConfig.tags.disabled) {
				relations.tags = true;
			}

			const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(
				workflowId,
				req.user,
				['workflow:read'],
				{ includeTags: !this.globalConfig.tags.disabled, includeParentFolder: true },
			);

			if (!workflow) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			const enterpriseWorkflowService = this.enterpriseWorkflowService;

			const workflowWithMetaData = enterpriseWorkflowService.addOwnerAndSharings(workflow);

			await enterpriseWorkflowService.addCredentialsToWorkflow(workflowWithMetaData, req.user);

			// @ts-expect-error: This is added as part of addOwnerAndSharings but
			// shouldn't be returned to the frontend
			delete workflowWithMetaData.shared;

			const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);

			return { ...workflowWithMetaData, scopes };
		}

		// sharing disabled

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(
			workflowId,
			req.user,
			['workflow:read'],
			{ includeTags: !this.globalConfig.tags.disabled },
		);

		if (!workflow) {
			this.logger.warn('User attempted to access a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Could not load the workflow - you can only access workflows owned by you',
			);
		}

		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);

		return { ...workflow, scopes };
	}

	@Patch('/:workflowId')
	@ProjectScope('workflow:update')
	async update(req: WorkflowRequest.Update) {
		const { workflowId } = req.params;
		const forceSave = req.query.forceSave === 'true';

		let updateData = new WorkflowEntity();
		const { tags, parentFolderId, ...rest } = req.body;
		Object.assign(updateData, rest);

		const isSharingEnabled = this.license.isSharingEnabled();
		if (isSharingEnabled) {
			updateData = await this.enterpriseWorkflowService.preventTampering(
				updateData,
				workflowId,
				req.user,
			);
		}

		const updatedWorkflow = await this.workflowService.update(
			req.user,
			updateData,
			workflowId,
			tags,
			parentFolderId,
			isSharingEnabled ? forceSave : true,
		);

		const scopes = await this.workflowService.getWorkflowScopes(req.user, workflowId);

		return { ...updatedWorkflow, scopes };
	}

	@Delete('/:workflowId')
	@ProjectScope('workflow:delete')
	async delete(req: WorkflowRequest.Delete) {
		const { workflowId } = req.params;

		const workflow = await this.workflowService.delete(req.user, workflowId);
		if (!workflow) {
			this.logger.warn('User attempted to delete a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new BadRequestError(
				'Could not delete the workflow - you can only remove workflows owned by you',
			);
		}

		return true;
	}

	@Post('/:workflowId/run')
	@ProjectScope('workflow:execute')
	async runManually(
		req: WorkflowRequest.ManualRun,
		_res: unknown,
		@Query query: ManualRunQueryDto,
	) {
		if (!req.body.workflowData.id) {
			throw new UnexpectedError('You cannot execute a workflow without an ID');
		}

		if (req.params.workflowId !== req.body.workflowData.id) {
			throw new UnexpectedError('Workflow ID in body does not match workflow ID in URL');
		}

		if (this.license.isSharingEnabled()) {
			const workflow = this.workflowRepository.create(req.body.workflowData);

			const safeWorkflow = await this.enterpriseWorkflowService.preventTampering(
				workflow,
				workflow.id,
				req.user,
			);
			req.body.workflowData.nodes = safeWorkflow.nodes;
		}

		return await this.workflowExecutionService.executeManually(
			req.body,
			req.user,
			req.headers['push-ref'],
			query.partialExecutionVersion,
		);
	}

	@Licensed('feat:sharing')
	@Put('/:workflowId/share')
	@ProjectScope('workflow:share')
	async share(req: WorkflowRequest.Share) {
		const { workflowId } = req.params;
		const { shareWithIds } = req.body;

		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new BadRequestError('Bad request');
		}

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, req.user, [
			'workflow:share',
		]);

		if (!workflow) {
			throw new ForbiddenError();
		}

		let newShareeIds: string[] = [];
		await Db.transaction(async (trx) => {
			const currentPersonalProjectIDs = workflow.shared
				.filter((sw) => sw.role === 'workflow:editor')
				.map((sw) => sw.projectId);
			const newPersonalProjectIDs = shareWithIds;

			const toShare = utils.rightDiff(
				[currentPersonalProjectIDs, (id) => id],
				[newPersonalProjectIDs, (id) => id],
			);

			const toUnshare = utils.rightDiff(
				[newPersonalProjectIDs, (id) => id],
				[currentPersonalProjectIDs, (id) => id],
			);

			await trx.delete(SharedWorkflow, {
				workflowId,
				projectId: In(toUnshare),
			});

			await this.enterpriseWorkflowService.shareWithProjects(workflow.id, toShare, trx);

			newShareeIds = toShare;
		});

		this.eventService.emit('workflow-sharing-updated', {
			workflowId,
			userIdSharer: req.user.id,
			userIdList: shareWithIds,
		});

		const projectsRelations = await this.projectRelationRepository.findBy({
			projectId: In(newShareeIds),
			role: 'project:personalOwner',
		});

		await this.mailer.notifyWorkflowShared({
			sharer: req.user,
			newShareeIds: projectsRelations.map((pr) => pr.userId),
			workflow,
		});
	}

	@Put('/:workflowId/transfer')
	@ProjectScope('workflow:move')
	async transfer(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
		@Body body: TransferWorkflowBodyDto,
	) {
		return await this.enterpriseWorkflowService.transferOne(
			req.user,
			workflowId,
			body.destinationProjectId,
			body.shareCredentials,
		);
	}
}
