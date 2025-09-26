import { GlobalConfig } from '@n8n/config';
import { WorkflowEntity, ProjectRepository, TagRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, Like, QueryFailedError } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere } from '@n8n/typeorm';
import type express from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { addNodeIds, replaceInvalidCredentials } from '@/workflow-helpers';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history.ee/workflow-history.service.ee';
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
import {
	apiKeyHasScope,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

export = {
	createWorkflow: [
		apiKeyHasScope('workflow:create'),
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
		apiKeyHasScope('workflow:move'),
		projectScope('workflow:move', 'workflow'),
		async (req: WorkflowRequest.Transfer, res: express.Response) => {
			const { id: workflowId } = req.params;

			const body = z.object({ destinationProjectId: z.string() }).parse(req.body);

			await Container.get(EnterpriseWorkflowService).transferWorkflow(
				req.user,
				workflowId,
				body.destinationProjectId,
			);

			res.status(204).send();
		},
	],
	deleteWorkflow: [
		apiKeyHasScope('workflow:delete'),
		projectScope('workflow:delete', 'workflow'),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id: workflowId } = req.params;

			const workflow = await Container.get(WorkflowService).delete(req.user, workflowId, true);
			if (!workflow) {
				// user trying to access a workflow they do not own
				// or workflow does not exist
				return res.status(404).json({ message: 'Not Found' });
			}

			return res.json(workflow);
		},
	],
	getWorkflow: [
		apiKeyHasScope('workflow:read'),
		projectScope('workflow:read', 'workflow'),
		async (req: WorkflowRequest.Get, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const { excludePinnedData = false } = req.query;

			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
				id,
				req.user,
				['workflow:read'],
				{ includeTags: !Container.get(GlobalConfig).tags.disabled },
			);

			if (!workflow) {
				// user trying to access a workflow they do not own
				// and was not shared to them
				// Or does not exist.
				return res.status(404).json({ message: 'Not Found' });
			}

			if (excludePinnedData) {
				delete workflow.pinData;
			}

			Container.get(EventService).emit('user-retrieved-workflow', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json(workflow);
		},
	],
	getWorkflows: [
		apiKeyHasScope('workflow:list'),
		validCursor,
		async (req: WorkflowRequest.GetAll, res: express.Response): Promise<express.Response> => {
			const {
				offset = 0,
				limit = 100,
				excludePinnedData = false,
				active,
				tags,
				name,
				projectId,
			} = req.query;

			const where: FindOptionsWhere<WorkflowEntity> = {
				...(active !== undefined && { active }),
				...(name !== undefined && { name: Like('%' + name.trim() + '%') }),
			};

			if (['global:owner', 'global:admin'].includes(req.user.role.slug)) {
				if (tags) {
					const workflowIds = await Container.get(TagRepository).getWorkflowIdsViaTags(
						parseTagNames(tags),
					);
					where.id = In(workflowIds);
				}

				if (projectId) {
					const workflows = await Container.get(WorkflowFinderService).findAllWorkflowsForUser(
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

				let workflows = await Container.get(WorkflowFinderService).findAllWorkflowsForUser(
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

			const selectFields: (keyof WorkflowEntity)[] = [
				'id',
				'name',
				'active',
				'createdAt',
				'updatedAt',
				'isArchived',
				'nodes',
				'connections',
				'settings',
				'staticData',
				'meta',
				'versionId',
				'triggerCount',
				'shared',
			];

			if (!excludePinnedData) {
				selectFields.push('pinData');
			}

			const relations = ['shared'];
			if (!Container.get(GlobalConfig).tags.disabled) {
				relations.push('tags');
			}
			const [workflows, count] = await Container.get(WorkflowRepository).findAndCount({
				skip: offset,
				take: limit,
				select: selectFields,
				relations,
				where,
			});

			if (excludePinnedData) {
				workflows.forEach((workflow) => {
					delete workflow.pinData;
				});
			}

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
		apiKeyHasScope('workflow:update'),
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.Update, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const updateData = new WorkflowEntity();
			Object.assign(updateData, req.body);
			updateData.id = id;
			updateData.versionId = uuid();

			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
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
		apiKeyHasScope('workflow:activate'),
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
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
				await setWorkflowAsActive(workflow.id);

				workflow.active = true;

				return res.json(workflow);
			}

			// nothing to do as the workflow is already active
			return res.json(workflow);
		},
	],
	deactivateWorkflow: [
		apiKeyHasScope('workflow:deactivate'),
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
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

				await setWorkflowAsInactive(workflow.id);

				workflow.active = false;

				return res.json(workflow);
			}

			// nothing to do as the workflow is already inactive
			return res.json(workflow);
		},
	],
	getWorkflowTags: [
		apiKeyHasScope('workflowTags:list'),
		projectScope('workflow:read', 'workflow'),
		async (req: WorkflowRequest.GetTags, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			if (Container.get(GlobalConfig).tags.disabled) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}

			const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
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
		apiKeyHasScope('workflowTags:update'),
		projectScope('workflow:update', 'workflow'),
		async (req: WorkflowRequest.UpdateTags, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const newTags = req.body.map((newTag) => newTag.id);

			if (Container.get(GlobalConfig).tags.disabled) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}

			const sharedWorkflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
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
