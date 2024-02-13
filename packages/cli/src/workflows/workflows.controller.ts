import express from 'express';
import { v4 as uuid } from 'uuid';
import axios from 'axios';

import * as Db from '@/Db';
import * as GenericHelpers from '@/GenericHelpers';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { IWorkflowResponse } from '@/Interfaces';
import config from '@/config';
import { Authorized, Delete, Get, Patch, Post, Put, RestController } from '@/decorators';
import { SharedWorkflow, type WorkflowSharingRole } from '@db/entities/SharedWorkflow';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { TagRepository } from '@db/repositories/tag.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import { ListQuery } from '@/requests';
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
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { NamingService } from '@/services/naming.service';
import { UserOnboardingService } from '@/services/userOnboarding.service';
import { CredentialsService } from '../credentials/credentials.service';
import { WorkflowRequest } from './workflow.request';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import { WorkflowExecutionService } from './workflowExecution.service';
import { WorkflowSharingService } from './workflowSharing.service';
import { UserManagementMailer } from '@/UserManagement/email';

@Authorized()
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
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly license: License,
		private readonly mailer: UserManagementMailer,
		private readonly credentialsService: CredentialsService,
	) {}

	@Post('/')
	async create(req: WorkflowRequest.Create) {
		delete req.body.id; // delete if sent

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
			// all used workflows

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

		let savedWorkflow: undefined | WorkflowEntity;

		await Db.transaction(async (transactionManager) => {
			savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			const newSharedWorkflow = new SharedWorkflow();

			Object.assign(newSharedWorkflow, {
				role: 'workflow:owner',
				user: req.user,
				workflow: savedWorkflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);
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

		await this.externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		void this.internalHooks.onWorkflowCreated(req.user, newWorkflow, false);

		return savedWorkflow;
	}

	@Get('/', { middlewares: listQueryMiddleware })
	async getAll(req: ListQuery.Request, res: express.Response) {
		try {
			const roles: WorkflowSharingRole[] = this.license.isSharingEnabled()
				? []
				: ['workflow:owner'];
			const sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(
				req.user,
				roles,
			);

			const { workflows: data, count } = await this.workflowService.getMany(
				sharedWorkflowIds,
				req.listQueryOptions,
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

	@Get('/:id')
	async getWorkflow(req: WorkflowRequest.Get) {
		const { id: workflowId } = req.params;

		if (this.license.isSharingEnabled()) {
			const relations = ['shared', 'shared.user'];
			if (!config.getEnv('workflowTagsDisabled')) {
				relations.push('tags');
			}

			const workflow = await this.workflowRepository.get({ id: workflowId }, { relations });

			if (!workflow) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			const userSharing = workflow.shared?.find((shared) => shared.user.id === req.user.id);
			if (!userSharing && !req.user.hasGlobalScope('workflow:read')) {
				throw new UnauthorizedError(
					'You do not have permission to access this workflow. Ask the owner to share it with you',
				);
			}

			const enterpriseWorkflowService = this.enterpriseWorkflowService;

			enterpriseWorkflowService.addOwnerAndSharings(workflow);
			await enterpriseWorkflowService.addCredentialsToWorkflow(workflow, req.user);
			return workflow;
		}

		// sharing disabled

		const extraRelations = config.getEnv('workflowTagsDisabled') ? [] : ['workflow.tags'];

		const shared = await this.sharedWorkflowRepository.findSharing(
			workflowId,
			req.user,
			'workflow:read',
			{ extraRelations },
		);

		if (!shared) {
			this.logger.verbose('User attempted to access a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Could not load the workflow - you can only access workflows owned by you',
			);
		}

		return shared.workflow;
	}

	@Patch('/:id')
	async update(req: WorkflowRequest.Update) {
		const { id: workflowId } = req.params;
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
			isSharingEnabled ? undefined : ['workflow:owner'],
		);

		return updatedWorkflow;
	}

	@Delete('/:id')
	async delete(req: WorkflowRequest.Delete) {
		const { id: workflowId } = req.params;

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

	@Post('/run')
	async runManually(req: WorkflowRequest.ManualRun) {
		if (this.license.isSharingEnabled()) {
			const workflow = this.workflowRepository.create(req.body.workflowData);

			if (req.body.workflowData.id !== undefined) {
				const safeWorkflow = await this.enterpriseWorkflowService.preventTampering(
					workflow,
					workflow.id,
					req.user,
				);
				req.body.workflowData.nodes = safeWorkflow.nodes;
			}
		}

		return await this.workflowExecutionService.executeManually(
			req.body,
			req.user,
			GenericHelpers.getSessionId(req),
		);
	}

	@Put('/:workflowId/share')
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

		const isOwnedRes = await this.enterpriseWorkflowService.isOwned(req.user, workflowId);
		const { ownsWorkflow } = isOwnedRes;
		let { workflow } = isOwnedRes;

		if (!ownsWorkflow || !workflow) {
			workflow = undefined;
			// Allow owners/admins to share
			if (req.user.hasGlobalScope('workflow:share')) {
				const sharedRes = await this.sharedWorkflowRepository.getSharing(req.user, workflowId, {
					allowGlobalScope: true,
					globalScope: 'workflow:share',
				});
				workflow = sharedRes?.workflow;
			}
			if (!workflow) {
				throw new UnauthorizedError('Forbidden');
			}
		}

		const ownerIds = (
			await this.workflowRepository.getSharings(
				Db.getConnection().createEntityManager(),
				workflowId,
				['shared'],
			)
		)
			.filter((e) => e.role === 'workflow:owner')
			.map((e) => e.userId);

		let newShareeIds: string[] = [];
		await Db.transaction(async (trx) => {
			// remove all sharings that are not supposed to exist anymore
			await this.workflowRepository.pruneSharings(trx, workflowId, [...ownerIds, ...shareWithIds]);

			const sharings = await this.workflowRepository.getSharings(trx, workflowId);

			// extract the new sharings that need to be added
			newShareeIds = utils.rightDiff(
				[sharings, (sharing) => sharing.userId],
				[shareWithIds, (shareeId) => shareeId],
			);

			if (newShareeIds.length) {
				const users = await this.userRepository.getByIds(trx, newShareeIds);
				await this.sharedWorkflowRepository.share(trx, workflow!, users);
			}
		});

		void this.internalHooks.onWorkflowSharingUpdate(workflowId, req.user.id, shareWithIds);

		await this.mailer.notifyWorkflowShared({
			sharer: req.user,
			newShareeIds,
			workflow,
		});
	}
}
