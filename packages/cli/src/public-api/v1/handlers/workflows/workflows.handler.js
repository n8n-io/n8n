'use strict';
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const uuid_1 = require('uuid');
const zod_1 = require('zod');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const workflow_helpers_1 = require('@/workflow-helpers');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
const workflow_history_service_ee_1 = require('@/workflows/workflow-history.ee/workflow-history.service.ee');
const workflow_service_1 = require('@/workflows/workflow.service');
const workflow_service_ee_1 = require('@/workflows/workflow.service.ee');
const workflows_service_1 = require('./workflows.service');
const global_middleware_1 = require('../../shared/middlewares/global.middleware');
const pagination_service_1 = require('../../shared/services/pagination.service');
module.exports = {
	createWorkflow: [
		(0, global_middleware_1.apiKeyHasScope)('workflow:create'),
		async (req, res) => {
			const workflow = req.body;
			workflow.active = false;
			workflow.versionId = (0, uuid_1.v4)();
			await (0, workflow_helpers_1.replaceInvalidCredentials)(workflow);
			(0, workflow_helpers_1.addNodeIds)(workflow);
			const project = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(req.user.id);
			const createdWorkflow = await (0, workflows_service_1.createWorkflow)(
				workflow,
				req.user,
				project,
				'workflow:owner',
			);
			await di_1.Container.get(workflow_history_service_ee_1.WorkflowHistoryService).saveVersion(
				req.user,
				createdWorkflow,
				createdWorkflow.id,
			);
			await di_1.Container.get(external_hooks_1.ExternalHooks).run('workflow.afterCreate', [
				createdWorkflow,
			]);
			di_1.Container.get(event_service_1.EventService).emit('workflow-created', {
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
		(0, global_middleware_1.apiKeyHasScope)('workflow:move'),
		(0, global_middleware_1.projectScope)('workflow:move', 'workflow'),
		async (req, res) => {
			const { id: workflowId } = req.params;
			const body = zod_1.z.object({ destinationProjectId: zod_1.z.string() }).parse(req.body);
			await di_1.Container.get(workflow_service_ee_1.EnterpriseWorkflowService).transferWorkflow(
				req.user,
				workflowId,
				body.destinationProjectId,
			);
			res.status(204).send();
		},
	],
	deleteWorkflow: [
		(0, global_middleware_1.apiKeyHasScope)('workflow:delete'),
		(0, global_middleware_1.projectScope)('workflow:delete', 'workflow'),
		async (req, res) => {
			const { id: workflowId } = req.params;
			const workflow = await di_1.Container.get(workflow_service_1.WorkflowService).delete(
				req.user,
				workflowId,
				true,
			);
			if (!workflow) {
				return res.status(404).json({ message: 'Not Found' });
			}
			return res.json(workflow);
		},
	],
	getWorkflow: [
		(0, global_middleware_1.apiKeyHasScope)('workflow:read'),
		(0, global_middleware_1.projectScope)('workflow:read', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const { excludePinnedData = false } = req.query;
			const workflow = await di_1.Container.get(
				workflow_finder_service_1.WorkflowFinderService,
			).findWorkflowForUser(id, req.user, ['workflow:read'], {
				includeTags: !di_1.Container.get(config_1.GlobalConfig).tags.disabled,
			});
			if (!workflow) {
				return res.status(404).json({ message: 'Not Found' });
			}
			if (excludePinnedData) {
				delete workflow.pinData;
			}
			di_1.Container.get(event_service_1.EventService).emit('user-retrieved-workflow', {
				userId: req.user.id,
				publicApi: true,
			});
			return res.json(workflow);
		},
	],
	getWorkflows: [
		(0, global_middleware_1.apiKeyHasScope)('workflow:list'),
		global_middleware_1.validCursor,
		async (req, res) => {
			const {
				offset = 0,
				limit = 100,
				excludePinnedData = false,
				active,
				tags,
				name,
				projectId,
			} = req.query;
			const where = {
				...(active !== undefined && { active }),
				...(name !== undefined && { name: (0, typeorm_1.Like)('%' + name.trim() + '%') }),
			};
			if (['global:owner', 'global:admin'].includes(req.user.role)) {
				if (tags) {
					const workflowIds = await di_1.Container.get(db_1.TagRepository).getWorkflowIdsViaTags(
						(0, workflows_service_1.parseTagNames)(tags),
					);
					where.id = (0, typeorm_1.In)(workflowIds);
				}
				if (projectId) {
					const workflows = await di_1.Container.get(
						workflow_finder_service_1.WorkflowFinderService,
					).findAllWorkflowsForUser(req.user, ['workflow:read']);
					const workflowIds = workflows
						.filter((workflow) => workflow.projectId === projectId)
						.map((workflow) => workflow.id);
					where.id = (0, typeorm_1.In)(workflowIds);
				}
			} else {
				const options = {};
				if (tags) {
					options.workflowIds = await di_1.Container.get(db_1.TagRepository).getWorkflowIdsViaTags(
						(0, workflows_service_1.parseTagNames)(tags),
					);
				}
				let workflows = await di_1.Container.get(
					workflow_finder_service_1.WorkflowFinderService,
				).findAllWorkflowsForUser(req.user, ['workflow:read']);
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
				where.id = (0, typeorm_1.In)(workflowsIds);
			}
			const selectFields = [
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
			];
			if (!excludePinnedData) {
				selectFields.push('pinData');
			}
			const [workflows, count] = await di_1.Container.get(db_1.WorkflowRepository).findAndCount({
				skip: offset,
				take: limit,
				select: selectFields,
				where,
				...(!di_1.Container.get(config_1.GlobalConfig).tags.disabled && { relations: ['tags'] }),
			});
			if (excludePinnedData) {
				workflows.forEach((workflow) => {
					delete workflow.pinData;
				});
			}
			di_1.Container.get(event_service_1.EventService).emit('user-retrieved-all-workflows', {
				userId: req.user.id,
				publicApi: true,
			});
			return res.json({
				data: workflows,
				nextCursor: (0, pagination_service_1.encodeNextCursor)({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
	updateWorkflow: [
		(0, global_middleware_1.apiKeyHasScope)('workflow:update'),
		(0, global_middleware_1.projectScope)('workflow:update', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const updateData = new db_1.WorkflowEntity();
			Object.assign(updateData, req.body);
			updateData.id = id;
			updateData.versionId = (0, uuid_1.v4)();
			const workflow = await di_1.Container.get(
				workflow_finder_service_1.WorkflowFinderService,
			).findWorkflowForUser(id, req.user, ['workflow:update']);
			if (!workflow) {
				return res.status(404).json({ message: 'Not Found' });
			}
			await (0, workflow_helpers_1.replaceInvalidCredentials)(updateData);
			(0, workflow_helpers_1.addNodeIds)(updateData);
			const workflowManager = di_1.Container.get(active_workflow_manager_1.ActiveWorkflowManager);
			if (workflow.active) {
				await workflowManager.remove(id);
			}
			try {
				await (0, workflows_service_1.updateWorkflow)(workflow.id, updateData);
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
			const updatedWorkflow = await (0, workflows_service_1.getWorkflowById)(workflow.id);
			if (updatedWorkflow) {
				await di_1.Container.get(workflow_history_service_ee_1.WorkflowHistoryService).saveVersion(
					req.user,
					updatedWorkflow,
					workflow.id,
				);
			}
			await di_1.Container.get(external_hooks_1.ExternalHooks).run('workflow.afterUpdate', [
				updateData,
			]);
			di_1.Container.get(event_service_1.EventService).emit('workflow-saved', {
				user: req.user,
				workflow: updateData,
				publicApi: true,
			});
			return res.json(updatedWorkflow);
		},
	],
	activateWorkflow: [
		(0, global_middleware_1.apiKeyHasScope)('workflow:activate'),
		(0, global_middleware_1.projectScope)('workflow:update', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const workflow = await di_1.Container.get(
				workflow_finder_service_1.WorkflowFinderService,
			).findWorkflowForUser(id, req.user, ['workflow:update']);
			if (!workflow) {
				return res.status(404).json({ message: 'Not Found' });
			}
			if (!workflow.active) {
				try {
					await di_1.Container.get(active_workflow_manager_1.ActiveWorkflowManager).add(
						workflow.id,
						'activate',
					);
				} catch (error) {
					if (error instanceof Error) {
						return res.status(400).json({ message: error.message });
					}
				}
				await (0, workflows_service_1.setWorkflowAsActive)(workflow.id);
				workflow.active = true;
				return res.json(workflow);
			}
			return res.json(workflow);
		},
	],
	deactivateWorkflow: [
		(0, global_middleware_1.apiKeyHasScope)('workflow:deactivate'),
		(0, global_middleware_1.projectScope)('workflow:update', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const workflow = await di_1.Container.get(
				workflow_finder_service_1.WorkflowFinderService,
			).findWorkflowForUser(id, req.user, ['workflow:update']);
			if (!workflow) {
				return res.status(404).json({ message: 'Not Found' });
			}
			const activeWorkflowManager = di_1.Container.get(
				active_workflow_manager_1.ActiveWorkflowManager,
			);
			if (workflow.active) {
				await activeWorkflowManager.remove(workflow.id);
				await (0, workflows_service_1.setWorkflowAsInactive)(workflow.id);
				workflow.active = false;
				return res.json(workflow);
			}
			return res.json(workflow);
		},
	],
	getWorkflowTags: [
		(0, global_middleware_1.apiKeyHasScope)('workflowTags:list'),
		(0, global_middleware_1.projectScope)('workflow:read', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			if (di_1.Container.get(config_1.GlobalConfig).tags.disabled) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}
			const workflow = await di_1.Container.get(
				workflow_finder_service_1.WorkflowFinderService,
			).findWorkflowForUser(id, req.user, ['workflow:read']);
			if (!workflow) {
				return res.status(404).json({ message: 'Not Found' });
			}
			const tags = await (0, workflows_service_1.getWorkflowTags)(id);
			return res.json(tags);
		},
	],
	updateWorkflowTags: [
		(0, global_middleware_1.apiKeyHasScope)('workflowTags:update'),
		(0, global_middleware_1.projectScope)('workflow:update', 'workflow'),
		async (req, res) => {
			const { id } = req.params;
			const newTags = req.body.map((newTag) => newTag.id);
			if (di_1.Container.get(config_1.GlobalConfig).tags.disabled) {
				return res.status(400).json({ message: 'Workflow Tags Disabled' });
			}
			const sharedWorkflow = await di_1.Container.get(
				workflow_finder_service_1.WorkflowFinderService,
			).findWorkflowForUser(id, req.user, ['workflow:update']);
			if (!sharedWorkflow) {
				return res.status(404).json({ message: 'Not Found' });
			}
			let tags;
			try {
				await (0, workflows_service_1.updateTags)(id, newTags);
				tags = await (0, workflows_service_1.getWorkflowTags)(id);
			} catch (error) {
				if (error instanceof typeorm_1.QueryFailedError) {
					return res.status(404).json({ message: 'Some tags not found' });
				} else {
					throw error;
				}
			}
			return res.json(tags);
		},
	],
};
//# sourceMappingURL=workflows.handler.js.map
