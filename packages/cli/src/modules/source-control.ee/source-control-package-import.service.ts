import { Logger } from '@n8n/backend-common';
import type { Variables } from '@n8n/db';
import {
	CredentialsRepository,
	FolderRepository,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableColumnRepository } from '@/modules/data-table/data-table-column.repository';
import { DataTableColumn } from '@/modules/data-table/data-table-column.entity';
import { DataTableDDLService } from '@/modules/data-table/data-table-ddl.service';
import { Service } from '@n8n/di';
import { PROJECT_ADMIN_ROLE_SLUG } from '@n8n/permissions';
import { In } from '@n8n/typeorm';
import { Credentials, InstanceSettings } from 'n8n-core';
import { ensureError, jsonParse, UnexpectedError } from 'n8n-workflow';
import { readdir, readFile } from 'node:fs/promises';
import path from 'path';

import {
	isValidDataTableColumnType,
	mergeRemoteCrendetialDataIntoLocalCredentialData,
	sanitizeCredentialData,
} from './source-control-helper.ee';
import { SOURCE_CONTROL_GIT_FOLDER } from './constants';
import type { ExportableCredential } from './types/exportable-credential';
import type { ExportableDataTable } from './types/exportable-data-table';
import type { ExportableFolder } from './types/exportable-folders';
import type { ExportableManifest } from './types/exportable-manifest';
import type { ExportableProject } from './types/exportable-project';
import type { ExportableVariable } from './types/exportable-variable';
import type { ExportableWorkflow } from './types/exportable-workflow';
import { VariablesService } from '../../environments.ee/variables/variables.service.ee';

export interface PackageImportResult {
	projects: Array<{ id: string; name: string }>;
	workflows: Array<{ id: string; name: string }>;
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: { imported: string[] };
	folders: { imported: number };
	dataTables: { imported: string[] };
}

export interface PackageProjectPreview {
	id: string;
	name: string;
	dirName: string;
	workflows: Array<{ id: string; name: string }>;
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: Array<{ id: string; key: string }>;
	folders: Array<{ id: string; name: string }>;
	dataTables: Array<{ id: string; name: string }>;
}

export interface PackagePreview {
	projects: PackageProjectPreview[];
	exportedAt: string;
	exportedBy: string;
}

