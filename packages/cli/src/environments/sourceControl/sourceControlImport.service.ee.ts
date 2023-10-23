import Container, { Service } from 'typedi';
import path from 'path';
import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import * as Db from '@/Db';
import glob from 'fast-glob';
import { LoggerProxy, jsonParse } from 'n8n-workflow';
import { readFile as fsReadFile } from 'fs/promises';
import { Credentials, InstanceSettings } from 'n8n-core';
import type { IWorkflowToImport } from '@/Interfaces';
import type { ExportableCredential } from './types/exportableCredential';
import type { Variables } from '@db/entities/Variables';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import type { WorkflowTagMapping } from '@db/entities/WorkflowTagMapping';
import type { TagEntity } from '@db/entities/TagEntity';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { In } from 'typeorm';
import { isUniqueConstraintError } from '@/ResponseHelper';
import type { SourceControlWorkflowVersionId } from './types/sourceControlWorkflowVersionId';
import { getCredentialExportPath, getWorkflowExportPath } from './sourceControlHelper.ee';
import type { SourceControlledFile } from './types/sourceControlledFile';
import { RoleService } from '@/services/role.service';
import { VariablesService } from '../variables/variables.service';
import { TagRepository } from '@/databases/repositories';
import { UM_FIX_INSTRUCTION } from '@/constants';

