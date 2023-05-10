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
import { LoggerProxy, jsonParse } from 'n8n-workflow';
import { constants as fsConstants } from 'fs';
import {
	writeFile as fsWriteFile,
	readFile as fsReadFile,
	access as fsAccess,
	mkdir as fsMkdir,
	rm as fsRm,
} from 'fs/promises';
import { VersionControlGitService } from './git.service.ee';
import { UserSettings } from 'n8n-core';
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

	private async getOwnerCredentialRole() {
		const ownerCredentiallRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'global' },
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
		} catch (error) {
			LoggerProxy.error(`Failed to clean work folder: ${(error as Error).message}`);
		}
	}

	private async rmDeletedWorkflowsFromExportFolder(
		workflowsToBeExported: SharedWorkflow[],
	): Promise<Set<string>> {
		const sharedWorkflowsFileNames = new Set<string>(
			workflowsToBeExported.map((e) => this.getWorkflowPath(e.workflow.name)),
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
		const workflowVersionIdMap = await this.getWorkflowAndVersionIdsInWorkFolder();
		await Promise.all(
			workflowsToBeExported.map(async (e) => {
				// TODO: using workflowname for now, until IDs are unique
				if (workflowVersionIdMap.get(e.workflowId) === e.workflow.versionId) {
					LoggerProxy.debug(
						`Skipping workflow ${e.workflowId} export as its versionId is already up to date`,
					);
					return;
				}
				const fileName = this.getWorkflowPath(e.workflow.name);
				const sanitizedWorkflow: ExportableWorkflow = {
					active: e.workflow.active,
					id: e.workflow.id,
					name: e.workflow.name,
					nodes: e.workflow.nodes,
					connections: e.workflow.connections,
					settings: e.workflow.settings,
					triggerCount: e.workflow.triggerCount,
					owner: e.user.email,
					versionId: e.workflow.versionId,
				};
				LoggerProxy.debug(`Writing workflow ${e.workflowId} to ${fileName}`);
				return fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
			}),
		);
	}

	private async getWorkflowAndVersionIdsInWorkFolder(): Promise<Map<string, string>> {
		const workflowFiles = await glob('*.json', {
			cwd: this.workflowExportFolder,
			absolute: true,
		});

		const workflowVersionIdMap = new Map<string, string>();
		await Promise.all(
			workflowFiles.map(async (file) => {
				const importedWorkflow = jsonParse<IWorkflowToImport>(
					await fsReadFile(file, { encoding: 'utf8' }),
				);
				if (importedWorkflow.id && importedWorkflow.versionId) {
					workflowVersionIdMap.set(importedWorkflow.id, importedWorkflow.versionId);
				}
			}),
		);
		return workflowVersionIdMap;
	}

	async exportWorkflowsToWorkFolder(): Promise<ExportResult> {
		try {
			try {
				await fsAccess(this.workflowExportFolder, fsConstants.F_OK);
			} catch (error) {
				await fsMkdir(this.workflowExportFolder);
			}
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
					id: e.workflow.id,
					// name: path.join(this.workflowExportFolder, `${e.workflow.name}.json`),
					name: this.getWorkflowPath(e.workflow.name),
				})),
				removedFiles: [...removedFiles],
			};
		} catch (error) {
			throw Error(`Failed to export workflows to work folder: ${(error as Error).message}`);
		}
	}

	async exportVariablesToWorkFolder(): Promise<ExportResult> {
		try {
			try {
				await fsAccess(this.gitFolder, fsConstants.F_OK);
			} catch (error) {
				await fsMkdir(this.gitFolder);
			}
			const variables = await Db.collections.Variables.find();
			const fileName = this.getVariablesPath();
			await fsWriteFile(fileName, JSON.stringify(variables, null, 2));
			return {
				count: variables.length,
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
			try {
				await fsAccess(this.gitFolder, fsConstants.F_OK);
			} catch (error) {
				await fsMkdir(this.gitFolder);
			}
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

	async exportCredentialsToWorkFolder(): Promise<ExportResult> {
		try {
			try {
				await fsAccess(this.credentialExportFolder, fsConstants.F_OK);
			} catch (error) {
				await fsMkdir(this.credentialExportFolder);
			}
			const sharedCredentials = await Db.collections.SharedCredentials.find({
				relations: ['credentials', 'role', 'user'],
			});
			await Promise.all(
				sharedCredentials.map(async (e) => {
					// TODO: using credential name for now, until IDs are unique
					const fileName = path.join(this.credentialExportFolder, `${e.credentials.name}.json`);
					const sanitizedCredential: ExportableCredential = {
						id: e.credentials.id,
						name: e.credentials.name,
						type: e.credentials.type,
						// nodesAccess: e.credentials.nodesAccess,
					};
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

	private async importCredentialsFromFiles(userId: string): Promise<CredentialsEntity[]> {
		const credentialFiles = await glob('*.json', {
			cwd: this.credentialExportFolder,
			absolute: true,
		});
		const existingCredentials = await Db.collections.Credentials.find({
			select: ['id', 'name', 'type', 'nodesAccess'],
		});
		const ownerCredentialRole = await this.getOwnerCredentialRole();
		let importCredentialsResult: CredentialsEntity[] = [];
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

					const newCredential = new CredentialsEntity();
					newCredential.id = credential.id;
					newCredential.name = credential.name;
					newCredential.type = credential.type;
					newCredential.data = existingCredential?.data ?? '';
					newCredential.nodesAccess = existingCredential?.nodesAccess ?? [];

					const newSharedCredential = new SharedCredentials();
					newSharedCredential.credentialsId = newCredential.id;
					newSharedCredential.userId = userId;
					newSharedCredential.roleId = ownerCredentialRole.id;

					LoggerProxy.debug(`Updating credential id ${newCredential.id}`);
					await transactionManager.upsert(CredentialsEntity, { ...newCredential }, ['id']);
					await transactionManager.upsert(SharedCredentials, { ...newSharedCredential }, [
						'credentialsId',
						'userId',
					]);
					// TODO: once IDs are unique, remove this
					if (config.getEnv('database.type') === 'postgresdb') {
						await transactionManager.query(
							"SELECT setval('credentials_entity_id_seq', (SELECT MAX(id) from credentials_entity))",
						);
					}
					return newCredential;
				}),
			);
		});
		return importCredentialsResult.filter((e) => e !== undefined);
	}

	private async importVariablesFromFile(): Promise<Variables[]> {
		const variablesFile = await glob(VERSION_CONTROL_VARIABLES_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (variablesFile.length > 0) {
			LoggerProxy.debug(`Importing variables from file ${variablesFile[0]}`);
			const variables = jsonParse<Variables[]>(
				await fsReadFile(variablesFile[0], { encoding: 'utf8' }),
				{ fallbackValue: [] },
			);
			await Db.transaction(async (transactionManager) => {
				await Promise.all(
					variables.map(async (variable) => {
						await transactionManager.upsert(
							Variables,
							{ ...variable },
							{
								skipUpdateIfNoValuesChanged: true,
								conflictPaths: { id: true },
							},
						);
					}),
				);
			});
			return variables;
		}
		return [];
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
		await Db.transaction(async (transactionManager) => {
			importWorkflowsResult = await Promise.all(
				workflowFiles.map(async (file) => {
					LoggerProxy.debug(`Importing workflow file ${file}`);
					const importedWorkflow = jsonParse<IWorkflowToImport>(
						await fsReadFile(file, { encoding: 'utf8' }),
					);
					const existingWorkflow = existingWorkflows.find((e) => e.id === importedWorkflow.id);
					if (existingWorkflow?.versionId === importedWorkflow.versionId) {
						LoggerProxy.debug(
							`Skipping import of workflow ${
								importedWorkflow.id ?? 'n/a'
							} export as its versionId is already up to date`,
						);
						return {
							id: importedWorkflow.id ?? 'n/a',
							name: 'skipped',
						};
					}

					importedWorkflow.active = existingWorkflow?.active ?? false;
					LoggerProxy.debug(`Updating workflow id ${importedWorkflow.id ?? 'new'}`);
					await transactionManager.upsert(WorkflowEntity, { ...importedWorkflow }, ['id']);
					await transactionManager.upsert(
						SharedWorkflow,
						{
							workflowId: importedWorkflow.id,
							userId,
							roleId: ownerWorkflowRole.id,
						},
						['workflowId', 'userId'],
					);
					// TODO: once IDs are unique, remove this
					if (config.getEnv('database.type') === 'postgresdb') {
						await transactionManager.query(
							"SELECT setval('workflow_entity_id_seq', (SELECT MAX(id) from workflow_entity))",
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

	async importFromWorkFolder(userId: string): Promise<ImportResult> {
		try {
			const importedVariables = await this.importVariablesFromFile();
			const importedCredentials = await this.importCredentialsFromFiles(userId);
			const importWorkflows = await this.importWorkflowsFromFiles(userId);
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
