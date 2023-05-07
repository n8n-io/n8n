import type express from 'express';
import { Container } from 'typedi';
import type { FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';

import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import config from '@/config';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ExternalHooks } from '@/ExternalHooks';
import { addNodeIds, replaceInvalidCredentials } from '@/WorkflowHelpers';
import type { WorkflowRequest } from '../../../types';
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
	getSharedWorkflows,
	createWorkflow,
	getWorkflowIdsViaTags,
	parseTagNames,
	getWorkflowsAndCount,
} from './workflows.service';
import { WorkflowsService } from '@/workflows/workflows.services';
import { InternalHooks } from '@/InternalHooks';

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

			await Container.get(ExternalHooks).run('workflow.afterCreate', [createdWorkflow]);
			void Container.get(InternalHooks).onWorkflowCreated(req.user, createdWorkflow, true);

			return res.json(createdWorkflow);
		},
	],
	deleteWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id: workflowId } = req.params;

			const workflow = await WorkflowsService.delete(req.user, workflowId);
			if (!workflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			return res.json(workflow);
		},
	],
	getWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			void Container.get(InternalHooks).onUserRetrievedWorkflow({
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

			const where: FindOptionsWhere<WorkflowEntity> = {
				...(active !== undefined && { active }),
			};

			if (isInstanceOwner(req.user)) {
				if (tags) {
					const workflowIds = await getWorkflowIdsViaTags(parseTagNames(tags));
					where.id = In(workflowIds);
				}
			} else {
				const options: { workflowIds?: string[] } = {};

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
				where.id = In(workflowsIds);
			}

			const [workflows, count] = await getWorkflowsAndCount({
				skip: offset,
				take: limit,
				where,
				...(!config.getEnv('workflowTagsDisabled') && { relations: ['tags'] }),
			});

			void Container.get(InternalHooks).onUserRetrievedAllWorkflows({
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

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			if (!hasStartNode(updateData)) {
				updateData.nodes.push(getStartNode());
			}

			await replaceInvalidCredentials(updateData);
			addNodeIds(updateData);

			const workflowRunner = Container.get(ActiveWorkflowRunner);

			if (sharedWorkflow.workflow.active) {
				// When workflow gets saved always remove it as the triggers could have been
				// changed and so the changes would not take effect
				await workflowRunner.remove(id);
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
					await workflowRunner.add(sharedWorkflow.workflowId, 'update');
				} catch (error) {
					if (error instanceof Error) {
						return res.status(400).json({ message: error.message });
					}
				}
			}

			const updatedWorkflow = await getWorkflowById(sharedWorkflow.workflowId);

			await Container.get(ExternalHooks).run('workflow.afterUpdate', [updateData]);
			void Container.get(InternalHooks).onWorkflowSaved(req.user, updateData, true);

			return res.json(updatedWorkflow);
		},
	],
	activateWorkflow: [
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			if (!sharedWorkflow.workflow.active) {
				try {
					await Container.get(ActiveWorkflowRunner).add(sharedWorkflow.workflowId, 'activate');
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

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			const workflowRunner = Container.get(ActiveWorkflowRunner);

			if (sharedWorkflow.workflow.active) {
				await workflowRunner.remove(sharedWorkflow.workflowId);

				await setWorkflowAsInactive(sharedWorkflow.workflow);

				sharedWorkflow.workflow.active = false;

				return res.json(sharedWorkflow.workflow);
			}

			// nothing to do as the workflow is already inactive
			return res.json(sharedWorkflow.workflow);
		},
	],
};
