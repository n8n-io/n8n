import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb } from '@n8n/db';
import {
	FolderRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	TagRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { Credentials, InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { rm as fsRm, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'path';

import { formatWorkflow } from '@/workflows/workflow.formatter';

import chunk from 'lodash/chunk';
import { VariablesService } from '../../environments.ee/variables/variables.service.ee';
import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_PROJECT_EXPORT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
	SOURCE_CONTROL_WRITE_FILE_BATCH_SIZE,
} from './constants';
import {
	getCredentialExportPath,
	getDataTableExportPath,
	getFoldersPath,
	getProjectExportPath,
	getVariablesPath,
	getWorkflowExportPath,
	readFoldersFromSourceControlFile,
	readTagAndMappingsFromSourceControlFile,
	sourceControlFoldersExistCheck,
	sanitizeCredentialData,
} from './source-control-helper.ee';
import { SourceControlScopedService } from './source-control-scoped.service';
import type { ExportResult } from './types/export-result';
import type { ExportableCredential } from './types/exportable-credential';
import type { DataTableResourceOwner, ExportableDataTable } from './types/exportable-data-table';
import { ExportableProject } from './types/exportable-project';
import { ExportableVariable } from './types/exportable-variable';
import type { ExportableWorkflow } from './types/exportable-workflow';
import type { RemoteResourceOwner } from './types/resource-owner';
import type { SourceControlContext } from './types/source-control-context';

@Service()
export class SourceControlExportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private projectExportFolder: string;

	private credentialExportFolder: string;

	private dataTableExportFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly variablesService: VariablesService,
		private readonly tagRepository: TagRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly folderRepository: FolderRepository,
		private readonly sourceControlScopedService: SourceControlScopedService,
		instanceSettings: InstanceSettings,
		private readonly dataTableRepository: DataTableRepository,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.projectExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_PROJECT_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
		this.dataTableExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER);
	}

	getWorkflowPath(workflowId: string): string {
		return getWorkflowExportPath(workflowId, this.workflowExportFolder);
	}

	getCredentialsPath(credentialsId: string): string {
		return getCredentialExportPath(credentialsId, this.credentialExportFolder);
	}

	getDataTablePath(dataTableId: string): string {
		return getDataTableExportPath(dataTableId, this.dataTableExportFolder);
	}

	async deleteRepositoryFolder() {
		try {
			await fsRm(this.gitFolder, { recursive: true });
		} catch (error) {
			this.logger.error(`Failed to delete work folder: ${(error as Error).message}`);
		}
	}

	async rmFilesFromExportFolder(filesToBeDeleted: Set<string>): Promise<Set<string>> {
		try {
			await Promise.all([...filesToBeDeleted].map(async (e) => await fsRm(e)));
		} catch (error) {
			this.logger.error(`Failed to delete workflows from work folder: ${(error as Error).message}`);
		}
		return filesToBeDeleted;
	}

	private async writeExportableWorkflowsToExportFolder(
		workflowsToBeExported: IWorkflowDb[],
		owners: Record<string, RemoteResourceOwner>,
	) {
		const workflowChunks = chunk(workflowsToBeExported, SOURCE_CONTROL_WRITE_FILE_BATCH_SIZE);
		for (const workflowChunk of workflowChunks) {
			await Promise.all(
				workflowChunk.map(async (workflow) => {
					const fileName = this.getWorkflowPath(workflow.id);
					const sanitizedWorkflow: ExportableWorkflow = {
						id: workflow.id,
						name: workflow.name,
						nodes: workflow.nodes,
						connections: workflow.connections,
						settings: workflow.settings,
						triggerCount: workflow.triggerCount,
						versionId: workflow.versionId,
						owner: owners[workflow.id],
						parentFolderId: workflow.parentFolder?.id ?? null,
						isArchived: workflow.isArchived,
					};
					this.logger.debug(`Writing workflow ${workflow.id} to ${fileName}`);
					return await fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
				}),
			);
		}
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

	async exportGlobalVariablesToWorkFolder(): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder]);
			const variables = await this.variablesService.getAllCached({ globalOnly: true });
			// do not export empty variables
			if (variables.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const fileName = getVariablesPath(this.gitFolder);
			const sanitizedVariables: ExportableVariable[] = variables.map((e) => ({
				id: e.id,
				key: e.key,
				type: e.type,
				value: '',
			}));
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

	async exportDataTablesToWorkFolder(
		candidates: SourceControlledFile[],
		_context: SourceControlContext,
	): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder, this.dataTableExportFolder]);

			if (candidates.length === 0) {
				return {
					count: 0,
					folder: this.dataTableExportFolder,
					files: [],
				};
			}

			// Extract data table IDs from candidates
			const candidateIds = candidates.map((candidate) => candidate.id);

			// Fetch only the selected data tables
			const dataTables = await this.dataTableRepository.find({
				where: {
					id: In(candidateIds),
				},
				relations: [
					'columns',
					'project',
					'project.projectRelations',
					'project.projectRelations.role',
					'project.projectRelations.user',
				],
				select: {
					id: true,
					name: true,
					projectId: true,
					createdAt: true,
					updatedAt: true,
					columns: {
						id: true,
						name: true,
						type: true,
						index: true,
					},
					project: {
						id: true,
						name: true,
						type: true,
						projectRelations: {
							userId: true,
							role: {
								slug: true,
							},
							user: {
								email: true,
							},
						},
					},
				},
			});

			const exportedFiles: Array<{ id: string; name: string }> = [];

			// Write each data table to its own file
			for (const table of dataTables) {
				let owner: DataTableResourceOwner | null = null;
				if (table.project?.type === 'personal') {
					const ownerRelation = table.project.projectRelations?.find(
						(pr) => pr.role.slug === PROJECT_OWNER_ROLE_SLUG,
					);
					if (ownerRelation) {
						owner = {
							type: 'personal',
							projectId: table.project.id,
							projectName: table.project.name,
							personalEmail: ownerRelation.user.email,
						};
					}
				} else if (table.project?.type === 'team') {
					owner = {
						type: 'team',
						teamId: table.project.id,
						teamName: table.project.name,
					};
				}

				const exportableDataTable: ExportableDataTable = {
					id: table.id,
					name: table.name,
					columns: table.columns
						.sort((a, b) => a.index - b.index)
						.map((col) => ({
							id: col.id,
							name: col.name,
							type: col.type,
							index: col.index,
						})),
					ownedBy: owner,
					createdAt: table.createdAt.toISOString(),
					updatedAt: table.updatedAt.toISOString(),
				};

				const filePath = this.getDataTablePath(table.id);
				await fsWriteFile(filePath, JSON.stringify(exportableDataTable, null, 2));

				exportedFiles.push({
					id: table.id,
					name: filePath,
				});
			}

			return {
				count: dataTables.length,
				folder: this.dataTableExportFolder,
				files: exportedFiles,
			};
		} catch (error) {
			this.logger.error('Failed to export data tables to work folder', { error });
			throw new UnexpectedError('Failed to export data tables to work folder', {
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
				? []
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
			const fileName = path.join(this.gitFolder, SOURCE_CONTROL_TAGS_EXPORT_FILE);
			sourceControlFoldersExistCheck([this.gitFolder]);
			const tags = await this.tagRepository.find();

			if (tags.length === 0) {
				await fsWriteFile(fileName, JSON.stringify({ tags: [], mappings: [] }, null, 2));

				return {
					count: 0,
					folder: this.gitFolder,
					files: [{ id: '', name: fileName }],
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
				files: [{ id: '', name: fileName }],
			};
		} catch (error) {
			this.logger.error('Failed to export tags to work folder', { error });
			throw new UnexpectedError('Failed to export tags to work folder', { cause: error });
		}
	}

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
					const { name, type, data, id, isGlobal = false } = sharing.credentials;
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

					const sanitizedData = sanitizeCredentialData(credentials.getData());

					const stub: ExportableCredential = {
						id,
						name,
						type,
						data: sanitizedData,
						ownedBy: owner,
						isGlobal,
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

	/**
	 * Writes candidates projects to files in the work folder.
	 *
	 * Only team projects are supported.
	 * Personal project are not supported because they are not stable across instances
	 * (different ids across instances).
	 */
	async exportTeamProjectsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.projectExportFolder], true);

			const projectIds = candidates.map((e) => e.id);
			const projects = await this.projectRepository.find({
				where: { id: In(projectIds), type: 'team' },
				relations: ['variables'],
			});

			await Promise.all(
				projects.map(async (project) => {
					const fileName = getProjectExportPath(project.id, this.projectExportFolder);

					const sanitizedProject: ExportableProject = {
						id: project.id,
						name: project.name,
						icon: project.icon,
						description: project.description,
						type: 'team',
						owner: {
							type: 'team',
							teamId: project.id,
							teamName: project.name,
						},
						variableStubs: project.variables.map((variable) => ({
							id: variable.id,
							key: variable.key,
							type: variable.type,
							value: '',
						})),
					};

					this.logger.debug(`Writing project ${project.id} to ${fileName}`);
					return await fsWriteFile(fileName, JSON.stringify(sanitizedProject, null, 2));
				}),
			);

			return {
				count: projects.length,
				folder: this.projectExportFolder,
				files: projects.map((project) => ({
					id: project.id,
					name: getProjectExportPath(project.id, this.projectExportFolder),
				})),
			};
		} catch (error) {
			if (error instanceof UnexpectedError) throw error;
			throw new UnexpectedError('Failed to export projects to work folder', { cause: error });
		}
	}
}
