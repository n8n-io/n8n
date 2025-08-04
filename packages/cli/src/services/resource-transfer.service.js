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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ResourceTransferService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const credentials_service_ee_1 = require('@/credentials/credentials.service.ee');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const role_service_1 = require('@/services/role.service');
const workflow_service_ee_1 = require('@/workflows/workflow.service.ee');
let ResourceTransferService = class ResourceTransferService {
	constructor(
		logger,
		workflowRepository,
		credentialsRepository,
		sharedWorkflowRepository,
		sharedCredentialsRepository,
		projectRepository,
		eventService,
		enterpriseWorkflowService,
		enterpriseCredentialsService,
		roleService,
	) {
		this.logger = logger;
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.projectRepository = projectRepository;
		this.eventService = eventService;
		this.enterpriseWorkflowService = enterpriseWorkflowService;
		this.enterpriseCredentialsService = enterpriseCredentialsService;
		this.roleService = roleService;
	}
	async batchTransferWorkflows(user, request) {
		this.logger.debug('Batch transferring workflows', {
			userId: user.id,
			workflowCount: request.workflowIds.length,
			destinationProjectId: request.destinationProjectId,
		});
		const response = {
			success: [],
			errors: [],
			totalProcessed: request.workflowIds.length,
			successCount: 0,
			errorCount: 0,
		};
		const destinationProject = await this.projectRepository.findOneBy({
			id: request.destinationProjectId,
		});
		if (!destinationProject) {
			throw new not_found_error_1.NotFoundError('Destination project not found');
		}
		const hasCreatePermission =
			user.role && ['global:owner', 'global:admin', 'project:editor'].includes(user.role);
		if (!hasCreatePermission) {
			throw new forbidden_error_1.ForbiddenError('Insufficient permissions on destination project');
		}
		for (const workflowId of request.workflowIds) {
			try {
				const hasWorkflowPermission =
					user.role && ['global:owner', 'global:admin', 'project:editor'].includes(user.role);
				if (!hasWorkflowPermission) {
					response.errors.push({
						workflowId,
						error: 'Insufficient permissions to move this workflow',
					});
					response.errorCount++;
					continue;
				}
				const workflow = await this.workflowRepository.findOneBy({ id: workflowId });
				if (!workflow) {
					response.errors.push({
						workflowId,
						error: 'Workflow not found',
					});
					response.errorCount++;
					continue;
				}
				const currentSharing = await this.sharedWorkflowRepository.findOne({
					where: { workflowId },
					relations: ['project'],
				});
				if (currentSharing?.projectId === request.destinationProjectId) {
					response.errors.push({
						workflowId,
						name: workflow.name,
						error: 'Workflow is already in the destination project',
					});
					response.errorCount++;
					continue;
				}
				await this.enterpriseWorkflowService.transferWorkflow(
					user,
					workflowId,
					request.destinationProjectId,
					request.shareCredentials,
					request.destinationParentFolderId,
				);
				response.success.push({
					workflowId,
					name: workflow.name,
					message: 'Workflow transferred successfully',
					sharedCredentials: request.shareCredentials,
				});
				response.successCount++;
				this.eventService.emit('user-updated', {
					user,
					fieldsChanged: ['workflow_transferred'],
				});
			} catch (error) {
				this.logger.error('Error transferring workflow in batch', {
					workflowId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
				response.errors.push({
					workflowId,
					error: error instanceof Error ? error.message : 'Unknown error occurred',
				});
				response.errorCount++;
			}
		}
		this.logger.debug('Batch workflow transfer completed', {
			successCount: response.successCount,
			errorCount: response.errorCount,
		});
		return response;
	}
	async batchTransferCredentials(user, request) {
		this.logger.debug('Batch transferring credentials', {
			userId: user.id,
			credentialCount: request.credentialIds.length,
			destinationProjectId: request.destinationProjectId,
		});
		const response = {
			success: [],
			errors: [],
			totalProcessed: request.credentialIds.length,
			successCount: 0,
			errorCount: 0,
		};
		const destinationProject = await this.projectRepository.findOneBy({
			id: request.destinationProjectId,
		});
		if (!destinationProject) {
			throw new not_found_error_1.NotFoundError('Destination project not found');
		}
		const hasCreatePermission =
			user.role && ['global:owner', 'global:admin', 'project:editor'].includes(user.role);
		if (!hasCreatePermission) {
			throw new forbidden_error_1.ForbiddenError('Insufficient permissions on destination project');
		}
		for (const credentialId of request.credentialIds) {
			try {
				const hasCredentialPermission =
					user.role && ['global:owner', 'global:admin', 'project:editor'].includes(user.role);
				if (!hasCredentialPermission) {
					response.errors.push({
						credentialId,
						error: 'Insufficient permissions to move this credential',
					});
					response.errorCount++;
					continue;
				}
				const credential = await this.credentialsRepository.findOneBy({ id: credentialId });
				if (!credential) {
					response.errors.push({
						credentialId,
						error: 'Credential not found',
					});
					response.errorCount++;
					continue;
				}
				const currentSharing = await this.sharedCredentialsRepository.findOne({
					where: { credentialsId: credentialId },
					relations: ['project'],
				});
				if (currentSharing?.projectId === request.destinationProjectId) {
					response.errors.push({
						credentialId,
						name: credential.name,
						error: 'Credential is already in the destination project',
					});
					response.errorCount++;
					continue;
				}
				await this.enterpriseCredentialsService.transferOne(
					user,
					credentialId,
					request.destinationProjectId,
				);
				response.success.push({
					credentialId,
					name: credential.name,
					message: 'Credential transferred successfully',
				});
				response.successCount++;
				this.eventService.emit('user-updated', {
					user,
					fieldsChanged: ['credential_transferred'],
				});
			} catch (error) {
				this.logger.error('Error transferring credential in batch', {
					credentialId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
				response.errors.push({
					credentialId,
					error: error instanceof Error ? error.message : 'Unknown error occurred',
				});
				response.errorCount++;
			}
		}
		this.logger.debug('Batch credential transfer completed', {
			successCount: response.successCount,
			errorCount: response.errorCount,
		});
		return response;
	}
	async transferProjectResources(user, request) {
		this.logger.debug('Transferring multiple resource types', {
			userId: user.id,
			destinationProjectId: request.destinationProjectId,
			workflowCount: request.workflowIds?.length || 0,
			credentialCount: request.credentialIds?.length || 0,
			folderCount: request.folderIds?.length || 0,
		});
		const response = {
			workflows: { success: [], errors: [] },
			credentials: { success: [], errors: [] },
			folders: { success: [], errors: [] },
			summary: { totalProcessed: 0, totalSuccess: 0, totalErrors: 0 },
		};
		if (request.workflowIds && request.workflowIds.length > 0) {
			const workflowResult = await this.batchTransferWorkflows(user, {
				workflowIds: request.workflowIds,
				destinationProjectId: request.destinationProjectId,
				shareCredentials: request.shareCredentials,
				destinationParentFolderId: request.destinationParentFolderId,
			});
			response.workflows.success = workflowResult.success.map((w) => ({
				workflowId: w.workflowId,
				name: w.name,
				message: w.message,
			}));
			response.workflows.errors = workflowResult.errors;
			response.summary.totalProcessed += workflowResult.totalProcessed;
			response.summary.totalSuccess += workflowResult.successCount;
			response.summary.totalErrors += workflowResult.errorCount;
		}
		if (request.credentialIds && request.credentialIds.length > 0) {
			const credentialResult = await this.batchTransferCredentials(user, {
				credentialIds: request.credentialIds,
				destinationProjectId: request.destinationProjectId,
				shareWithWorkflows: request.workflowIds,
			});
			response.credentials.success = credentialResult.success.map((c) => ({
				credentialId: c.credentialId,
				name: c.name,
				message: c.message,
			}));
			response.credentials.errors = credentialResult.errors;
			response.summary.totalProcessed += credentialResult.totalProcessed;
			response.summary.totalSuccess += credentialResult.successCount;
			response.summary.totalErrors += credentialResult.errorCount;
		}
		this.logger.debug('Multi-resource transfer completed', {
			totalProcessed: response.summary.totalProcessed,
			totalSuccess: response.summary.totalSuccess,
			totalErrors: response.summary.totalErrors,
		});
		return response;
	}
	async analyzeTransferDependencies(user, analysis) {
		this.logger.debug('Analyzing transfer dependencies', {
			userId: user.id,
			resourceId: analysis.resourceId,
			resourceType: analysis.resourceType,
		});
		const hasReadPermission =
			user.role &&
			['global:owner', 'global:admin', 'project:editor', 'project:viewer'].includes(user.role);
		if (!hasReadPermission) {
			throw new forbidden_error_1.ForbiddenError(
				'Insufficient permissions to analyze this resource',
			);
		}
		const response = {
			resourceId: analysis.resourceId,
			resourceType: analysis.resourceType,
			resourceName: '',
			currentProjectId: analysis.projectId,
			currentProjectName: '',
			dependencies: {
				requiredCredentials: [],
				containedWorkflows: [],
				containedFolders: [],
			},
			transferImpact: {
				canTransfer: true,
				reasons: [],
				recommendations: [],
			},
		};
		try {
			const currentProject = await this.projectRepository.findOneBy({ id: analysis.projectId });
			if (!currentProject) {
				throw new not_found_error_1.NotFoundError('Current project not found');
			}
			response.currentProjectName = currentProject.name;
			switch (analysis.resourceType) {
				case 'workflow':
					await this.analyzeWorkflowDependencies(analysis.resourceId, response);
					break;
				case 'credential':
					await this.analyzeCredentialDependencies(analysis.resourceId, response);
					break;
				case 'folder':
					await this.analyzeFolderDependencies(analysis.resourceId, response);
					break;
			}
			this.generateTransferRecommendations(response);
		} catch (error) {
			this.logger.error('Error analyzing transfer dependencies', {
				resourceId: analysis.resourceId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
		return response;
	}
	async previewTransfer(user, request) {
		this.logger.debug('Generating transfer preview', {
			userId: user.id,
			destinationProjectId: request.destinationProjectId,
		});
		const response = {
			canTransfer: true,
			totalResources: 0,
			summary: { workflows: 0, credentials: 0, folders: 0 },
			warnings: [],
			recommendations: [],
			requiredPermissions: [],
		};
		response.summary.workflows = request.workflowIds?.length || 0;
		response.summary.credentials = request.credentialIds?.length || 0;
		response.summary.folders = request.folderIds?.length || 0;
		response.totalResources =
			response.summary.workflows + response.summary.credentials + response.summary.folders;
		const destinationProject = await this.projectRepository.findOneBy({
			id: request.destinationProjectId,
		});
		if (!destinationProject) {
			response.canTransfer = false;
			response.warnings.push({
				type: 'dependency',
				message: 'Destination project not found',
			});
			return response;
		}
		const requiredPermissions = [];
		if (response.summary.workflows > 0) requiredPermissions.push('workflow:create');
		if (response.summary.credentials > 0) requiredPermissions.push('credential:create');
		if (response.summary.folders > 0) requiredPermissions.push('folder:create');
		const hasDestinationPermissions =
			user.role && ['global:owner', 'global:admin', 'project:editor'].includes(user.role);
		if (!hasDestinationPermissions) {
			response.canTransfer = false;
			response.warnings.push({
				type: 'permission',
				message: 'Insufficient permissions on destination project',
			});
			response.requiredPermissions.push({
				projectId: request.destinationProjectId,
				projectName: destinationProject.name,
				permissions: requiredPermissions,
			});
		}
		if (response.totalResources > 10) {
			response.recommendations.push(
				'Consider transferring resources in smaller batches for better performance',
			);
		}
		if (response.summary.workflows > 0 && response.summary.credentials > 0) {
			response.recommendations.push(
				'Transfer credentials first to ensure workflow dependencies are met',
			);
		}
		return response;
	}
	async analyzeWorkflowDependencies(workflowId, response) {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: ['shared', 'shared.project'],
		});
		if (!workflow) {
			throw new not_found_error_1.NotFoundError('Workflow not found');
		}
		response.resourceName = workflow.name;
		const workflowNodes = workflow.nodes || [];
		const credentialIds = new Set();
		for (const node of workflowNodes) {
			if (node.credentials) {
				for (const [, credentialInfo] of Object.entries(node.credentials)) {
					if (typeof credentialInfo === 'object' && credentialInfo.id) {
						credentialIds.add(credentialInfo.id);
					}
				}
			}
		}
		for (const credentialId of credentialIds) {
			const credential = await this.credentialsRepository.findOne({
				where: { id: credentialId },
				relations: ['shared', 'shared.project'],
			});
			if (credential) {
				const sharing = credential.shared[0];
				response.dependencies.requiredCredentials.push({
					id: credential.id,
					name: credential.name,
					type: credential.type,
					currentProjectId: sharing?.projectId || '',
					currentProjectName: sharing?.project?.name || 'Unknown',
					accessInDestination: false,
				});
			}
		}
	}
	async analyzeCredentialDependencies(credentialId, response) {
		const credential = await this.credentialsRepository.findOne({
			where: { id: credentialId },
			relations: ['shared', 'shared.project'],
		});
		if (!credential) {
			throw new not_found_error_1.NotFoundError('Credential not found');
		}
		response.resourceName = credential.name;
		response.transferImpact.recommendations.push(
			'Check which workflows use this credential before transferring',
		);
	}
	async analyzeFolderDependencies(folderId, response) {
		response.transferImpact.recommendations.push('Folder dependency analysis not yet implemented');
	}
	generateTransferRecommendations(response) {
		const { dependencies, transferImpact } = response;
		const inaccessibleCredentials = dependencies.requiredCredentials.filter(
			(cred) => !cred.accessInDestination,
		);
		if (inaccessibleCredentials.length > 0) {
			transferImpact.canTransfer = false;
			transferImpact.reasons.push(
				`${inaccessibleCredentials.length} required credentials are not accessible in the destination project`,
			);
			transferImpact.recommendations.push(
				'Transfer or share the required credentials to the destination project first',
			);
		}
		if (dependencies.requiredCredentials.length > 0) {
			transferImpact.recommendations.push(
				'Verify that all credential dependencies will be available after transfer',
			);
		}
	}
};
exports.ResourceTransferService = ResourceTransferService;
exports.ResourceTransferService = ResourceTransferService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.WorkflowRepository,
			db_1.CredentialsRepository,
			db_1.SharedWorkflowRepository,
			db_1.SharedCredentialsRepository,
			db_1.ProjectRepository,
			event_service_1.EventService,
			workflow_service_ee_1.EnterpriseWorkflowService,
			credentials_service_ee_1.EnterpriseCredentialsService,
			role_service_1.RoleService,
		]),
	],
	ResourceTransferService,
);
//# sourceMappingURL=resource-transfer.service.js.map
