import express from 'express';
import { v4 as uuid } from 'uuid';

import axios from 'axios';
import * as Db from '@/Db';
import * as GenericHelpers from '@/GenericHelpers';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { IWorkflowResponse, IExecutionPushResponse } from '@/Interfaces';
import config from '@/config';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import type { ListQuery, WorkflowRequest } from '@/requests';
import { isBelowOnboardingThreshold } from '@/WorkflowHelpers';
import { WorkflowService } from './workflow.service';
import { isSharingEnabled, rightDiff } from '@/UserManagement/UserManagementHelper';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { RoleService } from '@/services/role.service';
import * as utils from '@/utils';
import { listQueryMiddleware } from '@/middlewares';
import { TagService } from '@/services/tag.service';
import { WorkflowHistoryService } from './workflowHistory/workflowHistory.service.ee';
import { Logger } from '@/Logger';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NamingService } from '@/services/naming.service';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { RoleNames } from '@/databases/entities/Role';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { CredentialsService } from '../credentials/credentials.service';
import { UserRepository } from '@/databases/repositories/user.repository';

export const workflowsController = express.Router();

/**
 * POST /workflows
 */
workflowsController.post(
	'/',
	ResponseHelper.send(async (req: WorkflowRequest.Create) => {
		delete req.body.id; // delete if sent

		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, req.body);

		newWorkflow.versionId = uuid();

		await validateEntity(newWorkflow);

		await Container.get(ExternalHooks).run('workflow.create', [newWorkflow]);

		const { tags: tagIds } = req.body;

		if (tagIds?.length && !config.getEnv('workflowTagsDisabled')) {
			newWorkflow.tags = await Container.get(TagRepository).findMany(tagIds);
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		if (isSharingEnabled()) {
			// This is a new workflow, so we simply check if the user has access to
			// all used workflows

			const allCredentials = await CredentialsService.getMany(req.user);

			try {
				Container.get(EnterpriseWorkflowService).validateCredentialPermissionsToUser(
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

			const role = await Container.get(RoleService).findWorkflowOwnerRole();

			const newSharedWorkflow = new SharedWorkflow();

			Object.assign(newSharedWorkflow, {
				role,
				user: req.user,
				workflow: savedWorkflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);
		});

		if (!savedWorkflow) {
			Container.get(Logger).error('Failed to create workflow', { userId: req.user.id });
			throw new InternalServerError('Failed to save workflow');
		}

		await Container.get(WorkflowHistoryService).saveVersion(
			req.user,
			savedWorkflow,
			savedWorkflow.id,
		);

		if (tagIds && !config.getEnv('workflowTagsDisabled') && savedWorkflow.tags) {
			savedWorkflow.tags = Container.get(TagService).sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await Container.get(ExternalHooks).run('workflow.afterCreate', [savedWorkflow]);
		void Container.get(InternalHooks).onWorkflowCreated(req.user, newWorkflow, false);

		return savedWorkflow;
	}),
);

/**
 * GET /workflows
 */
workflowsController.get(
	'/',
	listQueryMiddleware,
	async (req: ListQuery.Request, res: express.Response) => {
		try {
			const roles: RoleNames[] = isSharingEnabled() ? [] : ['owner'];
			const sharedWorkflowIds = await WorkflowHelpers.getSharedWorkflowIds(req.user, roles);

			const { workflows: data, count } = await Container.get(WorkflowService).getMany(
				sharedWorkflowIds,
				req.listQueryOptions,
			);

			res.json({ count, data });
		} catch (maybeError) {
			const error = utils.toError(maybeError);
			ResponseHelper.reportError(error);
			ResponseHelper.sendErrorResponse(res, error);
		}
	},
);

/**
 * GET /workflows/new
 */
workflowsController.get(
	'/new',
	ResponseHelper.send(async (req: WorkflowRequest.NewName) => {
		const requestedName = req.query.name ?? config.getEnv('workflows.defaultName');

		const name = await Container.get(NamingService).getUniqueWorkflowName(requestedName);

		const onboardingFlowEnabled =
			!config.getEnv('workflows.onboardingFlowDisabled') &&
			!req.user.settings?.isOnboarded &&
			(await isBelowOnboardingThreshold(req.user));

		return { name, onboardingFlowEnabled };
	}),
);

// Reads and returns workflow data from an URL
/**
 * GET /workflows/from-url
 */
workflowsController.get(
	'/from-url',
	ResponseHelper.send(async (req: express.Request): Promise<IWorkflowResponse> => {
		if (req.query.url === undefined) {
			throw new BadRequestError('The parameter "url" is missing!');
		}
		if (!/^http[s]?:\/\/.*\.json$/i.exec(req.query.url as string)) {
			throw new BadRequestError(
				'The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.',
			);
		}
		let workflowData: IWorkflowResponse | undefined;
		try {
			const { data } = await axios.get<IWorkflowResponse>(req.query.url as string);
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
	}),
);

/**
 * GET /workflows/:id
 */
workflowsController.get(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowRequest.Get) => {
		const { id: workflowId } = req.params;

		if (isSharingEnabled()) {
			const relations = ['shared', 'shared.user', 'shared.role'];
			if (!config.getEnv('workflowTagsDisabled')) {
				relations.push('tags');
			}

			const workflow = await Container.get(WorkflowRepository).get(
				{ id: workflowId },
				{ relations },
			);

			if (!workflow) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
			}

			const userSharing = workflow.shared?.find((shared) => shared.user.id === req.user.id);
			if (!userSharing && !req.user.hasGlobalScope('workflow:read')) {
				throw new UnauthorizedError(
					'You do not have permission to access this workflow. Ask the owner to share it with you',
				);
			}

			const enterpriseWorkflowService = Container.get(EnterpriseWorkflowService);

			enterpriseWorkflowService.addOwnerAndSharings(workflow);
			await enterpriseWorkflowService.addCredentialsToWorkflow(workflow, req.user);
			return workflow;
		}

		// sharing disabled

		const extraRelations = config.getEnv('workflowTagsDisabled') ? [] : ['workflow.tags'];

		const shared = await Container.get(SharedWorkflowRepository).findSharing(
			workflowId,
			req.user,
			'workflow:read',
			{ extraRelations },
		);

		if (!shared) {
			Container.get(Logger).verbose('User attempted to access a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Could not load the workflow - you can only access workflows owned by you',
			);
		}

		return shared.workflow;
	}),
);

// Updates an existing workflow
/**
 * PATCH /workflows/:id
 */
workflowsController.patch(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowRequest.Update) => {
		const { id: workflowId } = req.params;
		const forceSave = req.query.forceSave === 'true';

		let updateData = new WorkflowEntity();
		const { tags, ...rest } = req.body;
		Object.assign(updateData, rest);

		if (isSharingEnabled()) {
			updateData = await Container.get(EnterpriseWorkflowService).preventTampering(
				updateData,
				workflowId,
				req.user,
			);
		}

		const updatedWorkflow = await Container.get(WorkflowService).update(
			req.user,
			updateData,
			workflowId,
			tags,
			isSharingEnabled() ? forceSave : true,
			isSharingEnabled() ? undefined : ['owner'],
		);

		return updatedWorkflow;
	}),
);

