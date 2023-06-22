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
import { Credentials, UserSettings } from 'n8n-core';
import type { IWorkflowToImport } from '@/Interfaces';
import type { ExportableCredential } from './types/exportableCredential';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import { Variables } from '@/databases/entities/Variables';
import type { ImportResult } from './types/importResult';
import { UM_FIX_INSTRUCTION } from '@/commands/BaseCommand';
import { SharedCredentials } from '@/databases/entities/SharedCredentials';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { WorkflowTagMapping } from '@/databases/entities/WorkflowTagMapping';
import { TagEntity } from '@/databases/entities/TagEntity';
import { ActiveWorkflowRunner } from '../../ActiveWorkflowRunner';
import type { SourceControllPullOptions } from './types/sourceControlPullWorkFolder';
import { In } from 'typeorm';
import { isUniqueConstraintError } from '../../ResponseHelper';

@Service()
export class SourceControlImportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	constructor() {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.gitFolder = path.join(userFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}

	private async getOwnerGlobalRole() {
		const ownerCredentiallRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'global' },
		});

		if (!ownerCredentiallRole) {
			throw new Error(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return ownerCredentiallRole;
	}

	private async getOwnerCredentialRole() {
		const ownerCredentiallRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'credential' },
		});

		if (!ownerCredentiallRole) {
			throw new Error(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return ownerCredentiallRole;
	}

	private async getOwnerWorkflowRole() {
		const ownerWorkflowRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'workflow' },
		});

		if (!ownerWorkflowRole) {
			throw new Error(`Failed to find owner workflow role. ${UM_FIX_INSTRUCTION}`);
		}

		return ownerWorkflowRole;
	}

	private async importCredentialsFromFiles(
		userId: string,
	): Promise<Array<{ id: string; name: string; type: string }>> {
		const credentialFiles = await glob('*.json', {
			cwd: this.credentialExportFolder,
			absolute: true,
		});
		const existingCredentials = await Db.collections.Credentials.find();
		const ownerCredentialRole = await this.getOwnerCredentialRole();
		const ownerGlobalRole = await this.getOwnerGlobalRole();
		const encryptionKey = await UserSettings.getEncryptionKey();
		let importCredentialsResult: Array<{ id: string; name: string; type: string }> = [];
		await Db.transaction(async (transactionManager) => {
			importCredentialsResult = await Promise.all(
				credentialFiles.map(async (file) => {
					LoggerProxy.debug(`Importing credentials file ${file}`);
					const credential = jsonParse<ExportableCredential>(
						await fsReadFile(file, { encoding: 'utf8' }),
					);
					const existingCredential = existingCredentials.find(
						(e) => e.id === credential.id && e.type === credential.type,
					);
					const sharedOwner = await Db.collections.SharedCredentials.findOne({
						select: ['userId'],
						where: {
							credentialsId: credential.id,
							roleId: In([ownerCredentialRole.id, ownerGlobalRole.id]),
						},
					});

					const { name, type, data, id, nodesAccess } = credential;
					const newCredentialObject = new Credentials({ id, name }, type, []);
					if (existingCredential?.data) {
						newCredentialObject.data = existingCredential.data;
					} else {
						newCredentialObject.setData(data, encryptionKey);
					}
					newCredentialObject.nodesAccess = nodesAccess || existingCredential?.nodesAccess || [];

					LoggerProxy.debug(`Updating credential id ${newCredentialObject.id as string}`);
					await transactionManager.upsert(CredentialsEntity, newCredentialObject, ['id']);

					if (!sharedOwner) {
						const newSharedCredential = new SharedCredentials();
						newSharedCredential.credentialsId = newCredentialObject.id as string;
						newSharedCredential.userId = userId;
						newSharedCredential.roleId = ownerGlobalRole.id;

						await transactionManager.upsert(SharedCredentials, { ...newSharedCredential }, [
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
		});
		return importCredentialsResult.filter((e) => e !== undefined);
	}

	private async importVariablesFromFile(valueOverrides?: {
		[key: string]: string;
	}): Promise<{ imported: string[] }> {
		const variablesFile = await glob(SOURCE_CONTROL_VARIABLES_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		const result: { imported: string[] } = { imported: [] };
		if (variablesFile.length > 0) {
			LoggerProxy.debug(`Importing variables from file ${variablesFile[0]}`);
			const importedVariables = jsonParse<Array<Partial<Variables>>>(
				await fsReadFile(variablesFile[0], { encoding: 'utf8' }),
				{ fallbackValue: [] },
			);
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
					const newVariable = new Variables({ key, value: valueOverrides[key] });
					await Db.collections.Variables.save(newVariable);
				}
			}
		}
		return result;
	}

	private async importTagsFromFile() {
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
			const existingWorkflowIds = new Set(
				(
					await Db.collections.Workflow.find({
						select: ['id'],
					})
				).map((e) => e.id),
			);

			await Db.transaction(async (transactionManager) => {
				await Promise.all(
					mappedTags.tags.map(async (tag) => {
						await transactionManager.upsert(
							TagEntity,
							{
								...tag,
							},
							{
								skipUpdateIfNoValuesChanged: true,
								conflictPaths: { id: true },
							},
						);
					}),
				);
				await Promise.all(
					mappedTags.mappings.map(async (mapping) => {
						if (!existingWorkflowIds.has(String(mapping.workflowId))) return;
						await transactionManager.upsert(
							WorkflowTagMapping,
							{ tagId: String(mapping.tagId), workflowId: String(mapping.workflowId) },
							{
								skipUpdateIfNoValuesChanged: true,
								conflictPaths: { tagId: true, workflowId: true },
							},
						);
					}),
				);
			});
			return mappedTags;
		}
		return { tags: [], mappings: [] };
	}

	private async importWorkflowsFromFiles(
		userId: string,
	): Promise<Array<{ id: string; name: string }>> {
		const workflowFiles = await glob('*.json', {
			cwd: this.workflowExportFolder,
			absolute: true,
		});

		const existingWorkflows = await Db.collections.Workflow.find({
			select: ['id', 'name', 'active', 'versionId'],
		});

		const ownerWorkflowRole = await this.getOwnerWorkflowRole();
		const workflowRunner = Container.get(ActiveWorkflowRunner);

		let importWorkflowsResult = new Array<{ id: string; name: string }>();
		await Db.transaction(async (transactionManager) => {
			importWorkflowsResult = await Promise.all(
				workflowFiles.map(async (file) => {
					LoggerProxy.debug(`Parsing workflow file ${file}`);
					const importedWorkflow = jsonParse<IWorkflowToImport>(
						await fsReadFile(file, { encoding: 'utf8' }),
					);
					const existingWorkflow = existingWorkflows.find((e) => e.id === importedWorkflow.id);
					if (existingWorkflow?.versionId === importedWorkflow.versionId) {
						LoggerProxy.debug(
							`Skipping import of workflow ${
								importedWorkflow.id ?? 'n/a'
							} - versionId is up to date`,
						);
						return {
							id: importedWorkflow.id ?? 'n/a',
							name: 'skipped',
						};
					}
					LoggerProxy.debug(`Importing workflow ${importedWorkflow.id ?? 'n/a'}`);
					importedWorkflow.active = existingWorkflow?.active ?? false;
					LoggerProxy.debug(`Updating workflow id ${importedWorkflow.id ?? 'new'}`);
					const upsertResult = await transactionManager.upsert(
						WorkflowEntity,
						{ ...importedWorkflow },
						['id'],
					);
					if (upsertResult?.identifiers?.length !== 1) {
						throw new Error(`Failed to upsert workflow ${importedWorkflow.id ?? 'new'}`);
					}
					// due to sequential Ids, this may have changed during the insert
					// TODO: once IDs are unique and we removed autoincrement, remove this
					const upsertedWorkflowId = upsertResult.identifiers[0].id as string;
					await transactionManager.upsert(
						SharedWorkflow,
						{
							workflowId: upsertedWorkflowId,
							userId,
							roleId: ownerWorkflowRole.id,
						},
						['workflowId', 'userId'],
					);

					if (existingWorkflow?.active) {
						try {
							// remove active pre-import workflow
							LoggerProxy.debug(`Deactivating workflow id ${existingWorkflow.id}`);
							await workflowRunner.remove(existingWorkflow.id);
							// try activating the imported workflow
							LoggerProxy.debug(`Reactivating workflow id ${existingWorkflow.id}`);
							await workflowRunner.add(existingWorkflow.id, 'activate');
						} catch (error) {
							LoggerProxy.error(
								`Failed to activate workflow ${existingWorkflow.id}`,
								error as Error,
							);
						}
					}

					return {
						id: importedWorkflow.id ?? 'unknown',
						name: file,
					};
				}),
			);
		});
		return importWorkflowsResult;
	}

	async importFromWorkFolder(options: SourceControllPullOptions): Promise<ImportResult> {
		try {
			const importedVariables = await this.importVariablesFromFile(options.variables);
			const importedCredentials = await this.importCredentialsFromFiles(options.userId);
			const importWorkflows = await this.importWorkflowsFromFiles(options.userId);
			const importTags = await this.importTagsFromFile();

			return {
				variables: importedVariables,
				credentials: importedCredentials,
				workflows: importWorkflows,
				tags: importTags,
			};
		} catch (error) {
			throw Error(`Failed to import workflows from work folder: ${(error as Error).message}`);
		}
	}
}
