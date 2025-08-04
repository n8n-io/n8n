'use strict';
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
exports.EnterpriseWorkflowService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const omit_1 = __importDefault(require('lodash/omit'));
const n8n_workflow_1 = require('n8n-workflow');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const credentials_finder_service_1 = require('@/credentials/credentials-finder.service');
const credentials_service_1 = require('@/credentials/credentials.service');
const credentials_service_ee_1 = require('@/credentials/credentials.service.ee');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const transfer_workflow_error_1 = require('@/errors/response-errors/transfer-workflow.error');
const folder_service_1 = require('@/services/folder.service');
const ownership_service_1 = require('@/services/ownership.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const workflow_finder_service_1 = require('./workflow-finder.service');
let EnterpriseWorkflowService = class EnterpriseWorkflowService {
	constructor(
		logger,
		sharedWorkflowRepository,
		workflowRepository,
		credentialsRepository,
		credentialsService,
		ownershipService,
		projectService,
		activeWorkflowManager,
		credentialsFinderService,
		enterpriseCredentialsService,
		workflowFinderService,
		folderService,
		folderRepository,
	) {
		this.logger = logger;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
		this.credentialsService = credentialsService;
		this.ownershipService = ownershipService;
		this.projectService = projectService;
		this.activeWorkflowManager = activeWorkflowManager;
		this.credentialsFinderService = credentialsFinderService;
		this.enterpriseCredentialsService = enterpriseCredentialsService;
		this.workflowFinderService = workflowFinderService;
		this.folderService = folderService;
		this.folderRepository = folderRepository;
	}
	async shareWithProjects(workflowId, shareWithIds, entityManager) {
		const em = entityManager ?? this.sharedWorkflowRepository.manager;
		let projects = await em.find(db_1.Project, {
			where: { id: (0, typeorm_1.In)(shareWithIds), type: 'personal' },
			relations: { sharedWorkflows: true },
		});
		projects = projects.filter(
			(p) =>
				!p.sharedWorkflows.some(
					(swf) => swf.workflowId === workflowId && swf.role === 'workflow:owner',
				),
		);
		const newSharedWorkflows = projects.map((project) =>
			this.sharedWorkflowRepository.create({
				workflowId,
				role: 'workflow:editor',
				projectId: project.id,
			}),
		);
		return await em.save(newSharedWorkflows);
	}
	addOwnerAndSharings(workflow) {
		const workflowWithMetaData = this.ownershipService.addOwnedByAndSharedWith(workflow);
		return {
			...workflow,
			...workflowWithMetaData,
			usedCredentials: workflow.usedCredentials ?? [],
		};
	}
	async addCredentialsToWorkflow(workflow, currentUser) {
		workflow.usedCredentials = [];
		const userCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			currentUser,
			{ workflowId: workflow.id },
		);
		const credentialIdsUsedByWorkflow = new Set();
		workflow.nodes.forEach((node) => {
			if (!node.credentials) {
				return;
			}
			Object.keys(node.credentials).forEach((credentialType) => {
				const credential = node.credentials?.[credentialType];
				if (!credential?.id) {
					return;
				}
				credentialIdsUsedByWorkflow.add(credential.id);
			});
		});
		const workflowCredentials = await this.credentialsRepository.getManyByIds(
			Array.from(credentialIdsUsedByWorkflow),
			{ withSharings: true },
		);
		const userCredentialIds = userCredentials.map((credential) => credential.id);
		workflowCredentials.forEach((credential) => {
			const credentialId = credential.id;
			const filledCred = this.ownershipService.addOwnedByAndSharedWith(credential);
			workflow.usedCredentials?.push({
				id: credentialId,
				name: credential.name,
				type: credential.type,
				currentUserHasAccess: userCredentialIds.includes(credentialId),
				homeProject: filledCred.homeProject,
				sharedWithProjects: filledCred.sharedWithProjects,
			});
		});
	}
	validateCredentialPermissionsToUser(workflow, allowedCredentials) {
		workflow.nodes.forEach((node) => {
			if (!node.credentials) {
				return;
			}
			Object.keys(node.credentials).forEach((credentialType) => {
				const credentialId = node.credentials?.[credentialType].id;
				if (credentialId === undefined) return;
				const matchedCredential = allowedCredentials.find(({ id }) => id === credentialId);
				if (!matchedCredential) {
					throw new n8n_workflow_1.UserError(
						'The workflow contains credentials that you do not have access to',
					);
				}
			});
		});
	}
	async preventTampering(workflow, workflowId, user) {
		const previousVersion = await this.workflowRepository.get({ id: workflowId });
		if (!previousVersion) {
			throw new not_found_error_1.NotFoundError('Workflow not found');
		}
		const allCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ workflowId },
		);
		try {
			return this.validateWorkflowCredentialUsage(workflow, previousVersion, allCredentials);
		} catch (error) {
			if (error instanceof n8n_workflow_1.NodeOperationError) {
				throw new bad_request_error_1.BadRequestError(error.message);
			}
			throw new bad_request_error_1.BadRequestError(
				'Invalid workflow credentials - make sure you have access to all credentials and try again.',
			);
		}
	}
	validateWorkflowCredentialUsage(
		newWorkflowVersion,
		previousWorkflowVersion,
		credentialsUserHasAccessTo,
	) {
		const allowedCredentialIds = credentialsUserHasAccessTo.map((cred) => cred.id);
		const nodesWithCredentialsUserDoesNotHaveAccessTo = this.getNodesWithInaccessibleCreds(
			newWorkflowVersion,
			allowedCredentialIds,
		);
		if (nodesWithCredentialsUserDoesNotHaveAccessTo.length === 0) {
			return newWorkflowVersion;
		}
		const previouslyExistingNodeIds = previousWorkflowVersion.nodes.map((node) => node.id);
		const isTamperingAttempt = (inaccessibleCredNodeId) =>
			!previouslyExistingNodeIds.includes(inaccessibleCredNodeId);
		nodesWithCredentialsUserDoesNotHaveAccessTo.forEach((node) => {
			if (isTamperingAttempt(node.id)) {
				this.logger.warn('Blocked workflow update due to tampering attempt', {
					nodeType: node.type,
					nodeName: node.name,
					nodeId: node.id,
					nodeCredentials: node.credentials,
				});
				throw new n8n_workflow_1.NodeOperationError(
					node,
					`You don't have access to the credentials in the '${node.name}' node. Ask the owner to share them with you.`,
				);
			}
			const nodeIdx = newWorkflowVersion.nodes.findIndex(
				(newWorkflowNode) => newWorkflowNode.id === node.id,
			);
			this.logger.debug('Replacing node with previous version when saving updated workflow', {
				nodeType: node.type,
				nodeName: node.name,
				nodeId: node.id,
			});
			const previousNodeVersion = previousWorkflowVersion.nodes.find(
				(previousNode) => previousNode.id === node.id,
			);
			Object.assign(
				newWorkflowVersion.nodes[nodeIdx],
				(0, omit_1.default)(previousNodeVersion, ['name', 'position', 'disabled']),
			);
		});
		return newWorkflowVersion;
	}
	getNodesWithInaccessibleCreds(workflow, userCredIds) {
		if (!workflow.nodes) {
			return [];
		}
		return workflow.nodes.filter((node) => {
			if (!node.credentials) return false;
			const allUsedCredentials = Object.values(node.credentials);
			const allUsedCredentialIds = allUsedCredentials.map((nodeCred) => nodeCred.id?.toString());
			return allUsedCredentialIds.some(
				(nodeCredId) => nodeCredId && !userCredIds.includes(nodeCredId),
			);
		});
	}
	async transferWorkflow(
		user,
		workflowId,
		destinationProjectId,
		shareCredentials = [],
		destinationParentFolderId,
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:move',
		]);
		not_found_error_1.NotFoundError.isDefinedAndNotNull(
			workflow,
			`Could not find workflow with the id "${workflowId}". Make sure you have the permission to move it.`,
		);
		const ownerSharing = workflow.shared.find((s) => s.role === 'workflow:owner');
		not_found_error_1.NotFoundError.isDefinedAndNotNull(
			ownerSharing,
			`Could not find owner for workflow "${workflow.id}"`,
		);
		const sourceProject = ownerSharing.project;
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['workflow:create'],
		);
		not_found_error_1.NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create workflows in it.`,
		);
		if (sourceProject.id === destinationProject.id) {
			throw new transfer_workflow_error_1.TransferWorkflowError(
				"You can't transfer a workflow into the project that's already owning it.",
			);
		}
		let parentFolder = null;
		if (destinationParentFolderId) {
			try {
				parentFolder = await this.folderService.findFolderInProjectOrFail(
					destinationParentFolderId,
					destinationProjectId,
				);
			} catch {
				throw new transfer_workflow_error_1.TransferWorkflowError(
					`The destination folder with id "${destinationParentFolderId}" does not exist in the project "${destinationProject.name}".`,
				);
			}
		}
		const wasActive = workflow.active;
		if (wasActive) {
			await this.activeWorkflowManager.remove(workflowId);
		}
		await this.transferWorkflowOwnership([workflow], destinationProject.id);
		await this.shareCredentialsWithProject(user, shareCredentials, destinationProject.id);
		await this.workflowRepository.update({ id: workflow.id }, { parentFolder });
		if (wasActive) {
			return await this.attemptWorkflowReactivation(workflowId);
		}
		return;
	}
	async getFolderUsedCredentials(user, folderId, projectId) {
		await this.folderService.findFolderInProjectOrFail(folderId, projectId);
		const workflows = await this.workflowFinderService.findAllWorkflowsForUser(
			user,
			['workflow:read'],
			folderId,
			projectId,
		);
		const usedCredentials = new Map();
		for (const workflow of workflows) {
			const workflowWithMetaData = this.addOwnerAndSharings(workflow);
			await this.addCredentialsToWorkflow(workflowWithMetaData, user);
			for (const credential of workflowWithMetaData?.usedCredentials ?? []) {
				usedCredentials.set(credential.id, credential);
			}
		}
		return [...usedCredentials.values()];
	}
	async transferFolder(
		user,
		sourceProjectId,
		sourceFolderId,
		destinationProjectId,
		destinationParentFolderId,
		shareCredentials = [],
	) {
		const childrenFolderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
			sourceFolderId,
			sourceProjectId,
		);
		const workflows = await this.workflowRepository.find({
			select: ['id', 'active', 'shared'],
			relations: ['shared', 'shared.project'],
			where: {
				parentFolder: { id: (0, typeorm_1.In)([...childrenFolderIds, sourceFolderId]) },
			},
		});
		const activeWorkflows = workflows.filter((w) => w.active).map((w) => w.id);
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['workflow:create'],
		);
		not_found_error_1.NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create workflows in it.`,
		);
		if (destinationParentFolderId !== n8n_workflow_1.PROJECT_ROOT) {
			await this.folderRepository.findOneOrFailFolderInProject(
				destinationParentFolderId,
				destinationProjectId,
			);
		}
		await this.folderRepository.findOneOrFailFolderInProject(sourceFolderId, sourceProjectId);
		for (const workflow of workflows) {
			const ownerSharing = workflow.shared.find((s) => s.role === 'workflow:owner');
			not_found_error_1.NotFoundError.isDefinedAndNotNull(
				ownerSharing,
				`Could not find owner for workflow "${workflow.id}"`,
			);
			const sourceProject = ownerSharing.project;
			if (sourceProject.id === destinationProject.id) {
				throw new transfer_workflow_error_1.TransferWorkflowError(
					"You can't transfer a workflow into the project that's already owning it.",
				);
			}
		}
		const deactivateWorkflowsPromises = activeWorkflows.map(
			async (workflowId) => await this.activeWorkflowManager.remove(workflowId),
		);
		await Promise.all(deactivateWorkflowsPromises);
		await this.transferWorkflowOwnership(workflows, destinationProject.id);
		await this.shareCredentialsWithProject(user, shareCredentials, destinationProject.id);
		await this.moveFoldersToDestination(
			sourceFolderId,
			childrenFolderIds,
			destinationProjectId,
			destinationParentFolderId,
		);
		for (const workflowId of activeWorkflows) {
			await this.attemptWorkflowReactivation(workflowId);
		}
	}
	formatActivationError(error) {
		return {
			error: error.toJSON
				? error.toJSON()
				: {
						name: error.name,
						message: error.message,
					},
		};
	}
	async attemptWorkflowReactivation(workflowId) {
		try {
			await this.activeWorkflowManager.add(workflowId, 'update');
			return;
		} catch (error) {
			await this.workflowRepository.updateActiveState(workflowId, false);
			if (error instanceof n8n_workflow_1.WorkflowActivationError) {
				return this.formatActivationError(error);
			}
			throw error;
		}
	}
	async transferWorkflowOwnership(workflows, destinationProjectId) {
		await this.workflowRepository.manager.transaction(async (trx) => {
			for (const workflow of workflows) {
				await trx.remove(workflow.shared);
				await trx.save(
					trx.create(db_1.SharedWorkflow, {
						workflowId: workflow.id,
						projectId: destinationProjectId,
						role: 'workflow:owner',
					}),
				);
			}
		});
	}
	async shareCredentialsWithProject(user, credentialIds, projectId) {
		await this.workflowRepository.manager.transaction(async (trx) => {
			const allCredentials = await this.credentialsFinderService.findAllCredentialsForUser(
				user,
				['credential:share'],
				trx,
			);
			const credentialsToShare = allCredentials.filter((c) => credentialIds.includes(c.id));
			for (const credential of credentialsToShare) {
				await this.enterpriseCredentialsService.shareWithProjects(
					user,
					credential.id,
					[projectId],
					trx,
				);
			}
		});
	}
	async moveFoldersToDestination(
		sourceFolderId,
		childrenFolderIds,
		destinationProjectId,
		destinationParentFolderId,
	) {
		await this.folderRepository.manager.transaction(async (trx) => {
			await trx.update(
				db_1.Folder,
				{ id: (0, typeorm_1.In)(childrenFolderIds) },
				{ homeProject: { id: destinationProjectId } },
			);
			await trx.update(
				db_1.Folder,
				{ id: sourceFolderId },
				{
					homeProject: { id: destinationProjectId },
					parentFolder:
						destinationParentFolderId === n8n_workflow_1.PROJECT_ROOT
							? null
							: { id: destinationParentFolderId },
				},
			);
		});
	}
};
exports.EnterpriseWorkflowService = EnterpriseWorkflowService;
exports.EnterpriseWorkflowService = EnterpriseWorkflowService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.SharedWorkflowRepository,
			db_1.WorkflowRepository,
			db_1.CredentialsRepository,
			credentials_service_1.CredentialsService,
			ownership_service_1.OwnershipService,
			project_service_ee_1.ProjectService,
			active_workflow_manager_1.ActiveWorkflowManager,
			credentials_finder_service_1.CredentialsFinderService,
			credentials_service_ee_1.EnterpriseCredentialsService,
			workflow_finder_service_1.WorkflowFinderService,
			folder_service_1.FolderService,
			db_1.FolderRepository,
		]),
	],
	EnterpriseWorkflowService,
);
//# sourceMappingURL=workflow.service.ee.js.map
