import Container, { Service } from 'typedi';
import path from 'path';
import {
	VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	VERSION_CONTROL_GIT_FOLDER,
	VERSION_CONTROL_TAGS_EXPORT_FILE,
	VERSION_CONTROL_VARIABLES_EXPORT_FILE,
	VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import * as Db from '@/Db';
import glob from 'fast-glob';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { LoggerProxy, jsonParse } from 'n8n-workflow';
import { writeFile as fsWriteFile, readFile as fsReadFile, rm as fsRm } from 'fs/promises';
import { VersionControlGitService } from './versionControlGit.service.ee';
import { Credentials, UserSettings } from 'n8n-core';
import type { IWorkflowToImport } from '@/Interfaces';
import type { ExportableWorkflow } from './types/exportableWorkflow';
import type { ExportableCredential } from './types/exportableCredential';
import type { ExportResult } from './types/exportResult';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import { Variables } from '@/databases/entities/Variables';
import type { ImportResult } from './types/importResult';
import { UM_FIX_INSTRUCTION } from '@/commands/BaseCommand';
import config from '@/config';
import { SharedCredentials } from '@/databases/entities/SharedCredentials';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { WorkflowTagMapping } from '@/databases/entities/WorkflowTagMapping';
import { TagEntity } from '@/databases/entities/TagEntity';
import { ActiveWorkflowRunner } from '../../ActiveWorkflowRunner';
import without from 'lodash.without';
import type { VersionControllPullOptions } from './types/versionControlPullWorkFolder';
import { versionControlFoldersExistCheck } from './versionControlHelper.ee';
import { In } from 'typeorm';

@Service()
export class VersionControlExportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	constructor(private gitService: VersionControlGitService) {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.gitFolder = path.join(userFolder, VERSION_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}

	getWorkflowPath(workflowId: string): string {
		return path.join(this.workflowExportFolder, `${workflowId}.json`);
	}

	getCredentialsPath(credentialsId: string): string {
		return path.join(this.credentialExportFolder, `${credentialsId}.json`);
	}

	getTagsPath(): string {
		return path.join(this.gitFolder, VERSION_CONTROL_TAGS_EXPORT_FILE);
	}

	getVariablesPath(): string {
		return path.join(this.gitFolder, VERSION_CONTROL_VARIABLES_EXPORT_FILE);
	}

	async getWorkflowFromFile(
		filePath: string,
		root = this.gitFolder,
	): Promise<IWorkflowToImport | undefined> {
		try {
			const importedWorkflow = jsonParse<IWorkflowToImport>(
				await fsReadFile(path.join(root, filePath), { encoding: 'utf8' }),
			);
			return importedWorkflow;
		} catch (error) {
			return undefined;
		}
	}

	async getCredentialFromFile(
		filePath: string,
		root = this.gitFolder,
	): Promise<ExportableCredential | undefined> {
		try {
			const credential = jsonParse<ExportableCredential>(
				await fsReadFile(path.join(root, filePath), { encoding: 'utf8' }),
			);
			return credential;
		} catch (error) {
			return undefined;
		}
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

	async cleanWorkFolder() {
		try {
			const workflowFiles = await glob('*.json', {
				cwd: this.workflowExportFolder,
				absolute: true,
			});
			const credentialFiles = await glob('*.json', {
				cwd: this.credentialExportFolder,
				absolute: true,
			});
			const variablesFile = await glob(VERSION_CONTROL_VARIABLES_EXPORT_FILE, {
				cwd: this.gitFolder,
				absolute: true,
			});
			const tagsFile = await glob(VERSION_CONTROL_TAGS_EXPORT_FILE, {
				cwd: this.gitFolder,
				absolute: true,
			});
			await Promise.all(tagsFile.map(async (e) => fsRm(e)));
			await Promise.all(variablesFile.map(async (e) => fsRm(e)));
			await Promise.all(workflowFiles.map(async (e) => fsRm(e)));
			await Promise.all(credentialFiles.map(async (e) => fsRm(e)));
			LoggerProxy.debug('Cleaned work folder.');
		} catch (error) {
			LoggerProxy.error(`Failed to clean work folder: ${(error as Error).message}`);
		}
	}

	async deleteRepositoryFolder() {
		try {
			await fsRm(this.gitFolder, { recursive: true });
		} catch (error) {
			LoggerProxy.error(`Failed to delete work folder: ${(error as Error).message}`);
		}
	}

	private async rmDeletedWorkflowsFromExportFolder(
		workflowsToBeExported: SharedWorkflow[],
	): Promise<Set<string>> {
		const sharedWorkflowsFileNames = new Set<string>(
			workflowsToBeExported.map((e) => this.getWorkflowPath(e?.workflow?.name)),
		);
		const existingWorkflowsInFolder = new Set<string>(
			await glob('*.json', {
				cwd: this.workflowExportFolder,
				absolute: true,
			}),
		);
		const deletedWorkflows = new Set(existingWorkflowsInFolder);
		for (const elem of sharedWorkflowsFileNames) {
			deletedWorkflows.delete(elem);
		}
		try {
			await Promise.all([...deletedWorkflows].map(async (e) => fsRm(e)));
		} catch (error) {
			LoggerProxy.error(`Failed to delete workflows from work folder: ${(error as Error).message}`);
		}
		return deletedWorkflows;
	}

	private async writeExportableWorkflowsToExportFolder(workflowsToBeExported: SharedWorkflow[]) {
		await Promise.all(
			workflowsToBeExported.map(async (e) => {
				if (!e.workflow) {
					LoggerProxy.debug(
						`Found no corresponding workflow ${e.workflowId ?? 'unknown'}, skipping export`,
					);
					return;
				}
				const fileName = this.getWorkflowPath(e.workflow?.id);
				const sanitizedWorkflow: ExportableWorkflow = {
					active: e.workflow?.active,
					id: e.workflow?.id,
					name: e.workflow?.name,
					nodes: e.workflow?.nodes,
					connections: e.workflow?.connections,
					settings: e.workflow?.settings,
					triggerCount: e.workflow?.triggerCount,
					owner: e.user.email,
					versionId: e.workflow?.versionId,
				};
				LoggerProxy.debug(`Writing workflow ${e.workflowId} to ${fileName}`);
				return fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
			}),
		);
	}

	async exportWorkflowsToWorkFolder(): Promise<ExportResult> {
		try {
			versionControlFoldersExistCheck([this.workflowExportFolder]);
			const sharedWorkflows = await Db.collections.SharedWorkflow.find({
				relations: ['workflow', 'role', 'user'],
				where: {
					role: {
						name: 'owner',
						scope: 'workflow',
					},
				},
			});

			// before exporting, figure out which workflows have been deleted and remove them from the export folder
			const removedFiles = await this.rmDeletedWorkflowsFromExportFolder(sharedWorkflows);
			// write the workflows to the export folder as json files
			await this.writeExportableWorkflowsToExportFolder(sharedWorkflows);
			return {
				count: sharedWorkflows.length,
				folder: this.workflowExportFolder,
				files: sharedWorkflows.map((e) => ({
					id: e?.workflow?.id,
					name: this.getWorkflowPath(e?.workflow?.name),
				})),
				removedFiles: [...removedFiles],
			};
		} catch (error) {
			throw Error(`Failed to export workflows to work folder: ${(error as Error).message}`);
		}
	}

	async exportVariablesToWorkFolder(): Promise<ExportResult> {
		try {
			versionControlFoldersExistCheck([this.gitFolder]);
			const variables = await Db.collections.Variables.find();
			// do not export empty variables
			if (variables.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const fileName = this.getVariablesPath();
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
			throw Error(`Failed to export variables to work folder: ${(error as Error).message}`);
		}
	}

	async exportTagsToWorkFolder(): Promise<ExportResult> {
		try {
			versionControlFoldersExistCheck([this.gitFolder]);
			const tags = await Db.collections.Tag.find();
			const mappings = await Db.collections.WorkflowTagMapping.find();
			const fileName = this.getTagsPath();
			await fsWriteFile(
				fileName,
				JSON.stringify(
					{
						tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
						mappings,
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
			throw Error(`Failed to export variables to work folder: ${(error as Error).message}`);
		}
	}

	private replaceCredentialData = (
		data: ICredentialDataDecryptedObject,
	): ICredentialDataDecryptedObject => {
		for (const [key] of Object.entries(data)) {
			try {
				if (typeof data[key] === 'object') {
					data[key] = this.replaceCredentialData(data[key] as ICredentialDataDecryptedObject);
				} else if (typeof data[key] === 'string') {
					data[key] = (data[key] as string)?.startsWith('={{') ? data[key] : '';
				} else if (typeof data[key] === 'number') {
					// TODO: leaving numbers in for now, but maybe we should remove them
					// data[key] = 0;
				}
			} catch (error) {
				LoggerProxy.error(`Failed to sanitize credential data: ${(error as Error).message}`);
				throw error;
			}
		}
		return data;
	};

	async exportCredentialsToWorkFolder(): Promise<ExportResult> {
		try {
			versionControlFoldersExistCheck([this.credentialExportFolder]);
			const sharedCredentials = await Db.collections.SharedCredentials.find({
				relations: ['credentials', 'role', 'user'],
			});
			const encryptionKey = await UserSettings.getEncryptionKey();
			await Promise.all(
				sharedCredentials.map(async (sharedCredential) => {
					const { name, type, nodesAccess, data, id } = sharedCredential.credentials;
					const credentialObject = new Credentials({ id, name }, type, nodesAccess, data);
					const plainData = credentialObject.getData(encryptionKey);
					const sanitizedData = this.replaceCredentialData(plainData);
					const fileName = path.join(
						this.credentialExportFolder,
						`${sharedCredential.credentials.id}.json`,
					);
					const sanitizedCredential: ExportableCredential = {
						id: sharedCredential.credentials.id,
						name: sharedCredential.credentials.name,
						type: sharedCredential.credentials.type,
						data: sanitizedData,
					};
					LoggerProxy.debug(`Writing credential ${sharedCredential.credentials.id} to ${fileName}`);
					return fsWriteFile(fileName, JSON.stringify(sanitizedCredential, null, 2));
				}),
			);
			return {
				count: sharedCredentials.length,
				folder: this.credentialExportFolder,
				files: sharedCredentials.map((e) => ({
					id: e.credentials.id,
					name: path.join(this.credentialExportFolder, `${e.credentials.name}.json`),
				})),
			};
		} catch (error) {
			throw Error(`Failed to export credentials to work folder: ${(error as Error).message}`);
		}
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

					const { name, type, data, id } = credential;
					const newCredentialObject = new Credentials({ id, name }, type, []);
					if (existingCredential?.data) {
						newCredentialObject.data = existingCredential.data;
					} else {
						newCredentialObject.setData(data, encryptionKey);
					}
					if (existingCredential?.nodesAccess) {
						newCredentialObject.nodesAccess = existingCredential.nodesAccess;
					}

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

					// TODO: once IDs are unique, remove this
					if (config.getEnv('database.type') === 'postgresdb') {
						await transactionManager.query(
							"SELECT setval('credentials_entity_id_seq', (SELECT MAX(id) from credentials_entity))",
						);
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
	}): Promise<{ added: string[]; changed: string[] }> {
		const variablesFile = await glob(VERSION_CONTROL_VARIABLES_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (variablesFile.length > 0) {
			LoggerProxy.debug(`Importing variables from file ${variablesFile[0]}`);
			const overriddenKeys = Object.keys(valueOverrides ?? {});
			const importedVariables = jsonParse<Variables[]>(
				await fsReadFile(variablesFile[0], { encoding: 'utf8' }),
				{ fallbackValue: [] },
			);
			const importedKeys = importedVariables.map((variable) => variable.key);
			const existingVariables = await Db.collections.Variables.find();
			const existingKeys = existingVariables.map((variable) => variable.key);
			const addedKeysFromImport = without(importedKeys, ...existingKeys);
			const addedKeysFromOverride = without(overriddenKeys, ...existingKeys);
			const addedVariables = importedVariables.filter((e) => addedKeysFromImport.includes(e.key));
			addedKeysFromOverride.forEach((key) => {
				addedVariables.push({
					key,
					value: valueOverrides ? valueOverrides[key] : '',
					type: 'string',
				} as Variables);
			});

			// first round, add missing variable keys to Db without touching values
			await Db.transaction(async (transactionManager) => {
				await Promise.all(
					addedVariables.map(async (addedVariable) => {
						await transactionManager.insert(Variables, {
							...addedVariable,
							id: undefined,
						});
					}),
				);
			});

			// second round, update values of existing variables if overridden
			if (valueOverrides) {
				await Db.transaction(async (transactionManager) => {
					await Promise.all(
						overriddenKeys.map(async (key) => {
							await transactionManager.update(Variables, { key }, { value: valueOverrides[key] });
						}),
					);
				});
			}
			return {
				added: [...addedKeysFromImport, ...addedKeysFromOverride],
				changed: without(overriddenKeys, ...addedKeysFromOverride),
			};
		}
		return { added: [], changed: [] };
	}

	private async importTagsFromFile() {
		const tagsFile = await glob(VERSION_CONTROL_TAGS_EXPORT_FILE, {
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
		// TODO: once IDs are unique and we removed autoincrement, remove this
		if (config.getEnv('database.type') === 'postgresdb') {
			await Db.transaction(async (transactionManager) => {
				await transactionManager.query(
					'ALTER SEQUENCE IF EXISTS "workflow_entity_id_seq" RESTART;',
				);
				await transactionManager.query(
					"SELECT setval('workflow_entity_id_seq', (SELECT MAX(id) from workflow_entity) );",
					// "SELECT setval('workflow_entity_id_seq', (SELECT MAX(v) FROM (VALUES (1), ((SELECT MAX(id) from workflow_entity))) as value(v)));",
				);
			});
		}
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

	async importFromWorkFolder(options: VersionControllPullOptions): Promise<ImportResult> {
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
