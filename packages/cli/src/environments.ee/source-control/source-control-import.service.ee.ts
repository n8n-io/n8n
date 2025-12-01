import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type {
	FindOptionsWhere,
	Project,
	TagEntity,
	User,
	Variables,
	WorkflowEntity,
	WorkflowTagMapping,
} from '@n8n/db';
import {
	CredentialsRepository,
	FolderRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	TagRepository,
	UserRepository,
	VariablesRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
	WorkflowPublishHistoryRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import glob from 'fast-glob';
import { Credentials, ErrorReporter, InstanceSettings } from 'n8n-core';
import { ensureError, jsonParse, UnexpectedError, UserError } from 'n8n-workflow';
import { readFile as fsReadFile } from 'node:fs/promises';
import path from 'path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialsService } from '@/credentials/credentials.service';
import type { IWorkflowToImport } from '@/interfaces';
import { isUniqueConstraintError } from '@/response-helper';
import { TagService } from '@/services/tag.service';
import { assertNever } from '@/utils';
import { WorkflowService } from '@/workflows/workflow.service';

import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_FOLDERS_EXPORT_FILE,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_PROJECT_EXPORT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import {
	getCredentialExportPath,
	getProjectExportPath,
	getWorkflowExportPath,
} from './source-control-helper.ee';
import { SourceControlScopedService } from './source-control-scoped.service';
import { VariablesService } from '../variables/variables.service.ee';
import type {
	ExportableCredential,
	StatusExportableCredential,
} from './types/exportable-credential';
import type { ExportableFolder } from './types/exportable-folders';
import type { ExportableProject, ExportableProjectWithFileName } from './types/exportable-project';
import type { ExportableTags } from './types/exportable-tags';
import { ExportableVariable } from './types/exportable-variable';
import type {
	RemoteResourceOwner,
	StatusResourceOwner,
	TeamResourceOwner,
} from './types/resource-owner';
import type { SourceControlContext } from './types/source-control-context';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';

const findOwnerProject = (
	owner: RemoteResourceOwner,
	accessibleProjects: Project[],
): Project | undefined => {
	if (typeof owner === 'string') {
		return accessibleProjects.find((project) =>
			project.projectRelations.some(
				(r) => r.role.slug === PROJECT_OWNER_ROLE_SLUG && r.user.email === owner,
			),
		);
	}
	if (owner.type === 'personal') {
		return accessibleProjects.find(
			(project) =>
				project.type === 'personal' &&
				project.projectRelations.some(
					(r) => r.role.slug === PROJECT_OWNER_ROLE_SLUG && r.user.email === owner.personalEmail,
				),
		);
	}
	return accessibleProjects.find(
		(project) => project.type === 'team' && project.id === owner.teamId,
	);
};

const getOwnerFromProject = (remoteOwnerProject: Project): StatusResourceOwner | undefined => {
	let owner: StatusResourceOwner | undefined = undefined;

	if (remoteOwnerProject?.type === 'personal') {
		const personalEmail = remoteOwnerProject.projectRelations?.find(
			(r) => r.role.slug === PROJECT_OWNER_ROLE_SLUG,
		)?.user?.email;

		if (personalEmail) {
			owner = {
				type: 'personal',
				projectId: remoteOwnerProject.id,
				projectName: remoteOwnerProject.name,
			};
		}
	} else if (remoteOwnerProject?.type === 'team') {
		owner = {
			type: 'team',
			projectId: remoteOwnerProject.id,
			projectName: remoteOwnerProject.name,
		};
	}
	return owner;
};

@Service()
export class SourceControlImportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	private projectExportFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly variablesService: VariablesService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly tagRepository: TagRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly userRepository: UserRepository,
		private readonly variablesRepository: VariablesRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly workflowService: WorkflowService,
		private readonly credentialsService: CredentialsService,
		private readonly tagService: TagService,
		private readonly folderRepository: FolderRepository,
		instanceSettings: InstanceSettings,
		private readonly sourceControlScopedService: SourceControlScopedService,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
		this.projectExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_PROJECT_EXPORT_FOLDER);
	}

	async getRemoteVersionIdsFromFiles(
		context: SourceControlContext,
	): Promise<SourceControlWorkflowVersionId[]> {
		const remoteWorkflowFiles = await glob('*.json', {
			cwd: this.workflowExportFolder,
			absolute: true,
		});

		const accessibleProjects =
			await this.sourceControlScopedService.getAuthorizedProjectsFromContext(context);

		const remoteWorkflowsRead = await Promise.all(
			remoteWorkflowFiles.map(async (file) => await this.parseWorkflowFromFile(file)),
		);

		const remoteWorkflowFilesParsed = remoteWorkflowsRead
			.filter((remote) => {
				if (!remote?.id) {
					return false;
				}
				return (
					context.hasAccessToAllProjects() ||
					(remote.owner && findOwnerProject(remote.owner, accessibleProjects))
				);
			})
			.map((remote) => {
				const project = remote.owner
					? findOwnerProject(remote.owner, accessibleProjects)
					: undefined;
				return {
					id: remote.id,
					versionId: remote.versionId ?? '',
					name: remote.name,
					parentFolderId: remote.parentFolderId,
					remoteId: remote.id,
					filename: getWorkflowExportPath(remote.id, this.workflowExportFolder),
					owner: project ? getOwnerFromProject(project) : undefined,
				};
			});

		return remoteWorkflowFilesParsed;
	}

	async getAllLocalVersionIdsFromDb(): Promise<SourceControlWorkflowVersionId[]> {
		const localWorkflows = await this.workflowRepository.find({
			relations: ['parentFolder'],
			select: {
				id: true,
				versionId: true,
				name: true,
				updatedAt: true,
				parentFolder: {
					id: true,
				},
			},
		});
		return localWorkflows.map((local) => {
			let updatedAt: Date;
			if (local.updatedAt instanceof Date) {
				updatedAt = local.updatedAt;
			} else {
				this.errorReporter.warn('updatedAt is not a Date', {
					extra: {
						type: typeof local.updatedAt,
						value: local.updatedAt,
					},
				});
				updatedAt = isNaN(Date.parse(local.updatedAt)) ? new Date() : new Date(local.updatedAt);
			}
			return {
				id: local.id,
				versionId: local.versionId,
				name: local.name,
				localId: local.id,
				parentFolderId: local.parentFolder?.id ?? null,
				filename: getWorkflowExportPath(local.id, this.workflowExportFolder),
				updatedAt: updatedAt.toISOString(),
			};
		}) as SourceControlWorkflowVersionId[];
	}

	async getLocalVersionIdsFromDb(
		context: SourceControlContext,
	): Promise<SourceControlWorkflowVersionId[]> {
		const localWorkflows = await this.workflowRepository.find({
			relations: {
				parentFolder: true,
				shared: {
					project: {
						projectRelations: {
							user: true,
							role: true,
						},
					},
				},
			},
			select: {
				id: true,
				versionId: true,
				name: true,
				updatedAt: true,
				parentFolder: {
					id: true,
				},
				shared: {
					project: {
						id: true,
						name: true,
						type: true,
						projectRelations: {
							// Even if the userId is not used, it seems that this is needed to get the other nested properties populated
							userId: true,
							role: {
								slug: true,
							},
							user: {
								email: true,
							},
						},
					},
					role: true,
				},
			},
			where: this.sourceControlScopedService.getWorkflowsInAdminProjectsFromContextFilter(context),
		});

		return localWorkflows.map((local) => {
			let updatedAt: Date;
			if (local.updatedAt instanceof Date) {
				updatedAt = local.updatedAt;
			} else {
				this.errorReporter.warn('updatedAt is not a Date', {
					extra: {
						type: typeof local.updatedAt,
						value: local.updatedAt,
					},
				});
				updatedAt = isNaN(Date.parse(local.updatedAt)) ? new Date() : new Date(local.updatedAt);
			}

			const remoteOwnerProject = local.shared?.find((s) => s.role === 'workflow:owner')?.project;

			return {
				id: local.id,
				versionId: local.versionId,
				name: local.name,
				localId: local.id,
				parentFolderId: local.parentFolder?.id ?? null,
				filename: getWorkflowExportPath(local.id, this.workflowExportFolder),
				updatedAt: updatedAt.toISOString(),
				owner: remoteOwnerProject ? getOwnerFromProject(remoteOwnerProject) : undefined,
			};
		});
	}

	async getRemoteCredentialsFromFiles(
		context: SourceControlContext,
	): Promise<StatusExportableCredential[]> {
		const remoteCredentialFiles = await glob('*.json', {
			cwd: this.credentialExportFolder,
			absolute: true,
		});

		const accessibleProjects =
			await this.sourceControlScopedService.getAuthorizedProjectsFromContext(context);

		const remoteCredentialFilesRead = await Promise.all(
			remoteCredentialFiles.map(async (file) => {
				this.logger.debug(`Parsing credential file ${file}`);
				const remote = jsonParse<ExportableCredential>(
					await fsReadFile(file, { encoding: 'utf8' }),
				);
				return remote;
			}),
		);

		const remoteCredentialFilesParsed = remoteCredentialFilesRead
			.filter((remote) => {
				if (!remote?.id) {
					return false;
				}
				const owner = remote.ownedBy;
				// The credential `remote` belongs not to a project, that the context has access to
				return (
					!owner || context.hasAccessToAllProjects() || findOwnerProject(owner, accessibleProjects)
				);
			})
			.map((remote) => {
				const project = remote.ownedBy
					? findOwnerProject(remote.ownedBy, accessibleProjects)
					: null;
				return {
					...remote,
					ownedBy: project
						? {
								type: project.type,
								projectId: project.id,
								projectName: project.name,
							}
						: undefined,
					filename: getCredentialExportPath(remote.id, this.credentialExportFolder),
				};
			});

		return remoteCredentialFilesParsed.filter(
			(e) => e !== undefined,
		) as StatusExportableCredential[];
	}

	async getLocalCredentialsFromDb(
		context: SourceControlContext,
	): Promise<StatusExportableCredential[]> {
		const localCredentials = await this.credentialsRepository.find({
			relations: {
				shared: {
					project: {
						projectRelations: {
							user: true,
							role: true,
						},
					},
				},
			},
			select: {
				id: true,
				name: true,
				type: true,
				isGlobal: true,
				shared: {
					project: {
						id: true,
						name: true,
						type: true,
						projectRelations: {
							// Even if the userId is not used, it seems that this is needed to get the other nested properties populated
							userId: true,
							role: {
								slug: true,
							},
							user: {
								email: true,
							},
						},
					},
					role: true,
				},
			},
			where:
				this.sourceControlScopedService.getCredentialsInAdminProjectsFromContextFilter(context),
		});
		return localCredentials.map((local) => {
			const remoteOwnerProject = local.shared?.find((s) => s.role === 'credential:owner')?.project;
			return {
				id: local.id,
				name: local.name,
				type: local.type,
				filename: getCredentialExportPath(local.id, this.credentialExportFolder),
				ownedBy: remoteOwnerProject ? getOwnerFromProject(remoteOwnerProject) : undefined,
				isGlobal: local.isGlobal,
			};
		}) as StatusExportableCredential[];
	}

	async getRemoteVariablesFromFile(): Promise<ExportableVariable[]> {
		const variablesFile = await glob(SOURCE_CONTROL_VARIABLES_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (variablesFile.length > 0) {
			this.logger.debug(`Importing variables from file ${variablesFile[0]}`);
			return jsonParse<ExportableVariable[]>(
				await fsReadFile(variablesFile[0], { encoding: 'utf8' }),
				{
					fallbackValue: [],
				},
			);
		}
		return [];
	}

	async getLocalGlobalVariablesFromDb(): Promise<Variables[]> {
		return await this.variablesService.getAllCached({ globalOnly: true });
	}

	async getRemoteFoldersAndMappingsFromFile(context: SourceControlContext): Promise<{
		folders: ExportableFolder[];
	}> {
		const foldersFile = await glob(SOURCE_CONTROL_FOLDERS_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (foldersFile.length > 0) {
			this.logger.debug(`Importing folders from file ${foldersFile[0]}`);
			const mappedFolders = jsonParse<{
				folders: ExportableFolder[];
			}>(await fsReadFile(foldersFile[0], { encoding: 'utf8' }), {
				fallbackValue: { folders: [] },
			});

			const accessibleProjects =
				await this.sourceControlScopedService.getAuthorizedProjectsFromContext(context);

			mappedFolders.folders = mappedFolders.folders.filter(
				(folder) =>
					context.hasAccessToAllProjects() ||
					accessibleProjects.some((project) => project.id === folder.homeProjectId),
			);

			return mappedFolders;
		}
		return { folders: [] };
	}

	async getLocalFoldersAndMappingsFromDb(context: SourceControlContext): Promise<{
		folders: ExportableFolder[];
	}> {
		const localFolders = await this.folderRepository.find({
			relations: ['parentFolder', 'homeProject'],
			select: {
				id: true,
				name: true,
				createdAt: true,
				updatedAt: true,
				parentFolder: { id: true },
				homeProject: { id: true },
			},
			where: this.sourceControlScopedService.getFoldersInAdminProjectsFromContextFilter(context),
		});

		return {
			folders: localFolders.map((f) => ({
				id: f.id,
				name: f.name,
				parentFolderId: f.parentFolder?.id ?? null,
				homeProjectId: f.homeProject.id,
				createdAt: f.createdAt.toISOString(),
				updatedAt: f.updatedAt.toISOString(),
			})),
		};
	}

	async getRemoteTagsAndMappingsFromFile(context: SourceControlContext): Promise<ExportableTags> {
		const tagsFile = await glob(SOURCE_CONTROL_TAGS_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (tagsFile.length > 0) {
			this.logger.debug(`Importing tags from file ${tagsFile[0]}`);
			const mappedTags = jsonParse<ExportableTags>(
				await fsReadFile(tagsFile[0], { encoding: 'utf8' }),
				{ fallbackValue: { tags: [], mappings: [] } },
			);

			const accessibleWorkflows =
				await this.sourceControlScopedService.getWorkflowsInAdminProjectsFromContext(context);

			if (accessibleWorkflows) {
				mappedTags.mappings = mappedTags.mappings.filter((mapping) =>
					accessibleWorkflows.some((workflow) => workflow.id === mapping.workflowId),
				);
			}

			return mappedTags;
		}
		return { tags: [], mappings: [] };
	}

	async getLocalTagsAndMappingsFromDb(context: SourceControlContext): Promise<{
		tags: TagEntity[];
		mappings: WorkflowTagMapping[];
	}> {
		const localTags = await this.tagRepository.find({
			select: ['id', 'name'],
		});
		const localMappings = await this.workflowTagMappingRepository.find({
			select: ['workflowId', 'tagId'],
			where:
				this.sourceControlScopedService.getWorkflowTagMappingInAdminProjectsFromContextFilter(
					context,
				),
		});
		return { tags: localTags, mappings: localMappings };
	}

	/**
	 * Reads projects from the git work folder and returns the projects that are accessible to the context user
	 */
	async getRemoteProjectsFromFiles(
		context: SourceControlContext,
	): Promise<ExportableProjectWithFileName[]> {
		const remoteProjectFiles = await glob('*.json', {
			cwd: this.projectExportFolder,
			absolute: true,
		});

		const remoteProjects = await Promise.all(
			remoteProjectFiles.map(async (file) => {
				this.logger.debug(`Parsing project file ${file}`);
				const fileContent = await fsReadFile(file, { encoding: 'utf8' });
				const parsedProject = jsonParse<ExportableProject>(fileContent);

				return {
					...parsedProject,
					filename: getProjectExportPath(parsedProject.id, this.projectExportFolder),
				};
			}),
		);

		if (context.hasAccessToAllProjects()) {
			return remoteProjects;
		}

		const accessibleProjects =
			await this.sourceControlScopedService.getAuthorizedProjectsFromContext(context);

		return remoteProjects.filter((remoteProject) => {
			return findOwnerProject(remoteProject.owner, accessibleProjects);
		});
	}

	/**
	 * Fetches team projects from the database that are accessible to the context user
	 * If context is not provided, it will return all team projects, regardless of the context user's access
	 */
	async getLocalTeamProjectsFromDb(
		context?: SourceControlContext,
	): Promise<ExportableProjectWithFileName[]> {
		let where: FindOptionsWhere<Project> = { type: 'team' };

		if (context) {
			where = {
				type: 'team',
				...(this.sourceControlScopedService.getProjectsWithPushScopeByContextFilter(context) ?? {}),
			};
		}

		const localProjects = await this.projectRepository.find({
			select: ['id', 'name', 'description', 'icon', 'type'],
			relations: ['variables'],
			where,
		});

		return localProjects.map((local) =>
			this.mapProjectEntityToExportableProjectWithFileName(local),
		);
	}

	private mapProjectEntityToExportableProjectWithFileName(
		project: Project,
	): ExportableProjectWithFileName {
		return {
			id: project.id,
			name: project.name,
			description: project.description,
			icon: project.icon,
			filename: getProjectExportPath(project.id, this.projectExportFolder),
			type: 'team', // This is safe because we only select team projects
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
	}

	async importWorkflowFromWorkFolder(candidates: SourceControlledFile[], userId: string) {
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(userId);
		const candidateIds = candidates.map((c) => c.id);
		const existingWorkflows = await this.workflowRepository.findByIds(candidateIds, {
			fields: ['id', 'name', 'versionId', 'active', 'activeVersionId'],
		});

		const folders = await this.folderRepository.find({ select: ['id'] });
		const existingFolderIds = folders.map((f) => f.id);

		const allSharedWorkflows = await this.sharedWorkflowRepository.findWithFields(candidateIds, {
			select: ['workflowId', 'role', 'projectId'],
		});
		const importWorkflowsResult = [];

		// Due to SQLite concurrency issues, we cannot save all workflows at once
		// as project creation might cause constraint issues.
		// We must iterate over the array and run the whole process workflow by workflow
		for (const candidate of candidates) {
			this.logger.debug(`Parsing workflow file ${candidate.file}`);

			const importedWorkflow = await this.parseWorkflowFromFile(candidate.file);

			if (!importedWorkflow?.id) {
				continue;
			}
			const existingWorkflow = existingWorkflows.find((e) => e.id === importedWorkflow.id);

			// Workflow's active status is not saved in the remote workflow files, and the field is missing despite
			// IWorkflowToImport having it typed as boolean. Imported workflows are always inactive if they are new,
			// and existing workflows use the existing workflow's active status unless they have been archived on the remote.
			// In that case, we deactivate the existing workflow on pull and turn it archived.
			if (existingWorkflow) {
				if (importedWorkflow.isArchived) {
					importedWorkflow.active = false;
					importedWorkflow.activeVersionId = null;
				} else {
					importedWorkflow.active = !!existingWorkflow.activeVersionId;
					importedWorkflow.activeVersionId = existingWorkflow.activeVersionId;
				}
			} else {
				importedWorkflow.active = false;
				importedWorkflow.activeVersionId = null;
			}

			const parentFolderId = importedWorkflow.parentFolderId ?? '';

			this.logger.debug(`Updating workflow id ${importedWorkflow.id ?? 'new'}`);

			const upsertResult = await this.workflowRepository.upsert(
				{
					...importedWorkflow,
					parentFolder: existingFolderIds.includes(parentFolderId) ? { id: parentFolderId } : null,
				},
				['id'],
			);
			if (upsertResult?.identifiers?.length !== 1) {
				throw new UnexpectedError('Failed to upsert workflow', {
					extra: { workflowId: importedWorkflow.id ?? 'new' },
				});
			}

			const localOwner = allSharedWorkflows.find(
				(w) => w.workflowId === importedWorkflow.id && w.role === 'workflow:owner',
			);

			await this.syncResourceOwnership({
				resourceId: importedWorkflow.id,
				remoteOwner: importedWorkflow.owner,
				localOwner,
				fallbackProject: personalProject,
				repository: this.sharedWorkflowRepository,
			});

			await this.activateImportedWorkflowIfAlreadyActive(
				{ existingWorkflow, importedWorkflow },
				userId,
			);

			importWorkflowsResult.push({
				id: importedWorkflow.id ?? 'unknown',
				name: candidate.file,
			});
		}

		return importWorkflowsResult.filter((e) => e !== undefined) as Array<{
			id: string;
			name: string;
		}>;
	}

	private async parseWorkflowFromFile(file: string): Promise<IWorkflowToImport> {
		this.logger.debug(`Parsing workflow file ${file}`);
		try {
			const fileContent = await fsReadFile(file, { encoding: 'utf8' });
			return jsonParse<IWorkflowToImport>(fileContent);
		} catch (error) {
			this.logger.error(`Failed to parse workflow file ${file}`, { error });
			throw new UnexpectedError(
				`Failed to parse workflow file ${file}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async activateImportedWorkflowIfAlreadyActive(
		{
			existingWorkflow,
			importedWorkflow,
		}: {
			existingWorkflow?: WorkflowEntity;
			importedWorkflow: IWorkflowToImport;
		},
		userId: string,
	) {
		if (!existingWorkflow?.activeVersionId) return;
		let didAdd = false;
		try {
			// remove active pre-import workflow
			this.logger.debug(`Deactivating workflow id ${existingWorkflow.id}`);
			await this.activeWorkflowManager.remove(existingWorkflow.id);

			if (importedWorkflow.activeVersionId) {
				// try activating the imported workflow
				this.logger.debug(`Reactivating workflow id ${existingWorkflow.id}`);
				await this.activeWorkflowManager.add(existingWorkflow.id, 'activate');
				didAdd = true;
			}
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(`Failed to activate workflow ${existingWorkflow.id}`, { error });
		} finally {
			// update the versionId of the workflow to match the imported workflow
			await this.workflowRepository.update(
				{ id: existingWorkflow.id },
				{ versionId: importedWorkflow.versionId },
			);
			if (didAdd) {
				await this.workflowPublishHistoryRepository.addRecord({
					workflowId: existingWorkflow.id,
					versionId: existingWorkflow.activeVersionId,
					event: 'activated',
					userId,
				});
			} else {
				await this.workflowPublishHistoryRepository.addRecord({
					workflowId: existingWorkflow.id,
					versionId: existingWorkflow.activeVersionId,
					event: 'deactivated',
					userId,
				});
			}
		}
	}

	async importCredentialsFromWorkFolder(candidates: SourceControlledFile[], userId: string) {
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(userId);
		const candidateIds = candidates.map((c) => c.id);
		const existingCredentials = await this.credentialsRepository.find({
			where: {
				id: In(candidateIds),
			},
			select: ['id', 'name', 'type', 'data'],
		});
		const existingSharedCredentials = await this.sharedCredentialsRepository.find({
			select: ['credentialsId', 'projectId', 'role'],
			where: {
				credentialsId: In(candidateIds),
				role: 'credential:owner',
			},
		});

		let importCredentialsResult: Array<{ id: string; name: string; type: string }> = [];
		importCredentialsResult = await Promise.all(
			candidates.map(async (candidate) => {
				this.logger.debug(`Importing credentials file ${candidate.file}`);
				const credential = jsonParse<ExportableCredential>(
					await fsReadFile(candidate.file, { encoding: 'utf8' }),
				);
				const existingCredential = existingCredentials.find(
					(e) => e.id === credential.id && e.type === credential.type,
				);

				const { name, type, data, id, isGlobal = false } = credential;
				const newCredentialObject = new Credentials({ id, name }, type);
				if (existingCredential?.data) {
					newCredentialObject.data = existingCredential.data;
				} else {
					/**
					 * Edge case: Do not import `oauthTokenData`, so that that the
					 * pulling instance reconnects instead of trying to use stubbed values.
					 */
					const { oauthTokenData, ...rest } = data;
					newCredentialObject.setData(rest);
				}

				this.logger.debug(`Updating credential id ${newCredentialObject.id as string}`);
				await this.credentialsRepository.upsert({ ...newCredentialObject, isGlobal }, ['id']);

				const localOwner = existingSharedCredentials.find(
					(c) => c.credentialsId === credential.id && c.role === 'credential:owner',
				);

				await this.syncResourceOwnership({
					resourceId: credential.id,
					remoteOwner: credential.ownedBy,
					localOwner,
					fallbackProject: personalProject,
					repository: this.sharedCredentialsRepository,
				});

				return {
					id: newCredentialObject.id as string,
					name: newCredentialObject.name,
					type: newCredentialObject.type,
				};
			}),
		);
		return importCredentialsResult.filter((e) => e !== undefined);
	}

	async importTagsFromWorkFolder(candidate: SourceControlledFile) {
		let mappedTags;
		try {
			this.logger.debug(`Importing tags from file ${candidate.file}`);
			mappedTags = jsonParse<{ tags: TagEntity[]; mappings: WorkflowTagMapping[] }>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
				{ fallbackValue: { tags: [], mappings: [] } },
			);
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(`Failed to import tags from file ${candidate.file}`, { error });
			return;
		}

		if (mappedTags.mappings.length === 0 && mappedTags.tags.length === 0) {
			return;
		}

		const existingWorkflowIds = new Set(
			(
				await this.workflowRepository.find({
					select: ['id'],
				})
			).map((e) => e.id),
		);

		await Promise.all(
			mappedTags.tags.map(async (tag) => {
				const findByName = await this.tagRepository.findOne({
					where: { name: tag.name },
					select: ['id'],
				});
				if (findByName && findByName.id !== tag.id) {
					throw new UserError(
						`A tag with the name <strong>${tag.name}</strong> already exists locally.<br />Please either rename the local tag, or the remote one with the id <strong>${tag.id}</strong> in the tags.json file.`,
					);
				}

				const tagCopy = this.tagRepository.create(tag);
				await this.tagRepository.upsert(tagCopy, {
					skipUpdateIfNoValuesChanged: true,
					conflictPaths: { id: true },
				});
			}),
		);

		await Promise.all(
			mappedTags.mappings.map(async (mapping) => {
				if (!existingWorkflowIds.has(String(mapping.workflowId))) return;
				await this.workflowTagMappingRepository.upsert(
					{ tagId: String(mapping.tagId), workflowId: String(mapping.workflowId) },
					{
						skipUpdateIfNoValuesChanged: true,
						conflictPaths: { tagId: true, workflowId: true },
					},
				);
			}),
		);

		return mappedTags;
	}

	async importFoldersFromWorkFolder(user: User, candidate: SourceControlledFile) {
		let mappedFolders;
		const projects = await this.projectRepository.find();
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);

		try {
			this.logger.debug(`Importing folders from file ${candidate.file}`);
			mappedFolders = jsonParse<{
				folders: ExportableFolder[];
			}>(await fsReadFile(candidate.file, { encoding: 'utf8' }), {
				fallbackValue: { folders: [] },
			});
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(`Failed to import folders from file ${candidate.file}`, { error });
			return;
		}

		if (mappedFolders.folders.length === 0) {
			return;
		}

		await Promise.all(
			mappedFolders.folders.map(async (folder) => {
				const folderCopy = this.folderRepository.create({
					id: folder.id,
					name: folder.name,
					homeProject: {
						id: projects.find((p) => p.id === folder.homeProjectId)?.id ?? personalProject.id,
					},
				});

				await this.folderRepository.upsert(folderCopy, {
					skipUpdateIfNoValuesChanged: true,
					conflictPaths: { id: true },
				});
			}),
		);

		// After folders are created, setup the parentFolder relationship
		await Promise.all(
			mappedFolders.folders.map(async (folder) => {
				await this.folderRepository.update(
					{ id: folder.id },
					{
						parentFolder: folder.parentFolderId ? { id: folder.parentFolderId } : null,
						createdAt: folder.createdAt,
						updatedAt: folder.updatedAt,
					},
				);
			}),
		);

		return mappedFolders;
	}

	async importVariables(
		variables: ExportableVariable[],
		valueOverrides?: {
			[key: string]: string;
		},
	) {
		const result: { imported: string[] } = { imported: [] };
		const overriddenKeys = Object.keys(valueOverrides ?? {});

		for (const variable of variables) {
			if (!variable.key) {
				continue;
			}
			if (overriddenKeys.includes(variable.key) && valueOverrides) {
				variable.value = valueOverrides[variable.key];
				overriddenKeys.splice(overriddenKeys.indexOf(variable.key), 1);
			}
			try {
				// by default no value is stored remotely, so an empty string is returned
				// it must be changed to undefined so as to not overwrite existing values!
				const variableToUpsert = {
					...variable,
					value: variable.value === '' ? undefined : variable.value,
					project: variable.projectId ? { id: variable.projectId } : null,
				};

				await this.variablesRepository.upsert(variableToUpsert, ['id']);
			} catch (errorUpsert) {
				if (isUniqueConstraintError(errorUpsert as Error)) {
					this.logger.debug(`Variable ${variable.key} already exists, updating instead`);
					try {
						await this.variablesRepository.update({ key: variable.key }, { ...variable });
					} catch (errorUpdate) {
						this.logger.debug(`Failed to update variable ${variable.key}, skipping`);
						this.logger.debug((errorUpdate as Error).message);
					}
				}
			} finally {
				result.imported.push(variable.key);
			}
		}

		// add remaining overrides as new variables
		if (overriddenKeys.length > 0 && valueOverrides) {
			for (const key of overriddenKeys) {
				result.imported.push(key);
				const newVariable = this.variablesRepository.create({
					key,
					value: valueOverrides[key],
				});
				await this.variablesRepository.save(newVariable, { transaction: false });
			}
		}

		await this.variablesService.updateCache();

		return result;
	}

	async importVariablesFromWorkFolder(
		candidate: SourceControlledFile,
		valueOverrides?: {
			[key: string]: string;
		},
	) {
		let importedVariables;
		try {
			this.logger.debug(`Importing variables from file ${candidate.file}`);
			importedVariables = jsonParse<ExportableVariable[]>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
				{ fallbackValue: [] },
			);
		} catch (e) {
			this.logger.error(`Failed to import tags from file ${candidate.file}`, { error: e });
			return;
		}

		return await this.importVariables(importedVariables, valueOverrides);
	}

	/**
	 * Reads project files candidates from the work folder and imports them into the database.
	 *
	 * Only team projects are supported.
	 * Personal project are not supported because they are not stable across instances
	 * (different ids across instances).
	 */
	async importTeamProjectsFromWorkFolder(candidates: SourceControlledFile[]) {
		const importResults = [];
		const existingProjectVariables = (await this.variablesService.getAllCached()).filter(
			(v) => v.project,
		);

		for (const candidate of candidates) {
			try {
				this.logger.debug(`Importing project file ${candidate.file}`);
				const project = jsonParse<ExportableProject>(
					await fsReadFile(candidate.file, { encoding: 'utf8' }),
				);

				// Ensure that only team owned projects are imported as we can't resolve owners for personal projects
				// This is a safety check as only team owned projects should be exported in the first place
				if (
					typeof project.owner !== 'object' ||
					project.owner.type !== 'team' ||
					project.owner.teamId !== project.id
				) {
					this.logger.warn(`Project ${project.id} has inconsistent owner data, skipping`);
					continue;
				}

				// Upsert team project with metadata only
				await this.projectRepository.upsert(
					{
						id: project.id,
						name: project.name,
						icon: project.icon,
						description: project.description,
						type: 'team',
					},
					['id'],
				);

				await this.importVariables(
					project.variableStubs?.map((v) => ({ ...v, projectId: project.id })) ?? [],
				);

				// Delete variables that existed before but are no longer present in the imported project
				const deletedVariables = existingProjectVariables.filter(
					(v) =>
						v.project!.id === project.id && !project.variableStubs?.some((vs) => vs.id === v.id),
				);
				await this.variablesService.deleteByIds(deletedVariables.map((v) => v.id));

				this.logger.info(`Imported team project: ${project.name}`);
				importResults.push({
					id: project.id,
					name: project.name,
				});
			} catch (error) {
				const errorMessage = ensureError(error);
				this.logger.error(`Failed to import project from file ${candidate.file}`, {
					error: errorMessage,
				});
			}
		}

		return importResults;
	}

	async deleteWorkflowsNotInWorkfolder(user: User, candidates: SourceControlledFile[]) {
		for (const candidate of candidates) {
			await this.workflowService.delete(user, candidate.id, true);
		}
	}

	async deleteCredentialsNotInWorkfolder(user: User, candidates: SourceControlledFile[]) {
		for (const candidate of candidates) {
			await this.credentialsService.delete(user, candidate.id);
		}
	}

	async deleteVariablesNotInWorkfolder(candidates: SourceControlledFile[]) {
		for (const candidate of candidates) {
			await this.variablesService.delete(candidate.id);
		}
	}

	async deleteTagsNotInWorkfolder(candidates: SourceControlledFile[]) {
		for (const candidate of candidates) {
			await this.tagService.delete(candidate.id);
		}
	}

	async deleteFoldersNotInWorkfolder(candidates: SourceControlledFile[]) {
		if (candidates.length === 0) {
			return;
		}
		const candidateIds = candidates.map((c) => c.id);

		await this.folderRepository.delete({
			id: In(candidateIds),
		});
	}

	async deleteTeamProjectsNotInWorkfolder(candidates: SourceControlledFile[]) {
		if (candidates.length === 0) {
			return;
		}
		const candidateIds = candidates.map((c) => c.id);

		await this.projectRepository.delete({
			id: In(candidateIds),
		});
	}

	/**
	 * Syncs ownership of a resource (workflow or credential) during import.
	 * Handles ownership transfer by removing old ownership and assigning new ownership.
	 */
	private async syncResourceOwnership({
		resourceId,
		remoteOwner,
		localOwner,
		fallbackProject,
		repository,
	}: {
		resourceId: string;
		remoteOwner: RemoteResourceOwner | null | undefined;
		localOwner: { projectId: string } | undefined;
		fallbackProject: Project;
		repository: SharedWorkflowRepository | SharedCredentialsRepository;
	}): Promise<void> {
		let targetOwnerProject = await this.findOwnerProjectInLocalDb(remoteOwner ?? undefined);
		if (!targetOwnerProject) {
			const isSharedResource =
				remoteOwner && typeof remoteOwner !== 'string' && remoteOwner.type === 'team';

			targetOwnerProject = isSharedResource
				? await this.createTeamProject(remoteOwner)
				: fallbackProject;
		}

		const trx = this.workflowRepository.manager;

		// remove old ownership if it changed
		const shouldRemoveOldOwner = localOwner && localOwner.projectId !== targetOwnerProject.id;
		if (shouldRemoveOldOwner) {
			await repository.deleteByIds([resourceId], localOwner.projectId, trx);
		}

		// Set new ownership
		await repository.makeOwner([resourceId], targetOwnerProject.id, trx);
	}

	private async findOwnerProjectInLocalDb(owner: RemoteResourceOwner | IWorkflowToImport['owner']) {
		if (!owner) {
			return null;
		}

		if (typeof owner === 'string' || owner.type === 'personal') {
			const email = typeof owner === 'string' ? owner : owner.personalEmail;
			const user = await this.userRepository.findOne({ where: { email } });

			if (!user) {
				return null;
			}

			return await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
		} else if (owner.type === 'team') {
			return await this.projectRepository.findOne({
				where: { id: owner.teamId },
			});
		}

		assertNever(owner);

		const errorOwner = owner as RemoteResourceOwner;
		throw new UnexpectedError(
			`Unknown resource owner type "${
				typeof errorOwner !== 'string' ? errorOwner.type : 'UNKNOWN'
			}" found when finding owner project`,
		);
	}

	private async createTeamProject(owner: TeamResourceOwner) {
		let teamProject: Project | null = null;

		try {
			teamProject = await this.projectRepository.save(
				this.projectRepository.create({
					id: owner.teamId,
					name: owner.teamName,
					type: 'team',
				}),
			);
		} catch (error) {
			// Workaround to handle the race condition where another worker created the project
			// between our check and insert
			teamProject = await this.projectRepository.findOne({
				where: { id: owner.teamId },
			});

			if (!teamProject) {
				throw error;
			}
		}

		return teamProject;
	}
}
