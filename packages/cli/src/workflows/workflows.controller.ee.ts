import express from 'express';
import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import config from '@/config';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { validateEntity } from '@/GenericHelpers';
import type { ListQuery, WorkflowRequest } from '@/requests';
import { isSharingEnabled, rightDiff } from '@/UserManagement/UserManagementHelper';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import { ExternalHooks } from '@/ExternalHooks';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { CredentialsService } from '../credentials/credentials.service';
import type { IExecutionPushResponse } from '@/Interfaces';
import * as GenericHelpers from '@/GenericHelpers';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { RoleService } from '@/services/role.service';
import * as utils from '@/utils';
import { listQueryMiddleware } from '@/middlewares';
import { TagService } from '@/services/tag.service';
import { Logger } from '@/Logger';
import { WorkflowHistoryService } from './workflowHistory/workflowHistory.service.ee';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { WorkflowService } from './workflow.service';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';

export const EEWorkflowController = express.Router();

EEWorkflowController.use((req, res, next) => {
	if (!isSharingEnabled()) {
		// skip ee router and use free one
		next('router');
		return;
	}
	// use ee router
	next();
});

/**
 * (EE) PUT /workflows/:id/share
 *
 * Grant or remove users' access to a workflow.
 */

EEWorkflowController.put(
	'/:workflowId/share',
	ResponseHelper.send(async (req: WorkflowRequest.Share) => {
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
				const sharedRes = await Container.get(WorkflowService).getSharing(req.user, workflowId, {
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
				await Container.get(EnterpriseWorkflowService).share(trx, workflow!, newShareeIds);
			}
		});

		void Container.get(InternalHooks).onWorkflowSharingUpdate(
			workflowId,
			req.user.id,
			shareWithIds,
		);
	}),
);

EEWorkflowController.get(
	'/:id(\\w+)',
	(req, res, next) => (req.params.id === 'new' ? next('router') : next()), // skip ee router and use free one for naming
	ResponseHelper.send(async (req: WorkflowRequest.Get) => {
		const { id: workflowId } = req.params;

		const relations = ['shared', 'shared.user', 'shared.role'];
		if (!config.getEnv('workflowTagsDisabled')) {
			relations.push('tags');
		}

		const workflow = await Container.get(WorkflowRepository).get({ id: workflowId }, { relations });

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
	}),
);

EEWorkflowController.post(
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
			throw new InternalServerError(
				'An error occurred while saving your workflow. Please try again.',
			);
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
 * (EE) GET /workflows
 */
EEWorkflowController.get(
	'/',
	listQueryMiddleware,
	async (req: ListQuery.Request, res: express.Response) => {
		try {
			const sharedWorkflowIds = await WorkflowHelpers.getSharedWorkflowIds(req.user);

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

EEWorkflowController.patch(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowRequest.Update) => {
		const { id: workflowId } = req.params;
		const forceSave = req.query.forceSave === 'true';

		const updateData = new WorkflowEntity();
		const { tags, ...rest } = req.body;
		Object.assign(updateData, rest);

		const safeWorkflow = await Container.get(EnterpriseWorkflowService).preventTampering(
			updateData,
			workflowId,
			req.user,
		);

		const updatedWorkflow = await Container.get(WorkflowService).update(
			req.user,
			safeWorkflow,
			workflowId,
			tags,
			forceSave,
		);

		return updatedWorkflow;
	}),
);

/**
 * (EE) POST /workflows/run
 */
EEWorkflowController.post(
	'/run',
	ResponseHelper.send(async (req: WorkflowRequest.ManualRun): Promise<IExecutionPushResponse> => {
		const workflow = new WorkflowEntity();
		Object.assign(workflow, req.body.workflowData);

		if (req.body.workflowData.id !== undefined) {
			const safeWorkflow = await Container.get(EnterpriseWorkflowService).preventTampering(
				workflow,
				workflow.id,
				req.user,
			);
			req.body.workflowData.nodes = safeWorkflow.nodes;
		}

		return Container.get(WorkflowService).runManually(
			req.body,
			req.user,
			GenericHelpers.getSessionId(req),
		);
	}),
);