@Service()
export class SourceControlImportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	constructor(
		private readonly variablesService: VariablesService,
		private readonly activeWorkflowRunner: ActiveWorkflowRunner,
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

	private async getOwnerGlobalRole() {
		const globalOwnerRole = await Container.get(RoleService).findGlobalOwnerRole();

		if (!globalOwnerRole) {
			throw new Error(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return globalOwnerRole;
	}

	private async getCredentialOwnerRole() {
		const credentialOwnerRole = await Container.get(RoleService).findCredentialOwnerRole();

		if (!credentialOwnerRole) {
			throw new Error(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return credentialOwnerRole;
	}

	private async getWorkflowOwnerRole() {
		const workflowOwnerRole = await Container.get(RoleService).findWorkflowOwnerRole();

		if (!workflowOwnerRole) {
			throw new Error(`Failed to find owner workflow role. ${UM_FIX_INSTRUCTION}`);
		}

		return workflowOwnerRole;
	}

	public async getRemoteVersionIdsFromFiles(): Promise<SourceControlWorkflowVersionId[]> {
		const remoteWorkflowFiles = await glob('*.json', {
			cwd: this.workflowExportFolder,
			absolute: true,
		});
		const remoteWorkflowFilesParsed = await Promise.all(
			remoteWorkflowFiles.map(async (file) => {
				LoggerProxy.debug(`Parsing workflow file ${file}`);
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
		const localWorkflows = await Db.collections.Workflow.find({
			select: ['id', 'name', 'versionId', 'updatedAt'],
		});
		return localWorkflows.map((local) => ({
			id: local.id,
			versionId: local.versionId,
			name: local.name,
			localId: local.id,
			filename: getWorkflowExportPath(local.id, this.workflowExportFolder),
			updatedAt: local.updatedAt.toISOString(),
		})) as SourceControlWorkflowVersionId[];
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
				LoggerProxy.debug(`Parsing credential file ${file}`);
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
		const localCredentials = await Db.collections.Credentials.find({
			select: ['id', 'name', 'type', 'nodesAccess'],
		});
		return localCredentials.map((local) => ({
			id: local.id,
			name: local.name,
			type: local.type,
			nodesAccess: local.nodesAccess,
			filename: getCredentialExportPath(local.id, this.credentialExportFolder),
		})) as Array<ExportableCredential & { filename: string }>;
	}

	public async getRemoteVariablesFromFile(): Promise<Variables[]> {
		const variablesFile = await glob(SOURCE_CONTROL_VARIABLES_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (variablesFile.length > 0) {
			LoggerProxy.debug(`Importing variables from file ${variablesFile[0]}`);
			return jsonParse<Variables[]>(await fsReadFile(variablesFile[0], { encoding: 'utf8' }), {
				fallbackValue: [],
			});
		}
		return [];
	}

	public async getLocalVariablesFromDb(): Promise<Variables[]> {
		return this.variablesService.getAllCached();
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
			LoggerProxy.debug(`Importing tags from file ${tagsFile[0]}`);
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
		const localMappings = await Db.collections.WorkflowTagMapping.find({
			select: ['workflowId', 'tagId'],
		});
		return { tags: localTags, mappings: localMappings };
	}

	public async importWorkflowFromWorkFolder(candidates: SourceControlledFile[], userId: string) {
		const ownerWorkflowRole = await this.getWorkflowOwnerRole();
		const workflowRunner = this.activeWorkflowRunner;
		const candidateIds = candidates.map((c) => c.id);
		const existingWorkflows = await Db.collections.Workflow.find({
			where: {
				id: In(candidateIds),
			},
			select: ['id', 'name', 'versionId', 'active'],
		});
		const allSharedWorkflows = await Db.collections.SharedWorkflow.find({
			where: {
				workflowId: In(candidateIds),
			},
			select: ['workflowId', 'roleId', 'userId'],
		});
		const cachedOwnerIds = new Map<string, string>();
		const importWorkflowsResult = await Promise.all(
			candidates.map(async (candidate) => {
				LoggerProxy.debug(`Parsing workflow file ${candidate.file}`);
				const importedWorkflow = jsonParse<IWorkflowToImport & { owner: string }>(
					await fsReadFile(candidate.file, { encoding: 'utf8' }),
				);
				if (!importedWorkflow?.id) {
					return;
				}
				const existingWorkflow = existingWorkflows.find((e) => e.id === importedWorkflow.id);
				importedWorkflow.active = existingWorkflow?.active ?? false;
				LoggerProxy.debug(`Updating workflow id ${importedWorkflow.id ?? 'new'}`);
				const upsertResult = await Db.collections.Workflow.upsert({ ...importedWorkflow }, ['id']);
				if (upsertResult?.identifiers?.length !== 1) {
					throw new Error(`Failed to upsert workflow ${importedWorkflow.id ?? 'new'}`);
				}
				// Update workflow owner to the user who exported the workflow, if that user exists
				// in the instance, and the workflow doesn't already have an owner
				let workflowOwnerId = userId;
				if (cachedOwnerIds.has(importedWorkflow.owner)) {
					workflowOwnerId = cachedOwnerIds.get(importedWorkflow.owner) ?? userId;
				} else {
					const foundUser = await Db.collections.User.findOne({
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
					(e) =>
						e.workflowId === importedWorkflow.id &&
						e.roleId.toString() === ownerWorkflowRole.id.toString(),
				);
				const existingSharedWorkflowOwnerByUserId = allSharedWorkflows.find(
					(e) =>
						e.workflowId === importedWorkflow.id &&
						e.roleId.toString() === workflowOwnerId.toString(),
				);
				if (!existingSharedWorkflowOwnerByUserId && !existingSharedWorkflowOwnerByRoleId) {
					// no owner exists yet, so create one
					await Db.collections.SharedWorkflow.insert({
						workflowId: importedWorkflow.id,
						userId: workflowOwnerId,
						roleId: ownerWorkflowRole.id,
					});
				} else if (existingSharedWorkflowOwnerByRoleId) {
					// skip, because the workflow already has a global owner
				} else if (existingSharedWorkflowOwnerByUserId && !existingSharedWorkflowOwnerByRoleId) {
					// if the worklflow has a non-global owner that is referenced by the owner file,
					// and no existing global owner, update the owner to the user referenced in the owner file
					await Db.collections.SharedWorkflow.update(
						{
							workflowId: importedWorkflow.id,
							userId: workflowOwnerId,
						},
						{
							roleId: ownerWorkflowRole.id,
						},
					);
				}
				if (existingWorkflow?.active) {
					try {
						// remove active pre-import workflow
						LoggerProxy.debug(`Deactivating workflow id ${existingWorkflow.id}`);
						await workflowRunner.remove(existingWorkflow.id);
						// try activating the imported workflow
						LoggerProxy.debug(`Reactivating workflow id ${existingWorkflow.id}`);
						await workflowRunner.add(existingWorkflow.id, 'activate');
						// update the versionId of the workflow to match the imported workflow
					} catch (error) {
						LoggerProxy.error(`Failed to activate workflow ${existingWorkflow.id}`, error as Error);
					} finally {
						await Db.collections.Workflow.update(
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

	public async importCredentialsFromWorkFolder(candidates: SourceControlledFile[], userId: string) {
		const candidateIds = candidates.map((c) => c.id);
		const existingCredentials = await Db.collections.Credentials.find({
			where: {
				id: In(candidateIds),
			},
			select: ['id', 'name', 'type', 'data'],
		});
		const ownerCredentialRole = await this.getCredentialOwnerRole();
		const ownerGlobalRole = await this.getOwnerGlobalRole();
		const existingSharedCredentials = await Db.collections.SharedCredentials.find({
			select: ['userId', 'credentialsId', 'roleId'],
			where: {
				credentialsId: In(candidateIds),
				roleId: In([ownerCredentialRole.id, ownerGlobalRole.id]),
			},
		});
		let importCredentialsResult: Array<{ id: string; name: string; type: string }> = [];
		importCredentialsResult = await Promise.all(
			candidates.map(async (candidate) => {
				LoggerProxy.debug(`Importing credentials file ${candidate.file}`);
				const credential = jsonParse<ExportableCredential>(
					await fsReadFile(candidate.file, { encoding: 'utf8' }),
				);
				const existingCredential = existingCredentials.find(
					(e) => e.id === credential.id && e.type === credential.type,
				);
				const sharedOwner = existingSharedCredentials.find(
					(e) => e.credentialsId === credential.id,
				);

				const { name, type, data, id, nodesAccess } = credential;
				const newCredentialObject = new Credentials({ id, name }, type, []);
				if (existingCredential?.data) {
					newCredentialObject.data = existingCredential.data;
				} else {
					newCredentialObject.setData(data);
				}
				newCredentialObject.nodesAccess = nodesAccess || existingCredential?.nodesAccess || [];

				LoggerProxy.debug(`Updating credential id ${newCredentialObject.id as string}`);
				await Db.collections.Credentials.upsert(newCredentialObject, ['id']);

				if (!sharedOwner) {
					const newSharedCredential = new SharedCredentials();
					newSharedCredential.credentialsId = newCredentialObject.id as string;
					newSharedCredential.userId = userId;
					newSharedCredential.roleId = ownerCredentialRole.id;

					await Db.collections.SharedCredentials.upsert({ ...newSharedCredential }, [
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
			LoggerProxy.debug(`Importing tags from file ${candidate.file}`);
			mappedTags = jsonParse<{ tags: TagEntity[]; mappings: WorkflowTagMapping[] }>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
				{ fallbackValue: { tags: [], mappings: [] } },
			);
		} catch (error) {
			LoggerProxy.error(`Failed to import tags from file ${candidate.file}`, error as Error);
			return;
		}

		if (mappedTags.mappings.length === 0 && mappedTags.tags.length === 0) {
			return;
		}

		const existingWorkflowIds = new Set(
			(
				await Db.collections.Workflow.find({
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
					throw new Error(
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
				await Db.collections.WorkflowTagMapping.upsert(
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
			LoggerProxy.debug(`Importing variables from file ${candidate.file}`);
			importedVariables = jsonParse<Array<Partial<Variables>>>(
				await fsReadFile(candidate.file, { encoding: 'utf8' }),
				{ fallbackValue: [] },
			);
		} catch (error) {
			LoggerProxy.error(`Failed to import tags from file ${candidate.file}`, error as Error);
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
				await Db.collections.Variables.upsert({ ...variable }, ['id']);
			} catch (errorUpsert) {
				if (isUniqueConstraintError(errorUpsert as Error)) {
					LoggerProxy.debug(`Variable ${variable.key} already exists, updating instead`);
					try {
						await Db.collections.Variables.update({ key: variable.key }, { ...variable });
					} catch (errorUpdate) {
						LoggerProxy.debug(`Failed to update variable ${variable.key}, skipping`);
						LoggerProxy.debug((errorUpdate as Error).message);
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
				const newVariable = Db.collections.Variables.create({ key, value: valueOverrides[key] });
				await Db.collections.Variables.save(newVariable);
			}
		}

		await this.variablesService.updateCache();

		return result;
	}
}
