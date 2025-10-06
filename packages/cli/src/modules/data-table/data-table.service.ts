import type {
	AddDataTableColumnDto,
	CreateDataTableDto,
	DeleteDataTableRowsDto,
	ListDataTableContentQueryDto,
	MoveDataTableColumnDto,
	DataTableListOptions,
	UpsertDataTableRowDto,
	UpdateDataTableDto,
	UpdateDataTableRowDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRelationRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
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
} from 'n8n-workflow';
import { DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP, validateFieldType } from 'n8n-workflow';

import { RoleService } from '@/services/role.service';

import { DataTableColumn } from './data-table-column.entity';
import { DataTableColumnRepository } from './data-table-column.repository';
import { DataTableRowsRepository } from './data-table-rows.repository';
import { DataTableSizeValidator } from './data-table-size-validator.service';
import { DataTableRepository } from './data-table.repository';
import { columnTypeToFieldType } from './data-table.types';
import { DataTableColumnNotFoundError } from './errors/data-table-column-not-found.error';
import { DataTableNameConflictError } from './errors/data-table-name-conflict.error';
import { DataTableNotFoundError } from './errors/data-table-not-found.error';
import { DataTableValidationError } from './errors/data-table-validation.error';
import { normalizeRows } from './utils/sql-utils';

@Service()
export class DataTableService {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly dataTableRowsRepository: DataTableRowsRepository,
		private readonly logger: Logger,
		private readonly dataTableSizeValidator: DataTableSizeValidator,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	async start() {}
	async shutdown() {}

	async createDataTable(projectId: string, dto: CreateDataTableDto) {
		await this.validateUniqueName(dto.name, projectId);

		const result = await this.dataTableRepository.createDataTable(projectId, dto.name, dto.columns);

		this.dataTableSizeValidator.reset();

		return result;
	}

	// Updates data table properties (currently limited to renaming)
	async updateDataTable(dataTableId: string, projectId: string, dto: UpdateDataTableDto) {
		await this.validateDataTableExists(dataTableId, projectId);
		await this.validateUniqueName(dto.name, projectId);

		await this.dataTableRepository.update({ id: dataTableId }, { name: dto.name });

		return true;
	}

	async transferDataTablesByProjectId(fromProjectId: string, toProjectId: string) {
		return await this.dataTableRepository.transferDataTableByProjectId(fromProjectId, toProjectId);
	}

