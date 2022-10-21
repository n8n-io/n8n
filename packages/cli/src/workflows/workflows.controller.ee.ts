import express from 'express';
import {
	ActiveWorkflowRunner,
	Db,
	InternalHooksManager,
	ResponseHelper,
	whereClause,
	WorkflowHelpers,
} from '..';
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
import { FindManyOptions } from 'typeorm';

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
		// @TODO: also return the credentials used by the workflow

		return EEWorkflows.addOwnerAndSharings(workflow);
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

EEWorkflowController.patch(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: WorkflowRequest.Update) => {
		const { id: workflowId } = req.params;

		let updateData = new WorkflowEntity();
		const { tags, ...rest } = req.body;
		Object.assign(updateData, rest);

		const shared = await Db.collections.SharedWorkflow.findOne({
			relations: ['workflow'],
			where: whereClause({
				user: req.user,
				entityType: 'workflow',
				entityId: workflowId,
			}),
		});

		if (!shared) {
			LoggerProxy.info('User attempted to update a workflow without permissions', {
				workflowId,
				userId: req.user.id,
			});
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
				undefined,
				404,
			);
		}

		// check credentials for old format
		await WorkflowHelpers.replaceInvalidCredentials(updateData);

		WorkflowHelpers.addNodeIds(updateData);

		const allCredentials = await EECredentials.getAll(req.user);

		try {
			updateData = WorkflowHelpers.validateWorkflowCredentialUsage(
				updateData,
				shared.workflow,
				allCredentials,
			);
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				'Invalid workflow credentials - make sure you have access to all credentials and try again.',
				undefined,
				400,
			);
		}

		await externalHooks.run('workflow.update', [updateData]);

		if (shared.workflow.active) {
			// When workflow gets saved always remove it as the triggers could have been
			// changed and so the changes would not take effect
			await ActiveWorkflowRunner.getInstance().remove(workflowId);
		}

		if (updateData.settings) {
			if (updateData.settings.timezone === 'DEFAULT') {
				// Do not save the default timezone
				delete updateData.settings.timezone;
			}
			if (updateData.settings.saveDataErrorExecution === 'DEFAULT') {
				// Do not save when default got set
				delete updateData.settings.saveDataErrorExecution;
			}
			if (updateData.settings.saveDataSuccessExecution === 'DEFAULT') {
				// Do not save when default got set
				delete updateData.settings.saveDataSuccessExecution;
			}
			if (updateData.settings.saveManualExecutions === 'DEFAULT') {
				// Do not save when default got set
				delete updateData.settings.saveManualExecutions;
			}
			if (
				parseInt(updateData.settings.executionTimeout as string, 10) ===
				config.get('executions.timeout')
			) {
				// Do not save when default got set
				delete updateData.settings.executionTimeout;
			}
		}

		if (updateData.name) {
			updateData.updatedAt = new Date(); // required due to atomic update
			await validateEntity(updateData);
		}

		await Db.collections.Workflow.update(workflowId, updateData);

		if (tags && !config.getEnv('workflowTagsDisabled')) {
			const tablePrefix = config.getEnv('database.tablePrefix');
			await TagHelpers.removeRelations(workflowId, tablePrefix);

			if (tags.length) {
				await TagHelpers.createRelations(workflowId, tags, tablePrefix);
			}
		}

		const options: FindManyOptions<WorkflowEntity> = {
			relations: ['tags'],
		};

		if (config.getEnv('workflowTagsDisabled')) {
			delete options.relations;
		}

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the hopefully updated entry.
		const updatedWorkflow = await Db.collections.Workflow.findOne(workflowId, options);

		if (updatedWorkflow === undefined) {
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
				undefined,
				400,
			);
		}

		if (updatedWorkflow.tags?.length && tags?.length) {
			updatedWorkflow.tags = TagHelpers.sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tags,
			});
		}

		await externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);
		void InternalHooksManager.getInstance().onWorkflowSaved(req.user.id, updatedWorkflow, false);

		if (updatedWorkflow.active) {
			// When the workflow is supposed to be active add it again
			try {
				await externalHooks.run('workflow.activate', [updatedWorkflow]);
				await ActiveWorkflowRunner.getInstance().add(
					workflowId,
					shared.workflow.active ? 'update' : 'activate',
				);
			} catch (error) {
				// If workflow could not be activated set it again to inactive
				updateData.active = false;
				await Db.collections.Workflow.update(workflowId, updateData);

				// Also set it in the returned data
				updatedWorkflow.active = false;

				// Now return the original error for UI to display
				throw error;
			}
		}

		const { id, ...remainder } = updatedWorkflow;

		return {
			id: id.toString(),
			...remainder,
		};
	}),
);
