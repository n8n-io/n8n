import express from 'express';
import { Db, InternalHooksManager, ResponseHelper, WorkflowHelpers } from '..';
import config from '../../config';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { validateEntity } from '../GenericHelpers';
import type { WorkflowRequest } from '../requests';
import { isSharingEnabled, rightDiff } from '../UserManagement/UserManagementHelper';
import { EEWorkflowsService as EEWorkflows } from './workflows.services.ee';
import { externalHooks } from '../Server';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { LoggerProxy } from 'n8n-workflow';
import * as TagHelpers from '../TagHelpers';
import { EECredentialsService as EECredentials } from '../credentials/credentials.service.ee';
import { WorkflowsService } from './workflows.services';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EEWorkflowController = express.Router();

EEWorkflowController.use((req, res, next) => {
	if (!isSharingEnabled() || !config.getEnv('enterprise.workflowSharingEnabled')) {
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

EEWorkflowController.put('/:workflowId/share', async (req: WorkflowRequest.Share, res) => {
	const { workflowId } = req.params;
	const { shareWithIds } = req.body;

	if (!Array.isArray(shareWithIds) || !shareWithIds.every((userId) => typeof userId === 'string')) {
		return res.status(400).send('Bad Request');
	}

	const { ownsWorkflow, workflow } = await EEWorkflows.isOwned(req.user, workflowId);

	if (!ownsWorkflow || !workflow) {
		return res.status(403).send();
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

	return res.status(200).send();
});

EEWorkflowController.get(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: WorkflowRequest.Get) => {
		const { id: workflowId } = req.params;

		const workflow = await EEWorkflows.get(
			{ id: parseInt(workflowId, 10) },
			{ relations: ['shared', 'shared.user', 'shared.role'] },
		);

		if (!workflow) {
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found.`,
				undefined,
				404,
			);
		}

		const userSharing = workflow.shared?.find((shared) => shared.user.id === req.user.id);

		if (!userSharing && req.user.globalRole.name !== 'owner') {
			throw new ResponseHelper.ResponseError(`Forbidden.`, undefined, 403);
		}

		return EEWorkflows.addCredentialsToWorkflow(
			EEWorkflows.addOwnerAndSharings(workflow),
			req.user,
		);
	}),
);

EEWorkflowController.post(
	'/',
	ResponseHelper.send(async (req: WorkflowRequest.Create) => {
		delete req.body.id; // delete if sent

		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, req.body);

		await validateEntity(newWorkflow);

		await externalHooks.run('workflow.create', [newWorkflow]);

		const { tags: tagIds } = req.body;

		if (tagIds?.length && !config.getEnv('workflowTagsDisabled')) {
			newWorkflow.tags = await Db.collections.Tag.findByIds(tagIds, {
				select: ['id', 'name'],
			});
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);

		WorkflowHelpers.addNodeIds(newWorkflow);

		// This is a new workflow, so we simply check if the user has access to
		// all used workflows

		const allCredentials = await EECredentials.getAll(req.user);

		try {
			EEWorkflows.validateCredentialPermissionsToUser(newWorkflow, allCredentials);
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				'The workflow contains credentials that you do not have access to',
				undefined,
				400,
			);
		}

		let savedWorkflow: undefined | WorkflowEntity;

		await Db.transaction(async (transactionManager) => {
			savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			const role = await Db.collections.Role.findOneOrFail({
				name: 'owner',
				scope: 'workflow',
			});

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
			throw new ResponseHelper.ResponseError('Failed to save workflow');
		}

		if (tagIds && !config.getEnv('workflowTagsDisabled') && savedWorkflow.tags) {
			savedWorkflow.tags = TagHelpers.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowCreated(req.user.id, newWorkflow, false);

		const { id, ...rest } = savedWorkflow;

		return {
			id: id.toString(),
			...rest,
		};
	}),
);

/**
 * (EE) GET /workflows
 */
EEWorkflowController.get(
	'/',
	ResponseHelper.send(async (req: WorkflowRequest.GetAll) => {
		const workflows = (await WorkflowsService.getMany(
			req.user,
			req.query.filter,
		)) as unknown as WorkflowEntity[];

		return Promise.all(
			workflows.map(async (workflow) =>
				EEWorkflows.addCredentialsToWorkflow(EEWorkflows.addOwnerAndSharings(workflow), req.user),
			),
		);
	}),
);

EEWorkflowController.patch(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: WorkflowRequest.Update) => {
		const { id: workflowId } = req.params;
		const forceSave = req.query.forceSave === 'true';

		const updateData = new WorkflowEntity();
		const { tags, ...rest } = req.body;
		Object.assign(updateData, rest);

		const updatedWorkflow = await EEWorkflows.updateWorkflow(
			req.user,
			updateData,
			workflowId,
			tags,
			forceSave,
		);

		const { id, ...remainder } = updatedWorkflow;

		return {
			id: id.toString(),
			...remainder,
		};
	}),
);
