import express from 'express';

import { FindManyOptions, In, ObjectLiteral } from 'typeorm';

import * as Db from '@/Db';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import config from '@/config';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { InternalHooksManager } from '@/InternalHooksManager';
import { ExternalHooks } from '@/ExternalHooks';
import { addNodeIds, replaceInvalidCredentials } from '@/WorkflowHelpers';
import { WorkflowRequest } from '../../../types';
import { authorize, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { getWorkflowOwnerRole, isInstanceOwner } from '../users/users.service';
import {
	getWorkflowById,
	getSharedWorkflow,
	setWorkflowAsActive,
	setWorkflowAsInactive,
	updateWorkflow,
	hasStartNode,
	getStartNode,
	getWorkflows,
	getSharedWorkflows,
	getWorkflowsCount,
	createWorkflow,
	getWorkflowIdsViaTags,
	parseTagNames,
} from './workflows.service';

export = {
	createWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Create, res: express.Response): Promise<express.Response> => {
			const workflow = req.body;

			workflow.active = false;

			if (!hasStartNode(workflow)) {
				workflow.nodes.push(getStartNode());
			}

			await replaceInvalidCredentials(workflow);

			addNodeIds(workflow);

			const role = await getWorkflowOwnerRole();

			const createdWorkflow = await createWorkflow(workflow, req.user, role);

			await ExternalHooks().run('workflow.afterCreate', [createdWorkflow]);
			void InternalHooksManager.getInstance().onWorkflowCreated(req.user.id, createdWorkflow, true);

			return res.json(createdWorkflow);
		},
	],
	deleteWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflow = await getSharedWorkflow(req.user, id.toString());

			if (!sharedWorkflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			if (sharedWorkflow.workflow.active) {
				// deactivate before deleting
				await ActiveWorkflowRunner.getInstance().remove(id.toString());
			}

			await Db.collections.Workflow.delete(id);

			void InternalHooksManager.getInstance().onWorkflowDeleted(req.user.id, id.toString(), true);
			await ExternalHooks().run('workflow.afterDelete', [id.toString()]);

			return res.json(sharedWorkflow.workflow);
		},
	],
	getWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflow = await getSharedWorkflow(req.user, id.toString());

			if (!sharedWorkflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			void InternalHooksManager.getInstance().onUserRetrievedWorkflow({
				user_id: req.user.id,
				public_api: true,
			});

			return res.json(sharedWorkflow.workflow);
		},
	],
	getWorkflows: [
		authorize(['owner', 'member']),
		validCursor,
		async (req: WorkflowRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const { offset = 0, limit = 100, active = undefined, tags = undefined } = req.query;

			let workflows: WorkflowEntity[];
			let count: number;

			const query: FindManyOptions<WorkflowEntity> & { where: ObjectLiteral } = {
				skip: offset,
				take: limit,
				where: {
					...(active !== undefined && { active }),
				},
				...(!config.getEnv('workflowTagsDisabled') && { relations: ['tags'] }),
			};

			if (isInstanceOwner(req.user)) {
				if (tags) {
					const workflowIds = await getWorkflowIdsViaTags(parseTagNames(tags));
					Object.assign(query.where, { id: In(workflowIds) });
				}

				workflows = await getWorkflows(query);

				count = await getWorkflowsCount(query);
			} else {
				const options: { workflowIds?: number[] } = {};

				if (tags) {
					options.workflowIds = await getWorkflowIdsViaTags(parseTagNames(tags));
				}

				const sharedWorkflows = await getSharedWorkflows(req.user, options);

				if (!sharedWorkflows.length) {
					return res.status(200).json({
						data: [],
						nextCursor: null,
					});
				}

				const workflowsIds = sharedWorkflows.map((shareWorkflow) => shareWorkflow.workflowId);

				Object.assign(query.where, { id: In(workflowsIds) });

				workflows = await getWorkflows(query);

				count = await getWorkflowsCount(query);
			}

			void InternalHooksManager.getInstance().onUserRetrievedAllWorkflows({
				user_id: req.user.id,
				public_api: true,
			});

			return res.json({
				data: workflows,
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
	updateWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Update, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const updateData = new WorkflowEntity();
			Object.assign(updateData, req.body);

			const sharedWorkflow = await getSharedWorkflow(req.user, id.toString());

			if (!sharedWorkflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			if (!hasStartNode(updateData)) {
				updateData.nodes.push(getStartNode());
			}

			await replaceInvalidCredentials(updateData);
			addNodeIds(updateData);

			const workflowRunner = ActiveWorkflowRunner.getInstance();

			if (sharedWorkflow.workflow.active) {
				// When workflow gets saved always remove it as the triggers could have been
				// changed and so the changes would not take effect
				await workflowRunner.remove(id.toString());
			}

			try {
				await updateWorkflow(sharedWorkflow.workflowId, updateData);
			} catch (error) {
				if (error instanceof Error) {
					return res.status(400).json({ message: error.message });
				}
			}

			if (sharedWorkflow.workflow.active) {
				try {
					await workflowRunner.add(sharedWorkflow.workflowId.toString(), 'update');
				} catch (error) {
					if (error instanceof Error) {
						return res.status(400).json({ message: error.message });
					}
				}
			}

			const updatedWorkflow = await getWorkflowById(sharedWorkflow.workflowId);

			await ExternalHooks().run('workflow.afterUpdate', [updateData]);
			void InternalHooksManager.getInstance().onWorkflowSaved(req.user.id, updateData, true);

			return res.json(updatedWorkflow);
		},
	],
	activateWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflow = await getSharedWorkflow(req.user, id.toString());

			if (!sharedWorkflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			if (!sharedWorkflow.workflow.active) {
				try {
					await ActiveWorkflowRunner.getInstance().add(
						sharedWorkflow.workflowId.toString(),
						'activate',
					);
				} catch (error) {
					if (error instanceof Error) {
						return res.status(400).json({ message: error.message });
					}
				}

				// change the status to active in the DB
				await setWorkflowAsActive(sharedWorkflow.workflow);

				sharedWorkflow.workflow.active = true;

				return res.json(sharedWorkflow.workflow);
			}

			// nothing to do as the workflow is already active
			return res.json(sharedWorkflow.workflow);
		},
	],
	deactivateWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflow = await getSharedWorkflow(req.user, id.toString());

			if (!sharedWorkflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			const workflowRunner = ActiveWorkflowRunner.getInstance();

			if (sharedWorkflow.workflow.active) {
				await workflowRunner.remove(sharedWorkflow.workflowId.toString());

				await setWorkflowAsInactive(sharedWorkflow.workflow);

				sharedWorkflow.workflow.active = false;

				return res.json(sharedWorkflow.workflow);
			}

			// nothing to do as the workflow is already inactive
			return res.json(sharedWorkflow.workflow);
		},
	],
};
