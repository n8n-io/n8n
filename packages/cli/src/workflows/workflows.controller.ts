import express from 'express';
import { v4 as uuid } from 'uuid';
import axios from 'axios';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { IWorkflowResponse } from '@/Interfaces';
import config from '@/config';
import { Delete, Get, Patch, Post, ProjectScope, Put, RestController } from '@/decorators';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { TagRepository } from '@db/repositories/tag.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import { WorkflowService } from './workflow.service';
import { License } from '@/License';
import { InternalHooks } from '@/InternalHooks';
import * as utils from '@/utils';
import { listQueryMiddleware } from '@/middlewares';
import { TagService } from '@/services/tag.service';
import { WorkflowHistoryService } from './workflowHistory/workflowHistory.service.ee';
import { Logger } from '@/Logger';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NamingService } from '@/services/naming.service';
import { UserOnboardingService } from '@/services/userOnboarding.service';
import { CredentialsService } from '../credentials/credentials.service';
import { WorkflowRequest } from './workflow.request';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import { WorkflowExecutionService } from './workflowExecution.service';
import { UserManagementMailer } from '@/UserManagement/email';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectService } from '@/services/project.service';
import { ApplicationError } from 'n8n-workflow';
import { In, type FindOptionsRelations } from '@n8n/typeorm';
import type { Project } from '@/databases/entities/Project';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import { z } from 'zod';

@RestController('/workflows')
export class WorkflowsController {
	constructor(
		private readonly logger: Logger,
		private readonly internalHooks: InternalHooks,
		private readonly externalHooks: ExternalHooks,
		private readonly tagRepository: TagRepository,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly tagService: TagService,
		private readonly namingService: NamingService,
		private readonly userOnboardingService: UserOnboardingService,
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

		if (tagIds?.length && !config.getEnv('workflowTagsDisabled')) {
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

			const { projectId } = req.body;
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
				throw new ApplicationError('No personal project found');
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
				{ em: transactionManager, includeTags: true },
			);
		});

		if (!savedWorkflow) {
			this.logger.error('Failed to create workflow', { userId: req.user.id });
			throw new InternalServerError('Failed to save workflow');
		}

		await this.workflowHistoryService.saveVersion(req.user, savedWorkflow, savedWorkflow.id);

		if (tagIds && !config.getEnv('workflowTagsDisabled') && savedWorkflow.tags) {
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
		void this.internalHooks.onWorkflowCreated(req.user, newWorkflow, project!, false);

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
		const requestedName = req.query.name ?? config.getEnv('workflows.defaultName');

		const name = await this.namingService.getUniqueWorkflowName(requestedName);

		const onboardingFlowEnabled =
			!config.getEnv('workflows.onboardingFlowDisabled') &&
			!req.user.settings?.isOnboarded &&
			(await this.userOnboardingService.isBelowThreshold(req.user));

		return { name, onboardingFlowEnabled };
	}

	@Get('/from-url')
	async getFromUrl(req: WorkflowRequest.FromUrl) {
		if (req.query.url === undefined) {
			throw new BadRequestError('The parameter "url" is missing!');
		}
		if (!/^http[s]?:\/\/.*\.json$/i.exec(req.query.url)) {
			throw new BadRequestError(
				'The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.',
			);
		}
		let workflowData: IWorkflowResponse | undefined;
		try {
			const { data } = await axios.get<IWorkflowResponse>(req.query.url);
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

			if (!config.getEnv('workflowTagsDisabled')) {
				relations.tags = true;
			}

			const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(
				workflowId,
				req.user,
				['workflow:read'],
				{ includeTags: !config.getEnv('workflowTagsDisabled') },
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
			{ includeTags: !config.getEnv('workflowTagsDisabled') },
		);

		if (!workflow) {
			this.logger.verbose('User attempted to access a workflow without permissions', {
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
		const { tags, ...rest } = req.body;
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
			this.logger.verbose('User attempted to delete a workflow without permissions', {
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
	async runManually(req: WorkflowRequest.ManualRun) {
		if (!req.body.workflowData.id) {
			throw new ApplicationError('You cannot execute a workflow without an ID', {
				level: 'warning',
			});
		}

		if (req.params.workflowId !== req.body.workflowData.id) {
			throw new ApplicationError('Workflow ID in body does not match workflow ID in URL', {
				level: 'warning',
			});
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
			req.headers['push-ref'] as string,
		);
	}

	@Put('/:workflowId/share')
	@ProjectScope('workflow:share')
	async share(req: WorkflowRequest.Share) {
		if (!this.license.isSharingEnabled()) throw new NotFoundError('Route not found');

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

			await this.enterpriseWorkflowService.shareWithProjects(workflow, toShare, trx);

			newShareeIds = toShare;
		});

		void this.internalHooks.onWorkflowSharingUpdate(workflowId, req.user.id, shareWithIds);

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
	async transfer(req: WorkflowRequest.Transfer) {
		const body = z.object({ destinationProjectId: z.string() }).parse(req.body);

		return await this.enterpriseWorkflowService.transferOne(
			req.user,
			req.params.workflowId,
			body.destinationProjectId,
		);
	}
}