	async deleteDataTableByProjectId(projectId: string) {
		const result = await this.dataTableRepository.deleteDataTableByProjectId(projectId);

		if (result) {
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

		this.dataTableSizeValidator.reset();

		return true;
	}

	async addColumn(dataTableId: string, projectId: string, dto: AddDataTableColumnDto) {
		await this.validateDataTableExists(dataTableId, projectId);

		return await this.dataTableColumnRepository.addColumn(dataTableId, dto);
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
		await this.validateDataTableExists(dataTableId, projectId);
		const existingColumn = await this.validateColumnExists(dataTableId, columnId);

		await this.dataTableColumnRepository.deleteColumn(dataTableId, existingColumn);

		return true;
	}

	async getManyAndCount(options: DataTableListOptions) {
		return await this.dataTableRepository.getManyAndCount(options);
	}

	async getManyRowsAndCount(
		dataTableId: string,
		projectId: string,
		dto: ListDataTableContentQueryDto,
	) {
		await this.validateDataTableExists(dataTableId, projectId);

		return await this.dataTableColumnRepository.manager.transaction(async (em) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, em);
			if (dto.filter) {
				this.validateAndTransformFilters(dto.filter, columns);
			}
			const result = await this.dataTableRowsRepository.getManyAndCount(
				dataTableId,
				dto,
				columns,
				em,
			);
			return {
				count: result.count,
				data: normalizeRows(result.data, columns),
			};
		});
	}

	async getColumns(dataTableId: string, projectId: string) {
		await this.validateDataTableExists(dataTableId, projectId);

		return await this.dataTableColumnRepository.getColumns(dataTableId);
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
			this.validateRowsWithColumns(rows, columns);

			return await this.dataTableRowsRepository.insertRows(
				dataTableId,
				rows,
				columns,
				returnType,
				trx,
			);
		});

		this.dataTableSizeValidator.reset();

		return result;
	}

	async upsertRow<T extends boolean | undefined>(
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
		returnData: boolean = false,
		dryRun: boolean = false,
	) {
		await this.validateDataTableSize();
		await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);
			this.validateUpdateParams(dto, columns);

			if (dryRun) {
				return await this.dataTableRowsRepository.dryRunUpsertRow(
					dataTableId,
					dto.data,
					dto.filter,
					columns,
					trx,
				);
			}

			const updated = await this.dataTableRowsRepository.updateRows(
				dataTableId,
				dto.data,
				dto.filter,
				columns,
				true,
				trx,
			);

			if (updated.length > 0) {
				return returnData ? updated : true;
			}

			// No rows were updated, so insert a new one
			const inserted = await this.dataTableRowsRepository.insertRows(
				dataTableId,
				[dto.data],
				columns,
				returnData ? 'all' : 'id',
				trx,
			);
			return returnData ? inserted : true;
		});

		if (!dryRun) {
			this.dataTableSizeValidator.reset();
		}

		return result;
	}

	validateUpdateParams(
		{ filter, data }: Pick<UpdateDataTableRowDto, 'filter' | 'data'>,
		columns: DataTableColumn[],
	) {
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

		this.validateRowsWithColumns([data], columns, false);
		this.validateAndTransformFilters(filter, columns);
	}

	async updateRows<T extends boolean | undefined>(
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
		returnData: boolean = false,
		dryRun: boolean = false,
	) {
		await this.validateDataTableSize();
		await this.validateDataTableExists(dataTableId, projectId);

		const result = await this.dataTableColumnRepository.manager.transaction(async (trx) => {
			const columns = await this.dataTableColumnRepository.getColumns(dataTableId, trx);
			this.validateUpdateParams(dto, columns);

			if (dryRun) {
				return await this.dataTableRowsRepository.dryRunUpdateRows(
					dataTableId,
					dto.data,
					dto.filter,
					columns,
					trx,
				);
			}

			return await this.dataTableRowsRepository.updateRows(
				dataTableId,
				dto.data,
				dto.filter,
				columns,
				returnData,
				trx,
			);
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

			this.validateAndTransformFilters(dto.filter, columns);

			return await this.dataTableRowsRepository.deleteRows(
				dataTableId,
				columns,
				dto.filter,
				returnData,
				dryRun,
				trx,
			);
		});

		if (!dryRun) {
			this.dataTableSizeValidator.reset();
		}

		return result;
	}

	private validateRowsWithColumns(
		rows: DataTableRows,
		columns: Array<{ name: string; type: DataTableColumnType }>,
		includeSystemColumns = false,
	): void {
		// Include system columns like 'id' if requested
		const allColumns = includeSystemColumns
			? [
					...Object.entries(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP).map(([name, type]) => ({
						name,
						type,
					})),
					...columns,
				]
			: columns;
		const columnNames = new Set(allColumns.map((x) => x.name));
		const columnTypeMap = new Map(allColumns.map((x) => [x.name, x.type]));
		for (const row of rows) {
			const keys = Object.keys(row);
			for (const key of keys) {
				if (!columnNames.has(key)) {
					throw new DataTableValidationError(`unknown column name '${key}'`);
				}
				this.validateCell(row, key, columnTypeMap);
			}
		}
	}

	private validateCell(row: DataTableRow, key: string, columnTypeMap: Map<string, string>) {
		const cell = row[key];
		if (cell === null) return;

		const columnType = columnTypeMap.get(key);
		if (!columnType) return;

		const fieldType = columnTypeToFieldType[columnType];
		if (!fieldType) return;

		const validationResult = validateFieldType(key, cell, fieldType, {
			strict: false, // Allow type coercion (e.g., string numbers to numbers)
			parseStrings: false,
		});

		if (!validationResult.valid) {
			throw new DataTableValidationError(
				`value '${String(cell)}' does not match column type '${columnType}': ${validationResult.errorMessage}`,
			);
		}

		// Special handling for date type to convert from luxon DateTime to ISO string
		if (columnType === 'date') {
			try {
				const dateInISO = (validationResult.newValue as DateTime).toISO();
				row[key] = dateInISO;
				return;
			} catch {
				throw new DataTableValidationError(
					`value '${String(cell)}' does not match column type 'date'`,
				);
			}
		}

		row[key] = validationResult.newValue as DataTableColumnJsType;
	}

	private async validateDataTableExists(dataTableId: string, projectId: string) {
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
	): void {
		this.validateRowsWithColumns(
			filterObject.filters.map((f) => {
				return {
					[f.columnName]: f.value,
				};
			}),
			columns,
			true,
		);

		for (const filter of filterObject.filters) {
			if (['like', 'ilike'].includes(filter.condition)) {
				if (filter.value === null || filter.value === undefined) {
					throw new DataTableValidationError(
						`${filter.condition.toUpperCase()} filter value cannot be null or undefined`,
					);
				}
				if (typeof filter.value !== 'string') {
					throw new DataTableValidationError(
						`${filter.condition.toUpperCase()} filter value must be a string`,
					);
				}

				if (!filter.value.includes('%')) {
					filter.value = `%${filter.value}%`;
				}
			}

			if (['gt', 'gte', 'lt', 'lte'].includes(filter.condition)) {
				if (filter.value === null || filter.value === undefined) {
					throw new DataTableValidationError(
						`${filter.condition.toUpperCase()} filter value cannot be null or undefined`,
					);
				}
			}
		}
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

		const roles = await this.roleService.rolesWithScope('project', ['dataStore:listProject']);

		const accessibleProjectIds = await this.projectRelationRepository.getAccessibleProjectsByRoles(
			user.id,
			roles,
		);

		const accessibleProjectIdsSet = new Set(accessibleProjectIds);

		// Filter the cached data based on user's accessible projects
		const accessibleDataTables: DataTableInfoById = Object.fromEntries(
			Object.entries(allSizeData.dataTables).filter(([, dataTableInfo]) =>
				accessibleProjectIdsSet.has(dataTableInfo.projectId),
			),
		);

		return {
			totalBytes: allSizeData.totalBytes,
			quotaStatus: this.dataTableSizeValidator.sizeToState(allSizeData.totalBytes),
			dataTables: accessibleDataTables,
		};
	}
}
