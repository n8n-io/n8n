import { Service } from 'typedi';
import path from 'path';
import {
	VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	VERSION_CONTROL_GIT_FOLDER,
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
import type { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import type { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import type { Variables } from '@/databases/entities/Variables';
import type { ImportResult } from './types/importResult';
import { UM_FIX_INSTRUCTION } from '../../commands/BaseCommand';
import config from '../../config';
// import { WorkflowEntity } from '../../databases/entities/WorkflowEntity';

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
		await Promise.all(
			workflowsToBeExported.map(async (e) => {
				// TODO: using workflowname for now, until IDs are unique
				const fileName = this.getWorkflowPath(e.workflow.name);
				const sanitizedWorkflow: ExportableWorkflow = {
					id: e.workflow.id,
					name: e.workflow.name,
					nodes: e.workflow.nodes,
					connections: e.workflow.connections,
					settings: e.workflow.settings,
					triggerCount: e.workflow.triggerCount,
					owner: e.user.email,
				};
				return fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
			}),
		);
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
					name: path.join(this.workflowExportFolder, `${e.workflow.name}.json`),
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
			const fileName = path.join(this.gitFolder, VERSION_CONTROL_VARIABLES_EXPORT_FILE);
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
						nodesAccess: e.credentials.nodesAccess,
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
			select: ['id', 'name', 'type'],
		});
		const ownerCredentialRole = await this.getOwnerCredentialRole();
		const importCredentialsResult = await Promise.all(
			credentialFiles.map(async (file) => {
				const credential = jsonParse<ExportableCredential>(
					await fsReadFile(file, { encoding: 'utf8' }),
				);
				const existingCredential = existingCredentials.find(
					(e) => e.id === credential.id && e.type === credential.type,
				);
				const newCredential = Db.collections.Credentials.create({
					id: credential.id,
					name: credential.name,
					type: credential.type,
					data: existingCredential?.data ?? '',
					nodesAccess: credential.nodesAccess,
				});
				await Db.collections.Credentials.upsert({ ...newCredential }, ['id']);
				await Db.collections.SharedCredentials.upsert(
					{
						credentialsId: newCredential.id,
						userId,
						roleId: ownerCredentialRole.id,
					},
					['credentialsId', 'userId'],
				);
				// TODO: once IDs are unique, remove this
				if (config.getEnv('database.type') === 'postgresdb') {
					await Db.getConnection().query(
						"SELECT setval('credentials_entity_id_seq', (SELECT MAX(id) from credentials_entity))",
					);
				}
				return newCredential;
			}),
		);
		return importCredentialsResult.filter((e) => e !== undefined);
	}

	private async importVariablesFromFile(): Promise<Variables[]> {
		const variablesFile = await glob(VERSION_CONTROL_VARIABLES_EXPORT_FILE, {
			cwd: this.gitFolder,
			absolute: true,
		});
		if (variablesFile.length > 0) {
			const variables = jsonParse<Variables[]>(
				await fsReadFile(variablesFile[0], { encoding: 'utf8' }),
				{ fallbackValue: [] },
			);
			await Promise.all(
				variables.map(async (variable) => {
					await Db.collections.Variables.upsert(
						{ ...variable },
						{
							skipUpdateIfNoValuesChanged: true,
							conflictPaths: { id: true },
						},
					);
				}),
			);
			return variables;
		}
		return [];
	}

	// TODO: TEMP IMPLEMENTATION
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

		const importWorkflowsResult = await Promise.all(
			workflowFiles.map(async (file) => {
				const newWorkflow = jsonParse<IWorkflowToImport>(
					await fsReadFile(file, { encoding: 'utf8' }),
				);
				const existingWorkflow = existingWorkflows.find((e) => e.id === newWorkflow.id);
				newWorkflow.active = existingWorkflow?.active ?? false;
				await Db.collections.Workflow.upsert({ ...newWorkflow }, ['id']);
				await Db.collections.SharedWorkflow.upsert(
					{
						workflowId: newWorkflow.id,
						userId,
						roleId: ownerWorkflowRole.id,
					},
					['workflowId', 'userId'],
				);
				// TODO: once IDs are unique, remove this
				if (config.getEnv('database.type') === 'postgresdb') {
					await Db.getConnection().query(
						"SELECT setval('workflow_entity_id_seq', (SELECT MAX(id) from workflow_entity))",
					);
				}
				return {
					id: newWorkflow.id ?? 'unknown',
					name: file,
				};
			}),
		);
		return importWorkflowsResult;
	}

	async importFromWorkFolder(userId: string): Promise<ImportResult> {
		try {
			const importedVariables = await this.importVariablesFromFile();
			const importedCredentials = await this.importCredentialsFromFiles(userId);
			const importWorkflows = await this.importWorkflowsFromFiles(userId);

			return {
				workflows: importWorkflows,
				variables: importedVariables,
				credentials: importedCredentials,
			};
		} catch (error) {
			throw Error(`Failed to import workflows from work folder: ${(error as Error).message}`);
		}
	}
}