// Deletes a specific workflow
/**
 * DELETE /workflows/:id
 */
workflowsController.delete(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowRequest.Delete) => {
		const { id: workflowId } = req.params;

		const workflow = await Container.get(WorkflowService).delete(req.user, workflowId);
		if (!workflow) {
			Container.get(Logger).verbose('User attempted to delete a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new BadRequestError(
				'Could not delete the workflow - you can only remove workflows owned by you',
			);
		}

		return true;
	}),
);

/**
 * POST /workflows/run
 */
workflowsController.post(
	'/run',
	ResponseHelper.send(async (req: WorkflowRequest.ManualRun): Promise<IExecutionPushResponse> => {
		if (isSharingEnabled()) {
			const workflow = Container.get(WorkflowRepository).create(req.body.workflowData);

			if (req.body.workflowData.id !== undefined) {
				const safeWorkflow = await Container.get(EnterpriseWorkflowService).preventTampering(
					workflow,
					workflow.id,
					req.user,
				);
				req.body.workflowData.nodes = safeWorkflow.nodes;
			}
		}

		return Container.get(WorkflowService).runManually(
			req.body,
			req.user,
			GenericHelpers.getSessionId(req),
		);
	}),
);

/**
 * (EE) PUT /workflows/:id/share
 *
 * Grant or remove users' access to a workflow.
 */
workflowsController.put(
	'/:workflowId/share',
	ResponseHelper.send(async (req: WorkflowRequest.Share) => {
		if (!isSharingEnabled()) throw new NotFoundError('Route not found');

		const { workflowId } = req.params;
		const { shareWithIds } = req.body;

		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new BadRequestError('Bad request');
		}

		const isOwnedRes = await Container.get(EnterpriseWorkflowService).isOwned(req.user, workflowId);
		const { ownsWorkflow } = isOwnedRes;
		let { workflow } = isOwnedRes;

		if (!ownsWorkflow || !workflow) {
			workflow = undefined;
			// Allow owners/admins to share
			if (req.user.hasGlobalScope('workflow:share')) {
				const sharedRes = await Container.get(SharedWorkflowRepository).getSharing(
					req.user,
					workflowId,
					{
						allowGlobalScope: true,
						globalScope: 'workflow:share',
					},
				);
				workflow = sharedRes?.workflow;
			}
			if (!workflow) {
				throw new UnauthorizedError('Forbidden');
			}
		}

		const ownerIds = (
			await Container.get(WorkflowRepository).getSharings(
				Db.getConnection().createEntityManager(),
				workflowId,
				['shared', 'shared.role'],
			)
		)
			.filter((e) => e.role.name === 'owner')
			.map((e) => e.userId);

		let newShareeIds: string[] = [];
		await Db.transaction(async (trx) => {
			// remove all sharings that are not supposed to exist anymore
			await Container.get(WorkflowRepository).pruneSharings(trx, workflowId, [
				...ownerIds,
				...shareWithIds,
			]);

			const sharings = await Container.get(WorkflowRepository).getSharings(trx, workflowId);

			// extract the new sharings that need to be added
			newShareeIds = rightDiff(
				[sharings, (sharing) => sharing.userId],
				[shareWithIds, (shareeId) => shareeId],
			);

			if (newShareeIds.length) {
				const users = await Container.get(UserRepository).getByIds(trx, newShareeIds);
				const role = await Container.get(RoleService).findWorkflowEditorRole();

				await Container.get(SharedWorkflowRepository).share(trx, workflow!, users, role.id);
			}
		});

		void Container.get(InternalHooks).onWorkflowSharingUpdate(
			workflowId,
			req.user.id,
			shareWithIds,
		);
	}),
);
