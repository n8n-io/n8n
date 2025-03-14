import type { SourceControlledFile } from '@n8n/api-types';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import glob from 'fast-glob';
import { Credentials, ErrorReporter, InstanceSettings, Logger } from 'n8n-core';
import { jsonParse, ensureError, UserError, UnexpectedError } from 'n8n-workflow';
import { readFile as fsReadFile } from 'node:fs/promises';
import path from 'path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialsService } from '@/credentials/credentials.service';
import type { Project } from '@/databases/entities/project';
import { SharedCredentials } from '@/databases/entities/shared-credentials';
import type { TagEntity } from '@/databases/entities/tag-entity';
import type { User } from '@/databases/entities/user';
import type { Variables } from '@/databases/entities/variables';
import type { WorkflowTagMapping } from '@/databases/entities/workflow-tag-mapping';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { VariablesRepository } from '@/databases/repositories/variables.repository';
import { WorkflowTagMappingRepository } from '@/databases/repositories/workflow-tag-mapping.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { IWorkflowToImport } from '@/interfaces';
import { isUniqueConstraintError } from '@/response-helper';
import { TagService } from '@/services/tag.service';
import { assertNever } from '@/utils';
import { WorkflowService } from '@/workflows/workflow.service';

import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import { getCredentialExportPath, getWorkflowExportPath } from './source-control-helper.ee';
import type { ExportableCredential } from './types/exportable-credential';
import type { ResourceOwner } from './types/resource-owner';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';
import { VariablesService } from '../variables/variables.service.ee';

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
		instanceSettings: InstanceSettings,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}

	async getRemoteVersionIdsFromFiles(): Promise<SourceControlWorkflowVersionId[]> {
		const remoteWorkflowFiles = await glob('*.json', {
			cwd: this.workflowExportFolder,
			absolute: true,
		});
		const remoteWorkflowFilesParsed = await Promise.all(
			remoteWorkflowFiles.map(async (file) => {
				this.logger.debug(`Parsing workflow file ${file}`);
				const remote = jsonParse<IWorkflowToImport>(await fsReadFile(file, { encoding: 'utf8' }));
				if (!remote?.id) {
					return undefined;
				}
				return {
					id: remote.id,
					versionId: remote.versionId,
					name: remote.name,
					remoteId: remote.id,
					filename: getWorkflowExportPath(remote.id, this.workflowExportFolder),
				} as SourceControlWorkflowVersionId;
			}),
		);
		return remoteWorkflowFilesParsed.filter(
			(e): e is SourceControlWorkflowVersionId => e !== undefined,
		);
	}

	async getLocalVersionIdsFromDb(): Promise<SourceControlWorkflowVersionId[]> {
		const localWorkflows = await this.workflowRepository.find({
			select: ['id', 'name', 'versionId', 'updatedAt'],
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
				filename: getWorkflowExportPath(local.id, this.workflowExportFolder),
				updatedAt: updatedAt.toISOString(),
			};
		}) as SourceControlWorkflowVersionId[];
	}

	async getRemoteCredentialsFromFiles(): Promise<
		Array<ExportableCredential & { filename: string }>
	> {
		const remoteCredentialFiles = await glob('*.json', {
			cwd: this.credentialExportFolder,
			absolute: true,
		});
		const remoteCredentialFilesParsed = await Promise.all(
			remoteCredentialFiles.map(async (file) => {
				this.logger.debug(`Parsing credential file ${file}`);
				const remote = jsonParse<ExportableCredential>(
					await fsReadFile(file, { encoding: 'utf8' }),
				);
				if (!remote?.id) {
					return undefined;
				}
				return {
					...remote,
					filename: getCredentialExportPath(remote.id, this.credentialExportFolder),
				};
			}),
		);
		return remoteCredentialFilesParsed.filter((e) => e !== undefined) as Array<
			ExportableCredential & { filename: string }
		>;
	}

	async getLocalCredentialsFromDb(): Promise<Array<ExportableCredential & { filename: string }>> {
		const localCredentials = await this.credentialsRepository.find({
			select: ['id', 'name', 'type'],
		});
		return localCredentials.map((local) => ({
			id: local.id,
			name: local.name,
			type: local.type,
			filename: getCredentialExportPath(local.id, this.credentialExportFolder),
		})) as Array<ExportableCredential & { filename: string }>;
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

	async getRemoteTagsAndMappingsFromFile(): Promise<{
		tags: TagEntity[];
		mappings: WorkflowTagMapping[];
	}> {
		const tagsFile = await glob(SOURCE_CONTROL_TAGS_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (tagsFile.length > 0) {
			this.logger.debug(`Importing tags from file ${tagsFile[0]}`);
			const mappedTags = jsonParse<{ tags: TagEntity[]; mappings: WorkflowTagMapping[] }>(
				await fsReadFile(tagsFile[0], { encoding: 'utf8' }),
				{ fallbackValue: { tags: [], mappings: [] } },
			);
			return mappedTags;
		}
		return { tags: [], mappings: [] };
	}

	async getLocalTagsAndMappingsFromDb(): Promise<{
		tags: TagEntity[];
		mappings: WorkflowTagMapping[];
	}> {
		const localTags = await this.tagRepository.find({
			select: ['id', 'name'],
		});
		const localMappings = await this.workflowTagMappingRepository.find({
			select: ['workflowId', 'tagId'],
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
		const allSharedWorkflows = await this.sharedWorkflowRepository.findWithFields(candidateIds, {
			select: ['workflowId', 'role', 'projectId'],
		});
		const importWorkflowsResult = [];

		// Due to SQLite concurrency issues, we cannot save all workflows at once
		// as project creation might cause constraint issues.
		// We must iterate over the array and run the whole process workflow by workflow
		for (const candidate of candidates) {
			this.logger.debug(`Parsing workflow file ${candidate.file}`);
			const importedWorkflow = jsonParse<IWorkflowToImport & { owner: string }>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
			);
			if (!importedWorkflow?.id) {
				continue;
			}
			const existingWorkflow = existingWorkflows.find((e) => e.id === importedWorkflow.id);
			importedWorkflow.active = existingWorkflow?.active ?? false;
			this.logger.debug(`Updating workflow id ${importedWorkflow.id ?? 'new'}`);
			const upsertResult = await this.workflowRepository.upsert({ ...importedWorkflow }, ['id']);
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
					// try activating the imported workflow
					this.logger.debug(`Reactivating workflow id ${existingWorkflow.id}`);
					await workflowManager.add(existingWorkflow.id, 'activate');
					// update the versionId of the workflow to match the imported workflow
				} catch (e) {
					const error = ensureError(e);
					this.logger.error(`Failed to activate workflow ${existingWorkflow.id}`, { error });
				} finally {
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
			await this.workflowService.delete(user, candidate.id);
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

	private async findOrCreateOwnerProject(owner: ResourceOwner): Promise<Project | null> {
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

		const errorOwner = owner as ResourceOwner;
		throw new UnexpectedError(
			`Unknown resource owner type "${
				typeof errorOwner !== 'string' ? errorOwner.type : 'UNKNOWN'
			}" found when importing from source controller`,
		);
	}
}
