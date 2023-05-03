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

	async importFromWorkFolder(): Promise<ExportResult> {
		try {
			const files = await glob('*.json', {
				cwd: this.gitFolder,
				absolute: true,
			});
			const existingWorkflows = await Db.collections.Workflow.find({
				select: ['id', 'name', 'versionId'],
			});
			const importResult = await Promise.all(
				files.map(async (file) => {
					const workflow = jsonParse<IWorkflowToImport>(
						await fsReadFile(file, { encoding: 'utf8' }),
					);

					//TODO: TEMP IMPLEMENTATION

					if (
						existingWorkflows.find(
							(e) => e.name === workflow.name && e.versionId === workflow.versionId,
						)
					) {
						// Workflow with same id and version already exists, skip
						console.log(`Skipping workflow ${workflow.name} with same id and version`);
					}
					return {
						id: workflow.id ?? 'unknown',
						name: file,
					};
					// TODO: run actual import
				}),
			);
			return {
				count: importResult.length,
				folder: this.workflowExportFolder,
				files: importResult,
			};
		} catch (error) {
			throw Error(`Failed to import workflows from work folder: ${(error as Error).message}`);
		}
	}
}
