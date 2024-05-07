import { Container, Service } from 'typedi';
import path from 'path';
import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import glob from 'fast-glob';
import { ApplicationError, jsonParse, ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import { readFile as fsReadFile } from 'fs/promises';
import { Credentials, InstanceSettings } from 'n8n-core';
import type { IWorkflowToImport } from '@/Interfaces';
import type { ExportableCredential } from './types/exportableCredential';
import type { Variables } from '@db/entities/Variables';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import type { WorkflowTagMapping } from '@db/entities/WorkflowTagMapping';
import type { TagEntity } from '@db/entities/TagEntity';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { In } from '@n8n/typeorm';
import { isUniqueConstraintError } from '@/ResponseHelper';
import type { SourceControlWorkflowVersionId } from './types/sourceControlWorkflowVersionId';
import { getCredentialExportPath, getWorkflowExportPath } from './sourceControlHelper.ee';
import type { SourceControlledFile } from './types/sourceControlledFile';
import { VariablesService } from '../variables/variables.service.ee';
import { TagRepository } from '@db/repositories/tag.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { Logger } from '@/Logger';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowTagMappingRepository } from '@db/repositories/workflowTagMapping.repository';
import { VariablesRepository } from '@db/repositories/variables.repository';

@Service()
export class SourceControlImportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly variablesService: VariablesService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly tagRepository: TagRepository,
		instanceSettings: InstanceSettings,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}

	public async getRemoteVersionIdsFromFiles(): Promise<SourceControlWorkflowVersionId[]> {
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
			(e) => e !== undefined,
		) as SourceControlWorkflowVersionId[];
	}

	public async getLocalVersionIdsFromDb(): Promise<SourceControlWorkflowVersionId[]> {
		const localWorkflows = await Container.get(WorkflowRepository).find({
			select: ['id', 'name', 'versionId', 'updatedAt'],
		});
		return localWorkflows.map((local) => {
			let updatedAt: Date;
			if (local.updatedAt instanceof Date) {
				updatedAt = local.updatedAt;
			} else {
				ErrorReporter.warn('updatedAt is not a Date', {
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

	public async getRemoteCredentialsFromFiles(): Promise<
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

	public async getLocalCredentialsFromDb(): Promise<
		Array<ExportableCredential & { filename: string }>
	> {
		const localCredentials = await Container.get(CredentialsRepository).find({
			select: ['id', 'name', 'type'],
		});
		return localCredentials.map((local) => ({
			id: local.id,
			name: local.name,
			type: local.type,
			filename: getCredentialExportPath(local.id, this.credentialExportFolder),
		})) as Array<ExportableCredential & { filename: string }>;
	}

	public async getRemoteVariablesFromFile(): Promise<Variables[]> {
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

	public async getLocalVariablesFromDb(): Promise<Variables[]> {
		return await this.variablesService.getAllCached();
	}

	public async getRemoteTagsAndMappingsFromFile(): Promise<{
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

	public async getLocalTagsAndMappingsFromDb(): Promise<{
		tags: TagEntity[];
		mappings: WorkflowTagMapping[];
	}> {
		const localTags = await this.tagRepository.find({
			select: ['id', 'name'],
		});
		const localMappings = await Container.get(WorkflowTagMappingRepository).find({
			select: ['workflowId', 'tagId'],
		});
		return { tags: localTags, mappings: localMappings };
	}

	public async importWorkflowFromWorkFolder(candidates: SourceControlledFile[], userId: string) {
		const workflowRunner = this.activeWorkflowManager;
		const candidateIds = candidates.map((c) => c.id);
		const existingWorkflows = await Container.get(WorkflowRepository).findByIds(candidateIds, {
			fields: ['id', 'name', 'versionId', 'active'],
		});
		const allSharedWorkflows = await Container.get(SharedWorkflowRepository).findWithFields(
			candidateIds,
			{ select: ['workflowId', 'role', 'userId'] },
		);
		const cachedOwnerIds = new Map<string, string>();
		const importWorkflowsResult = await Promise.all(
			candidates.map(async (candidate) => {
				this.logger.debug(`Parsing workflow file ${candidate.file}`);
				const importedWorkflow = jsonParse<IWorkflowToImport & { owner: string }>(
					await fsReadFile(candidate.file, { encoding: 'utf8' }),
				);
				if (!importedWorkflow?.id) {
					return;
				}
				const existingWorkflow = existingWorkflows.find((e) => e.id === importedWorkflow.id);
				importedWorkflow.active = existingWorkflow?.active ?? false;
				this.logger.debug(`Updating workflow id ${importedWorkflow.id ?? 'new'}`);
				const upsertResult = await Container.get(WorkflowRepository).upsert(
					{ ...importedWorkflow },
					['id'],
				);
				if (upsertResult?.identifiers?.length !== 1) {
					throw new ApplicationError('Failed to upsert workflow', {
						extra: { workflowId: importedWorkflow.id ?? 'new' },
					});
				}
				// Update workflow owner to the user who exported the workflow, if that user exists
				// in the instance, and the workflow doesn't already have an owner
				let workflowOwnerId = userId;
				if (cachedOwnerIds.has(importedWorkflow.owner)) {
					workflowOwnerId = cachedOwnerIds.get(importedWorkflow.owner) ?? userId;
				} else {
					const foundUser = await Container.get(UserRepository).findOne({
						where: {
							email: importedWorkflow.owner,
						},
						select: ['id'],
					});
					if (foundUser) {
						cachedOwnerIds.set(importedWorkflow.owner, foundUser.id);
						workflowOwnerId = foundUser.id;
					}
				}

				const existingSharedWorkflowOwnerByRoleId = allSharedWorkflows.find(
					(e) => e.workflowId === importedWorkflow.id && e.role === 'workflow:owner',
				);
				const existingSharedWorkflowOwnerByUserId = allSharedWorkflows.find(
					(e) => e.workflowId === importedWorkflow.id && e.role === 'workflow:owner',
				);
				if (!existingSharedWorkflowOwnerByUserId && !existingSharedWorkflowOwnerByRoleId) {
					// no owner exists yet, so create one
					await Container.get(SharedWorkflowRepository).insert({
						workflowId: importedWorkflow.id,
						userId: workflowOwnerId,
						role: 'workflow:owner',
					});
				} else if (existingSharedWorkflowOwnerByRoleId) {
					// skip, because the workflow already has a global owner
				} else if (existingSharedWorkflowOwnerByUserId && !existingSharedWorkflowOwnerByRoleId) {
					// if the workflow has a non-global owner that is referenced by the owner file,
					// and no existing global owner, update the owner to the user referenced in the owner file
					await Container.get(SharedWorkflowRepository).update(
						{
							workflowId: importedWorkflow.id,
							userId: workflowOwnerId,
						},
						{ role: 'workflow:owner' },
					);
				}
				if (existingWorkflow?.active) {
					try {
						// remove active pre-import workflow
						this.logger.debug(`Deactivating workflow id ${existingWorkflow.id}`);
						await workflowRunner.remove(existingWorkflow.id);
						// try activating the imported workflow
						this.logger.debug(`Reactivating workflow id ${existingWorkflow.id}`);
						await workflowRunner.add(existingWorkflow.id, 'activate');
						// update the versionId of the workflow to match the imported workflow
					} catch (error) {
						this.logger.error(`Failed to activate workflow ${existingWorkflow.id}`, error as Error);
					} finally {
						await Container.get(WorkflowRepository).update(
							{ id: existingWorkflow.id },
							{ versionId: importedWorkflow.versionId },
						);
					}
				}

				return {
					id: importedWorkflow.id ?? 'unknown',
					name: candidate.file,
				};
			}),
		);
		return importWorkflowsResult.filter((e) => e !== undefined) as Array<{
			id: string;
			name: string;
		}>;
	}

	public async importCredentialsFromWorkFolder(
		candidates: SourceControlledFile[],
		importingUserId: string,
	) {
		const candidateIds = candidates.map((c) => c.id);
		const existingCredentials = await Container.get(CredentialsRepository).find({
			where: {
				id: In(candidateIds),
			},
			select: ['id', 'name', 'type', 'data'],
		});
		const existingSharedCredentials = await Container.get(SharedCredentialsRepository).find({
			select: ['userId', 'credentialsId', 'role'],
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
					newCredentialObject.setData(data);
				}

				this.logger.debug(`Updating credential id ${newCredentialObject.id as string}`);
				await Container.get(CredentialsRepository).upsert(newCredentialObject, ['id']);

				const isOwnedLocally = existingSharedCredentials.some(
					(c) => c.credentialsId === credential.id,
				);

				if (!isOwnedLocally) {
					const remoteOwnerId = credential.ownedBy
						? await Container.get(UserRepository)
								.findOne({
									where: { email: credential.ownedBy },
									select: { id: true },
								})
								.then((user) => user?.id)
						: null;

					const newSharedCredential = new SharedCredentials();
					newSharedCredential.credentialsId = newCredentialObject.id as string;
					newSharedCredential.userId = remoteOwnerId ?? importingUserId;
					newSharedCredential.role = 'credential:owner';

					await Container.get(SharedCredentialsRepository).upsert({ ...newSharedCredential }, [
						'credentialsId',
						'userId',
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

	public async importTagsFromWorkFolder(candidate: SourceControlledFile) {
		let mappedTags;
		try {
			this.logger.debug(`Importing tags from file ${candidate.file}`);
			mappedTags = jsonParse<{ tags: TagEntity[]; mappings: WorkflowTagMapping[] }>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
				{ fallbackValue: { tags: [], mappings: [] } },
			);
		} catch (error) {
			this.logger.error(`Failed to import tags from file ${candidate.file}`, error as Error);
			return;
		}

		if (mappedTags.mappings.length === 0 && mappedTags.tags.length === 0) {
			return;
		}

		const existingWorkflowIds = new Set(
			(
				await Container.get(WorkflowRepository).find({
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
					throw new ApplicationError(
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
				await Container.get(WorkflowTagMappingRepository).upsert(
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

	public async importVariablesFromWorkFolder(
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
		} catch (error) {
			this.logger.error(`Failed to import tags from file ${candidate.file}`, error as Error);
			return;
		}
		const overriddenKeys = Object.keys(valueOverrides ?? {});

		for (const variable of importedVariables) {
			if (!variable.key) {
				continue;
			}
			// by default no value is stored remotely, so an empty string is retuned
			// it must be changed to undefined so as to not overwrite existing values!
			if (variable.value === '') {
				variable.value = undefined;
			}
			if (overriddenKeys.includes(variable.key) && valueOverrides) {
				variable.value = valueOverrides[variable.key];
				overriddenKeys.splice(overriddenKeys.indexOf(variable.key), 1);
			}
			try {
				await Container.get(VariablesRepository).upsert({ ...variable }, ['id']);
			} catch (errorUpsert) {
				if (isUniqueConstraintError(errorUpsert as Error)) {
					this.logger.debug(`Variable ${variable.key} already exists, updating instead`);
					try {
						await Container.get(VariablesRepository).update({ key: variable.key }, { ...variable });
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
				const newVariable = Container.get(VariablesRepository).create({
					key,
					value: valueOverrides[key],
				});
				await Container.get(VariablesRepository).save(newVariable, { transaction: false });
			}
		}

		await this.variablesService.updateCache();

		return result;
	}
}
