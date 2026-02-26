import { GlobalConfig } from '@n8n/config';
import { WorkflowEntity, ProjectRepository, TagRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, IsNull, Like, Not, QueryFailedError } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsWhere } from '@n8n/typeorm';
import type express from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { addNodeIds, replaceInvalidCredentials } from '@/workflow-helpers';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { createWorkflow, parseTagNames, getWorkflowTags, updateTags } from './workflows.service';
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
				{
					includeTags: !Container.get(GlobalConfig).tags.disabled,
					includeActiveVersion: true,
				},
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
	getWorkflowVersion: [
		apiKeyHasScope('workflow:read'),
		projectScope('workflow:read', 'workflow'),
		async (req: WorkflowRequest.GetVersion, res: express.Response): Promise<express.Response> => {
			const { id: workflowId, versionId } = req.params;

			try {
				const version = await Container.get(WorkflowHistoryService).getVersion(
					req.user,
					workflowId,
					versionId,
					{ includePublishHistory: false },
				);

				Container.get(EventService).emit('user-retrieved-workflow-version', {
					userId: req.user.id,
					publicApi: true,
				});

				const { autosaved, ...versionWithoutInternalFields } = version;

				return res.json(versionWithoutInternalFields);
			} catch (error) {
				return res.status(404).json({ message: 'Version not found' });
			}
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
				...(name !== undefined && { name: Like('%' + name.trim() + '%') }),
			};

			// Filter by active status based on activeVersionId
			if (active !== undefined) {
				if (active) {
					where.activeVersionId = Not(IsNull());
				} else {
					where.activeVersionId = IsNull();
				}
			}

			if (['global:owner', 'global:admin'].includes(req.user.role.slug)) {
				if (tags) {
					const workflowIds = await Container.get(TagRepository).getWorkflowIdsViaTags(
						parseTagNames(tags),
					);
					where.id = In(workflowIds);
				}

				if (projectId) {
					const workflowIds = await Container.get(WorkflowFinderService).findAllWorkflowIdsForUser(
						req.user,
						['workflow:read'],
						undefined,
						projectId,
					);

					if (workflowIds.length === 0) {
						return res.status(200).json({
							data: [],
							nextCursor: null,
						});
					}

					where.id = In(workflowIds);
				}
			} else {
				const options: { workflowIds?: string[] } = {};

				if (tags) {
					options.workflowIds = await Container.get(TagRepository).getWorkflowIdsViaTags(
						parseTagNames(tags),
					);
				}

				let workflowIds = await Container.get(WorkflowFinderService).findAllWorkflowIdsForUser(
					req.user,
					['workflow:read'],
					undefined,
					projectId,
				);

				if (options.workflowIds) {
					workflowIds = options.workflowIds.filter((id) => workflowIds.includes(id));
				}

				if (!workflowIds.length) {
					return res.status(200).json({
						data: [],
						nextCursor: null,
					});
				}

				where.id = In(workflowIds);
			}

			const selectFields: Array<keyof WorkflowEntity> = [
				'id',
				'name',
				'active',
				'activeVersionId',
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

			const relations = ['shared', 'activeVersion'];
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

			try {
				const updatedWorkflow = await Container.get(WorkflowService).update(
					req.user,
					updateData,
					id,
					{
						forceSave: true, // Skip version conflict check for public API
						publicApi: true,
						publishIfActive: true,
					},
				);

				return res.json(updatedWorkflow);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return res.status(404).json({ message: 'Not Found' });
				}
				if (error instanceof Error) {
					return res.status(400).json({ message: error.message });
				}
				throw error;
			}
		},
	],
	activateWorkflow: [
		apiKeyHasScope('workflow:activate'),
		projectScope('workflow:publish', 'workflow'),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;
			const { versionId, name, description } = req.body;

			try {
				const workflow = await Container.get(WorkflowService).activateWorkflow(
					req.user,
					id,
					{ versionId, name, description },
					true,
				);

				return res.json(workflow);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return res.status(404).json({ message: 'Not Found' });
				}
				if (error instanceof Error) {
					return res.status(400).json({ message: error.message });
				}
				throw error;
			}
		},
	],
	deactivateWorkflow: [
		apiKeyHasScope('workflow:deactivate'),
		projectScope('workflow:unpublish', 'workflow'),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { id } = req.params;

			try {
				const workflow = await Container.get(WorkflowService).deactivateWorkflow(req.user, id, {
					publicApi: true,
				});

				return res.json(workflow);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return res.status(404).json({ message: 'Not Found' });
				}
				if (error instanceof Error) {
					return res.status(400).json({ message: error.message });
				}
				throw error;
			}
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
