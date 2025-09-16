import type {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	DeleteDataTableRowsDto,
	ListDataStoreContentQueryDto,
	MoveDataStoreColumnDto,
	DataStoreListOptions,
	UpsertDataStoreRowDto,
	UpdateDataStoreDto,
	UpdateDataTableRowDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';
import type {
	DataStoreColumnJsType,
	DataTableFilter,
	DataStoreRow,
	DataStoreRowReturn,
	DataStoreRows,
	DataTableInsertRowsReturnType,
	DataTableInsertRowsResult,
} from 'n8n-workflow';
import { validateFieldType } from 'n8n-workflow';

import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStoreSizeValidator } from './data-store-size-validator.service';
import { DataStoreRepository } from './data-store.repository';
import { columnTypeToFieldType } from './data-store.types';
import { DataTableColumn } from './data-table-column.entity';
import { DataStoreColumnNotFoundError } from './errors/data-store-column-not-found.error';
import { DataStoreNameConflictError } from './errors/data-store-name-conflict.error';
import { DataStoreNotFoundError } from './errors/data-store-not-found.error';
import { DataStoreValidationError } from './errors/data-store-validation.error';
import { normalizeRows } from './utils/sql-utils';

@Service()
export class DataStoreService {
	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
		private readonly dataStoreColumnRepository: DataStoreColumnRepository,
		private readonly dataStoreRowsRepository: DataStoreRowsRepository,
		private readonly logger: Logger,
		private readonly dataStoreSizeValidator: DataStoreSizeValidator,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	async start() {}
	async shutdown() {}

	async createDataStore(projectId: string, dto: CreateDataStoreDto) {
		await this.validateUniqueName(dto.name, projectId);

		return await this.dataStoreRepository.createDataStore(projectId, dto.name, dto.columns);
	}

	// Updates data store properties (currently limited to renaming)
	async updateDataStore(dataStoreId: string, projectId: string, dto: UpdateDataStoreDto) {
		await this.validateDataStoreExists(dataStoreId, projectId);
		await this.validateUniqueName(dto.name, projectId);

		await this.dataStoreRepository.update({ id: dataStoreId }, { name: dto.name });

		return true;
	}

	async deleteDataStoreByProjectId(projectId: string) {
		return await this.dataStoreRepository.deleteDataStoreByProjectId(projectId);
	}

	async deleteDataStoreAll() {
		return await this.dataStoreRepository.deleteDataStoreAll();
	}

	async deleteDataStore(dataStoreId: string, projectId: string) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		await this.dataStoreRepository.deleteDataStore(dataStoreId);

