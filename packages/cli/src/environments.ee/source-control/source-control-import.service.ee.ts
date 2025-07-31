import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { Variables, Project, TagEntity, User, WorkflowTagMapping } from '@n8n/db';
import {
	SharedCredentials,
	CredentialsRepository,
	FolderRepository,
	ProjectRepository,
	TagRepository,
	VariablesRepository,
	WorkflowTagMappingRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import glob from 'fast-glob';
import { Credentials, ErrorReporter, InstanceSettings } from 'n8n-core';
import { jsonParse, ensureError, UserError, UnexpectedError } from 'n8n-workflow';
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
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import { getCredentialExportPath, getWorkflowExportPath } from './source-control-helper.ee';
import { SourceControlScopedService } from './source-control-scoped.service';
import type {
	ExportableCredential,
	StatusExportableCredential,
} from './types/exportable-credential';
import type { ExportableFolder } from './types/exportable-folders';
import type { ExportableTags } from './types/exportable-tags';
import type { StatusResourceOwner, RemoteResourceOwner } from './types/resource-owner';
import type { SourceControlContext } from './types/source-control-context';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';
import { VariablesService } from '../variables/variables.service.ee';

const findOwnerProject = (
	owner: RemoteResourceOwner,
	accessibleProjects: Project[],
): Project | undefined => {
	if (typeof owner === 'string') {
		return accessibleProjects.find((project) =>
			project.projectRelations.some(
				(r) => r.role === 'project:personalOwner' && r.user.email === owner,
			),
		);
	}
	if (owner.type === 'personal') {
		return accessibleProjects.find(
			(project) =>
				project.type === 'personal' &&
				project.projectRelations.some(
					(r) => r.role === 'project:personalOwner' && r.user.email === owner.personalEmail,
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
			(r) => r.role === 'project:personalOwner',
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
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}

	async getRemoteVersionIdsFromFiles(
		context: SourceControlContext,
	): Promise<SourceControlWorkflowVersionId[]> {
		const remoteWorkflowFiles = await glob('*.json', {
			cwd: this.workflowExportFolder,
			absolute: true,
		});

		const accessibleProjects =
			await this.sourceControlScopedService.getAdminProjectsFromContext(context);

		const remoteWorkflowsRead = await Promise.all(
			remoteWorkflowFiles.map(async (file) => {
				this.logger.debug(`Parsing workflow file ${file}`);
				return jsonParse<IWorkflowToImport>(await fsReadFile(file, { encoding: 'utf8' }));
			}),
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
							role: true,
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
			await this.sourceControlScopedService.getAdminProjectsFromContext(context);

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
						},
					},
				},
			},
			select: {
				id: true,
				name: true,
				type: true,
				shared: {
					project: {
						id: true,
						name: true,
						type: true,
						projectRelations: {
							role: true,
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
			};
		}) as StatusExportableCredential[];
	}

	async getRemoteVariablesFromFile(): Promise<Variables[]> {
		const variablesFile = await glob(SOURCE_CONTROL_VARIABLES_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (variablesFile.length > 0) {
			this.logger.debug(`Importing variables from file ${variablesFile[0]}`);
			return jsonParse<Variables[]>(await fsReadFile(variablesFile[0], { encoding: 'utf8' }), {
				fallbackValue: [],
			});
		}
		return [];
	}

	async getLocalVariablesFromDb(): Promise<Variables[]> {
		return await this.variablesService.getAllCached();
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
				await this.sourceControlScopedService.getAdminProjectsFromContext(context);

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

	async importWorkflowFromWorkFolder(candidates: SourceControlledFile[], userId: string) {
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(userId);
		const workflowManager = this.activeWorkflowManager;
		const candidateIds = candidates.map((c) => c.id);
		const existingWorkflows = await this.workflowRepository.findByIds(candidateIds, {
			fields: ['id', 'name', 'versionId', 'active'],
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
			const importedWorkflow = jsonParse<IWorkflowToImport>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
			);
			if (!importedWorkflow?.id) {
				continue;
			}
			const existingWorkflow = existingWorkflows.find((e) => e.id === importedWorkflow.id);

			// Workflow's active status is not saved in the remote workflow files, and the field is missing despite
			// IWorkflowToImport having it typed as boolean. Imported workflows are always inactive if they are new,
			// and existing workflows use the existing workflow's active status unless they have been archived on the remote.
			// In that case, we deactivate the existing workflow on pull and turn it archived.
			importedWorkflow.active = existingWorkflow
				? existingWorkflow.active && !importedWorkflow.isArchived
				: false;

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

			const isOwnedLocally = allSharedWorkflows.some(
				(w) => w.workflowId === importedWorkflow.id && w.role === 'workflow:owner',
			);

			if (!isOwnedLocally) {
				const remoteOwnerProject: Project | null = importedWorkflow.owner
					? await this.findOrCreateOwnerProject(importedWorkflow.owner)
					: null;

				await this.sharedWorkflowRepository.upsert(
					{
						workflowId: importedWorkflow.id,
						projectId: remoteOwnerProject?.id ?? personalProject.id,
						role: 'workflow:owner',
					},
					['workflowId', 'projectId'],
				);
			}

			if (existingWorkflow?.active) {
				try {
					// remove active pre-import workflow
					this.logger.debug(`Deactivating workflow id ${existingWorkflow.id}`);
					await workflowManager.remove(existingWorkflow.id);

					if (importedWorkflow.active) {
						// try activating the imported workflow
						this.logger.debug(`Reactivating workflow id ${existingWorkflow.id}`);
						await workflowManager.add(existingWorkflow.id, 'activate');
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
				}
			}

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
			select: ['credentialsId', 'role'],
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

				const { name, type, data, id } = credential;
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
				await this.credentialsRepository.upsert(newCredentialObject, ['id']);

				const isOwnedLocally = existingSharedCredentials.some(
					(c) => c.credentialsId === credential.id && c.role === 'credential:owner',
				);

				if (!isOwnedLocally) {
					const remoteOwnerProject: Project | null = credential.ownedBy
						? await this.findOrCreateOwnerProject(credential.ownedBy)
						: null;

					const newSharedCredential = new SharedCredentials();
					newSharedCredential.credentialsId = newCredentialObject.id as string;
					newSharedCredential.projectId = remoteOwnerProject?.id ?? personalProject.id;
					newSharedCredential.role = 'credential:owner';

					// @ts-ignore CAT-957
					await this.sharedCredentialsRepository.upsert({ ...newSharedCredential }, [
						'credentialsId',
						'projectId',
					]);
				}

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
				// @ts-ignore CAT-957
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

				// @ts-ignore CAT-957
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

	async importVariablesFromWorkFolder(
		candidate: SourceControlledFile,
		valueOverrides?: {
			[key: string]: string;
		},
	) {
		const result: { imported: string[] } = { imported: [] };
		let importedVariables;
		try {
			this.logger.debug(`Importing variables from file ${candidate.file}`);
			importedVariables = jsonParse<Array<Partial<Variables>>>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
				{ fallbackValue: [] },
			);
		} catch (e) {
			this.logger.error(`Failed to import tags from file ${candidate.file}`, { error: e });
			return;
		}
		const overriddenKeys = Object.keys(valueOverrides ?? {});

		for (const variable of importedVariables) {
			if (!variable.key) {
				continue;
			}
			// by default no value is stored remotely, so an empty string is returned
			// it must be changed to undefined so as to not overwrite existing values!
			if (variable.value === '') {
				variable.value = undefined;
			}
			if (overriddenKeys.includes(variable.key) && valueOverrides) {
				variable.value = valueOverrides[variable.key];
				overriddenKeys.splice(overriddenKeys.indexOf(variable.key), 1);
			}
			try {
				await this.variablesRepository.upsert({ ...variable }, ['id']);
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
		for (const candidate of candidates) {
			await this.folderRepository.delete(candidate.id);
		}
	}

	private async findOrCreateOwnerProject(owner: RemoteResourceOwner): Promise<Project | null> {
		if (typeof owner === 'string' || owner.type === 'personal') {
			const email = typeof owner === 'string' ? owner : owner.personalEmail;
			const user = await this.userRepository.findOne({
				where: { email },
			});
			if (!user) {
				return null;
			}
			return await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
		} else if (owner.type === 'team') {
			let teamProject = await this.projectRepository.findOne({
				where: { id: owner.teamId },
			});
			if (!teamProject) {
				try {
					teamProject = await this.projectRepository.save(
						this.projectRepository.create({
							id: owner.teamId,
							name: owner.teamName,
							type: 'team',
						}),
					);
				} catch (e) {
					teamProject = await this.projectRepository.findOne({
						where: { id: owner.teamId },
					});
					if (!teamProject) {
						throw e;
					}
				}
			}

			return teamProject;
		}

		assertNever(owner);

		const errorOwner = owner as RemoteResourceOwner;
		throw new UnexpectedError(
			`Unknown resource owner type "${
				typeof errorOwner !== 'string' ? errorOwner.type : 'UNKNOWN'
			}" found when importing from source controller`,
		);
	}
}
