import { Service } from 'typedi';
import path from 'path';
import {
	VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	VERSION_CONTROL_GIT_FOLDER,
	VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import * as Db from '@/Db';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { constants as fsConstants } from 'fs';
import {
	writeFile as fsWriteFile,
	readFile as fsReadFile,
	access as fsAccess,
	mkdir as fsMkdir,
} from 'fs/promises';
import { VersionControlGitService } from './git.service.ee';
import { UserSettings } from 'n8n-core';
import type { IWorkflowToImport } from '@/Interfaces';
import type { ExportableWorkflow } from './types/exportableWorkflow';
import type { ExportableCredential } from './types/exportableCredential';
import type { ExportResult } from './types/exportResult';

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
			await Promise.all(
				sharedWorkflows.map(async (e) => {
					// TODO: using workflowname for now, until IDs are unique
					const fileName = path.join(this.workflowExportFolder, `${e.workflow.name}.json`);
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
			// TODO: also write variables
			return {
				count: sharedWorkflows.length,
				folder: this.workflowExportFolder,
				files: sharedWorkflows.map((e) => ({
					id: e.workflow.id,
					name: path.join(this.workflowExportFolder, `${e.workflow.name}.json`),
				})),
			};
		} catch (error) {
			throw Error(`Failed to export workflows to work folder: ${(error as Error).message}`);
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