@Service()
export class SourceControlPackageImportService {
	private gitFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly folderRepository: FolderRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly variablesRepository: VariablesRepository,
		private readonly variablesService: VariablesService,
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly dataTableDDLService: DataTableDDLService,
		instanceSettings: InstanceSettings,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
	}

	async previewPackage(): Promise<PackagePreview> {
		const manifest = await this.readManifest();

		const projects: PackageProjectPreview[] = [];

		for (const projectEntry of manifest.projects) {
			const projectDir = path.join(this.gitFolder, 'projects', projectEntry.dirName);
			try {
				const preview = await this.previewSingleProject(projectDir, projectEntry);
				projects.push(preview);
			} catch (error) {
				this.logger.error(`Failed to preview project ${projectEntry.name}`, {
					error: ensureError(error),
				});
			}
		}

		return {
			projects,
			exportedAt: manifest.exportedAt,
			exportedBy: manifest.exportedBy,
		};
	}

	async importPackage(userId: string, projectIds?: string[]): Promise<PackageImportResult> {
		const manifest = await this.readManifest();

		const result: PackageImportResult = {
			projects: [],
			workflows: [],
			credentials: [],
			variables: { imported: [] },
			folders: { imported: 0 },
			dataTables: { imported: [] },
		};

		const projectsToImport = projectIds
			? manifest.projects.filter((p) => projectIds.includes(p.id))
			: manifest.projects;

		for (const projectEntry of projectsToImport) {
			const projectDir = path.join(this.gitFolder, 'projects', projectEntry.dirName);

			try {
				const projectResult = await this.importSingleProject(projectDir, userId);
				result.projects.push(...projectResult.projects);
				result.workflows.push(...projectResult.workflows);
				result.credentials.push(...projectResult.credentials);
				result.variables.imported.push(...projectResult.variables.imported);
				result.folders.imported += projectResult.folders.imported;
				result.dataTables.imported.push(...projectResult.dataTables.imported);
			} catch (error) {
				this.logger.error(`Failed to import project ${projectEntry.name}`, {
					error: ensureError(error),
				});
			}
		}

		return result;
	}

	private async readManifest(): Promise<ExportableManifest> {
		const manifestPath = path.join(this.gitFolder, 'manifest.json');
		try {
			const content = await readFile(manifestPath, 'utf8');
			return jsonParse<ExportableManifest>(content);
		} catch {
			throw new UnexpectedError('No manifest.json found in git work folder');
		}
	}

	private async previewSingleProject(
		projectDir: string,
		entry: ExportableManifest['projects'][number],
	): Promise<PackageProjectPreview> {
		const preview: PackageProjectPreview = {
			id: entry.id,
			name: entry.name,
			dirName: entry.dirName,
			workflows: [],
			credentials: [],
			variables: [],
			folders: [],
			dataTables: [],
		};

		// Collect workflows and folders from the folder tree
		const foldersDir = path.join(projectDir, 'folders');
		await this.previewFolderTree(foldersDir, preview);

		// Collect credentials
		const credentialsDir = path.join(projectDir, 'credentials');
		try {
			const entries = await readdir(credentialsDir, { withFileTypes: true });
			for (const credEntry of entries) {
				if (!credEntry.isDirectory()) continue;
				try {
					const data = jsonParse<ExportableCredential>(
						await readFile(path.join(credentialsDir, credEntry.name, 'credential.json'), 'utf8'),
					);
					preview.credentials.push({ id: data.id, name: data.name, type: data.type });
				} catch {}
			}
		} catch {}

		// Collect variables
		const variablesDir = path.join(projectDir, 'variables');
		try {
			const entries = await readdir(variablesDir, { withFileTypes: true });
			for (const varEntry of entries) {
				if (!varEntry.isDirectory()) continue;
				try {
					const data = jsonParse<ExportableVariable>(
						await readFile(path.join(variablesDir, varEntry.name, 'variable.json'), 'utf8'),
					);
					preview.variables.push({ id: data.id, key: data.key });
				} catch {}
			}
		} catch {}

		// Collect data tables
		const dataTablesDir = path.join(projectDir, 'data-tables');
		try {
			const entries = await readdir(dataTablesDir, { withFileTypes: true });
			for (const dtEntry of entries) {
				if (!dtEntry.isDirectory()) continue;
				try {
					const data = jsonParse<ExportableDataTable>(
						await readFile(path.join(dataTablesDir, dtEntry.name, 'data-table.json'), 'utf8'),
					);
					preview.dataTables.push({ id: data.id, name: data.name });
				} catch {}
			}
		} catch {}

		return preview;
	}

	private async previewFolderTree(dirPath: string, preview: PackageProjectPreview): Promise<void> {
		let entries;
		try {
			entries = await readdir(dirPath, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const subDir = path.join(dirPath, entry.name);

			if (entry.name === 'workflows') {
				const wfEntries = await readdir(subDir, { withFileTypes: true });
				for (const wfEntry of wfEntries) {
					if (!wfEntry.isDirectory()) continue;
					try {
						const data = jsonParse<ExportableWorkflow>(
							await readFile(path.join(subDir, wfEntry.name, 'workflow.json'), 'utf8'),
						);
						preview.workflows.push({ id: data.id, name: data.name });
					} catch {}
				}
			} else {
				// Check if this is a folder
				try {
					const folderData = jsonParse<ExportableFolder>(
						await readFile(path.join(subDir, 'folder.json'), 'utf8'),
					);
					preview.folders.push({ id: folderData.id, name: folderData.name });
				} catch {}
				// Recurse
				await this.previewFolderTree(subDir, preview);
			}
		}
	}

	private async importSingleProject(
		projectDir: string,
		userId: string,
	): Promise<PackageImportResult> {
		const result: PackageImportResult = {
			projects: [],
			workflows: [],
			credentials: [],
			variables: { imported: [] },
			folders: { imported: 0 },
			dataTables: { imported: [] },
		};

		// Read project.json
		const projectPath = path.join(projectDir, 'project.json');
		const projectData = jsonParse<ExportableProject>(await readFile(projectPath, 'utf8'));

		// Upsert project
		await this.projectRepository.upsert(
			{
				id: projectData.id,
				name: projectData.name,
				icon: projectData.icon,
				description: projectData.description,
				type: 'team',
			},
			['id'],
		);

		// Ensure pulling user is admin
		const hasAdmin = await this.projectRelationRepository.findOne({
			where: { projectId: projectData.id, role: { slug: PROJECT_ADMIN_ROLE_SLUG } },
		});
		if (!hasAdmin) {
			await this.projectRelationRepository.save({
				projectId: projectData.id,
				userId,
				role: { slug: PROJECT_ADMIN_ROLE_SLUG },
			});
		}

		result.projects.push({ id: projectData.id, name: projectData.name });

		// Import folders recursively from folders/ directory
		const foldersDir = path.join(projectDir, 'folders');
		try {
			const allFolders: ExportableFolder[] = [];
			await this.collectFolders(foldersDir, null, projectData.id, allFolders);

			// First pass: create all folders without parent relationships
			for (const folder of allFolders) {
				const folderCopy = this.folderRepository.create({
					id: folder.id,
					name: folder.name,
					homeProject: { id: folder.homeProjectId },
				});
				await this.folderRepository.upsert(folderCopy, {
					skipUpdateIfNoValuesChanged: true,
					conflictPaths: { id: true },
				});
			}

			// Second pass: set parent relationships
			for (const folder of allFolders) {
				await this.folderRepository.update(
					{ id: folder.id },
					{
						parentFolder: folder.parentFolderId ? { id: folder.parentFolderId } : null,
						createdAt: folder.createdAt,
						updatedAt: folder.updatedAt,
					},
				);
			}
			result.folders.imported = allFolders.length;

			// Import workflows found within the folder tree
			await this.importWorkflowsFromFolderTree(foldersDir, projectData.id, userId, result);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.logger.error('Failed to import folders', { error: ensureError(error) });
			}
		}

		// Import credentials
		const credentialsDir = path.join(projectDir, 'credentials');
		try {
			const credEntries = await readdir(credentialsDir, { withFileTypes: true });
			for (const entry of credEntries) {
				if (!entry.isDirectory()) continue;
				try {
					await this.importCredential(
						path.join(credentialsDir, entry.name, 'credential.json'),
						projectData.id,
						userId,
						result,
					);
				} catch (error) {
					this.logger.error(`Failed to import credential ${entry.name}`, {
						error: ensureError(error),
					});
				}
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.logger.error('Failed to read credentials dir', { error: ensureError(error) });
			}
		}

		// Import variables
		const variablesDir = path.join(projectDir, 'variables');
		try {
			const varEntries = await readdir(variablesDir, { withFileTypes: true });
			for (const entry of varEntries) {
				if (!entry.isDirectory()) continue;
				try {
					const varData = jsonParse<ExportableVariable>(
						await readFile(path.join(variablesDir, entry.name, 'variable.json'), 'utf8'),
					);
					const variableToUpsert: Partial<Variables> & { id: string; key: string } = {
						id: varData.id,
						key: varData.key,
						type: varData.type,
						value: varData.value === '' ? undefined : varData.value,
					};
					if (varData.projectId) {
						Object.assign(variableToUpsert, { project: { id: varData.projectId } });
					}
					await this.variablesRepository.upsert(variableToUpsert, ['id']);
					result.variables.imported.push(varData.key);
				} catch (error) {
					this.logger.error(`Failed to import variable ${entry.name}`, {
						error: ensureError(error),
					});
				}
			}
			await this.variablesService.updateCache();
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.logger.error('Failed to read variables dir', { error: ensureError(error) });
			}
		}

		// Import data tables
		const dataTablesDir = path.join(projectDir, 'data-tables');
		try {
			const dtEntries = await readdir(dataTablesDir, { withFileTypes: true });
			for (const entry of dtEntries) {
				if (!entry.isDirectory()) continue;
				try {
					await this.importDataTable(
						path.join(dataTablesDir, entry.name, 'data-table.json'),
						projectData.id,
						result,
					);
				} catch (error) {
					this.logger.error(`Failed to import data table ${entry.name}`, {
						error: ensureError(error),
					});
				}
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.logger.error('Failed to read data-tables dir', { error: ensureError(error) });
			}
		}

		return result;
	}

	/**
	 * Recursively walk directory structure to collect folder metadata.
	 * Looks for folder.json in each subdirectory.
	 */
	private async collectFolders(
		dirPath: string,
		parentFolderId: string | null,
		homeProjectId: string,
		collected: ExportableFolder[],
	): Promise<void> {
		let entries;
		try {
			entries = await readdir(dirPath, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			if (entry.name === 'workflows') continue; // skip workflow subdirectories

			const subDir = path.join(dirPath, entry.name);

			// Check if this directory has a folder.json
			try {
				const folderData = jsonParse<ExportableFolder>(
					await readFile(path.join(subDir, 'folder.json'), 'utf8'),
				);

				collected.push({
					...folderData,
					parentFolderId,
					homeProjectId,
				});

				// Recurse into child directories (excluding 'workflows')
				await this.collectFolders(subDir, folderData.id, homeProjectId, collected);
			} catch {
				// Not a folder directory, skip
			}
		}
	}

	/**
	 * Walk the folder tree and import any workflow.json files found in workflows/ subdirs.
	 */
	private async importWorkflowsFromFolderTree(
		dirPath: string,
		projectId: string,
		userId: string,
		result: PackageImportResult,
	): Promise<void> {
		let entries;
		try {
			entries = await readdir(dirPath, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const subDir = path.join(dirPath, entry.name);

			if (entry.name === 'workflows') {
				// Import all workflows in this directory
				const wfEntries = await readdir(subDir, { withFileTypes: true });
				for (const wfEntry of wfEntries) {
					if (!wfEntry.isDirectory()) continue;
					try {
						await this.importWorkflow(
							path.join(subDir, wfEntry.name, 'workflow.json'),
							projectId,
							userId,
							result,
						);
					} catch (error) {
						this.logger.error(`Failed to import workflow ${wfEntry.name}`, {
							error: ensureError(error),
						});
					}
				}
			} else {
				// Recurse into folder subdirectories
				await this.importWorkflowsFromFolderTree(subDir, projectId, userId, result);
			}
		}
	}

	private async importWorkflow(
		filePath: string,
		projectId: string,
		_userId: string,
		result: PackageImportResult,
	): Promise<void> {
		const wfData = jsonParse<ExportableWorkflow>(await readFile(filePath, 'utf8'));

		if (!wfData.id || !wfData.nodes || !wfData.connections) {
			this.logger.warn(`Skipping invalid workflow file: ${filePath}`);
			return;
		}

		// Check if parent folder exists
		const existingFolderIds = (await this.folderRepository.find({ select: ['id'] })).map(
			(f) => f.id,
		);

		const parentFolderId = wfData.parentFolderId ?? '';

		await this.workflowRepository.upsert(
			{
				...wfData,
				parentFolder: existingFolderIds.includes(parentFolderId) ? { id: parentFolderId } : null,
			},
			['id'],
		);

		// Set ownership to the project
		await this.sharedWorkflowRepository.makeOwner([wfData.id], projectId);

		result.workflows.push({ id: wfData.id, name: wfData.name });
	}

	private async importCredential(
		filePath: string,
		projectId: string,
		_userId: string,
		result: PackageImportResult,
	): Promise<void> {
		const credData = jsonParse<ExportableCredential>(await readFile(filePath, 'utf8'));

		const existingCredential = await this.credentialsRepository.findOne({
			where: { id: credData.id },
			select: ['id', 'name', 'type', 'data'],
		});

		const { name, type, data, id, isGlobal = false } = credData;
		const newCredentialObject = new Credentials({ id, name }, type);

		if (existingCredential?.data) {
			const existingDecrypted = new Credentials(
				{ id: existingCredential.id, name: existingCredential.name },
				existingCredential.type,
				existingCredential.data,
			);
			const localData = existingDecrypted.getData();
			const mergedData = mergeRemoteCrendetialDataIntoLocalCredentialData({
				local: localData,
				remote: data,
			});
			newCredentialObject.setData(mergedData);
		} else {
			const sanitizedData = sanitizeCredentialData(data);
			newCredentialObject.setData(sanitizedData);
		}

		await this.credentialsRepository.upsert({ ...newCredentialObject, isGlobal }, ['id']);

		// Set ownership
		await this.sharedCredentialsRepository.makeOwner([credData.id], projectId);

		result.credentials.push({
			id: newCredentialObject.id as string,
			name: newCredentialObject.name,
			type: newCredentialObject.type,
		});
	}

	private async importDataTable(
		filePath: string,
		projectId: string,
		result: PackageImportResult,
	): Promise<void> {
		const dtData = jsonParse<ExportableDataTable>(await readFile(filePath, 'utf8'));

		if (!dtData.id || !dtData.name) {
			this.logger.warn(`Skipping invalid data table file: ${filePath}`);
			return;
		}

		const dbType = this.dataTableRepository.manager.connection.options.type;

		const existingDataTable = await this.dataTableRepository.findOne({
			where: { id: dtData.id },
			relations: ['columns'],
		});

		const isNewTable = !existingDataTable;

		await this.dataTableRepository.upsert(
			{
				id: dtData.id,
				name: dtData.name,
				projectId,
				createdAt: dtData.createdAt,
				updatedAt: dtData.updatedAt,
			},
			['id'],
		);

		const existingColumns = await this.dataTableColumnRepository.find({
			where: { dataTable: { id: dtData.id } },
			select: ['id', 'name'],
		});
		const existingColumnIds = new Set(existingColumns.map((c) => c.id));
		const existingColumnNameMap = new Map(existingColumns.map((c) => [c.id, c.name]));
		const importedColumnIds = new Set(dtData.columns.map((c) => c.id));

		await this.dataTableRepository.manager.transaction(async (trx) => {
			const columnsToDelete = [...existingColumnIds].filter((id) => !importedColumnIds.has(id));
			if (columnsToDelete.length > 0) {
				if (!isNewTable) {
					for (const columnId of columnsToDelete) {
						const columnName = existingColumnNameMap.get(columnId);
						if (columnName) {
							await this.dataTableDDLService.dropColumnFromTable(
								dtData.id,
								columnName,
								dbType,
								trx,
							);
						}
					}
				}
				await trx.delete(DataTableColumn, { id: In(columnsToDelete) });
			}

			const columnEntities = [];
			for (const column of dtData.columns) {
				if (!isValidDataTableColumnType(column.type)) {
					this.logger.warn(
						`Invalid column type "${column.type}" in data table ${dtData.name}. Skipping.`,
					);
					continue;
				}

				const columnEntity = await trx.save(DataTableColumn, {
					id: column.id,
					name: column.name,
					type: column.type,
					index: column.index,
					dataTable: { id: dtData.id },
				});
				columnEntities.push(columnEntity);

				if (!isNewTable && !existingColumnIds.has(column.id)) {
					await this.dataTableDDLService.addColumn(dtData.id, columnEntity, dbType, trx);
				}
			}

			if (isNewTable) {
				await this.dataTableDDLService.createTableWithColumns(dtData.id, columnEntities, trx);
			}
		});

		result.dataTables.imported.push(dtData.name);
	}
}
