import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb, Project, SharedCredentials } from '@n8n/db';
import {
	FolderRepository,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	TagRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import chunk from 'lodash/chunk';
import { Credentials, InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { rm as fsRm, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'path';

import { DataTableRepository } from '@/modules/data-table/data-table.repository';

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
import type { ExportableFolder } from './types/exportable-folders';
import { ExportableProject } from './types/exportable-project';
import { ExportableVariable } from './types/exportable-variable';
import type { ExportableWorkflow } from './types/exportable-workflow';
import type {
	PersonalResourceOwner,
	RemoteResourceOwner,
	TeamResourceOwner,
} from './types/resource-owner';
import type { SourceControlContext } from './types/source-control-context';
import { VariablesService } from '../../environments.ee/variables/variables.service.ee';

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
		private readonly projectRelationRepository: ProjectRelationRepository,
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

	private async getPersonalOwnerEmails(projects: Iterable<Project>) {
		const personalProjectIds = [...projects]
			.filter((project) => project.type === 'personal')
			.map((project) => project.id);
		return await this.projectRelationRepository.findPersonalOwnerEmails(personalProjectIds);
	}

	private getResourceOwner(
		project: Project,
		ownerEmails: Map<string, string>,
	): PersonalResourceOwner | TeamResourceOwner | null {
		if (project.type === 'team') {
			return { type: 'team', teamId: project.id, teamName: project.name };
		}
		const personalEmail = ownerEmails.get(project.id);
		if (personalEmail === undefined) return null;
		return { type: 'personal', projectId: project.id, projectName: project.name, personalEmail };
	}

	private async writeExportableWorkflowsToExportFolder(
		workflowsToBeExported: IWorkflowDb[],
		owners: Record<string, RemoteResourceOwner>,
	) {
		await Promise.all(
			workflowsToBeExported.map(async (workflow) => {
				const fileName = this.getWorkflowPath(workflow.id);
				const sanitizedWorkflow: ExportableWorkflow = {
					id: workflow.id,
					name: workflow.name,
					description: workflow.description ?? null,
					nodes: workflow.nodes,
					connections: workflow.connections,
					settings: workflow.settings,
					triggerCount: workflow.triggerCount,
					versionId: workflow.versionId,
					owner: owners[workflow.id],
					parentFolderId: workflow.parentFolder?.id ?? null,
					isArchived: workflow.isArchived,
					nodeGroups: workflow.nodeGroups ?? [],
				};
				this.logger.debug(`Writing workflow ${workflow.id} to ${fileName}`);
				return await fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
			}),
		);
	}

	async exportWorkflowsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.workflowExportFolder]);
			const workflowIds = candidates.map((e) => e.id);
			const ownerProjects =
				await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);
			const ownerEmails = await this.getPersonalOwnerEmails(ownerProjects.values());

			const owners: Record<string, RemoteResourceOwner> = {};
			for (const [workflowId, project] of ownerProjects) {
				const owner = this.getResourceOwner(project, ownerEmails);
				if (!owner) {
					throw new UnexpectedError(`Workflow ${workflowId} has no owner`);
				}
				owners[workflowId] = owner;
			}

			const files: ExportResult['files'] = [];
			for (const workflowIdChunk of chunk(workflowIds, SOURCE_CONTROL_WRITE_FILE_BATCH_SIZE)) {
				const workflows = await this.workflowRepository.find({
					where: { id: In(workflowIdChunk) },
					relations: ['parentFolder'],
				});
				await this.writeExportableWorkflowsToExportFolder(workflows, owners);
				files.push(
					...workflows.map((workflow) => ({
						id: workflow.id,
						name: this.getWorkflowPath(workflow.name),
					})),
				);
			}

			return {
				count: ownerProjects.size,
				folder: this.workflowExportFolder,
				files,
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
		context: SourceControlContext,
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
					...this.sourceControlScopedService.getDataTablesInAdminProjectsFromContextFilter(context),
				},
				relations: ['columns', 'project'],
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
					},
				},
			});
			const ownerEmails = await this.getPersonalOwnerEmails(
				dataTables.flatMap((table) => table.project ?? []),
			);

			const exportedFiles: Array<{ id: string; name: string }> = [];

			// Write each data table to its own file
			for (const table of dataTables) {
				const owner: DataTableResourceOwner | null = table.project
					? this.getResourceOwner(table.project, ownerEmails)
					: null;

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

			const fileName = getFoldersPath(this.gitFolder);

			let foldersToKeepUnchanged: ExportableFolder[] = [];
			if (!context.hasAccessToAllProjects()) {
				const existingFolders = await readFoldersFromSourceControlFile(fileName);
				foldersToKeepUnchanged = existingFolders.folders.filter(
					(folder) => !context.canAccessProject(folder.homeProjectId),
				);
			}

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
				select: { id: true },
				where:
					this.sourceControlScopedService.getWorkflowsInAdminProjectsFromContextFilter(context),
			});
			const allowedWorkflowIds = new Set(allowedWorkflows.map((workflow) => workflow.id));

			const existingTagsAndMapping = await readTagAndMappingsFromSourceControlFile(fileName);

			// keep all mappings that are not accessible by the current user
			const mappingsToKeep = existingTagsAndMapping.mappings.filter(
				(mapping) => !allowedWorkflowIds.has(mapping.workflowId),
			);

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

	private async writeExportableCredentialsToExportFolder(
		sharings: SharedCredentials[],
		ownerProjects: Map<string, Project>,
		ownerEmails: Map<string, string>,
	) {
		await Promise.all(
			sharings.map(async (sharing) => {
				const {
					name,
					type,
					data,
					id,
					isGlobal = false,
					isResolvable = false,
					resolvableAllowFallback = false,
				} = sharing.credentials;
				const credentials = new Credentials({ id, name }, type, data);

				const project = ownerProjects.get(sharing.credentialsId);
				const owner = project ? this.getResourceOwner(project, ownerEmails) : null;

				const sanitizedData = sanitizeCredentialData(await credentials.getData());

				const stub: ExportableCredential = {
					id,
					name,
					type,
					data: sanitizedData,
					ownedBy: owner,
					isGlobal,
					isResolvable,
					resolvableAllowFallback,
				};

				const filePath = this.getCredentialsPath(id);
				this.logger.debug(`Writing credentials stub "${name}" (ID ${id}) to: ${filePath}`);

				return await fsWriteFile(filePath, JSON.stringify(stub, null, 2));
			}),
		);
	}

	async exportCredentialsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.credentialExportFolder]);
			const credentialIds = candidates.map((e) => e.id);
			const ownerProjects =
				await this.sharedCredentialsRepository.findOwnerProjectsByCredentialIds(credentialIds);
			const ownerEmails = await this.getPersonalOwnerEmails(ownerProjects.values());
			const foundCredentialIds = new Set<string>();
			const files: ExportResult['files'] = [];

			for (const credentialIdChunk of chunk(credentialIds, SOURCE_CONTROL_WRITE_FILE_BATCH_SIZE)) {
				const credentialsToBeExported = await this.sharedCredentialsRepository.findByCredentialIds(
					credentialIdChunk,
					'credential:owner',
				);
				await this.writeExportableCredentialsToExportFolder(
					credentialsToBeExported,
					ownerProjects,
					ownerEmails,
				);
				for (const sharing of credentialsToBeExported) {
					foundCredentialIds.add(sharing.credentialsId);
					files.push({
						id: sharing.credentials.id,
						name: path.join(this.credentialExportFolder, `${sharing.credentials.name}.json`),
					});
				}
			}

			let missingIds: string[] = [];
			if (foundCredentialIds.size !== credentialIds.length) {
				missingIds = credentialIds.filter((remote) => !foundCredentialIds.has(remote));
			}

			return {
				count: files.length,
				folder: this.credentialExportFolder,
				files,
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
