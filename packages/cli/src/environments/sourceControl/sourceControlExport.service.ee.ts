import { Service } from 'typedi';
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
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { LoggerProxy, jsonParse } from 'n8n-workflow';
import { writeFile as fsWriteFile, readFile as fsReadFile, rm as fsRm } from 'fs/promises';
import { Credentials, UserSettings } from 'n8n-core';
import type { IWorkflowToImport } from '@/Interfaces';
import type { ExportableWorkflow } from './types/exportableWorkflow';
import type { ExportableCredential } from './types/exportableCredential';
import type { ExportResult } from './types/exportResult';
import type { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { sourceControlFoldersExistCheck } from './sourceControlHelper.ee';

@Service()
export class SourceControlExportService {
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

	getWorkflowPath(workflowId: string): string {
		return path.join(this.workflowExportFolder, `${workflowId}.json`);
	}

	getCredentialsPath(credentialsId: string): string {
		return path.join(this.credentialExportFolder, `${credentialsId}.json`);
	}

	getTagsPath(): string {
		return path.join(this.gitFolder, SOURCE_CONTROL_TAGS_EXPORT_FILE);
	}

	getVariablesPath(): string {
		return path.join(this.gitFolder, SOURCE_CONTROL_VARIABLES_EXPORT_FILE);
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
			const variablesFile = await glob(SOURCE_CONTROL_VARIABLES_EXPORT_FILE, {
				cwd: this.gitFolder,
				absolute: true,
			});
			const tagsFile = await glob(SOURCE_CONTROL_TAGS_EXPORT_FILE, {
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
			sourceControlFoldersExistCheck([this.workflowExportFolder]);
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
			sourceControlFoldersExistCheck([this.gitFolder]);
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
			sourceControlFoldersExistCheck([this.gitFolder]);
			const tags = await Db.collections.Tag.find();
			// do not export empty tags
			if (tags.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
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
				if (data[key] === null) {
					delete data[key]; // remove invalid null values
				} else if (typeof data[key] === 'object') {
					data[key] = this.replaceCredentialData(data[key] as ICredentialDataDecryptedObject);
				} else if (typeof data[key] === 'string') {
					data[key] = (data[key] as string)?.startsWith('={{') ? data[key] : '';
				} else if (typeof data[key] === 'number') {
					// TODO: leaving numbers in for now, but maybe we should remove them
					continue;
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
			sourceControlFoldersExistCheck([this.credentialExportFolder]);
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
						nodesAccess: sharedCredential.credentials.nodesAccess,
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
}
