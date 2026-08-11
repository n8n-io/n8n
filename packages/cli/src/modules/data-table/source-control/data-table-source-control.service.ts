import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { Project } from '@n8n/db';
import { ProjectRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import glob from 'fast-glob';
import { InstanceSettings } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { readFile as fsReadFile, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'path';

import {
	SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_READ_FILE_BATCH_SIZE,
} from '@/modules/source-control.ee/constants';
import {
	getDataTableColumnKey,
	getDataTableExportPath,
	isValidDataTableColumnType,
	mapInBatches,
	sourceControlFoldersExistCheck,
} from '@/modules/source-control.ee/source-control-helper.ee';
import type { SourceControlDataTableHandler } from '@/modules/source-control.ee/source-control-resource-handler.registry';
import { SourceControlScopedService } from '@/modules/source-control.ee/source-control-scoped.service';
import type { ExportResult } from '@/modules/source-control.ee/types/export-result';
import type {
	DataTableResourceOwner,
	ExportableDataTable,
	StatusExportableDataTable,
} from '@/modules/source-control.ee/types/exportable-data-table';
import type {
	StatusResourceOwner,
	TeamResourceOwner,
} from '@/modules/source-control.ee/types/resource-owner';
import type { SourceControlContext } from '@/modules/source-control.ee/types/source-control-context';

import { DataTableColumn } from '../data-table-column.entity';
import { DataTableColumnRepository } from '../data-table-column.repository';
import { DataTableDDLService } from '../data-table-ddl.service';
import { DataTableSizeValidator } from '../data-table-size-validator.service';
import { DataTable } from '../data-table.entity';
import { DataTableRepository } from '../data-table.repository';
import { isValidColumnName, isValidDataTableId } from '../utils/sql-utils';

// Derived from the DDL service contract to keep `@n8n/typeorm` imports out of
// this (non-persistence) file.
type DbType = Parameters<DataTableDDLService['renameTable']>[2];

@Service()
export class DataTableSourceControlService implements SourceControlDataTableHandler {
	private gitFolder: string;

	private dataTableExportFolder: string;

	constructor(
		private readonly logger: Logger,
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly dataTableDDLService: DataTableDDLService,
		private readonly dataTableSizeValidator: DataTableSizeValidator,
		private readonly projectRepository: ProjectRepository,
		private readonly userRepository: UserRepository,
		private readonly sourceControlScopedService: SourceControlScopedService,
		instanceSettings: InstanceSettings,
	) {
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.dataTableExportFolder = path.join(this.gitFolder, SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER);
	}

	getDataTablePath(dataTableId: string): string {
		return getDataTableExportPath(dataTableId, this.dataTableExportFolder);
	}

	async exportDataTablesToWorkFolder(
		candidates: SourceControlledFile[],
		context: SourceControlContext,
	): Promise<ExportResult> {
		try {
			sourceControlFoldersExistCheck([this.gitFolder, this.dataTableExportFolder]);

			if (candidates.length === 0) {
				return {
					count: 0,
					folder: this.dataTableExportFolder,
					files: [],
				};
			}

			// Extract data table IDs from candidates
			const candidateIds = candidates.map((candidate) => candidate.id);

			// Fetch only the selected data tables
			const dataTables = await this.dataTableRepository.findForSourceControlExport(
				candidateIds,
				this.sourceControlScopedService.getProjectsWithPushScopeByContextFilter(context),
			);

			const exportedFiles: Array<{ id: string; name: string }> = [];

			// Write each data table to its own file
			for (const table of dataTables) {
				let owner: DataTableResourceOwner | null = null;
				if (table.project?.type === 'personal') {
					const ownerRelation = table.project.projectRelations?.find(
						(pr) => pr.role.slug === PROJECT_OWNER_ROLE_SLUG,
					);
					if (ownerRelation) {
						owner = {
							type: 'personal',
							projectId: table.project.id,
							projectName: table.project.name,
							personalEmail: ownerRelation.user.email,
						};
					}
				} else if (table.project?.type === 'team') {
					owner = {
						type: 'team',
						teamId: table.project.id,
						teamName: table.project.name,
					};
				}

				const exportableDataTable: ExportableDataTable = {
					id: table.id,
					name: table.name,
					columns: table.columns
						.sort((a, b) => a.index - b.index)
						.map((col) => ({
							id: col.id,
							name: col.name,
							type: col.type,
							index: col.index,
						})),
					ownedBy: owner,
					createdAt: table.createdAt.toISOString(),
					updatedAt: table.updatedAt.toISOString(),
				};

				const filePath = this.getDataTablePath(table.id);
				await fsWriteFile(filePath, JSON.stringify(exportableDataTable, null, 2));

				exportedFiles.push({
					id: table.id,
					name: filePath,
				});
			}

			return {
				count: dataTables.length,
				folder: this.dataTableExportFolder,
				files: exportedFiles,
			};
		} catch (error) {
			this.logger.error('Failed to export data tables to work folder', { error });
			throw new UnexpectedError('Failed to export data tables to work folder', {
				cause: error,
			});
		}
	}

	async getRemoteDataTablesFromFiles(
		context: SourceControlContext,
	): Promise<ExportableDataTable[]> {
		const dataTableFiles = await glob('*.json', {
			cwd: this.dataTableExportFolder,
			absolute: true,
		});

		if (dataTableFiles.length === 0) {
			return [];
		}

		const remoteTables = await mapInBatches(
			dataTableFiles,
			SOURCE_CONTROL_READ_FILE_BATCH_SIZE,
			async (file): Promise<ExportableDataTable | undefined> => {
				this.logger.debug(`Parsing data table file ${file}`);
				const fileContent = await fsReadFile(file, { encoding: 'utf8' });
				try {
					return jsonParse<ExportableDataTable>(fileContent);
				} catch (error) {
					this.logger.warn(`Failed to parse data table from file ${file}: invalid JSON format`);
					return undefined;
				}
			},
		);

		return remoteTables.filter((table): table is ExportableDataTable => {
			// Filter out null/undefined values from failed parses
			if (!table) {
				return false;
			}

			// Unless data is corrupted, there should always be an owner.
			// We keep tables without an owner because they can still be imported
			// and assigned to the pulling user's personal project.
			if (!table.ownedBy) {
				return true;
			}

			const isOwnedByAuthorizedProject = !!context.findAuthorizedProjectByOwner(table.ownedBy);
			return context.hasAccessToAllProjects() || isOwnedByAuthorizedProject;
		});
	}

	async getLocalDataTablesFromDb(
		context: SourceControlContext,
	): Promise<StatusExportableDataTable[]> {
		try {
			const dataTables = await this.dataTableRepository.findForSourceControlStatus(
				this.sourceControlScopedService.getProjectsWithPushScopeByContextFilter(context),
			);
			return dataTables.map((table) => {
				let ownedBy: StatusResourceOwner | null = null;
				if (table.project?.type === 'personal') {
					const ownerRelation = table.project.projectRelations?.find(
						(pr) => pr.role.slug === PROJECT_OWNER_ROLE_SLUG,
					);
					if (ownerRelation) {
						ownedBy = {
							type: 'personal',
							projectId: table.project.id,
							projectName: table.project.name,
						};
					}
				} else if (table.project?.type === 'team') {
					ownedBy = {
						type: 'team',
						projectId: table.project.id,
						projectName: table.project.name,
					};
				}

				return {
					id: table.id,
					name: table.name,
					columns: (table.columns || [])
						.sort((a, b) => a.index - b.index)
						.map((col) => ({
							id: col.id,
							name: col.name,
							type: col.type,
							index: col.index,
						})),
					ownedBy,
					filename: this.getDataTablePath(table.id),
					createdAt: table.createdAt.toISOString(),
					updatedAt: table.updatedAt.toISOString(),
				};
			});
		} catch (error) {
			// Return empty array if DataTable entity is not registered (e.g., in test environments)
			if (error instanceof Error && error.message.includes('No metadata for "DataTable"')) {
				return [];
			}
			throw error;
		}
	}

	async importDataTablesFromWorkFolder(candidates: SourceControlledFile[], userId: string) {
		if (candidates.length === 0) {
			return;
		}

		// Get database type from the repository's connection
		const dbType = this.dataTableRepository.manager.connection.options.type;

		const result: {
			imported: string[];
			reconciliationFailures: Array<{ id: string; name: string }>;
		} = {
			imported: [],
			reconciliationFailures: [],
		};

		// Phase 1: Parse all data table files and resolve target projects upfront
		// so name collisions can be resolved before any imports happen.
		const parsedTables: Array<{
			dataTable: ExportableDataTable;
			candidate: SourceControlledFile;
			targetProjectId: string;
		}> = [];

		for (const candidate of candidates) {
			this.logger.debug(`Parsing data table from file ${candidate.file}`);
			let dataTable: ExportableDataTable;
			try {
				dataTable = jsonParse<ExportableDataTable>(
					await fsReadFile(candidate.file, { encoding: 'utf8' }),
				);
			} catch (error) {
				this.logger.error(`Failed to parse data table from file ${candidate.file}`, {
					error: ensureError(error),
				});
				continue;
			}

			if (!dataTable || typeof dataTable !== 'object' || !dataTable.id || !dataTable.name) {
				this.logger.warn(`Failed to parse data table from file ${candidate.file}`);
				continue;
			}

			if (!isValidDataTableId(dataTable.id)) {
				this.logger.warn(
					`Invalid data table ID "${dataTable.id}" in file ${candidate.file}. Skipping.`,
				);
				continue;
			}

			let targetProjectId: string;

			if (dataTable.ownedBy?.type === 'team') {
				const teamProject =
					(await this.projectRepository.findOne({
						where: { id: dataTable.ownedBy.teamId },
					})) ??
					(await this.createTeamProject({
						type: 'team',
						teamId: dataTable.ownedBy.teamId,
						teamName: dataTable.ownedBy.teamName,
					}));
				targetProjectId = teamProject.id;
			} else {
				targetProjectId = await this.resolveRemoteDataTableProjectId(dataTable.ownedBy, userId);
			}

			parsedTables.push({ dataTable, candidate, targetProjectId });
		}

		// Phase 2: Resolve name collisions (same (project, name), different id —
		// typically a delete+recreate upstream). A same-named table in the same
		// project is the same logical table: it adopts the incoming id, then the
		// regular import path below aligns the schema. A failed adoption degrades
		// to a per-table conflict so the rest of the pull proceeds.
		const importableTables: typeof parsedTables = [];
		for (const entry of parsedTables) {
			const { dataTable, targetProjectId } = entry;
			const localTable = await this.dataTableRepository.findOne({
				where: { name: dataTable.name, projectId: targetProjectId },
				relations: ['columns'],
			});
			if (localTable && localTable.id !== dataTable.id) {
				try {
					await this.adoptDataTableIdentity(localTable, dataTable, dbType);
				} catch (error) {
					this.logger.error(`Failed to reconcile data table ${dataTable.name}`, {
						error: ensureError(error),
					});
					result.reconciliationFailures.push({ id: dataTable.id, name: dataTable.name });
					continue;
				}
			}
			importableTables.push(entry);
		}

		// Phase 3: Import all data tables (no name collisions at this point)
		for (const { dataTable, candidate, targetProjectId } of importableTables) {
			try {
				this.logger.debug(`Importing data table from file ${candidate.file}`);

				const existingDataTable = await this.dataTableRepository.findOne({
					where: { id: dataTable.id },
					relations: ['columns'],
				});

				const isNewTable = !existingDataTable;

				// Upsert data table - preserve timestamps from file to avoid false "modified" detections
				await this.dataTableRepository.upsert(
					{
						id: dataTable.id,
						name: dataTable.name,
						projectId: targetProjectId,
						createdAt: dataTable.createdAt,
						updatedAt: dataTable.updatedAt,
					},
					['id'],
				);

				// Get existing columns for this table to handle deletions/updates
				const existingColumns = await this.dataTableColumnRepository.find({
					where: { dataTable: { id: dataTable.id } },
					select: ['id', 'name'],
				});
				const existingColumnIds = new Set(existingColumns.map((c) => c.id));
				const existingColumnNameMap = new Map(existingColumns.map((c) => [c.id, c.name]));
				const importedColumnIds = new Set(dataTable.columns.map((c) => c.id));

				// Wrap all DDL + metadata operations in a transaction
				await this.dataTableRepository.manager.transaction(async (trx) => {
					// Delete columns that no longer exist in the imported data
					const columnsToDelete = Array.from(existingColumnIds).filter(
						(id) => !importedColumnIds.has(id),
					);
					if (columnsToDelete.length > 0) {
						if (!isNewTable) {
							// Drop columns from physical table
							for (const columnId of columnsToDelete) {
								const columnName = existingColumnNameMap.get(columnId);
								if (columnName) {
									await this.dataTableDDLService.dropColumnFromTable(
										dataTable.id,
										columnName,
										dbType,
										trx,
									);
								}
							}
						}
						await trx.delete(DataTableColumn, columnsToDelete);
					}

					// Upsert columns
					const columnEntities = [];
					for (const column of dataTable.columns) {
						if (!isValidColumnName(column.name)) {
							this.logger.warn(
								`Invalid column name "${column.name}" in data table ${dataTable.name}. Skipping column.`,
							);
							continue;
						}

						if (!isValidDataTableColumnType(column.type)) {
							this.logger.warn(
								`Invalid column type "${column.type}" in data table ${dataTable.name}, column ${column.name}. Skipping column.`,
							);
							continue;
						}

						const columnEntity = await trx.save(DataTableColumn, {
							id: column.id,
							name: column.name,
							type: column.type,
							index: column.index,
							dataTable: { id: dataTable.id },
						});
						columnEntities.push(columnEntity);

						// Rename columns whose name changed (same ID, different name)
						if (!isNewTable && existingColumnIds.has(column.id)) {
							const oldName = existingColumnNameMap.get(column.id);
							if (oldName && oldName !== column.name) {
								await this.dataTableDDLService.renameColumn(
									dataTable.id,
									oldName,
									column.name,
									dbType,
									trx,
								);
							}
						}

						// Add new columns to existing physical table
						if (!isNewTable && !existingColumnIds.has(column.id)) {
							await this.dataTableDDLService.addColumn(dataTable.id, columnEntity, dbType, trx);
						}
					}

					// Create physical table for new data tables
					if (isNewTable) {
						await this.dataTableDDLService.createTableWithColumns(
							dataTable.id,
							columnEntities,
							trx,
						);
					}
				});

				result.imported.push(dataTable.name);
			} catch (error) {
				this.logger.error(`Failed to import data table ${candidate.name}`, {
					error: ensureError(error),
				});
			}
		}

		return result;
	}

	/**
	 * Resolves the local project a remote data table belongs to: the team id
	 * for team-owned tables, the owner's personal project for personal ones,
	 * falling back to the pulling user's personal project when the owner is
	 * unknown locally. The status service uses this for collision detection so
	 * the pull preview matches where the import will place the table.
	 */
	async resolveRemoteDataTableProjectId(
		ownedBy: DataTableResourceOwner | null,
		pullingUserId: string,
	): Promise<string> {
		if (ownedBy?.type === 'team') {
			return ownedBy.teamId;
		}
		if (ownedBy?.type === 'personal' && ownedBy.personalEmail) {
			const user = await this.userRepository.findOne({
				where: { email: ownedBy.personalEmail },
			});
			if (user) {
				return (await this.projectRepository.getPersonalProjectForUserOrFail(user.id)).id;
			}
			this.logger.debug(
				`User ${ownedBy.personalEmail} not found locally. Using pulling user's personal project as fallback.`,
			);
		}
		return (await this.projectRepository.getPersonalProjectForUserOrFail(pullingUserId)).id;
	}

	async deleteDataTablesNotInWorkFolder(candidates: SourceControlledFile[]) {
		if (candidates.length === 0) {
			return;
		}

		for (const candidate of candidates) {
			await this.dataTableRepository.deleteDataTable(candidate.id);
		}
	}

	/**
	 * Re-keys a local data table (metadata and physical rows table) to the
	 * incoming id, preserving its rows, so the regular import path can then
	 * align the schema. Local columns adopt the incoming column id where
	 * `(name, type)` matches, so an identical recreate imports as a no-op.
	 *
	 * Idempotent as defense in depth: a retry that finds the physical table
	 * already renamed skips the rename and only completes the metadata swap,
	 * so a half-finished adoption cannot wedge the pull.
	 */
	private async adoptDataTableIdentity(
		localTable: DataTable,
		incoming: ExportableDataTable,
		dbType: DbType,
	) {
		this.logger.info(
			`Reconciling data table "${localTable.name}": adopting id ${incoming.id} (was ${localTable.id})`,
		);
		await this.dataTableRepository.manager.transaction(async (trx) => {
			const alreadyRenamed = await this.dataTableDDLService.tableExists(incoming.id, trx);
			if (!alreadyRenamed) {
				await this.dataTableDDLService.renameTable(localTable.id, incoming.id, dbType, trx);
			}
			// Spread the loaded entities so future scalar fields carry over
			// automatically; only the id (and the column FK) are re-keyed.
			const { columns: localColumns, ...localTableProps } = localTable;
			// The delete cascades to the old data_table_column rows
			await trx.delete(DataTable, { id: localTable.id });
			await trx.insert(DataTable, { ...localTableProps, id: incoming.id });
			const incomingIdByColumnKey = new Map(
				incoming.columns.map((c) => [getDataTableColumnKey(c), c.id]),
			);
			for (const column of localColumns) {
				await trx.insert(DataTableColumn, {
					...column,
					id: incomingIdByColumnKey.get(getDataTableColumnKey(column)) ?? column.id,
					dataTableId: incoming.id,
				});
			}
		});
		this.dataTableSizeValidator.reset();
	}

	private async createTeamProject(owner: TeamResourceOwner): Promise<Project> {
		let teamProject: Project | null = null;

		try {
			teamProject = await this.projectRepository.save(
				this.projectRepository.create({
					id: owner.teamId,
					name: owner.teamName,
					type: 'team',
				}),
			);
		} catch (error) {
			// Workaround to handle the race condition where another worker created the project
			// between our check and insert
			teamProject = await this.projectRepository.findOne({
				where: { id: owner.teamId },
			});

			if (!teamProject) {
				throw error;
			}
		}

		return teamProject;
	}
}
