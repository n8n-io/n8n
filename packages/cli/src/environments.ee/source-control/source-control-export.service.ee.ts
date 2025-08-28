import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb } from '@n8n/db';
import {
	FolderRepository,
	TagRepository,
	WorkflowTagMappingRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { rmSync } from 'fs';
import { Credentials, InstanceSettings } from 'n8n-core';
import { UnexpectedError, type ICredentialDataDecryptedObject } from 'n8n-workflow';
import { writeFile as fsWriteFile, rm as fsRm } from 'node:fs/promises';
import path from 'path';

import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import {
	getCredentialExportPath,
	getFoldersPath,
	getVariablesPath,
	getWorkflowExportPath,
	readFoldersFromSourceControlFile,
	readTagAndMappingsFromSourceControlFile,
	sourceControlFoldersExistCheck,
	stringContainsExpression,
} from './source-control-helper.ee';
import { SourceControlScopedService } from './source-control-scoped.service';
import type { ExportResult } from './types/export-result';
import type { ExportableCredential } from './types/exportable-credential';
import type { ExportableWorkflow } from './types/exportable-workflow';
import type { RemoteResourceOwner } from './types/resource-owner';
import type { SourceControlContext } from './types/source-control-context';
import { VariablesService } from '../variables/variables.service.ee';

import { formatWorkflow } from '@/workflows/workflow.formatter';

@Service()
export class SourceControlExportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly variablesService: VariablesService,
		private readonly tagRepository: TagRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly folderRepository: FolderRepository,
		private readonly sourceControlScopedService: SourceControlScopedService,
		instanceSettings: InstanceSettings,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}

	getWorkflowPath(workflowId: string): string {
		return getWorkflowExportPath(workflowId, this.workflowExportFolder);
	}

	getCredentialsPath(credentialsId: string): string {
		return getCredentialExportPath(credentialsId, this.credentialExportFolder);
	}

	async deleteRepositoryFolder() {
		try {
			await fsRm(this.gitFolder, { recursive: true });
		} catch (error) {
			this.logger.error(`Failed to delete work folder: ${(error as Error).message}`);
		}
	}

	rmFilesFromExportFolder(filesToBeDeleted: Set<string>): Set<string> {
		try {
			filesToBeDeleted.forEach((e) => rmSync(e));
		} catch (error) {
			this.logger.error(`Failed to delete workflows from work folder: ${(error as Error).message}`);
		}
		return filesToBeDeleted;
	}

	private async writeExportableWorkflowsToExportFolder(
		workflowsToBeExported: IWorkflowDb[],
		owners: Record<string, RemoteResourceOwner>,
	) {
		await Promise.all(
			workflowsToBeExported.map(async (e) => {
				const fileName = this.getWorkflowPath(e.id);
				const sanitizedWorkflow: ExportableWorkflow = {
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
				return await fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
			}),
		);
	}

	async exportWorkflowsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.workflowExportFolder]);
			const workflowIds = candidates.map((e) => e.id);
			const sharedWorkflows = await this.sharedWorkflowRepository.findByWorkflowIds(workflowIds);
			const workflows = await this.workflowRepository.find({
				where: { id: In(workflowIds) },
				relations: ['parentFolder'],
			});

			// determine owner of each workflow to be exported
			const owners: Record<string, RemoteResourceOwner> = {};
			sharedWorkflows.forEach((sharedWorkflow) => {
				const project = sharedWorkflow.project;

				if (!project) {
					throw new UnexpectedError(
						`Workflow ${formatWorkflow(sharedWorkflow.workflow)} has no owner`,
					);
				}

				if (project.type === 'personal') {
					const ownerRelation = project.projectRelations.find(
						(pr) => pr.role.slug === PROJECT_OWNER_ROLE_SLUG,
					);
					if (!ownerRelation) {
						throw new UnexpectedError(
							`Workflow ${formatWorkflow(sharedWorkflow.workflow)} has no owner`,
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
					throw new UnexpectedError(
						`Workflow belongs to unknown project type: ${project.type as string}`,
					);
				}
			});

			// write the workflows to the export folder as json files
			await this.writeExportableWorkflowsToExportFolder(workflows, owners);

			// await fsWriteFile(ownersFileName, JSON.stringify(owners, null, 2));
			return {
				count: sharedWorkflows.length,
				folder: this.workflowExportFolder,
				files: workflows.map((e) => ({
					id: e?.id,
					name: this.getWorkflowPath(e?.name),
				})),
			};
		} catch (error) {
			if (error instanceof UnexpectedError) throw error;
			throw new UnexpectedError('Failed to export workflows to work folder', { cause: error });
		}
	}

	async exportVariablesToWorkFolder(): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder]);
			const variables = await this.variablesService.getAllCached();
			// do not export empty variables
			if (variables.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const fileName = getVariablesPath(this.gitFolder);
			const sanitizedVariables = variables.map((e) => ({ ...e, value: '' }));
			await fsWriteFile(fileName, JSON.stringify(sanitizedVariables, null, 2));
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
			throw new UnexpectedError('Failed to export variables to work folder', {
				cause: error,
			});
		}
	}

	async exportFoldersToWorkFolder(context: SourceControlContext): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder]);
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
				await this.sourceControlScopedService.getAuthorizedProjectsFromContext(context);

			const fileName = getFoldersPath(this.gitFolder);

			const existingFolders = await readFoldersFromSourceControlFile(fileName);

			// keep all folders that are not accessible by the current user
			// if allowedProjects is undefined, all folders are accessible by the current user
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

			await fsWriteFile(
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
			throw new UnexpectedError('Failed to export folders to work folder', { cause: error });
		}
	}

	async exportTagsToWorkFolder(context: SourceControlContext): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder]);
			const tags = await this.tagRepository.find();
			// do not export empty tags
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
			const fileName = path.join(this.gitFolder, SOURCE_CONTROL_TAGS_EXPORT_FILE);
			const existingTagsAndMapping = await readTagAndMappingsFromSourceControlFile(fileName);

			// keep all mappings that are not accessible by the current user
			const mappingsToKeep = existingTagsAndMapping.mappings.filter((mapping) => {
				return !allowedWorkflows.some(
					(allowedWorkflow) => allowedWorkflow.id === mapping.workflowId,
				);
			});

			await fsWriteFile(
				fileName,
				JSON.stringify(
					{
						// overwrite all tags
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
			throw new UnexpectedError('Failed to export tags to work folder', { cause: error });
		}
	}

	private replaceCredentialData = (
		data: ICredentialDataDecryptedObject,
	): ICredentialDataDecryptedObject => {
		for (const [key] of Object.entries(data)) {
			const value = data[key];
			try {
				if (value === null) {
					delete data[key]; // remove invalid null values
				} else if (typeof value === 'object') {
					data[key] = this.replaceCredentialData(value as ICredentialDataDecryptedObject);
				} else if (typeof value === 'string') {
					data[key] = stringContainsExpression(value) ? data[key] : '';
				} else if (typeof data[key] === 'number') {
					// TODO: leaving numbers in for now, but maybe we should remove them
					continue;
				}
			} catch (error) {
				this.logger.error(`Failed to sanitize credential data: ${(error as Error).message}`);
				throw error;
			}
		}
		return data;
	};

	async exportCredentialsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.credentialExportFolder]);
			const credentialIds = candidates.map((e) => e.id);
			const credentialsToBeExported = await this.sharedCredentialsRepository.findByCredentialIds(
				credentialIds,
				'credential:owner',
			);
			let missingIds: string[] = [];
			if (credentialsToBeExported.length !== credentialIds.length) {
				const foundCredentialIds = credentialsToBeExported.map((e) => e.credentialsId);
				missingIds = credentialIds.filter(
					(remote) => foundCredentialIds.findIndex((local) => local === remote) === -1,
				);
			}
			await Promise.all(
				credentialsToBeExported.map(async (sharing) => {
					const { name, type, data, id } = sharing.credentials;
					const credentials = new Credentials({ id, name }, type, data);

					let owner: RemoteResourceOwner | null = null;
					if (sharing.project.type === 'personal') {
						const ownerRelation = sharing.project.projectRelations.find(
							(pr) => pr.role.slug === PROJECT_OWNER_ROLE_SLUG,
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

					/**
					 * Edge case: Do not export `oauthTokenData`, so that that the
					 * pulling instance reconnects instead of trying to use stubbed values.
					 */
					const credentialData = credentials.getData();
					const { oauthTokenData, ...rest } = credentialData;

					const stub: ExportableCredential = {
						id,
						name,
						type,
						data: this.replaceCredentialData(rest),
						ownedBy: owner,
					};

					const filePath = this.getCredentialsPath(id);
					this.logger.debug(`Writing credentials stub "${name}" (ID ${id}) to: ${filePath}`);

					return await fsWriteFile(filePath, JSON.stringify(stub, null, 2));
				}),
			);

			return {
				count: credentialsToBeExported.length,
				folder: this.credentialExportFolder,
				files: credentialsToBeExported.map((e) => ({
					id: e.credentials.id,
					name: path.join(this.credentialExportFolder, `${e.credentials.name}.json`),
				})),
				missingIds,
			};
		} catch (error) {
			this.logger.error('Failed to export credentials to work folder', { error });
			throw new UnexpectedError('Failed to export credentials to work folder', { cause: error });
		}
	}
}
