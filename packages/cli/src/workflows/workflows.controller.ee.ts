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
import { EEWorkflowsService as EEWorkflows } from './workflows.services.ee';
import { ExternalHooks } from '@/ExternalHooks';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { LoggerProxy } from 'n8n-workflow';
import { CredentialsService } from '../credentials/credentials.service';
import type { IExecutionPushResponse } from '@/Interfaces';
import * as GenericHelpers from '@/GenericHelpers';
import { In } from 'typeorm';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { RoleService } from '@/services/role.service';
import * as utils from '@/utils';
import { listQueryMiddleware } from '@/middlewares';
import { TagService } from '@/services/tag.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
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
			throw new ResponseHelper.BadRequestError('Bad request');
		}

		const { ownsWorkflow, workflow } = await EEWorkflows.isOwned(req.user, workflowId);

		if (!ownsWorkflow || !workflow) {
			throw new ResponseHelper.UnauthorizedError('Forbidden');
		}

		let newShareeIds: string[] = [];
		await Db.transaction(async (trx) => {
			// remove all sharings that are not supposed to exist anymore
			await EEWorkflows.pruneSharings(trx, workflowId, [req.user.id, ...shareWithIds]);

			const sharings = await EEWorkflows.getSharings(trx, workflowId);

			// extract the new sharings that need to be added
			newShareeIds = rightDiff(
				[sharings, (sharing) => sharing.userId],
				[shareWithIds, (shareeId) => shareeId],
			);

			if (newShareeIds.length) {
				await EEWorkflows.share(trx, workflow, newShareeIds);
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

		const workflow = await EEWorkflows.get({ id: workflowId }, { relations });

		if (!workflow) {
			throw new ResponseHelper.NotFoundError(`Workflow with ID "${workflowId}" does not exist`);
		}

		const userSharing = workflow.shared?.find((shared) => shared.user.id === req.user.id);

		if (!userSharing && req.user.globalRole.name !== 'owner') {
			throw new ResponseHelper.UnauthorizedError(
				'You do not have permission to access this workflow. Ask the owner to share it with you',
			);
		}

		EEWorkflows.addOwnerAndSharings(workflow);
		await EEWorkflows.addCredentialsToWorkflow(workflow, req.user);
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
			newWorkflow.tags = await Container.get(TagService).findMany({
				select: ['id', 'name'],
				where: {
					id: In(tagIds),
				},
			});
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		// This is a new workflow, so we simply check if the user has access to
		// all used workflows

		const allCredentials = await CredentialsService.getMany(req.user);

		try {
			EEWorkflows.validateCredentialPermissionsToUser(newWorkflow, allCredentials);
		} catch (error) {
			throw new ResponseHelper.BadRequestError(
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
			LoggerProxy.error('Failed to create workflow', { userId: req.user.id });
			throw new ResponseHelper.InternalServerError(
				'An error occurred while saving your workflow. Please try again.',
			);
		}

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

			const { workflows: data, count } = await EEWorkflows.getMany(
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

		const safeWorkflow = await EEWorkflows.preventTampering(updateData, workflowId, req.user);

		const updatedWorkflow = await EEWorkflows.update(
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
			const safeWorkflow = await EEWorkflows.preventTampering(workflow, workflow.id, req.user);
			req.body.workflowData.nodes = safeWorkflow.nodes;
		}

		return EEWorkflows.runManually(req.body, req.user, GenericHelpers.getSessionId(req));
	}),
);
