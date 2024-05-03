import type express from 'express';

import { Container } from 'typedi';
import type { FindOptionsWhere } from '@n8n/typeorm';
import { In, Like, QueryFailedError } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import config from '@/config';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ExternalHooks } from '@/ExternalHooks';
import { addNodeIds, replaceInvalidCredentials } from '@/WorkflowHelpers';
import type { WorkflowRequest } from '../../../types';
import { authorize, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import {
	getWorkflowById,
	getSharedWorkflow,
	setWorkflowAsActive,
	setWorkflowAsInactive,
	updateWorkflow,
	createWorkflow,
	parseTagNames,
	getWorkflowTags,
	updateTags,
} from './workflows.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { InternalHooks } from '@/InternalHooks';
import { WorkflowHistoryService } from '@/workflows/workflowHistory/workflowHistory.service.ee';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

export = {
	createWorkflow: [
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: WorkflowRequest.Create, res: express.Response): Promise<express.Response> => {
			const workflow = req.body;

			workflow.active = false;
			workflow.versionId = uuid();

			await replaceInvalidCredentials(workflow);

			addNodeIds(workflow);

			const createdWorkflow = await createWorkflow(workflow, req.user, 'workflow:owner');

			await Container.get(WorkflowHistoryService).saveVersion(
				req.user,
				createdWorkflow,
				createdWorkflow.id,
			);

			await Container.get(ExternalHooks).run('workflow.afterCreate', [createdWorkflow]);
			void Container.get(InternalHooks).onWorkflowCreated(req.user, createdWorkflow, true);

			return res.json(createdWorkflow);
		},
	],
	deleteWorkflow: [
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id: workflowId } = req.params;

			const workflow = await Container.get(WorkflowService).delete(req.user, workflowId);
			if (!workflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			return res.json(workflow);
		},
	],
	getWorkflow: [
		authorize(['global:owner', 'global:admin', 'global:member']),
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
		authorize(['global:owner', 'global:admin', 'global:member']),
		validCursor,
		async (req: WorkflowRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const { offset = 0, limit = 100, active, tags, name } = req.query;

			const where: FindOptionsWhere<WorkflowEntity> = {
				...(active !== undefined && { active }),
				...(name !== undefined && { name: Like('%' + name.trim() + '%') }),
			};

			if (['global:owner', 'global:admin'].includes(req.user.role)) {
				if (tags) {
					const workflowIds = await Container.get(TagRepository).getWorkflowIdsViaTags(
						parseTagNames(tags),
					);
					where.id = In(workflowIds);
				}
			} else {
				const options: { workflowIds?: string[] } = {};

				if (tags) {
					options.workflowIds = await Container.get(TagRepository).getWorkflowIdsViaTags(
						parseTagNames(tags),
					);
				}

				const sharedWorkflows = await Container.get(SharedWorkflowRepository).getSharedWorkflows(
					req.user,
					options,
				);

				if (!sharedWorkflows.length) {
					return res.status(200).json({
						data: [],
						nextCursor: null,
					});
				}

				const workflowsIds = sharedWorkflows.map((shareWorkflow) => shareWorkflow.workflowId);
				where.id = In(workflowsIds);
			}

			const [workflows, count] = await Container.get(WorkflowRepository).findAndCount({
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
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: WorkflowRequest.Update, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const updateData = new WorkflowEntity();
			Object.assign(updateData, req.body);
			updateData.id = id;
			updateData.versionId = uuid();

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			await replaceInvalidCredentials(updateData);
			addNodeIds(updateData);

			const workflowManager = Container.get(ActiveWorkflowManager);

			if (sharedWorkflow.workflow.active) {
				// When workflow gets saved always remove it as the triggers could have been
				// changed and so the changes would not take effect
				await workflowManager.remove(id);
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
					await workflowManager.add(sharedWorkflow.workflowId, 'update');
				} catch (error) {
					if (error instanceof Error) {
						return res.status(400).json({ message: error.message });
					}
				}
			}

			const updatedWorkflow = await getWorkflowById(sharedWorkflow.workflowId);

			if (updatedWorkflow) {
				await Container.get(WorkflowHistoryService).saveVersion(
					req.user,
					updatedWorkflow,
					sharedWorkflow.workflowId,
				);
			}

			await Container.get(ExternalHooks).run('workflow.afterUpdate', [updateData]);
			void Container.get(InternalHooks).onWorkflowSaved(req.user, updateData, true);

			return res.json(updatedWorkflow);
		},
	],
	activateWorkflow: [
		authorize(['global:owner', 'global:admin', 'global:member']),
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
					await Container.get(ActiveWorkflowManager).add(sharedWorkflow.workflowId, 'activate');
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
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			const activeWorkflowManager = Container.get(ActiveWorkflowManager);

			if (sharedWorkflow.workflow.active) {
				await activeWorkflowManager.remove(sharedWorkflow.workflowId);

				await setWorkflowAsInactive(sharedWorkflow.workflow);

				sharedWorkflow.workflow.active = false;

				return res.json(sharedWorkflow.workflow);
			}

			// nothing to do as the workflow is already inactive
			return res.json(sharedWorkflow.workflow);
		},
	],
	getWorkflowTags: [
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: WorkflowRequest.GetTags, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			if (config.getEnv('workflowTagsDisabled')) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			const tags = await getWorkflowTags(id);

			return res.json(tags);
		},
	],
	updateWorkflowTags: [
		authorize(['global:owner', 'global:admin', 'global:member']),
		async (req: WorkflowRequest.UpdateTags, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const newTags = req.body.map((newTag) => newTag.id);

			if (config.getEnv('workflowTagsDisabled')) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}

			const sharedWorkflow = await getSharedWorkflow(req.user, id);

			if (!sharedWorkflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			let tags;
			try {
				await updateTags(id, newTags);
				tags = await getWorkflowTags(id);
			} catch (error) {
				// TODO: add a `ConstraintFailureError` in typeorm to handle when tags are missing here
				if (error instanceof QueryFailedError) {
					return res.status(404).json({ message: 'Some tags not found' });
				} else {
					throw error;
				}
			}

			return res.json(tags);
		},
	],
};
