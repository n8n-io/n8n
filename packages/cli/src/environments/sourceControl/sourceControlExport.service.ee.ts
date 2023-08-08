import { Service } from 'typedi';
import path from 'path';
import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import * as Db from '@/Db';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';
import { writeFile as fsWriteFile, rm as fsRm } from 'fs/promises';
import { rmSync } from 'fs';
import { Credentials, UserSettings } from 'n8n-core';
import type { ExportableWorkflow } from './types/exportableWorkflow';
import type { ExportableCredential } from './types/exportableCredential';
import type { ExportResult } from './types/exportResult';
import {
	getCredentialExportPath,
	getVariablesPath,
	getWorkflowExportPath,
	sourceControlFoldersExistCheck,
	stringContainsExpression,
} from './sourceControlHelper.ee';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { In } from 'typeorm';
import type { SourceControlledFile } from './types/sourceControlledFile';
import { VariablesService } from '../variables/variables.service';
import { TagRepository } from '@/databases/repositories';

@Service()
export class SourceControlExportService {
	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	constructor(
		private readonly variablesService: VariablesService,
		private readonly tagRepository: TagRepository,
	) {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.gitFolder = path.join(userFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
	}

	getWorkflowPath(workflowId: string): string {
		return getWorkflowExportPath(workflowId, this.workflowExportFolder);
	}

	getCredentialsPath(credentialsId: string): string {
		return getCredentialExportPath(credentialsId, this.credentialExportFolder);
	}

	async deleteRepositoryFolder() {
		try {
			await fsRm(this.gitFolder, { recursive: true });
		} catch (error) {
			LoggerProxy.error(`Failed to delete work folder: ${(error as Error).message}`);
		}
	}

	public rmFilesFromExportFolder(filesToBeDeleted: Set<string>): Set<string> {
		try {
			filesToBeDeleted.forEach((e) => rmSync(e));
		} catch (error) {
			LoggerProxy.error(`Failed to delete workflows from work folder: ${(error as Error).message}`);
		}
		return filesToBeDeleted;
	}

	private async writeExportableWorkflowsToExportFolder(
		workflowsToBeExported: WorkflowEntity[],
		owners: Record<string, string>,
	) {
		await Promise.all(
			workflowsToBeExported.map(async (e) => {
				const fileName = this.getWorkflowPath(e.id);
				const sanitizedWorkflow: ExportableWorkflow = {
					id: e.id,
					name: e.name,
					nodes: e.nodes,
					connections: e.connections,
					settings: e.settings,
					triggerCount: e.triggerCount,
					versionId: e.versionId,
					owner: owners[e.id],
				};
				LoggerProxy.debug(`Writing workflow ${e.id} to ${fileName}`);
				return fsWriteFile(fileName, JSON.stringify(sanitizedWorkflow, null, 2));
			}),
		);
	}

	async exportWorkflowsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.workflowExportFolder]);
			const workflowIds = candidates.map((e) => e.id);
			const sharedWorkflows = await Db.collections.SharedWorkflow.find({
				relations: ['role', 'user'],
				where: {
					role: {
						name: 'owner',
						scope: 'workflow',
					},
					workflowId: In(workflowIds),
				},
			});
			const workflows = await Db.collections.Workflow.find({
				where: {
					id: In(workflowIds),
				},
			});

			// determine owner of each workflow to be exported
			const owners: Record<string, string> = {};
			sharedWorkflows.forEach((e) => (owners[e.workflowId] = e.user.email));

			// write the workflows to the export folder as json files
			await this.writeExportableWorkflowsToExportFolder(workflows, owners);

			// await fsWriteFile(ownersFileName, JSON.stringify(owners, null, 2));
			return {
				count: sharedWorkflows.length,
				folder: this.workflowExportFolder,
				files: workflows.map((e) => ({
					id: e?.id,
					name: this.getWorkflowPath(e?.name),
				})),
			};
		} catch (error) {
			throw Error(`Failed to export workflows to work folder: ${(error as Error).message}`);
		}
	}

	async exportVariablesToWorkFolder(): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder]);
			const variables = await this.variablesService.getAllCached();
			// do not export empty variables
			if (variables.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const fileName = getVariablesPath(this.gitFolder);
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
			const tags = await this.tagRepository.find();
			// do not export empty tags
			if (tags.length === 0) {
				return {
					count: 0,
					folder: this.gitFolder,
					files: [],
				};
			}
			const mappings = await Db.collections.WorkflowTagMapping.find();
			const fileName = path.join(this.gitFolder, SOURCE_CONTROL_TAGS_EXPORT_FILE);
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
					data[key] = stringContainsExpression(data[key] as string) ? data[key] : '';
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

	async exportCredentialsToWorkFolder(candidates: SourceControlledFile[]): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.credentialExportFolder]);
			const credentialIds = candidates.map((e) => e.id);
			const credentialsToBeExported = await Db.collections.SharedCredentials.find({
				relations: ['credentials', 'role', 'user'],
				where: {
					credentialsId: In(credentialIds),
				},
			});
			let missingIds: string[] = [];
			if (credentialsToBeExported.length !== credentialIds.length) {
				const foundCredentialIds = credentialsToBeExported.map((e) => e.credentialsId);
				missingIds = credentialIds.filter(
					(remote) => foundCredentialIds.findIndex((local) => local === remote) === -1,
				);
			}
			const encryptionKey = await UserSettings.getEncryptionKey();
			await Promise.all(
				credentialsToBeExported.map(async (sharedCredential) => {
					const { name, type, nodesAccess, data, id } = sharedCredential.credentials;
					const credentialObject = new Credentials({ id, name }, type, nodesAccess, data);
					const plainData = credentialObject.getData(encryptionKey);
					const sanitizedData = this.replaceCredentialData(plainData);
					const fileName = this.getCredentialsPath(sharedCredential.credentials.id);
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
				count: credentialsToBeExported.length,
				folder: this.credentialExportFolder,
				files: credentialsToBeExported.map((e) => ({
					id: e.credentials.id,
					name: path.join(this.credentialExportFolder, `${e.credentials.name}.json`),
				})),
				missingIds,
			};
		} catch (error) {
			throw Error(`Failed to export credentials to work folder: ${(error as Error).message}`);
		}
	}
}
