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
import type { DataStoreRow, DataStoreRows } from 'n8n-workflow';

import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStoreRepository } from './data-store.repository';
import { DataStoreColumnNotFoundError } from './errors/data-store-column-not-found.error';
import { DataStoreNameConflictError } from './errors/data-store-name-conflict.error';
import { DataStoreNotFoundError } from './errors/data-store-not-found.error';
import { DataStoreValidationError } from './errors/data-store-validation.error';
import { toTableName, normalizeRows } from './utils/sql-utils';

@Service()
export class DataStoreService {
	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
		private readonly dataStoreColumnRepository: DataStoreColumnRepository,
		private readonly dataStoreRowsRepository: DataStoreRowsRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-store');
	}

	async start() {}
	async shutdown() {}

	async createDataStore(projectId: string, dto: CreateDataStoreDto) {
		await this.validateUniqueName(dto.name, projectId);

		return await this.dataStoreRepository.createDataStore(projectId, dto.name, dto.columns);
	}

	// Currently only renames data stores
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

		// unclear if we should validate here, only use case would be to reduce the chance of
		// a renamed/removed column appearing here (or added column missing) if the store was
		// modified between when the frontend sent the request and we received it
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		const result = await this.dataStoreRowsRepository.getManyAndCount(
			toTableName(dataStoreId),
			dto,
		);
		return {
			count: result.count,
			data: normalizeRows(result.data, columns),
		};
	}

	async getColumns(dataStoreId: string, projectId: string) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		return await this.dataStoreColumnRepository.getColumns(dataStoreId);
	}

	async insertRows(dataStoreId: string, projectId: string, rows: DataStoreRows) {
		await this.validateDataStoreExists(dataStoreId, projectId);
		await this.validateRows(dataStoreId, rows);

		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		return await this.dataStoreRowsRepository.insertRows(toTableName(dataStoreId), rows, columns);
	}

	async upsertRows(dataStoreId: string, projectId: string, dto: UpsertDataStoreRowsDto) {
		await this.validateDataStoreExists(dataStoreId, projectId);
		await this.validateRows(dataStoreId, dto.rows);

		if (dto.rows.length === 0) {
			throw new DataStoreValidationError('No rows provided for upsertRows');
		}

		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);

		return await this.dataStoreRowsRepository.upsertRows(toTableName(dataStoreId), dto, columns);
	}

	async updateRow(dataStoreId: string, projectId: string, dto: UpdateDataStoreRowDto) {
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

		this.validateRowsWithColumns([filter], columns, true, true);
		this.validateRowsWithColumns([data], columns, true, false);

		await this.dataStoreRowsRepository.updateRow(toTableName(dataStoreId), data, filter, columns);
		return true;
	}

	async deleteRows(dataStoreId: string, projectId: string, ids: number[]) {
		await this.validateDataStoreExists(dataStoreId, projectId);

		return await this.dataStoreRowsRepository.deleteRows(toTableName(dataStoreId), ids);
	}

	private validateRowsWithColumns(
		rows: DataStoreRows,
		columns: Array<{ name: string; type: string }>,
		allowPartial = false,
		includeSystemColumns = false,
	): void {
		// Include system columns like 'id' if requested
		const allColumns = includeSystemColumns
			? [{ name: 'id', type: 'number' }, ...columns]
			: columns;
		const columnNames = new Set(allColumns.map((x) => x.name));
		const columnTypeMap = new Map(allColumns.map((x) => [x.name, x.type]));
		for (const row of rows) {
			const keys = Object.keys(row);
			if (!allowPartial && columnNames.size !== keys.length) {
				throw new DataStoreValidationError('mismatched key count');
			}
			for (const key of keys) {
				if (!columnNames.has(key)) {
					throw new DataStoreValidationError('unknown column name');
				}
				this.validateCell(row, key, columnTypeMap);
			}
		}
	}

	private async validateRows(
		dataStoreId: string,
		rows: DataStoreRows,
		allowPartial = false,
		includeSystemColumns = false,
	): Promise<void> {
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		if (columns.length === 0) {
			throw new DataStoreValidationError(
				'No columns found for this data store or data store not found',
			);
		}

		this.validateRowsWithColumns(rows, columns, allowPartial, includeSystemColumns);
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

	private async validateColumnExists(dataStoreId: string, columnId: string) {
		const existingColumn = await this.dataStoreColumnRepository.findOneBy({
			id: columnId,
			dataStoreId,
		});

		if (existingColumn === null) {
			throw new DataStoreColumnNotFoundError(dataStoreId, columnId);
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
}