		return true;
	}

	async addColumn(dataStoreId: string, projectId: string, dto: AddDataStoreColumnDto) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		return await this.dataStoreColumnRepository.addColumn(dataStoreId, dto);
	}

	async moveColumn(
		dataStoreId: string,
		projectId: string,
		columnId: string,
		dto: MoveDataStoreColumnDto,
	) {
		await this.validateDataStoreExists(dataStoreId, projectId);
		const existingColumn = await this.validateColumnExists(dataStoreId, columnId);

		await this.dataStoreColumnRepository.moveColumn(dataStoreId, existingColumn, dto.targetIndex);

		return true;
	}

	async deleteColumn(dataStoreId: string, projectId: string, columnId: string) {
		await this.validateDataStoreExists(dataStoreId, projectId);
		const existingColumn = await this.validateColumnExists(dataStoreId, columnId);

		await this.dataStoreColumnRepository.deleteColumn(dataStoreId, existingColumn);

		return true;
	}

	async getManyAndCount(options: DataStoreListOptions) {
		return await this.dataStoreRepository.getManyAndCount(options);
	}

	async getManyRowsAndCount(
		dataStoreId: string,
		projectId: string,
		dto: ListDataStoreContentQueryDto,
	) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		return await this.dataStoreColumnRepository.manager.transaction(async (em) => {
			const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId, em);
			if (dto.filter) {
				this.validateAndTransformFilters(dto.filter, columns);
			}
			const result = await this.dataStoreRowsRepository.getManyAndCount(
				dataStoreId,
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

	async getColumns(dataStoreId: string, projectId: string) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		return await this.dataStoreColumnRepository.getColumns(dataStoreId);
	}

	async insertRows<T extends DataTableInsertRowsReturnType = 'count'>(
		dataStoreId: string,
		projectId: string,
		rows: DataStoreRows,
		returnType?: T,
	): Promise<DataTableInsertRowsResult<T>>;
	async insertRows(
		dataStoreId: string,
		projectId: string,
		rows: DataStoreRows,
		returnType: DataTableInsertRowsReturnType = 'count',
	) {
		await this.validateDataTableSize();
		await this.validateDataStoreExists(dataStoreId, projectId);
		return await this.dataStoreColumnRepository.manager.transaction(async (em) => {
			const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId, em);
			this.validateRowsWithColumns(rows, columns);

			return await this.dataStoreRowsRepository.insertRows(
				dataStoreId,
				rows,
				columns,
				returnType,
				em,
			);
		});
	}

	async upsertRow<T extends boolean | undefined>(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpsertDataStoreRowDto, 'returnData'>,
		returnData?: T,
	): Promise<T extends true ? DataStoreRowReturn[] : true>;
	async upsertRow(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpsertDataStoreRowDto, 'returnData'>,
		returnData: boolean = false,
	) {
		await this.validateDataTableSize();
		await this.validateDataStoreExists(dataTableId, projectId);

		return await this.dataStoreColumnRepository.manager.transaction(async (em) => {
			const columns = await this.dataStoreColumnRepository.getColumns(dataTableId, em);
			this.validateUpdateParams(dto, columns);
			const updated = await this.dataStoreRowsRepository.updateRow(
				dataTableId,
				dto.data,
				dto.filter,
				columns,
				true,
				em,
			);

			if (updated.length > 0) {
				return returnData ? updated : true;
			}

			// No rows were updated, so insert a new one
			const inserted = await this.dataStoreRowsRepository.insertRows(
				dataTableId,
				[dto.data],
				columns,
				returnData ? 'all' : 'id',
				em,
			);
			return returnData ? inserted : true;
		});
	}

	validateUpdateParams(
		{ filter, data }: Pick<UpdateDataTableRowDto, 'filter' | 'data'>,
		columns: DataTableColumn[],
	) {
		if (columns.length === 0) {
			throw new DataStoreValidationError(
				'No columns found for this data table or data table not found',
			);
		}

		if (!filter?.filters || filter.filters.length === 0) {
			throw new DataStoreValidationError('Filter must not be empty');
		}
		if (!data || Object.keys(data).length === 0) {
			throw new DataStoreValidationError('Data columns must not be empty');
		}

		this.validateRowsWithColumns([data], columns, false);
		this.validateAndTransformFilters(filter, columns);
	}

	async updateRow<T extends boolean | undefined>(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpdateDataTableRowDto, 'returnData'>,
		returnData?: T,
	): Promise<T extends true ? DataStoreRowReturn[] : true>;
	async updateRow(
		dataTableId: string,
		projectId: string,
		dto: Omit<UpdateDataTableRowDto, 'returnData'>,
		returnData = false,
	) {
		await this.validateDataTableSize();
		await this.validateDataStoreExists(dataTableId, projectId);

		return await this.dataStoreColumnRepository.manager.transaction(async (em) => {
			const columns = await this.dataStoreColumnRepository.getColumns(dataTableId, em);
			this.validateUpdateParams(dto, columns);
			return await this.dataStoreRowsRepository.updateRow(
				dataTableId,
				dto.data,
				dto.filter,
				columns,
				returnData,
				em,
			);
		});
	}

	async deleteRows<T extends boolean | undefined>(
		dataStoreId: string,
		projectId: string,
		dto: Omit<DeleteDataTableRowsDto, 'returnData'>,
		returnData?: T,
	): Promise<T extends true ? DataStoreRowReturn[] : true>;
	async deleteRows(
		dataStoreId: string,
		projectId: string,
		dto: Omit<DeleteDataTableRowsDto, 'returnData'>,
		returnData: boolean = false,
	) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		if (columns.length === 0) {
			throw new DataStoreValidationError(
				'No columns found for this data table or data table not found',
			);
		}

		if (dto.filter?.filters && dto.filter.filters.length !== 0) {
			this.validateAndTransformFilters(dto.filter, columns);
		}

		const result = await this.dataStoreRowsRepository.deleteRows(
			dataStoreId,
			columns,
			dto.filter,
			returnData,
		);
		return returnData ? result : true;
	}

	private validateRowsWithColumns(
		rows: DataStoreRows,
		columns: Array<{ name: string; type: string }>,
		includeSystemColumns = false,
	): void {
		// Include system columns like 'id' if requested
		const allColumns = includeSystemColumns
			? [
					{ name: 'id', type: 'number' },
					{ name: 'createdAt', type: 'date' },
					{ name: 'updatedAt', type: 'date' },
					...columns,
				]
			: columns;
		const columnNames = new Set(allColumns.map((x) => x.name));
		const columnTypeMap = new Map(allColumns.map((x) => [x.name, x.type]));
		for (const row of rows) {
			const keys = Object.keys(row);
			for (const key of keys) {
				if (!columnNames.has(key)) {
					throw new DataStoreValidationError(`unknown column name '${key}'`);
				}
				this.validateCell(row, key, columnTypeMap);
			}
		}
	}

	private validateCell(row: DataStoreRow, key: string, columnTypeMap: Map<string, string>) {
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
			throw new DataStoreValidationError(
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
				throw new DataStoreValidationError(
					`value '${String(cell)}' does not match column type 'date'`,
				);
			}
		}

		row[key] = validationResult.newValue as DataStoreColumnJsType;
	}

	private async validateDataStoreExists(dataStoreId: string, projectId: string) {
		const existingTable = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
			project: {
				id: projectId,
			},
		});

		if (!existingTable) {
			throw new DataStoreNotFoundError(dataStoreId);
		}

		return existingTable;
	}

	private async validateColumnExists(dataTableId: string, columnId: string) {
		const existingColumn = await this.dataStoreColumnRepository.findOneBy({
			id: columnId,
			dataTableId,
		});

		if (existingColumn === null) {
			throw new DataStoreColumnNotFoundError(dataTableId, columnId);
		}

		return existingColumn;
	}

	private async validateUniqueName(name: string, projectId: string) {
		const hasNameClash = await this.dataStoreRepository.existsBy({
			name,
			projectId,
		});

		if (hasNameClash) {
			throw new DataStoreNameConflictError(name);
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
					throw new DataStoreValidationError(
						`${filter.condition.toUpperCase()} filter value cannot be null or undefined`,
					);
				}
				if (typeof filter.value !== 'string') {
					throw new DataStoreValidationError(
						`${filter.condition.toUpperCase()} filter value must be a string`,
					);
				}

				if (!filter.value.includes('%')) {
					filter.value = `%${filter.value}%`;
				}
			}

			if (['gt', 'gte', 'lt', 'lte'].includes(filter.condition)) {
				if (filter.value === null || filter.value === undefined) {
					throw new DataStoreValidationError(
						`${filter.condition.toUpperCase()} filter value cannot be null or undefined`,
					);
				}
			}
		}
	}

	private async validateDataTableSize() {
		await this.dataStoreSizeValidator.validateSize(
			async () => await this.dataStoreRepository.findDataTablesSize(),
		);
	}

	async getDataTablesSize() {
		const sizeData = await this.dataStoreSizeValidator.getCachedSizeData(
			async () => await this.dataStoreRepository.findDataTablesSize(),
		);
		return {
			sizeBytes: sizeData.totalBytes,
			sizeState: this.dataStoreSizeValidator.sizeToState(sizeData.totalBytes),
			dataTables: sizeData.dataTables,
		};
	}
}
