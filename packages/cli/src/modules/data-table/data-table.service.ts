import type {
	AddDataTableColumnDto,
	CreateDataTableDto,
	DeleteDataTableRowsDto,
	GetDataTableKanbanBoardQueryDto,
	GetDataTableKanbanLaneQueryDto,
	ListDataTableContentQueryDto,
	MoveDataTableKanbanRowDto,
	MoveDataTableColumnDto,
	RenameDataTableColumnDto,
	DataTableListOptions,
	DataTableMetadata,
	DataTableEnumOption,
	UpsertDataTableRowDto,
	UpdateDataTableDto,
	UpdateDataTableEnumOptionColorDto,
	UpdateDataTableRowDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	DataTableRowAutomationRepository,
	DataTableTriggerSubscriptionRepository,
	ProjectRelationRepository,
	ProjectRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { In, type EntityManager } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import type {
	DataTableColumnJsType,
	DataTableFilter,
	DataTableRow,
	DataTableRowReturn,
	DataTableRows,
	DataTableInsertRowsReturnType,
	DataTableInsertRowsResult,
	DataTablesSizeResult,
	DataTableInfoById,
	DataTableColumnType,
	DataTableRowReturnWithState,
	DataTableAutomationStatus,
	DataTableRowAutomation,
} from 'n8n-workflow';
import {
	DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP,
	DATA_TABLE_VIRTUAL_COLUMN_TYPE_MAP,
	validateFieldType,
} from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import { DataTableColumnRepository } from './data-table-column.repository';
import { DataTableCsvImportService } from './data-table-csv-import.service';
import { DataTableDDLService } from './data-table-ddl.service';
import { normalizeColumn, resolveEnumRows } from './data-table-enum.utils';
import { InvalidKanbanCursorError } from './data-table-kanban.utils';
import { DataTableMutationEventRecorder } from './data-table-mutation-event.repository';
import { DataTableRowsRepository } from './data-table-rows.repository';
import { DataTableSizeValidator } from './data-table-size-validator.service';
import type { DataTable } from './data-table.entity';
import { DataTableRepository } from './data-table.repository';
import { columnTypeToFieldType } from './data-table.types';
import { DataTableAccessDeniedError } from './errors/data-table-access-denied.error';
import { DataTableColumnInUseError } from './errors/data-table-column-in-use.error';
import { DataTableColumnNotFoundError } from './errors/data-table-column-not-found.error';
import { DataTableNameConflictError } from './errors/data-table-name-conflict.error';
import { DataTableNotFoundError } from './errors/data-table-not-found.error';
import { DataTableValidationError } from './errors/data-table-validation.error';
import { normalizeRows, toTableName } from './utils/sql-utils';

import { EventService } from '@/events/event.service';
import { ProjectNotFoundError, ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';

/** Lower wins. Must match the CASE ranking in `DataTableRowsRepository.automationStatusSql`. */
const AUTOMATION_STATUS_RANK: Record<DataTableAutomationStatus, number> = {
	failed: 0,
	running: 1,
	waiting: 2,
	finished: 3,
};

@Service()
export class DataTableService {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly dataTableRowsRepository: DataTableRowsRepository,
		private readonly dataTableDDLService: DataTableDDLService,
		private readonly logger: Logger,
		private readonly dataTableSizeValidator: DataTableSizeValidator,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
		private readonly csvImportService: DataTableCsvImportService,
		private readonly mutationEventService: DataTableMutationEventRecorder,
		private readonly eventService: EventService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly rowAutomationRepository: DataTableRowAutomationRepository,
		private readonly triggerSubscriptionRepository: DataTableTriggerSubscriptionRepository,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	async start() {}
	async shutdown() {}

	async getProjectIdForDataTable(dataTableId: string): Promise<string> {
		const dataTable = await this.dataTableRepository.findOne({
			select: ['projectId'],
			where: { id: dataTableId },
		});

		if (!dataTable) {
			throw new DataTableNotFoundError(dataTableId);
		}

		return dataTable.projectId;
	}

	async getOne(dataTableId: string, projectId: string): Promise<DataTable> {
		const dataTable = await this.dataTableRepository.findOne({
			where: { id: dataTableId, project: { id: projectId } },
			relations: ['project', 'columns'],
		});

		if (!dataTable) {
			throw new DataTableNotFoundError(dataTableId);
		}

		return dataTable;
	}

	async getKanbanBoard(
		dataTableId: string,
		projectId: string,
		dto: GetDataTableKanbanBoardQueryDto,
	) {
		const table = await this.getOne(dataTableId, projectId);
		const groupingColumn = this.getKanbanGroupingColumn(table.columns, dto.groupByColumnId);
		const lanes = await this.dataTableRowsRepository.getKanbanBoard(
			dataTableId,
			groupingColumn.name,
			[...(groupingColumn.options ?? []).map((option) => option.id), null],
			dto.rowsPerLane,
			dto.search,
			table.updatedAt.toISOString(),
			table.columns,
		);
		return {
			lanes: await Promise.all(
				lanes.map(async (lane) => ({
					...lane,
					rows: await this.attachAutomations(
						dataTableId,
						resolveEnumRows(lane.rows, table.columns),
					),
				})),
			),
			revision: table.updatedAt.toISOString(),
		};
	}

	async getKanbanLanePage(
		dataTableId: string,
		projectId: string,
		dto: GetDataTableKanbanLaneQueryDto,
	) {
		const table = await this.getOne(dataTableId, projectId);
		const groupingColumn = this.getKanbanGroupingColumn(table.columns, dto.groupByColumnId);
		this.validateKanbanLaneValue(groupingColumn, dto.laneValue ?? null);
		try {
			const page = await this.dataTableRowsRepository.getKanbanLanePage(
				dataTableId,
				groupingColumn.name,
				dto.laneValue ?? null,
				dto.limit,
				dto.cursor,
				dto.search,
				table.updatedAt.toISOString(),
				table.columns,
			);
			return {
				...page,
				rows: await this.attachAutomations(dataTableId, resolveEnumRows(page.rows, table.columns)),
			};
		} catch (error) {
			if (error instanceof InvalidKanbanCursorError) {
				throw new DataTableValidationError(error.message);
			}
			throw error;
		}
	}

	async moveKanbanRow(
		dataTableId: string,
		projectId: string,
		rowId: number,
		dto: MoveDataTableKanbanRowDto,
	) {
		await this.validateDataTableSize();
		await this.validateDataTableExists(dataTableId, projectId);
		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);
			const groupingColumn = this.getKanbanGroupingColumn(columns, dto.groupByColumnId);
			this.validateKanbanLaneValue(groupingColumn, dto.targetValue);
			const capture = await this.mutationEventService.prepareCapture(
				dataTableId,
				'columnUpdated',
				[groupingColumn.id],
				trx,
			);
			const moved = await this.dataTableRowsRepository.moveKanbanRow(
				dataTableId,
				rowId,
				groupingColumn.name,
				dto.targetValue,
				dto.afterRowId,
				columns,
				trx,
			);
			if (capture.shouldCapture) {
				await this.mutationEventService.recordUpdated(
					dataTableId,
					[moved.before],
					[moved.after],
					columns,
					capture.subscriptions,
					trx,
				);
			}
			await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
			return resolveEnumRows([moved.after], columns)[0];
		});
		this.dataTableSizeValidator.reset();
		return result;
	}

	async resolveOwningProjectId(user: User, projectId?: string): Promise<string> {
		if (!projectId) {
			const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
			return personalProject.id;
		}

		const existingProject = await this.projectService.findProject(projectId);
		if (!existingProject) {
			throw new ProjectNotFoundError(projectId);
		}

		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'dataTable:create',
		]);
		if (!project) throw new DataTableAccessDeniedError('create');

		return project.id;
	}

	/**
	 * `id` is package-import-only: it keeps the id the table had on the exporting
	 * instance (mirrors `FolderService.createFolder`). REST callers never pass it —
	 * the public create endpoint always mints a fresh id.
	 */
	async createDataTable(projectId: string, dto: CreateDataTableDto, id?: string) {
		if (dto.fileId && dto.columns.length === 0) {
			throw new DataTableValidationError(
				'At least one column must be included when importing from CSV',
			);
		}

		await this.validateUniqueName(dto.name, projectId);
		const columns = dto.columns.map(normalizeColumn);

		const result = await this.dataTableRepository.createDataTable(
			projectId,
			dto.name,
			columns,
			undefined,
			id,
		);

		if (dto.fileId) {
			try {
				const tableColumns = await this.getColumns(result.id, projectId);
				const rows = await this.csvImportService.buildRowsForNewTable(
					dto.fileId,
					dto.hasHeaders ?? true,
					tableColumns,
					dto.columns,
				);

				if (rows.length > 0) {
					await this.insertRows(result.id, projectId, rows);
				}
			} catch (error) {
				await this.deleteDataTable(result.id, projectId);
				throw error;
			} finally {
				await this.csvImportService.cleanupFile(dto.fileId);
			}
		}

		this.dataTableSizeValidator.reset();

		return result;
	}

	/**
	 * Instance-wide id lookup (with columns) used by package import: same-project
	 * hits are match candidates, cross-project hits are id conflicts.
	 * Authorization is the import flow's concern.
	 */
	async findDataTablesByIds(dataTableIds: string[]): Promise<DataTable[]> {
		if (dataTableIds.length === 0) return [];

		return await this.dataTableRepository.find({
			where: { id: In(dataTableIds) },
			relations: { columns: true },
		});
	}

	/** Project-scoped name lookup used by package import to detect name conflicts before creating tables. */
	async findDataTablesByNamesInProject(
		projectId: string,
		names: string[],
	): Promise<Array<Pick<DataTable, 'id' | 'name'>>> {
		if (names.length === 0) return [];

		return await this.dataTableRepository.find({
			select: ['id', 'name'],
			where: { projectId, name: In(names) },
		});
	}

	async importCsvToExistingTable(
		dataTableId: string,
		projectId: string,
		fileId: string,
	): Promise<{ importedRowCount: number; systemColumnsIgnored: string[] }> {
		await this.validateDataTableSize();
		await this.validateDataTableExists(dataTableId, projectId);

		try {
			const tableColumns = await this.getColumns(dataTableId, projectId);
			const { rows, systemColumnsIgnored } =
				await this.csvImportService.validateAndBuildRowsForExistingTable(fileId, tableColumns);

			if (rows.length > 0) {
				await this.insertRows(dataTableId, projectId, rows);
			}

			return {
				importedRowCount: rows.length,
				systemColumnsIgnored,
			};
		} finally {
			await this.csvImportService.cleanupFile(fileId);
		}
	}

	async updateDataTable(dataTableId: string, projectId: string, dto: UpdateDataTableDto) {
		const table = await this.validateDataTableExists(dataTableId, projectId);
		if (dto.name === undefined && dto.metadata === undefined) {
			throw new DataTableValidationError('Provide a name or view settings');
		}
		if (dto.name !== undefined && dto.name !== table.name) {
			await this.validateUniqueName(dto.name, projectId);
		}
		const metadata =
			dto.metadata === undefined ? undefined : { ...table.metadata, ...dto.metadata };
		let kanbanGroupingColumnName: string | null | undefined;
		if (metadata) {
			if (metadata.view === 'kanban' && !metadata.kanban) {
				throw new DataTableValidationError('Select an enum column to use the kanban view');
			}
			if (metadata.kanban && (dto.metadata?.kanban || metadata.view === 'kanban')) {
				const groupingColumn = await this.dataTableColumnRepository.findOneBy({
					id: metadata.kanban.groupByColumnId,
					dataTableId,
				});
				if (groupingColumn?.type !== 'enum') {
					throw new DataTableValidationError('Select an enum column from this table');
				}
				kanbanGroupingColumnName = groupingColumn.name;
			}
		}
		const properties = {
			...(dto.name === undefined ? {} : { name: dto.name }),
			...(metadata === undefined ? {} : { metadata }),
		};
		const groupingChanged =
			kanbanGroupingColumnName !== undefined &&
			table.metadata?.kanban?.groupByColumnId !== metadata?.kanban?.groupByColumnId;
		if (groupingChanged) {
			await this.dataTableColumnRepository.manager.transaction(async (trx) => {
				await this.dataTableDDLService.replaceKanbanIndex(
					dataTableId,
					kanbanGroupingColumnName ?? null,
					trx,
				);
				await this.dataTableRepository.updateProperties(dataTableId, projectId, properties, trx);
			});
		} else {
			await this.dataTableRepository.updateProperties(dataTableId, projectId, properties);
		}

		return true;
	}

	async transferDataTablesByProjectId(
		fromProjectId: string,
		toProjectId: string,
		trx?: EntityManager,
	) {
		return await this.dataTableRepository.transferDataTableByProjectId(
			fromProjectId,
			toProjectId,
			trx,
		);
	}

	async deleteDataTableByProjectId(projectId: string) {
		const tables = await this.dataTableRepository.findBy({ projectId });

		const result = await this.dataTableRepository.deleteDataTableByProjectId(projectId);

		if (result) {
			for (const table of tables) {
				this.eventService.emit('data-table-deleted', { dataTableId: table.id, projectId });
			}
			this.dataTableSizeValidator.reset();
		}

		return result;
	}

	async deleteDataTableAll() {
		const result = await this.dataTableRepository.deleteDataTableAll();

		if (result) {
			this.dataTableSizeValidator.reset();
		}

		return result;
	}

	async deleteDataTable(dataTableId: string, projectId: string) {
		await this.validateDataTableExists(dataTableId, projectId);

		await this.dataTableRepository.deleteDataTable(dataTableId);
		this.eventService.emit('data-table-deleted', { dataTableId, projectId });

		this.dataTableSizeValidator.reset();

		return true;
	}

	async addColumn(dataTableId: string, projectId: string, dto: AddDataTableColumnDto) {
		await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.addColumn(
			dataTableId,
			normalizeColumn(dto),
		);

		await this.dataTableRepository.touchUpdatedAt(dataTableId);

		return result;
	}

	async moveColumn(
		dataTableId: string,
		projectId: string,
		columnId: string,
		dto: MoveDataTableColumnDto,
	) {
		await this.validateDataTableExists(dataTableId, projectId);
		const existingColumn = await this.validateColumnExists(dataTableId, columnId);

		await this.dataTableColumnRepository.moveColumn(dataTableId, existingColumn, dto.targetIndex);

		return true;
	}

	async deleteColumn(dataTableId: string, projectId: string, columnId: string) {
		const table = await this.validateDataTableExists(dataTableId, projectId);
		const existingColumn = await this.validateColumnExists(dataTableId, columnId);
		if (await this.mutationEventService.hasSubscriptionForColumn(dataTableId, columnId)) {
			throw new DataTableColumnInUseError(existingColumn.name);
		}

		await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			if (table.metadata?.kanban?.groupByColumnId === columnId) {
				await this.dataTableDDLService.replaceKanbanIndex(dataTableId, null, trx);
				const metadata: DataTableMetadata = { ...table.metadata, view: 'table' };
				delete metadata.kanban;
				await this.dataTableRepository.updateProperties(dataTableId, projectId, { metadata }, trx);
			}
			await this.dataTableColumnRepository.deleteColumn(dataTableId, existingColumn, trx);
			await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
		});

		return true;
	}

	async renameColumn(
		dataTableId: string,
		projectId: string,
		columnId: string,
		dto: RenameDataTableColumnDto,
	) {
		await this.validateDataTableExists(dataTableId, projectId);
		const existingColumn = await this.validateColumnExists(dataTableId, columnId);

		return await this.dataTableColumnRepository.renameColumn(dataTableId, existingColumn, dto.name);
	}

	async updateEnumOptionColor(
		dataTableId: string,
		projectId: string,
		columnId: string,
		optionId: string,
		dto: UpdateDataTableEnumOptionColorDto,
	) {
		await this.validateDataTableExists(dataTableId, projectId);
		const column = await this.dataTableColumnRepository.updateEnumOptionColor(
			dataTableId,
			columnId,
			optionId,
			dto.color,
		);
		await this.dataTableRepository.touchUpdatedAt(dataTableId);
		return column;
	}

	async getManyAndCount(options: DataTableListOptions) {
		const { count, data } = await this.dataTableRepository.getManyAndCount(options);
		const triggers = await this.triggerSubscriptionRepository.findByDataTableIds(
			data.map((table) => table.id),
		);
		return {
			count,
			data: data.map((table) =>
				Object.assign(table, {
					triggers: triggers
						.filter((trigger) => trigger.dataTableId === table.id)
						.map(({ workflowId, workflowName, nodeId }) => ({ workflowId, workflowName, nodeId })),
				}),
			),
		};
	}

	async getManyRowsAndCount(
		dataTableId: string,
		projectId: string,
		dto: ListDataTableContentQueryDto,
	) {
		await this.validateDataTableExists(dataTableId, projectId);

		return await this.dataTableColumnRepository.manager.transaction(async (em) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, em);
			const transformedDto = dto.filter
				? { ...dto, filter: this.validateAndTransformFilters(dto.filter, columns) }
				: dto;
			const result = await this.dataTableRowsRepository.getManyAndCount(
				dataTableId,
				transformedDto,
				columns,
				em,
			);
			return {
				count: result.count,
				data: await this.attachAutomations(
					dataTableId,
					resolveEnumRows(normalizeRows(result.data, columns), columns),
				),
			};
		});
	}

	/** Adds the read-only `automationStatus` and `automations` fields to rows. */
	private async attachAutomations<T extends DataTableRowReturn>(
		dataTableId: string,
		rows: T[],
	): Promise<T[]> {
		const found = await this.rowAutomationRepository.findForRows(
			dataTableId,
			rows.map((row) => row.id),
		);
		const byRow = new Map<number, DataTableRowAutomation[]>();
		for (const { rowId, ...automation } of found) {
			byRow.set(rowId, [...(byRow.get(rowId) ?? []), automation]);
		}
		return rows.map((row) => {
			const automations = byRow.get(row.id) ?? [];
			const automationStatus =
				automations
					.map((automation) => automation.status)
					.sort((a, b) => AUTOMATION_STATUS_RANK[a] - AUTOMATION_STATUS_RANK[b])[0] ?? null;
			return Object.assign(row, { automationStatus, automations });
		});
	}

	async getColumns(dataTableId: string, projectId: string) {
		await this.validateDataTableExists(dataTableId, projectId);

		return await this.dataTableColumnRepository.getColumns(dataTableId);
	}

	async getColumnById({
		projectId,
		dataTableId,
		columnId,
	}: {
		projectId: string;
		dataTableId: string;
		columnId: string;
	}) {
		await this.validateDataTableExists(dataTableId, projectId);

		return await this.dataTableColumnRepository.getColumnByIdOrFail(dataTableId, columnId);
	}

	async insertRows<T extends DataTableInsertRowsReturnType = 'count'>(
		dataTableId: string,
		projectId: string,
		rows: DataTableRows,
		returnType?: T,
	): Promise<DataTableInsertRowsResult<T>>;
	async insertRows(
		dataTableId: string,
		projectId: string,
		rows: DataTableRows,
		returnType: DataTableInsertRowsReturnType = 'count',
	) {
		await this.validateDataTableSize();
		await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);
			const rowsWithDefaults = this.applyColumnDefaults(rows, columns);
			const transformedRows = this.validateAndTransformRows(rowsWithDefaults, columns);
			const capture = await this.mutationEventService.prepareCapture(
				dataTableId,
				'rowInserted',
				[],
				trx,
			);
			const effectiveReturnType = capture.shouldCapture ? 'all' : returnType;

			const inserted = await this.dataTableRowsRepository.insertRows(
				dataTableId,
				transformedRows,
				columns,
				effectiveReturnType,
				trx,
			);
			await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);

			if (!capture.shouldCapture) {
				return returnType === 'all' && this.isReturnedRows(inserted)
					? resolveEnumRows(inserted, columns)
					: inserted;
			}
			if (!this.isReturnedRows(inserted)) {
				throw new DataTableValidationError('Inserted rows were not returned for trigger delivery');
			}
			const insertedRows: DataTableRowReturn[] = inserted;
			await this.mutationEventService.recordInserted(
				dataTableId,
				insertedRows,
				capture.subscriptions,
				trx,
				columns,
			);

			if (returnType === 'all') return resolveEnumRows(insertedRows, columns);
			if (returnType === 'id') return insertedRows.map(({ id }) => ({ id }));
			return { success: true, insertedRows: insertedRows.length };
		});

		this.dataTableSizeValidator.reset();

		return result;
	}

	async upsertRow(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpsertDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData: true,
		dryRun?: boolean,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[]>;
	async upsertRow(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpsertDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData?: boolean,
		dryRun?: true,
	): Promise<DataTableRowReturnWithState[]>;
	async upsertRow(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpsertDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData?: false,
		dryRun?: false,
	): Promise<true>;
	async upsertRow(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpsertDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData: boolean,
		dryRun: boolean,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[] | true>;
	async upsertRow(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpsertDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData: boolean = false,
		dryRun: boolean = false,
	) {
		await this.validateDataTableSize();
		const table = await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);
			const { data, filter } = this.validateAndTransformUpdateParams(dto, columns);

			if (dryRun) {
				const rows = await this.dataTableRowsRepository.dryRunUpsertRow(
					dataTableId,
					data,
					filter,
					columns,
					trx,
				);
				return resolveEnumRows(rows, columns);
			}

			const updatedColumnIds = columns
				.filter((column) => column.name in data)
				.map((column) => column.id);
			const updateCapture = await this.mutationEventService.prepareCapture(
				dataTableId,
				'columnUpdated',
				updatedColumnIds,
				trx,
			);
			const groupingColumn = table.metadata?.kanban
				? columns.find((column) => column.id === table.metadata.kanban?.groupByColumnId)
				: undefined;
			const updatesGroupingColumn = groupingColumn ? groupingColumn.name in data : false;
			const beforeRows =
				updateCapture.shouldCapture || updatesGroupingColumn
					? await this.dataTableRowsRepository.getAffectedRowsForUpdate(
							dataTableId,
							filter,
							columns,
							false,
							trx,
						)
					: [];
			const updated = await this.dataTableRowsRepository.updateRows(
				dataTableId,
				data,
				filter,
				columns,
				true,
				trx,
			);

			if (Array.isArray(updated) && updated.length > 0) {
				if (updatesGroupingColumn && groupingColumn) {
					const changedRowIds = beforeRows
						.filter(
							(row) => !Object.is(row[groupingColumn.name] ?? null, data[groupingColumn.name]),
						)
						.map((row) => row.id);
					await this.dataTableRowsRepository.moveRowsToKanbanTop(dataTableId, changedRowIds, trx);
				}
				if (updateCapture.shouldCapture) {
					await this.mutationEventService.recordUpdated(
						dataTableId,
						beforeRows,
						updated,
						columns,
						updateCapture.subscriptions,
						trx,
					);
				}
				await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
				return returnData ? resolveEnumRows(updated, columns) : true;
			}

			// No rows were updated, so insert a new one
			const [dataWithDefaults] = this.applyColumnDefaults([data], columns);
			const insertCapture = await this.mutationEventService.prepareCapture(
				dataTableId,
				'rowInserted',
				[],
				trx,
			);
			const inserted = await this.dataTableRowsRepository.insertRows(
				dataTableId,
				[dataWithDefaults],
				columns,
				returnData || insertCapture.shouldCapture ? 'all' : 'id',
				trx,
			);
			if (insertCapture.shouldCapture) {
				if (!this.isReturnedRows(inserted)) {
					throw new DataTableValidationError('Inserted row was not returned for trigger delivery');
				}
				await this.mutationEventService.recordInserted(
					dataTableId,
					inserted,
					insertCapture.subscriptions,
					trx,
					columns,
				);
			}
			await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
			return returnData && this.isReturnedRows(inserted)
				? resolveEnumRows(inserted, columns)
				: true;
		});

		if (!dryRun) {
			this.dataTableSizeValidator.reset();
		}

		return result;
	}

	validateAndTransformUpdateParams(
		{ filter, data }: Pick<UpdateDataTableRowDto, 'filter' | 'data'>,
		columns: DataTableColumn[],
	): { data: DataTableRow; filter: DataTableFilter } {
		if (columns.length === 0) {
			throw new DataTableValidationError(
				'No columns found for this data table or data table not found',
			);
		}

		if (!filter?.filters || filter.filters.length === 0) {
			throw new DataTableValidationError('Filter must not be empty');
		}
		if (!data || Object.keys(data).length === 0) {
			throw new DataTableValidationError('Data columns must not be empty');
		}

		const [transformedData] = this.validateAndTransformRows([data], columns, false);
		const transformedFilter = this.validateAndTransformFilters(filter, columns);

		return { data: transformedData, filter: transformedFilter };
	}

	async updateRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpdateDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData: true,
		dryRun?: boolean,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[]>;
	async updateRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpdateDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData?: boolean,
		dryRun?: true,
	): Promise<DataTableRowReturnWithState[]>;
	async updateRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpdateDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData?: false,
		dryRun?: false,
	): Promise<true>;
	async updateRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpdateDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData: boolean,
		dryRun: boolean,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[] | true>;
	async updateRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpdateDataTableRowDto, 'returnData' | 'dryRun'>,
		returnData: boolean = false,
		dryRun: boolean = false,
	) {
		await this.validateDataTableSize();
		const table = await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);
			const { data, filter } = this.validateAndTransformUpdateParams(dto, columns);

			if (dryRun) {
				const rows = await this.dataTableRowsRepository.dryRunUpdateRows(
					dataTableId,
					data,
					filter,
					columns,
					trx,
				);
				return resolveEnumRows(rows, columns);
			}

			const updatedColumnIds = columns
				.filter((column) => column.name in data)
				.map((column) => column.id);
			const capture = await this.mutationEventService.prepareCapture(
				dataTableId,
				'columnUpdated',
				updatedColumnIds,
				trx,
			);
			const groupingColumn = table.metadata?.kanban
				? columns.find((column) => column.id === table.metadata.kanban?.groupByColumnId)
				: undefined;
			const updatesGroupingColumn = groupingColumn ? groupingColumn.name in data : false;
			const beforeRows =
				capture.shouldCapture || updatesGroupingColumn
					? await this.dataTableRowsRepository.getAffectedRowsForUpdate(
							dataTableId,
							filter,
							columns,
							false,
							trx,
						)
					: [];
			const updated = await this.dataTableRowsRepository.updateRows(
				dataTableId,
				data,
				filter,
				columns,
				returnData || capture.shouldCapture || updatesGroupingColumn,
				trx,
			);
			if (updatesGroupingColumn && Array.isArray(updated) && groupingColumn) {
				const changedRowIds = beforeRows
					.filter((row) => !Object.is(row[groupingColumn.name] ?? null, data[groupingColumn.name]))
					.map((row) => row.id);
				await this.dataTableRowsRepository.moveRowsToKanbanTop(dataTableId, changedRowIds, trx);
			}
			if (capture.shouldCapture && Array.isArray(updated)) {
				await this.mutationEventService.recordUpdated(
					dataTableId,
					beforeRows,
					updated,
					columns,
					capture.subscriptions,
					trx,
				);
			}
			await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
			return returnData && Array.isArray(updated) ? resolveEnumRows(updated, columns) : true;
		});

		if (!dryRun) {
			this.dataTableSizeValidator.reset();
		}

		return result;
	}

	async deleteRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<DeleteDataTableRowsDto, 'returnData' | 'dryRun'>,
		returnData: true,
		dryRun?: boolean,
	): Promise<DataTableRowReturn[]>;
	async deleteRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<DeleteDataTableRowsDto, 'returnData' | 'dryRun'>,
		returnData?: boolean,
		dryRun?: true,
	): Promise<DataTableRowReturn[]>;
	async deleteRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<DeleteDataTableRowsDto, 'returnData' | 'dryRun'>,
		returnData?: false,
		dryRun?: false,
	): Promise<true>;
	async deleteRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<DeleteDataTableRowsDto, 'returnData' | 'dryRun'>,
		returnData: boolean,
		dryRun: boolean,
	): Promise<DataTableRowReturn[] | true>;
	async deleteRows(
		dataTableId: string,
		projectId: string,
		dto: Omit<DeleteDataTableRowsDto, 'returnData' | 'dryRun'>,
		returnData: boolean = false,
		dryRun: boolean = false,
	) {
		await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);

			if (!dto.filter?.filters || dto.filter.filters.length === 0) {
				throw new DataTableValidationError(
					'Filter is required for delete operations to prevent accidental deletion of all data',
				);
			}

			const transformedFilter = this.validateAndTransformFilters(dto.filter, columns);

			const capture = dryRun
				? { subscriptions: [], shouldCapture: false }
				: await this.mutationEventService.prepareCapture(dataTableId, 'rowDeleted', [], trx);
			const deleted = await this.dataTableRowsRepository.deleteRows(
				dataTableId,
				columns,
				transformedFilter,
				returnData || capture.shouldCapture,
				dryRun,
				trx,
			);
			if (capture.shouldCapture && this.isReturnedRows(deleted)) {
				await this.mutationEventService.recordDeleted(
					dataTableId,
					deleted,
					capture.subscriptions,
					trx,
					columns,
				);
			}
			if (!dryRun) {
				await this.rowAutomationRepository.deleteOrphans(
					dataTableId,
					toTableName(dataTableId),
					trx,
				);
				await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
			}
			if (!returnData && !dryRun) return true;
			if (!this.isReturnedRows(deleted)) {
				throw new DataTableValidationError('Deleted rows were not returned');
			}
			return resolveEnumRows(deleted, columns);
		});

		if (!dryRun) {
			this.dataTableSizeValidator.reset();
		}

		return result;
	}

	async clearRows(dataTableId: string, projectId: string): Promise<{ deletedCount: number }> {
		await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);
			const capture = await this.mutationEventService.prepareCapture(
				dataTableId,
				'rowDeleted',
				[],
				trx,
			);
			await this.rowAutomationRepository.deleteForTable(dataTableId, trx);
			if (!capture.shouldCapture) {
				const clearResult = await this.dataTableRowsRepository.clearRows(dataTableId, trx);
				await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
				return clearResult;
			}

			let deletedCount = 0;
			while (true) {
				const { data } = await this.dataTableRowsRepository.getManyAndCount(
					dataTableId,
					{ skip: 0, take: 100, sortBy: ['id', 'ASC'] },
					columns,
					trx,
				);
				const rows = normalizeRows(data, columns);
				if (rows.length === 0) break;

				await this.dataTableRowsRepository.deleteRows(
					dataTableId,
					columns,
					{
						type: 'or',
						filters: rows.map((row) => ({
							columnName: 'id',
							condition: 'eq',
							value: row.id,
						})),
					},
					false,
					false,
					trx,
				);
				await this.mutationEventService.recordDeleted(
					dataTableId,
					rows,
					capture.subscriptions,
					trx,
					columns,
				);
				deletedCount += rows.length;
			}
			await this.dataTableRepository.touchUpdatedAt(dataTableId, trx);
			return { deletedCount };
		});

		this.dataTableSizeValidator.reset();
		return result;
	}

	private validateAndTransformRows(
		rows: DataTableRows,
		columns: Array<{
			name: string;
			type: DataTableColumnType;
			options?: DataTableEnumOption[] | null;
		}>,
		includeSystemColumns = false,
		skipDateTransform = false,
		allowUnknownEnumValues = false,
	): DataTableRows {
		// Include system columns like 'id' if requested
		const allColumns = includeSystemColumns
			? [
					...Object.entries({
						...DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP,
						...DATA_TABLE_VIRTUAL_COLUMN_TYPE_MAP,
					}).map(([name, type]) => ({ name, type })),
					...columns,
				]
			: columns;
		const columnNames = new Set(allColumns.map((x) => x.name));
		const columnTypeMap = new Map(allColumns.map((x) => [x.name, x.type]));
		const enumOptionsMap = new Map(
			columns
				.filter((column) => column.type === 'enum')
				.map((column) => [column.name, column.options ?? []]),
		);

		return rows.map((row) => {
			const transformedRow: DataTableRow = {};
			const keys = Object.keys(row);
			for (const key of keys) {
				if (!columnNames.has(key)) {
					throw new DataTableValidationError(`unknown column name '${key}'`);
				}
				transformedRow[key] = this.validateAndTransformCell(
					row[key],
					key,
					columnTypeMap,
					enumOptionsMap,
					skipDateTransform,
					allowUnknownEnumValues,
				);
			}
			return transformedRow;
		});
	}

	private applyColumnDefaults(
		rows: DataTableRows,
		columns: Array<{ name: string; type: DataTableColumnType; defaultValue?: string | null }>,
	): DataTableRows {
		const defaults = columns
			.filter(
				(column): column is typeof column & { defaultValue: string } =>
					column.type === 'enum' &&
					column.defaultValue !== null &&
					column.defaultValue !== undefined,
			)
			.map((column) => [column.name, column.defaultValue] as const);

		if (defaults.length === 0) return rows;

		return rows.map((row) => {
			const rowWithDefaults = { ...row };
			for (const [columnName, defaultValue] of defaults) {
				if (!(columnName in rowWithDefaults)) {
					rowWithDefaults[columnName] = defaultValue;
				}
			}
			return rowWithDefaults;
		});
	}

	private isReturnedRows(value: unknown): value is DataTableRowReturn[] {
		return (
			Array.isArray(value) &&
			value.every(
				(row) =>
					typeof row === 'object' &&
					row !== null &&
					'id' in row &&
					typeof row.id === 'number' &&
					'createdAt' in row &&
					'updatedAt' in row,
			)
		);
	}

	private getKanbanGroupingColumn(columns: DataTableColumn[], columnId: string): DataTableColumn {
		const column = columns.find((candidate) => candidate.id === columnId);
		if (column?.type !== 'enum') {
			throw new DataTableValidationError('Select an enum column from this table');
		}
		return column;
	}

	private validateKanbanLaneValue(column: DataTableColumn, value: string | null): void {
		if (value !== null && !column.options?.some((option) => option.id === value)) {
			throw new DataTableValidationError(
				`value '${value}' is not an option for enum column '${column.name}'`,
			);
		}
	}

	private validateAndTransformCell(
		cell: DataTableColumnJsType,
		key: string,
		columnTypeMap: Map<string, string>,
		enumOptionsMap: Map<string, DataTableEnumOption[]>,
		skipDateTransform = false,
		allowUnknownEnumValues = false,
	): DataTableColumnJsType {
		if (cell === null) return null;

		const columnType = columnTypeMap.get(key);
		if (!columnType) return cell;
		if (columnType === 'enum') {
			const option =
				typeof cell === 'string'
					? enumOptionsMap
							.get(key)
							?.find(
								(candidate) =>
									candidate.id === cell ||
									candidate.text.toLocaleLowerCase() === cell.toLocaleLowerCase(),
							)
					: undefined;
			if (!option) {
				if (allowUnknownEnumValues && typeof cell === 'string') return cell;
				throw new DataTableValidationError(
					`value '${String(cell)}' is not an option for enum column '${key}'`,
				);
			}
			return option.id;
		}

		const fieldType = columnTypeToFieldType[columnType];
		if (!fieldType) return cell;

		const validationResult = validateFieldType(key, cell, fieldType, {
			strict: false, // Allow type coercion (e.g., string numbers to numbers)
			parseStrings: false,
		});

		if (!validationResult.valid) {
			throw new DataTableValidationError(
				`value '${String(cell)}' does not match column type '${columnType}': ${validationResult.errorMessage}`,
			);
		}

		if (columnType === 'date') {
			if (skipDateTransform && cell instanceof Date) {
				return cell;
			}
			try {
				// Convert to UTC to ensure consistent timezone handling
				const dateInISO = (validationResult.newValue as DateTime).toUTC().toISO();
				return dateInISO;
			} catch {
				throw new DataTableValidationError(
					`value '${String(cell)}' does not match column type 'date'`,
				);
			}
		}

		return validationResult.newValue as DataTableColumnJsType;
	}

	/**
	 * Performs no authorization — callers must pass an already-authorized `projectId`.
	 */
	async validateDataTableExists(dataTableId: string, projectId: string) {
		const existingTable = await this.dataTableRepository.findOneBy({
			id: dataTableId,
			project: {
				id: projectId,
			},
		});

		if (!existingTable) {
			throw new DataTableNotFoundError(dataTableId);
		}

		return existingTable;
	}

	private async validateColumnExists(dataTableId: string, columnId: string) {
		const existingColumn = await this.dataTableColumnRepository.findOneBy({
			id: columnId,
			dataTableId,
		});

		if (existingColumn === null) {
			throw new DataTableColumnNotFoundError(dataTableId, columnId);
		}

		return existingColumn;
	}

	private async validateUniqueName(name: string, projectId: string) {
		const hasNameClash = await this.dataTableRepository.existsBy({
			name,
			projectId,
		});

		if (hasNameClash) {
			throw new DataTableNameConflictError(name);
		}
	}

	private validateAndTransformFilters(
		filterObject: DataTableFilter,
		columns: DataTableColumn[],
	): DataTableFilter {
		const columnTypeByName = new Map(columns.map((column) => [column.name, column.type]));
		for (const filter of filterObject.filters) {
			if (
				columnTypeByName.get(filter.columnName) === 'enum' &&
				filter.condition !== 'eq' &&
				filter.condition !== 'neq'
			) {
				throw new DataTableValidationError(
					`condition '${filter.condition}' is not supported for enum column '${filter.columnName}'`,
				);
			}
		}

		// Skip date transformation for filters - TypeORM needs Date objects for parameterized queries
		const transformedRows = this.validateAndTransformRows(
			filterObject.filters.map((f) => {
				return {
					[f.columnName]: f.value,
				};
			}),
			columns,
			true,
			true,
			true,
		);

		const transformedFilters = filterObject.filters.map((filter, index) => {
			const transformedValue = transformedRows[index][filter.columnName];

			if (['like', 'ilike'].includes(filter.condition)) {
				if (transformedValue === null || transformedValue === undefined) {
					throw new DataTableValidationError(
						`${filter.condition.toUpperCase()} filter value cannot be null or undefined`,
					);
				}
				if (typeof transformedValue !== 'string') {
					throw new DataTableValidationError(
						`${filter.condition.toUpperCase()} filter value must be a string`,
					);
				}

				const valueWithWildcards = transformedValue.includes('%')
					? transformedValue
					: `%${transformedValue}%`;

				return { ...filter, value: valueWithWildcards };
			}

			if (['gt', 'gte', 'lt', 'lte'].includes(filter.condition)) {
				if (transformedValue === null || transformedValue === undefined) {
					throw new DataTableValidationError(
						`${filter.condition.toUpperCase()} filter value cannot be null or undefined`,
					);
				}
			}

			return { ...filter, value: transformedValue };
		});

		return { ...filterObject, filters: transformedFilters };
	}

	private async validateDataTableSize() {
		await this.dataTableSizeValidator.validateSize(
			async () => await this.dataTableRepository.findDataTablesSize(),
		);
	}

	async getDataTablesSize(user: User): Promise<DataTablesSizeResult> {
		const allSizeData = await this.dataTableSizeValidator.getCachedSizeData(
			async () => await this.dataTableRepository.findDataTablesSize(),
		);

		let dataTables: DataTableInfoById;
		if (hasGlobalScope(user, 'dataTable:listProject')) {
			dataTables = allSizeData.dataTables;
		} else {
			const roles = await this.roleService.rolesWithScope('project', ['dataTable:listProject']);

			const accessibleProjectIds =
				await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles);

			const accessibleProjectIdsSet = new Set(accessibleProjectIds);

			// Filter the cached data based on user's accessible projects
			const accessibleDataTables: DataTableInfoById = Object.fromEntries(
				Object.entries(allSizeData.dataTables).filter(([, dataTableInfo]) =>
					accessibleProjectIdsSet.has(dataTableInfo.projectId),
				),
			);
			dataTables = accessibleDataTables;
		}

		return {
			totalBytes: allSizeData.totalBytes,
			quotaStatus: this.dataTableSizeValidator.sizeToState(allSizeData.totalBytes),
			dataTables,
		};
	}

	/**
	 * Sizes in bytes from the shared size cache, so callers add no query load.
	 * Does no project filtering, so callers must have authorised these ids.
	 */
	async getCachedSizeBytesByIds(dataTableIds: string[]): Promise<Map<string, number>> {
		if (dataTableIds.length === 0) return new Map();

		const sizeData = await this.dataTableSizeValidator.getCachedSizeData(
			async () => await this.dataTableRepository.findDataTablesSize(),
		);

		return new Map(dataTableIds.map((id) => [id, sizeData.dataTables[id]?.sizeBytes ?? 0]));
	}

	async findDataTablesByIdsForUser(
		dataTableIds: string[],
		user: User,
		scopes: Scope[],
	): Promise<DataTable[]> {
		if (dataTableIds.length === 0) return [];

		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			return await this.dataTableRepository.find({
				where: { id: In(dataTableIds) },
				relations: { columns: true, project: true },
			});
		}

		const roles = await this.roleService.rolesWithScope('project', scopes);
		const accessibleProjectIds = await this.projectRelationRepository.getAccessibleProjectsByRoles(
			user.id,
			roles,
		);

		if (accessibleProjectIds.length === 0) return [];

		return await this.dataTableRepository.find({
			where: { id: In(dataTableIds), projectId: In(accessibleProjectIds) },
			relations: { columns: true, project: true },
		});
	}

	async generateDataTableCsv(
		dataTableId: string,
		projectId: string,
		includeSystemColumns = true,
	): Promise<{ csvContent: string; dataTableName: string }> {
		const dataTable = await this.validateDataTableExists(dataTableId, projectId);

		const columns = await this.dataTableColumnRepository.getColumns(dataTableId);

		const { data: rows } = await this.dataTableRowsRepository.getManyAndCount(
			dataTableId,
			{
				skip: 0,
			},
			columns,
		);

		const csvContent = this.buildCsvContent(rows, columns, includeSystemColumns);

		return {
			csvContent,
			dataTableName: dataTable.name,
		};
	}

	private buildCsvContent(
		rows: DataTableRowReturn[],
		columns: DataTableColumn[],
		includeSystemColumns = true,
	): string {
		const sortedColumns = [...columns].sort((a, b) => a.index - b.index);

		const userHeaders = sortedColumns.map((col) => col.name);
		const headers = includeSystemColumns
			? ['id', ...userHeaders, 'createdAt', 'updatedAt']
			: userHeaders;

		const csvRows: string[] = [headers.map((h) => this.escapeCsvValue(h)).join(',')];

		for (const row of rows) {
			const values: string[] = [];

			if (includeSystemColumns) {
				values.push(this.escapeCsvValue(row.id));
			}

			for (const column of sortedColumns) {
				const value = row[column.name];
				values.push(this.escapeCsvValue(this.formatValueForCsv(value, column.type)));
			}

			if (includeSystemColumns) {
				values.push(this.escapeCsvValue(this.formatDateForCsv(row.createdAt)));
				values.push(this.escapeCsvValue(this.formatDateForCsv(row.updatedAt)));
			}

			csvRows.push(values.join(','));
		}

		return csvRows.join('\n');
	}

	private formatValueForCsv(value: unknown, columnType: DataTableColumnType): string {
		if (value === null || value === undefined) {
			return '';
		}

		if (columnType === 'date') {
			if (value instanceof Date || typeof value === 'string') {
				return this.formatDateForCsv(value);
			}
		}

		if (columnType === 'boolean') {
			if (value === 1 || value === '1') {
				return 'true';
			}
			if (value === 0 || value === '0') {
				return 'false';
			}
			return String(value);
		}

		if (columnType === 'number') {
			return String(value);
		}

		return String(value);
	}

	private formatDateForCsv(date: Date | string): string {
		if (date instanceof Date) {
			return date.toISOString();
		}
		// If it's already a string, try to parse and format
		const parsed = new Date(date);
		return !isNaN(parsed.getTime()) ? parsed.toISOString() : String(date);
	}

	private escapeCsvValue(value: unknown): string {
		const str = String(value);

		// RFC 4180 compliant escaping:
		// - If value contains comma, quote, or newline, wrap in quotes
		// - Also wrap if value has leading/trailing spaces to prevent trimming
		// - Escape quotes by doubling them
		const hasLeadingOrTrailingSpace =
			str.length > 0 && (str[0] === ' ' || str[str.length - 1] === ' ');

		if (
			str.includes(',') ||
			str.includes('"') ||
			str.includes('\n') ||
			str.includes('\r') ||
			hasLeadingOrTrailingSpace
		) {
			return `"${str.replace(/"/g, '""')}"`;
		}

		return str;
	}
}
