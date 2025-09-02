import { dateTimeSchema } from '@n8n/api-types';
import type {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	ListDataStoreContentQueryDto,
	MoveDataStoreColumnDto,
	DataStoreListOptions,
	UpsertDataStoreRowsDto,
	UpdateDataStoreDto,
	UpdateDataStoreRowDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { DataStoreRow, DataStoreRowReturn, DataStoreRows } from 'n8n-workflow';

import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStoreRepository } from './data-store.repository';
import { DataStoreColumnNotFoundError } from './errors/data-store-column-not-found.error';
import { DataStoreNameConflictError } from './errors/data-store-name-conflict.error';
import { DataStoreNotFoundError } from './errors/data-store-not-found.error';
import { DataStoreValidationError } from './errors/data-store-validation.error';
import { normalizeRows } from './utils/sql-utils';
import { GlobalConfig } from '@n8n/config';

@Service()
export class DataStoreService {
	lastCacheSizeCheck: Date;
	pendingSizeCheck: any;

	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
		private readonly dataStoreColumnRepository: DataStoreColumnRepository,
		private readonly dataStoreRowsRepository: DataStoreRowsRepository,
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
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
		this.validateAndTransformFilters(dto);

		// unclear if we should validate here, only use case would be to reduce the chance of
		// a renamed/removed column appearing here (or added column missing) if the store was
		// modified between when the frontend sent the request and we received it
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		const result = await this.dataStoreRowsRepository.getManyAndCount(dataStoreId, dto, columns);
		return {
			count: result.count,
			data: normalizeRows(result.data, columns),
		};
	}

	async getColumns(dataStoreId: string, projectId: string) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		return await this.dataStoreColumnRepository.getColumns(dataStoreId);
	}

	async insertRows<T extends boolean | undefined>(
		dataStoreId: string,
		projectId: string,
		rows: DataStoreRows,
		returnData?: T,
	): Promise<Array<T extends true ? DataStoreRowReturn : Pick<DataStoreRowReturn, 'id'>>>;
	async insertRows(
		dataStoreId: string,
		projectId: string,
		rows: DataStoreRows,
		returnData?: boolean,
	) {
		await this.validateDataTableSize();
		await this.validateDataStoreExists(dataStoreId, projectId);
		await this.validateRows(dataStoreId, rows);

		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		return await this.dataStoreRowsRepository.insertRows(dataStoreId, rows, columns, returnData);
	}

	async upsertRows<T extends boolean | undefined>(
		dataStoreId: string,
		projectId: string,
		dto: Omit<UpsertDataStoreRowsDto, 'returnData'>,
		returnData?: T,
	): Promise<T extends true ? DataStoreRowReturn[] : true>;
	async upsertRows(
		dataStoreId: string,
		projectId: string,
		dto: Omit<UpsertDataStoreRowsDto, 'returnData'>,
		returnData: boolean = false,
	) {
		await this.validateDataTableSize();
		await this.validateDataStoreExists(dataStoreId, projectId);
		await this.validateRows(dataStoreId, dto.rows, true);

		if (dto.rows.length === 0) {
			throw new DataStoreValidationError('No rows provided for upsertRows');
		}

		const { matchFields, rows } = dto;
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);

		return await this.dataStoreRowsRepository.upsertRows(
			dataStoreId,
			matchFields,
			rows,
			columns,
			returnData,
		);
	}

	async updateRow<T extends boolean | undefined>(
		dataStoreId: string,
		projectId: string,
		dto: Omit<UpdateDataStoreRowDto, 'returnData'>,
		returnData?: T,
	): Promise<T extends true ? DataStoreRowReturn[] : true>;
	async updateRow(
		dataStoreId: string,
		projectId: string,
		dto: Omit<UpdateDataStoreRowDto, 'returnData'>,
		returnData = false,
	) {
		await this.validateDataTableSize();
		await this.validateDataStoreExists(dataStoreId, projectId);

		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		if (columns.length === 0) {
			throw new DataStoreValidationError(
				'No columns found for this data store or data store not found',
			);
		}

		const { data, filter } = dto;
		if (!filter || Object.keys(filter).length === 0) {
			throw new DataStoreValidationError('Filter columns must not be empty for updateRow');
		}
		if (!data || Object.keys(data).length === 0) {
			throw new DataStoreValidationError('Data columns must not be empty for updateRow');
		}

		this.validateRowsWithColumns([filter], columns, true);
		this.validateRowsWithColumns([data], columns, false);

		return await this.dataStoreRowsRepository.updateRow(
			dataStoreId,
			data,
			filter,
			columns,
			returnData,
		);
	}

	async deleteRows(dataStoreId: string, projectId: string, ids: number[]) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		return await this.dataStoreRowsRepository.deleteRows(dataStoreId, ids);
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

	private async validateRows(
		dataStoreId: string,
		rows: DataStoreRows,
		includeSystemColumns = false,
	): Promise<void> {
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		this.validateRowsWithColumns(rows, columns, includeSystemColumns);
	}

	private validateCell(row: DataStoreRow, key: string, columnTypeMap: Map<string, string>) {
		const cell = row[key];
		if (cell === null) return;

		const columnType = columnTypeMap.get(key);
		switch (columnType) {
			case 'boolean':
				if (typeof cell !== 'boolean') {
					throw new DataStoreValidationError(
						`value '${String(cell)}' does not match column type 'boolean'`,
					);
				}
				break;
			case 'date':
				if (typeof cell === 'string') {
					const validated = dateTimeSchema.safeParse(cell);
					if (validated.success) {
						row[key] = validated.data.toISOString();
						break;
					}
				} else if (cell instanceof Date) {
					row[key] = cell.toISOString();
					break;
				}

				throw new DataStoreValidationError(`value '${cell}' does not match column type 'date'`);
			case 'string':
				if (typeof cell !== 'string') {
					throw new DataStoreValidationError(
						`value '${String(cell)}' does not match column type 'string'`,
					);
				}
				break;
			case 'number':
				if (typeof cell !== 'number') {
					throw new DataStoreValidationError(
						`value '${String(cell)}' does not match column type 'number'`,
					);
				}
				break;
		}
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

	private validateAndTransformFilters(dto: ListDataStoreContentQueryDto): void {
		if (!dto.filter?.filters) {
			return;
		}

		for (const filter of dto.filter.filters) {
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
		const now = new Date();

		// If there's already a pending check, wait for it to complete
		if (this.pendingSizeCheck) {
			await this.pendingSizeCheck;
			return;
		}

		// Check if we need to run the size check
		const shouldRunCheck =
			!this.lastCacheSizeCheck || now.getTime() - this.lastCacheSizeCheck.getTime() >= 3 * 1000;

		if (shouldRunCheck) {
			// Create and store the promise to prevent concurrent checks
			this.pendingSizeCheck = this.performSizeCheck(now);

			try {
				await this.pendingSizeCheck;
			} finally {
				// Clear the pending check once it's done
				this.pendingSizeCheck = null;
			}
		}
	}

	private async performSizeCheck(checkTime: Date): Promise<void> {
		const maxSize = this.globalConfig.datatable.maxSize;

		this.lastCacheSizeCheck = checkTime;

		const currentSizeInMbs = await this.findDataTablesSize();

		if (currentSizeInMbs >= maxSize) {
			throw new DataStoreValidationError(
				`Data store size limit exceeded: ${currentSizeInMbs}MB used, limit is ${this.globalConfig.datatable.maxSize}MB`,
			);
		}
	}

	async findDataTablesSize(): Promise<number> {
		const dbType = this.globalConfig.database.type;
		const tablePrefix = this.globalConfig.database.tablePrefix || '';
		const schemaName = this.globalConfig.database.postgresdb.schema;

		let sql = '';

		switch (dbType) {
			case 'sqlite':
				sql = `
					SELECT ROUND(SUM(pgsize) / 1024.0 / 1024.0, 2) AS total_mb
					FROM dbstat
					WHERE name LIKE '${tablePrefix}data_table_user_%'
				`;
				break;

			case 'postgresdb':
				sql = `
					SELECT ROUND(
						SUM(pg_relation_size(schemaname||'.'||tablename)) / 1024.0 / 1024.0, 2
					) AS total_mb
					FROM pg_tables
					WHERE schemaname = '${schemaName}'
					AND tablename LIKE '${tablePrefix}data_table_user_%'
				`;
				break;

			case 'mysqldb':
			case 'mariadb':
				const databaseName = this.globalConfig.database.mysqldb.database;
				sql = `
					SELECT ROUND(SUM((DATA_LENGTH + INDEX_LENGTH)) / 1024 / 1024, 1) AS total_mb
					FROM information_schema.tables
					WHERE table_schema = '${databaseName}'
					AND table_name LIKE '${tablePrefix}data_table_user_%'
				`;
				break;

			default:
				this.logger.warn(`Unsupported database type for size calculation: ${dbType}`);
				return 0;
		}

		const result = await this.dataStoreRepository.query(sql);

		const currentSizeInMbs = result[0]?.total_mb || 0;

		return currentSizeInMbs;
	}
}
