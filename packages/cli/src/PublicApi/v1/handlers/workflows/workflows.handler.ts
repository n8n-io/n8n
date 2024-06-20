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
import { projectScope, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import {
	getWorkflowById,
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
import { ProjectRepository } from '@/databases/repositories/project.repository';

export = {
	createWorkflow: [
		async (req: WorkflowRequest.Create, res: express.Response): Promise<express.Response> => {
			const workflow = req.body;

			workflow.active = false;
			workflow.versionId = uuid();

			await replaceInvalidCredentials(workflow);

			addNodeIds(workflow);

			const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				req.user.id,
			);
			const createdWorkflow = await createWorkflow(workflow, req.user, project, 'workflow:owner');

			await Container.get(WorkflowHistoryService).saveVersion(
				req.user,
				createdWorkflow,
				createdWorkflow.id,
			);

			await Container.get(ExternalHooks).run('workflow.afterCreate', [createdWorkflow]);
			void Container.get(InternalHooks).onWorkflowCreated(req.user, createdWorkflow, project, true);

			return res.json(createdWorkflow);
		},
	],
	deleteWorkflow: [
		projectScope('workflow:delete', 'workflow'),
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
		projectScope('workflow:read', 'workflow'),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const workflow = await Container.get(SharedWorkflowRepository).findWorkflowForUser(
				id,
				req.user,
				['workflow:read'],
				{ includeTags: !config.getEnv('workflowTagsDisabled') },
			);

			if (!workflow) {
				// user trying to access a workflow they do not own
				// and was not shared to them
				// Or does not exist.
				return res.status(404).json({ message: 'Not Found' });
			}

			void Container.get(InternalHooks).onUserRetrievedWorkflow({
				user_id: req.user.id,
				public_api: true,
			});

			return res.json(workflow);
		},
	],
	getWorkflows: [
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

				let workflows = await Container.get(SharedWorkflowRepository).findAllWorkflowsForUser(
					req.user,
					['workflow:read'],
				);

				if (options.workflowIds) {
					const workflowIds = options.workflowIds;
					workflows = workflows.filter((wf) => workflowIds.includes(wf.id));
				}

				if (!workflows.length) {
					return res.status(200).json({
						data: [],
						nextCursor: null,
					});
				}

				const workflowsIds = workflows.map((wf) => wf.id);
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
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.Update, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const updateData = new WorkflowEntity();
			Object.assign(updateData, req.body);
			updateData.id = id;
			updateData.versionId = uuid();

			const workflow = await Container.get(SharedWorkflowRepository).findWorkflowForUser(
				id,
				req.user,
				['workflow:update'],
			);

			if (!workflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			await replaceInvalidCredentials(updateData);
			addNodeIds(updateData);

			const workflowManager = Container.get(ActiveWorkflowManager);

			if (workflow.active) {
				// When workflow gets saved always remove it as the triggers could have been
				// changed and so the changes would not take effect
				await workflowManager.remove(id);
			}

			try {
				await updateWorkflow(workflow.id, updateData);
			} catch (error) {
				if (error instanceof Error) {
					return res.status(400).json({ message: error.message });
				}
			}

			if (workflow.active) {
				try {
					await workflowManager.add(workflow.id, 'update');
				} catch (error) {
					if (error instanceof Error) {
						return res.status(400).json({ message: error.message });
					}
				}
			}

			const updatedWorkflow = await getWorkflowById(workflow.id);

			if (updatedWorkflow) {
				await Container.get(WorkflowHistoryService).saveVersion(
					req.user,
					updatedWorkflow,
					workflow.id,
				);
			}

			await Container.get(ExternalHooks).run('workflow.afterUpdate', [updateData]);
			void Container.get(InternalHooks).onWorkflowSaved(req.user, updateData, true);

			return res.json(updatedWorkflow);
		},
	],
	activateWorkflow: [
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const workflow = await Container.get(SharedWorkflowRepository).findWorkflowForUser(
				id,
				req.user,
				['workflow:update'],
			);

			if (!workflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			if (!workflow.active) {
				try {
					await Container.get(ActiveWorkflowManager).add(workflow.id, 'activate');
				} catch (error) {
					if (error instanceof Error) {
						return res.status(400).json({ message: error.message });
					}
				}

				// change the status to active in the DB
				await setWorkflowAsActive(workflow);

				workflow.active = true;

				return res.json(workflow);
			}

			// nothing to do as the workflow is already active
			return res.json(workflow);
		},
	],
	deactivateWorkflow: [
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const workflow = await Container.get(SharedWorkflowRepository).findWorkflowForUser(
				id,
				req.user,
				['workflow:update'],
			);

			if (!workflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			const activeWorkflowManager = Container.get(ActiveWorkflowManager);

			if (workflow.active) {
				await activeWorkflowManager.remove(workflow.id);

				await setWorkflowAsInactive(workflow);

				workflow.active = false;

				return res.json(workflow);
			}

			// nothing to do as the workflow is already inactive
			return res.json(workflow);
		},
	],
	getWorkflowTags: [
		projectScope('workflow:read', 'workflow'),
		async (req: WorkflowRequest.GetTags, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			if (config.getEnv('workflowTagsDisabled')) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}

			const workflow = await Container.get(SharedWorkflowRepository).findWorkflowForUser(
				id,
				req.user,
				['workflow:read'],
			);

			if (!workflow) {
				// user trying to access a workflow he does not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			const tags = await getWorkflowTags(id);

			return res.json(tags);
		},
	],
	updateWorkflowTags: [
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.UpdateTags, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const newTags = req.body.map((newTag) => newTag.id);

			if (config.getEnv('workflowTagsDisabled')) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}

			const sharedWorkflow = await Container.get(SharedWorkflowRepository).findWorkflowForUser(
				id,
				req.user,
				['workflow:update'],
			);

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
