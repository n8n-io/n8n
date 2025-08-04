'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const omit_1 = __importDefault(require('lodash/omit'));
const pick_1 = __importDefault(require('lodash/pick'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const config_2 = __importDefault(require('@/config'));
const folder_not_found_error_1 = require('@/errors/folder-not-found.error');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const generic_helpers_1 = require('@/generic-helpers');
const requests_1 = require('@/requests');
const ownership_service_1 = require('@/services/ownership.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const role_service_1 = require('@/services/role.service');
const tag_service_1 = require('@/services/tag.service');
const WorkflowHelpers = __importStar(require('@/workflow-helpers'));
const workflow_finder_service_1 = require('./workflow-finder.service');
const workflow_history_service_ee_1 = require('./workflow-history.ee/workflow-history.service.ee');
const workflow_sharing_service_1 = require('./workflow-sharing.service');
let WorkflowService = class WorkflowService {
	constructor(
		logger,
		sharedWorkflowRepository,
		workflowRepository,
		workflowTagMappingRepository,
		binaryDataService,
		ownershipService,
		tagService,
		workflowHistoryService,
		externalHooks,
		activeWorkflowManager,
		roleService,
		workflowSharingService,
		projectService,
		executionRepository,
		eventService,
		globalConfig,
		folderRepository,
		workflowFinderService,
	) {
		this.logger = logger;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.workflowRepository = workflowRepository;
		this.workflowTagMappingRepository = workflowTagMappingRepository;
		this.binaryDataService = binaryDataService;
		this.ownershipService = ownershipService;
		this.tagService = tagService;
		this.workflowHistoryService = workflowHistoryService;
		this.externalHooks = externalHooks;
		this.activeWorkflowManager = activeWorkflowManager;
		this.roleService = roleService;
		this.workflowSharingService = workflowSharingService;
		this.projectService = projectService;
		this.executionRepository = executionRepository;
		this.eventService = eventService;
		this.globalConfig = globalConfig;
		this.folderRepository = folderRepository;
		this.workflowFinderService = workflowFinderService;
	}
	async getMany(user, options, includeScopes, includeFolders, onlySharedWithMe) {
		let count;
		let workflows;
		let workflowsAndFolders = [];
		let sharedWorkflowIds = [];
		let isPersonalProject = false;
		if (options?.filter?.projectId) {
			const projects = await this.projectService.getProjectRelationsForUser(user);
			isPersonalProject = !!projects.find(
				(p) => p.project.id === options.filter?.projectId && p.project.type === 'personal',
			);
		}
		if (isPersonalProject) {
			sharedWorkflowIds =
				await this.workflowSharingService.getOwnedWorkflowsInPersonalProject(user);
		} else if (onlySharedWithMe) {
			sharedWorkflowIds = await this.workflowSharingService.getSharedWithMeIds(user);
		} else {
			sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
				scopes: ['workflow:read'],
			});
		}
		if (includeFolders) {
			[workflowsAndFolders, count] = await this.workflowRepository.getWorkflowsAndFoldersWithCount(
				sharedWorkflowIds,
				options,
			);
			workflows = workflowsAndFolders.filter((wf) => wf.resource === 'workflow');
		} else {
			({ workflows, count } = await this.workflowRepository.getManyAndCount(
				sharedWorkflowIds,
				options,
			));
		}
		if ((0, requests_1.hasSharing)(workflows)) {
			workflows = await this.processSharedWorkflows(workflows, options);
		}
		if (includeScopes) {
			workflows = await this.addUserScopes(workflows, user);
		}
		this.cleanupSharedField(workflows);
		if (includeFolders) {
			workflows = this.mergeProcessedWorkflows(workflowsAndFolders, workflows);
		}
		return {
			workflows,
			count,
		};
	}
	async processSharedWorkflows(workflows, options) {
		const projectId = options?.filter?.projectId;
		const shouldAddProjectRelations = typeof projectId === 'string' && projectId !== '';
		if (shouldAddProjectRelations) {
			await this.addSharedRelation(workflows);
		}
		return workflows.map((workflow) => this.ownershipService.addOwnedByAndSharedWith(workflow));
	}
	async addSharedRelation(workflows) {
		const workflowIds = workflows.map((workflow) => workflow.id);
		const relations = await this.sharedWorkflowRepository.getAllRelationsForWorkflows(workflowIds);
		workflows.forEach((workflow) => {
			workflow.shared = relations.filter((relation) => relation.workflowId === workflow.id);
		});
	}
	async addUserScopes(workflows, user) {
		const projectRelations = await this.projectService.getProjectRelationsForUser(user);
		return workflows.map((workflow) =>
			this.roleService.addScopes(workflow, user, projectRelations),
		);
	}
	cleanupSharedField(workflows) {
		workflows.forEach((workflow) => {
			delete workflow.shared;
		});
	}
	mergeProcessedWorkflows(workflowsAndFolders, processedWorkflows) {
		const workflowMap = new Map(processedWorkflows.map((workflow) => [workflow.id, workflow]));
		return workflowsAndFolders.map((item) =>
			item.resource === 'workflow' ? (workflowMap.get(item.id) ?? item) : item,
		);
	}
	async update(user, workflowUpdateData, workflowId, tagIds, parentFolderId, forceSave) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);
		if (!workflow) {
			this.logger.warn('User attempted to update a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			throw new not_found_error_1.NotFoundError(
				'You do not have permission to update this workflow. Ask the owner to share it with you.',
			);
		}
		if (
			!forceSave &&
			workflowUpdateData.versionId !== '' &&
			workflowUpdateData.versionId !== workflow.versionId
		) {
			throw new bad_request_error_1.BadRequestError(
				'Your most recent changes may be lost, because someone else just updated this workflow. Open this workflow in a new tab to see those new updates.',
				100,
			);
		}
		if (
			Object.keys((0, omit_1.default)(workflowUpdateData, ['id', 'versionId', 'active'])).length > 0
		) {
			workflowUpdateData.versionId = (0, uuid_1.v4)();
			this.logger.debug(
				`Updating versionId for workflow ${workflowId} for user ${user.id} after saving`,
				{
					previousVersionId: workflow.versionId,
					newVersionId: workflowUpdateData.versionId,
				},
			);
		}
		await WorkflowHelpers.replaceInvalidCredentials(workflowUpdateData);
		WorkflowHelpers.addNodeIds(workflowUpdateData);
		await this.externalHooks.run('workflow.update', [workflowUpdateData]);
		if (workflow.active) {
			await this.activeWorkflowManager.remove(workflowId);
		}
		const workflowSettings = workflowUpdateData.settings ?? {};
		const keysAllowingDefault = [
			'timezone',
			'saveDataErrorExecution',
			'saveDataSuccessExecution',
			'saveManualExecutions',
			'saveExecutionProgress',
		];
		for (const key of keysAllowingDefault) {
			if (workflowSettings[key] === 'DEFAULT') {
				delete workflowSettings[key];
			}
		}
		if (workflowSettings.executionTimeout === config_2.default.get('executions.timeout')) {
			delete workflowSettings.executionTimeout;
		}
		if (workflowUpdateData.name) {
			workflowUpdateData.updatedAt = new Date();
			await (0, generic_helpers_1.validateEntity)(workflowUpdateData);
		}
		const updatePayload = (0, pick_1.default)(workflowUpdateData, [
			'name',
			'active',
			'nodes',
			'connections',
			'meta',
			'settings',
			'staticData',
			'pinData',
			'versionId',
		]);
		if (parentFolderId) {
			const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflow.id);
			if (parentFolderId !== n8n_workflow_1.PROJECT_ROOT) {
				try {
					await this.folderRepository.findOneOrFailFolderInProject(
						parentFolderId,
						project?.id ?? '',
					);
				} catch (e) {
					throw new folder_not_found_error_1.FolderNotFoundError(parentFolderId);
				}
			}
			updatePayload.parentFolder =
				parentFolderId === n8n_workflow_1.PROJECT_ROOT ? null : { id: parentFolderId };
		}
		await this.workflowRepository.update(workflowId, updatePayload);
		const tagsDisabled = this.globalConfig.tags.disabled;
		if (tagIds && !tagsDisabled) {
			await this.workflowTagMappingRepository.overwriteTaggings(workflowId, tagIds);
		}
		if (workflowUpdateData.versionId !== workflow.versionId) {
			await this.workflowHistoryService.saveVersion(user, workflowUpdateData, workflowId);
		}
		const relations = tagsDisabled ? [] : ['tags'];
		const updatedWorkflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations,
		});
		if (updatedWorkflow === null) {
			throw new bad_request_error_1.BadRequestError(
				`Workflow with ID "${workflowId}" could not be found to be updated.`,
			);
		}
		if (updatedWorkflow.tags?.length && tagIds?.length) {
			updatedWorkflow.tags = this.tagService.sortByRequestOrder(updatedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}
		await this.externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);
		this.eventService.emit('workflow-saved', {
			user,
			workflow: updatedWorkflow,
			publicApi: false,
		});
		if (updatedWorkflow.active) {
			try {
				await this.externalHooks.run('workflow.activate', [updatedWorkflow]);
				await this.activeWorkflowManager.add(workflowId, workflow.active ? 'update' : 'activate');
			} catch (error) {
				await this.workflowRepository.update(workflowId, {
					active: false,
					versionId: workflow.versionId,
				});
				updatedWorkflow.active = false;
				let message;
				if (error instanceof n8n_workflow_1.NodeApiError) message = error.description;
				message = message ?? error.message;
				throw new bad_request_error_1.BadRequestError(message);
			}
		}
		return updatedWorkflow;
	}
	async delete(user, workflowId, force = false) {
		await this.externalHooks.run('workflow.delete', [workflowId]);
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);
		if (!workflow) {
			return;
		}
		if (!workflow.isArchived && !force) {
			throw new bad_request_error_1.BadRequestError(
				'Workflow must be archived before it can be deleted.',
			);
		}
		if (workflow.active) {
			await this.activeWorkflowManager.remove(workflowId);
		}
		const idsForDeletion = await this.executionRepository
			.find({
				select: ['id'],
				where: { workflowId },
			})
			.then((rows) => rows.map(({ id: executionId }) => ({ workflowId, executionId })));
		await this.workflowRepository.delete(workflowId);
		await this.binaryDataService.deleteMany(idsForDeletion);
		this.eventService.emit('workflow-deleted', { user, workflowId, publicApi: false });
		await this.externalHooks.run('workflow.afterDelete', [workflowId]);
		return workflow;
	}
	async archive(user, workflowId, skipArchived = false) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);
		if (!workflow) {
			return;
		}
		if (workflow.isArchived) {
			if (skipArchived) {
				return workflow;
			}
			throw new bad_request_error_1.BadRequestError('Workflow is already archived.');
		}
		if (workflow.active) {
			await this.activeWorkflowManager.remove(workflowId);
		}
		const versionId = (0, uuid_1.v4)();
		await this.workflowRepository.update(workflowId, {
			isArchived: true,
			active: false,
			versionId,
		});
		this.eventService.emit('workflow-archived', { user, workflowId, publicApi: false });
		await this.externalHooks.run('workflow.afterArchive', [workflowId]);
		workflow.isArchived = true;
		workflow.active = false;
		workflow.versionId = versionId;
		return workflow;
	}
	async unarchive(user, workflowId) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:delete',
		]);
		if (!workflow) {
			return;
		}
		if (!workflow.isArchived) {
			throw new bad_request_error_1.BadRequestError('Workflow is not archived.');
		}
		const versionId = (0, uuid_1.v4)();
		await this.workflowRepository.update(workflowId, { isArchived: false, versionId });
		this.eventService.emit('workflow-unarchived', { user, workflowId, publicApi: false });
		await this.externalHooks.run('workflow.afterUnarchive', [workflowId]);
		workflow.isArchived = false;
		workflow.versionId = versionId;
		return workflow;
	}
	async getWorkflowScopes(user, workflowId) {
		const userProjectRelations = await this.projectService.getProjectRelationsForUser(user);
		const shared = await this.sharedWorkflowRepository.find({
			where: {
				projectId: (0, typeorm_1.In)([...new Set(userProjectRelations.map((pr) => pr.projectId))]),
				workflowId,
			},
		});
		return this.roleService.combineResourceScopes('workflow', user, shared, userProjectRelations);
	}
	async transferAll(fromProjectId, toProjectId, trx) {
		trx = trx ?? this.workflowRepository.manager;
		const allSharedWorkflows = await trx.findBy(db_1.SharedWorkflow, {
			projectId: (0, typeorm_1.In)([fromProjectId, toProjectId]),
		});
		const sharedWorkflowsOfFromProject = allSharedWorkflows.filter(
			(sw) => sw.projectId === fromProjectId,
		);
		const ownedWorkflowIds = sharedWorkflowsOfFromProject
			.filter((sw) => sw.role === 'workflow:owner')
			.map((sw) => sw.workflowId);
		await this.sharedWorkflowRepository.makeOwner(ownedWorkflowIds, toProjectId, trx);
		await this.sharedWorkflowRepository.deleteByIds(ownedWorkflowIds, fromProjectId, trx);
		const sharedWorkflowIdsOfTransferee = allSharedWorkflows
			.filter((sw) => sw.projectId === toProjectId)
			.map((sw) => sw.workflowId);
		const sharedWorkflowsToTransfer = sharedWorkflowsOfFromProject.filter(
			(sw) =>
				sw.role !== 'workflow:owner' && !sharedWorkflowIdsOfTransferee.includes(sw.workflowId),
		);
		await trx.insert(
			db_1.SharedWorkflow,
			sharedWorkflowsToTransfer.map((sw) => ({
				workflowId: sw.workflowId,
				projectId: toProjectId,
				role: sw.role,
			})),
		);
	}
	async getWorkflowsWithNodesIncluded(user, nodeTypes) {
		const foundWorkflows = await this.workflowRepository.findWorkflowsWithNodeType(nodeTypes);
		let { workflows } = await this.workflowRepository.getManyAndCount(
			foundWorkflows.map((w) => w.id),
		);
		if ((0, requests_1.hasSharing)(workflows)) {
			workflows = await this.processSharedWorkflows(workflows);
		}
		workflows = await this.addUserScopes(workflows, user);
		this.cleanupSharedField(workflows);
		return workflows.map((workflow) => ({
			resourceType: 'workflow',
			...workflow,
		}));
	}
};
exports.WorkflowService = WorkflowService;
exports.WorkflowService = WorkflowService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.SharedWorkflowRepository,
			db_1.WorkflowRepository,
			db_1.WorkflowTagMappingRepository,
			n8n_core_1.BinaryDataService,
			ownership_service_1.OwnershipService,
			tag_service_1.TagService,
			workflow_history_service_ee_1.WorkflowHistoryService,
			external_hooks_1.ExternalHooks,
			active_workflow_manager_1.ActiveWorkflowManager,
			role_service_1.RoleService,
			workflow_sharing_service_1.WorkflowSharingService,
			project_service_ee_1.ProjectService,
			db_1.ExecutionRepository,
			event_service_1.EventService,
			config_1.GlobalConfig,
			db_1.FolderRepository,
			workflow_finder_service_1.WorkflowFinderService,
		]),
	],
	WorkflowService,
);
//# sourceMappingURL=workflow.service.js.map
