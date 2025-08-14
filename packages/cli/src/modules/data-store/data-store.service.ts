import type {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	ListDataStoreContentQueryDto,
	MoveDataStoreColumnDto,
	DataStoreListOptions,
	DataStoreRows,
	UpsertDataStoreRowsDto,
} from '@n8n/api-types';
import { UpdateDataStoreDto } from '@n8n/api-types/src/dto/data-store/update-data-store.dto';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { DataStoreColumn } from './data-store-column.entity';
import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStoreRepository } from './data-store.repository';
import { toTableName } from './utils/sql-utils';

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
		const existingTable = await this.dataStoreRepository.findOneBy({
			name: dto.name,
			projectId,
		});
		if (existingTable !== null) {
			throw new UserError(`Data store with name '${dto.name}' already exists in this project`);
		}
		return await this.dataStoreRepository.createDataStore(projectId, dto.name, dto.columns);
	}

	// Currently only renames data stores
	async updateDataStore(dataStoreId: string, dto: UpdateDataStoreDto) {
		const name = dto.name.trim();

		if (!name) {
			throw new UserError('Data store name must not be empty');
		}

		const existingTable = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
		});

		if (existingTable === null) {
			throw new UserError(`Tried to rename non-existent data store '${dataStoreId}'`);
		}

		const hasNameClash = await this.dataStoreRepository.existsBy({
			name,
			projectId: existingTable.projectId,
		});

		if (hasNameClash) {
			throw new UserError(`The name '${name}' is already taken within this project`);
		}

		await this.dataStoreRepository.update({ id: dataStoreId }, { name });

		return true;
	}

	async deleteDataStoreByProjectId(projectId: string) {
		return await this.dataStoreRepository.deleteDataStoreByProjectId(projectId);
	}

	async deleteDataStoreAll() {
		return await this.dataStoreRepository.deleteDataStoreAll();
	}

	async deleteDataStore(dataStoreId: string) {
		await this.validateDataStoreExists(
			dataStoreId,
			`Tried to delete non-existent data store '${dataStoreId}'`,
		);

		await this.dataStoreRepository.deleteDataStore(dataStoreId);

		return true;
	}

	async addColumn(dataStoreId: string, dto: AddDataStoreColumnDto) {
		await this.validateDataStoreExists(
			dataStoreId,
			`Tried to add column to non-existent data store '${dataStoreId}'`,
		);

		return await this.dataStoreColumnRepository.addColumn(dataStoreId, dto);
	}

	async moveColumn(dataStoreId: string, columnId: string, dto: MoveDataStoreColumnDto) {
		await this.validateDataStoreExists(
			dataStoreId,
			`Tried to move column from non-existent data store '${dataStoreId}'`,
		);

		await this.dataStoreColumnRepository.moveColumn(dataStoreId, columnId, dto.targetIndex);

		return true;
	}

	async deleteColumn(dataStoreId: string, columnId: string) {
		await this.validateDataStoreExists(
			dataStoreId,
			`Tried to delete column from non-existent data store '${dataStoreId}'`,
		);

		const existingColumnMatch = await this.dataStoreColumnRepository.findOneBy({
			id: columnId,
			dataStoreId,
		});

		if (existingColumnMatch === null) {
			throw new UserError(
				`Tried to delete column with name not present in data store '${dataStoreId}'`,
			);
		}

		await this.dataStoreColumnRepository.deleteColumn(dataStoreId, existingColumnMatch);

		return true;
	}

	async getManyAndCount(options: DataStoreListOptions) {
		return await this.dataStoreRepository.getManyAndCount(options);
	}

	async getManyRowsAndCount(dataStoreId: string, dto: ListDataStoreContentQueryDto) {
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
			data: this.normalizeRows(result.data, columns),
		};
	}

	async getColumns(dataStoreId: string) {
		return await this.dataStoreColumnRepository.getColumns(dataStoreId);
	}

	// TODO: move to utils and test
	private normalizeRows(rows: Array<Record<string, unknown>>, columns: DataStoreColumn[]) {
		const typeMap = new Map(columns.map((col) => [col.name, col.type]));
		return rows.map((row) => {
			const normalized = { ...row };
			for (const [key, value] of Object.entries(row)) {
				const type = typeMap.get(key);

				if (type === 'boolean') {
					// Convert boolean values to true/false
					if (typeof value === 'boolean') {
						normalized[key] = value;
					} else if (value === 1 || value === '1') {
						normalized[key] = true;
					} else if (value === 0 || value === '0') {
						normalized[key] = false;
					}
				}
				if (type === 'date' && value !== null && value !== undefined) {
					// Convert date objects or strings to ISO string
					let dateObj: Date | null = null;

					if (value instanceof Date) {
						dateObj = value;
					} else if (typeof value === 'string' || typeof value === 'number') {
						const parsed = new Date(value);
						if (!isNaN(parsed.getTime())) {
							dateObj = parsed;
						}
					}

					normalized[key] = dateObj ? dateObj.toISOString() : value;
				}
			}
			return normalized;
		});
	}

	private async validateRows(dataStoreId: string, rows: DataStoreRows): Promise<void> {
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		if (columns.length === 0) {
			throw new UserError('No columns found for this data store or data store not found');
		}

		const columnNames = new Set(columns.map((x) => x.name));
		const columnTypeMap = new Map(columns.map((x) => [x.name, x.type]));
		for (const row of rows) {
			const keys = Object.keys(row);
			if (columns.length !== keys.length) {
				throw new UserError('mismatched key count');
			}
			for (const key of keys) {
				if (!columnNames.has(key)) {
					throw new UserError('unknown column name');
				}
				const cell = row[key];
				if (cell === null) continue;
				switch (columnTypeMap.get(key)) {
					case 'boolean':
						if (typeof cell !== 'boolean')
							throw new UserError(
								`value '${cell.toString()}' does not match column type 'boolean'`,
							);
						break;
					case 'date':
						if (!(cell instanceof Date))
							throw new UserError(`value '${cell}' does not match column type 'date'`);
						row[key] = cell.toISOString();
						break;
					case 'string':
						if (typeof cell !== 'string')
							throw new UserError(`value '${cell.toString()}' does not match column type 'string'`);
						break;
					case 'number':
						if (typeof cell !== 'number')
							throw new UserError(`value '${cell.toString()}' does not match column type 'number'`);
						break;
				}
			}
		}
	}

	async insertRows(dataStoreId: string, rows: DataStoreRows) {
		await this.validateRows(dataStoreId, rows);
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);

		return await this.dataStoreRowsRepository.insertRows(toTableName(dataStoreId), rows, columns);
	}

	async upsertRows(dataStoreId: string, dto: UpsertDataStoreRowsDto) {
		await this.validateRows(dataStoreId, dto.rows);
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);

		return await this.dataStoreRowsRepository.upsertRows(toTableName(dataStoreId), dto, columns);
	}

	private async validateDataStoreExists(dataStoreId: string, msg?: string) {
		const existingTable = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
		});

		if (!existingTable) {
			throw new UserError(msg ?? `Data Store '${dataStoreId}' does not exist.`);
		}
	}
}
