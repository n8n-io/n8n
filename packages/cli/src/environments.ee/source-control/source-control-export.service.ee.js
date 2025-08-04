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
exports.SourceControlExportService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const fs_1 = require('fs');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const promises_1 = require('node:fs/promises');
const path_1 = __importDefault(require('path'));
const workflow_formatter_1 = require('@/workflows/workflow.formatter');
const constants_1 = require('./constants');
const source_control_helper_ee_1 = require('./source-control-helper.ee');
const source_control_scoped_service_1 = require('./source-control-scoped.service');
const variables_service_ee_1 = require('../variables/variables.service.ee');
let SourceControlExportService = class SourceControlExportService {
	constructor(
		logger,
		variablesService,
		tagRepository,
		sharedCredentialsRepository,
		sharedWorkflowRepository,
		workflowRepository,
		workflowTagMappingRepository,
		folderRepository,
		sourceControlScopedService,
		instanceSettings,
	) {
		this.logger = logger;
		this.variablesService = variablesService;
		this.tagRepository = tagRepository;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.workflowRepository = workflowRepository;
		this.workflowTagMappingRepository = workflowTagMappingRepository;
		this.folderRepository = folderRepository;
		this.sourceControlScopedService = sourceControlScopedService;
		this.replaceCredentialData = (data) => {
			for (const [key] of Object.entries(data)) {
				const value = data[key];
				try {
					if (value === null) {
						delete data[key];
					} else if (typeof value === 'object') {
						data[key] = this.replaceCredentialData(value);
					} else if (typeof value === 'string') {
						data[key] = (0, source_control_helper_ee_1.stringContainsExpression)(value)
							? data[key]
							: '';
					} else if (typeof data[key] === 'number') {
						continue;
					}
				} catch (error) {
					this.logger.error(`Failed to sanitize credential data: ${error.message}`);
					throw error;
				}
			}
			return data;
		};
		this.gitFolder = path_1.default.join(
			instanceSettings.n8nFolder,
			constants_1.SOURCE_CONTROL_GIT_FOLDER,
		);
		this.workflowExportFolder = path_1.default.join(
			this.gitFolder,
			constants_1.SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
		);
		this.credentialExportFolder = path_1.default.join(
			this.gitFolder,
			constants_1.SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}
	getWorkflowPath(workflowId) {
		return (0, source_control_helper_ee_1.getWorkflowExportPath)(
			workflowId,
			this.workflowExportFolder,
		);
	}
	getCredentialsPath(credentialsId) {
		return (0, source_control_helper_ee_1.getCredentialExportPath)(
			credentialsId,
			this.credentialExportFolder,
		);
	}
	async deleteRepositoryFolder() {
		try {
			await (0, promises_1.rm)(this.gitFolder, { recursive: true });
		} catch (error) {
			this.logger.error(`Failed to delete work folder: ${error.message}`);
		}
	}
	rmFilesFromExportFolder(filesToBeDeleted) {
		try {
			filesToBeDeleted.forEach((e) => (0, fs_1.rmSync)(e));
		} catch (error) {
			this.logger.error(`Failed to delete workflows from work folder: ${error.message}`);
		}
		return filesToBeDeleted;
	}
	async writeExportableWorkflowsToExportFolder(workflowsToBeExported, owners) {
		await Promise.all(
			workflowsToBeExported.map(async (e) => {
				const fileName = this.getWorkflowPath(e.id);
				const sanitizedWorkflow = {
					id: e.id,
					name: e.name,
					nodes: e.nodes,
					connections: e.connections,
					settings: e.settings,
					triggerCount: e.triggerCount,
					versionId: e.versionId,
					owner: owners[e.id],
					parentFolderId: e.parentFolder?.id ?? null,
					isArchived: e.isArchived,
				};
				this.logger.debug(`Writing workflow ${e.id} to ${fileName}`);
				return await (0, promises_1.writeFile)(
					fileName,
					JSON.stringify(sanitizedWorkflow, null, 2),
				);
			}),
		);
	}
	async exportWorkflowsToWorkFolder(candidates) {
		try {
			(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([this.workflowExportFolder]);
			const workflowIds = candidates.map((e) => e.id);
			const sharedWorkflows = await this.sharedWorkflowRepository.findByWorkflowIds(workflowIds);
			const workflows = await this.workflowRepository.find({
				where: { id: (0, typeorm_1.In)(workflowIds) },
				relations: ['parentFolder'],
			});
			const owners = {};
			sharedWorkflows.forEach((sharedWorkflow) => {
				const project = sharedWorkflow.project;
				if (!project) {
					throw new n8n_workflow_1.UnexpectedError(
						`Workflow ${(0, workflow_formatter_1.formatWorkflow)(sharedWorkflow.workflow)} has no owner`,
					);
				}
				if (project.type === 'personal') {
					const ownerRelation = project.projectRelations.find(
						(pr) => pr.role === 'project:personalOwner',
					);
					if (!ownerRelation) {
						throw new n8n_workflow_1.UnexpectedError(
							`Workflow ${(0, workflow_formatter_1.formatWorkflow)(sharedWorkflow.workflow)} has no owner`,
						);
					}
					owners[sharedWorkflow.workflowId] = {
						type: 'personal',
						projectId: project.id,
						projectName: project.name,
						personalEmail: ownerRelation.user.email,
					};
				} else if (project.type === 'team') {
					owners[sharedWorkflow.workflowId] = {
						type: 'team',
						teamId: project.id,
						teamName: project.name,
					};
				} else {
					throw new n8n_workflow_1.UnexpectedError(
						`Workflow belongs to unknown project type: ${project.type}`,
					);
				}
			});
			await this.writeExportableWorkflowsToExportFolder(workflows, owners);
			return {
				count: sharedWorkflows.length,
				folder: this.workflowExportFolder,
				files: workflows.map((e) => ({
					id: e?.id,
					name: this.getWorkflowPath(e?.name),
				})),
			};
		} catch (error) {
			if (error instanceof n8n_workflow_1.UnexpectedError) throw error;
			throw new n8n_workflow_1.UnexpectedError('Failed to export workflows to work folder', {
				cause: error,
			});
		}
	}
	async exportVariablesToWorkFolder() {
		try {
			(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([this.gitFolder]);
			const variables = await this.variablesService.getAllCached();
			if (variables.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const fileName = (0, source_control_helper_ee_1.getVariablesPath)(this.gitFolder);
			const sanitizedVariables = variables.map((e) => ({ ...e, value: '' }));
			await (0, promises_1.writeFile)(fileName, JSON.stringify(sanitizedVariables, null, 2));
			return {
				count: sanitizedVariables.length,
				folder: this.gitFolder,
				files: [
					{
						id: '',
						name: fileName,
					},
				],
			};
		} catch (error) {
			this.logger.error('Failed to export variables to work folder', { error });
			throw new n8n_workflow_1.UnexpectedError('Failed to export variables to work folder', {
				cause: error,
			});
		}
	}
	async exportFoldersToWorkFolder(context) {
		try {
			(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([this.gitFolder]);
			const folders = await this.folderRepository.find({
				relations: ['parentFolder', 'homeProject'],
				select: {
					id: true,
					name: true,
					createdAt: true,
					updatedAt: true,
					parentFolder: {
						id: true,
					},
					homeProject: {
						id: true,
					},
				},
				where: this.sourceControlScopedService.getFoldersInAdminProjectsFromContextFilter(context),
			});
			if (folders.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const allowedProjects =
				await this.sourceControlScopedService.getAdminProjectsFromContext(context);
			const fileName = (0, source_control_helper_ee_1.getFoldersPath)(this.gitFolder);
			const existingFolders = await (0,
			source_control_helper_ee_1.readFoldersFromSourceControlFile)(fileName);
			const foldersToKeepUnchanged = context.hasAccessToAllProjects()
				? existingFolders.folders
				: existingFolders.folders.filter((folder) => {
						return !allowedProjects.some((project) => project.id === folder.homeProjectId);
					});
			const newFolders = foldersToKeepUnchanged.concat(
				...folders.map((f) => ({
					id: f.id,
					name: f.name,
					parentFolderId: f.parentFolder?.id ?? null,
					homeProjectId: f.homeProject.id,
					createdAt: f.createdAt.toISOString(),
					updatedAt: f.updatedAt.toISOString(),
				})),
			);
			await (0, promises_1.writeFile)(
				fileName,
				JSON.stringify(
					{
						folders: newFolders,
					},
					null,
					2,
				),
			);
			return {
				count: folders.length,
				folder: this.gitFolder,
				files: [
					{
						id: '',
						name: fileName,
					},
				],
			};
		} catch (error) {
			this.logger.error('Failed to export folders to work folder', { error });
			throw new n8n_workflow_1.UnexpectedError('Failed to export folders to work folder', {
				cause: error,
			});
		}
	}
	async exportTagsToWorkFolder(context) {
		try {
			(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([this.gitFolder]);
			const tags = await this.tagRepository.find();
			if (tags.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const mappingsOfAllowedWorkflows = await this.workflowTagMappingRepository.find({
				where:
					this.sourceControlScopedService.getWorkflowTagMappingInAdminProjectsFromContextFilter(
						context,
					),
			});
			const allowedWorkflows = await this.workflowRepository.find({
				where:
					this.sourceControlScopedService.getWorkflowsInAdminProjectsFromContextFilter(context),
			});
			const fileName = path_1.default.join(
				this.gitFolder,
				constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE,
			);
			const existingTagsAndMapping = await (0,
			source_control_helper_ee_1.readTagAndMappingsFromSourceControlFile)(fileName);
			const mappingsToKeep = existingTagsAndMapping.mappings.filter((mapping) => {
				return !allowedWorkflows.some(
					(allowedWorkflow) => allowedWorkflow.id === mapping.workflowId,
				);
			});
			await (0, promises_1.writeFile)(
				fileName,
				JSON.stringify(
					{
						tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
						mappings: mappingsToKeep.concat(mappingsOfAllowedWorkflows),
					},
					null,
					2,
				),
			);
			return {
				count: tags.length,
				folder: this.gitFolder,
				files: [
					{
						id: '',
						name: fileName,
					},
				],
			};
		} catch (error) {
			this.logger.error('Failed to export tags to work folder', { error });
			throw new n8n_workflow_1.UnexpectedError('Failed to export tags to work folder', {
				cause: error,
			});
		}
	}
	async exportCredentialsToWorkFolder(candidates) {
		try {
			(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([this.credentialExportFolder]);
			const credentialIds = candidates.map((e) => e.id);
			const credentialsToBeExported = await this.sharedCredentialsRepository.findByCredentialIds(
				credentialIds,
				'credential:owner',
			);
			let missingIds = [];
			if (credentialsToBeExported.length !== credentialIds.length) {
				const foundCredentialIds = credentialsToBeExported.map((e) => e.credentialsId);
				missingIds = credentialIds.filter(
					(remote) => foundCredentialIds.findIndex((local) => local === remote) === -1,
				);
			}
			await Promise.all(
				credentialsToBeExported.map(async (sharing) => {
					const { name, type, data, id } = sharing.credentials;
					const credentials = new n8n_core_1.Credentials({ id, name }, type, data);
					let owner = null;
					if (sharing.project.type === 'personal') {
						const ownerRelation = sharing.project.projectRelations.find(
							(pr) => pr.role === 'project:personalOwner',
						);
						if (ownerRelation) {
							owner = {
								type: 'personal',
								projectId: sharing.project.id,
								projectName: sharing.project.name,
								personalEmail: ownerRelation.user.email,
							};
						}
					} else if (sharing.project.type === 'team') {
						owner = {
							type: 'team',
							teamId: sharing.project.id,
							teamName: sharing.project.name,
						};
					}
					const credentialData = credentials.getData();
					const { oauthTokenData, ...rest } = credentialData;
					const stub = {
						id,
						name,
						type,
						data: this.replaceCredentialData(rest),
						ownedBy: owner,
					};
					const filePath = this.getCredentialsPath(id);
					this.logger.debug(`Writing credentials stub "${name}" (ID ${id}) to: ${filePath}`);
					return await (0, promises_1.writeFile)(filePath, JSON.stringify(stub, null, 2));
				}),
			);
			return {
				count: credentialsToBeExported.length,
				folder: this.credentialExportFolder,
				files: credentialsToBeExported.map((e) => ({
					id: e.credentials.id,
					name: path_1.default.join(this.credentialExportFolder, `${e.credentials.name}.json`),
				})),
				missingIds,
			};
		} catch (error) {
			this.logger.error('Failed to export credentials to work folder', { error });
			throw new n8n_workflow_1.UnexpectedError('Failed to export credentials to work folder', {
				cause: error,
			});
		}
	}
};
exports.SourceControlExportService = SourceControlExportService;
exports.SourceControlExportService = SourceControlExportService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			variables_service_ee_1.VariablesService,
			db_1.TagRepository,
			db_1.SharedCredentialsRepository,
			db_1.SharedWorkflowRepository,
			db_1.WorkflowRepository,
			db_1.WorkflowTagMappingRepository,
			db_1.FolderRepository,
			source_control_scoped_service_1.SourceControlScopedService,
			n8n_core_1.InstanceSettings,
		]),
	],
	SourceControlExportService,
);
//# sourceMappingURL=source-control-export.service.ee.js.map
