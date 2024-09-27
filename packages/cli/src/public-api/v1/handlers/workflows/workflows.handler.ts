// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, Like, QueryFailedError } from '@n8n/typeorm';
import type express from 'express';
import { Container } from 'typedi';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { addNodeIds, replaceInvalidCredentials } from '@/workflow-helpers';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service.ee';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

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
import type { WorkflowRequest } from '../../../types';
import { projectScope, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

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
			Container.get(EventService).emit('workflow-created', {
				workflow: createdWorkflow,
				user: req.user,
				publicApi: true,
				projectId: project.id,
				projectType: project.type,
			});

			return res.json(createdWorkflow);
		},
	],
	transferWorkflow: [
		projectScope('workflow:move', 'workflow'),
		async (req: WorkflowRequest.Transfer, res: express.Response) => {
			const { id: workflowId } = req.params;

			const body = z.object({ destinationProjectId: z.string() }).parse(req.body);

			await Container.get(EnterpriseWorkflowService).transferOne(
				req.user,
				workflowId,
				body.destinationProjectId,
			);

			res.status(204).send();
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

			Container.get(EventService).emit('user-retrieved-workflow', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json(workflow);
		},
	],
	getWorkflows: [
		validCursor,
		async (req: WorkflowRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const { offset = 0, limit = 100, active, tags, name, projectId } = req.query;

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

				if (projectId) {
					const workflows = await Container.get(SharedWorkflowRepository).findAllWorkflowsForUser(
						req.user,
						['workflow:read'],
					);

					const workflowIds = workflows
						.filter((workflow) => workflow.projectId === projectId)
						.map((workflow) => workflow.id);

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

				if (projectId) {
					workflows = workflows.filter((w) => w.projectId === projectId);
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

			Container.get(EventService).emit('user-retrieved-all-workflows', {
				userId: req.user.id,
				publicApi: true,
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
			Container.get(EventService).emit('workflow-saved', {
				user: req.user,
				workflow: updateData,
				publicApi: true,
			});

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
