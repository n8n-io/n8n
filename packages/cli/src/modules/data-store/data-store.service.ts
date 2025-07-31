import {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	DeleteDataStoreColumnDto,
	ListDataStoreContentQueryDto,
	MoveDataStoreColumnDto,
} from '@n8n/api-types';
import { RenameDataStoreDto } from '@n8n/api-types/src/dto/data-store/rename-data-store.dto';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { DataStoreConfig } from './data-store';
import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStoreRepository } from './data-store.repository';
import type {
	DataStoreListOptions,
	DataStoreRows,
	DataStoreUserTableName,
} from './data-store.types';

function toTableName(dataStoreId: string): DataStoreUserTableName {
	return `data_store_user_${dataStoreId}`;
}

@Service()
export class DataStoreService {
	private intervalId?: NodeJS.Timeout;

	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
		private readonly dataStoreColumnRepository: DataStoreColumnRepository,
		private readonly dataStoreRowsRepository: DataStoreRowsRepository,
		private readonly logger: Logger,
		private readonly config: DataStoreConfig,
	) {
		this.logger = this.logger.scoped('data-store');
	}

	start() {
		this.logger.debug('Starting feature work...');

		this.intervalId = setInterval(
			() => {
				this.logger.debug('Running scheduled task...');
			},
			this.config.taskInterval * 60 * 1000,
		);
	}

	async shutdown() {
		this.logger.debug('Shutting down...');

		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		await Promise.resolve();
	}

	async createDataStore(projectId: string, dto: CreateDataStoreDto) {
		const dataStore = this.dataStoreRepository.create({ ...dto, projectId });
		const existingTable = await this.dataStoreRepository.findOneBy({
			name: dto.name,
			projectId,
		});
		if (existingTable !== null) {
			throw new UserError(`data store name '${dto.name}' already exists in this project`);
		}
		await this.dataStoreRepository.insert(dataStore);
		await this.dataStoreRepository.createUserTable(toTableName(dataStore.id), dto.columns);

		return dataStore;
	}

	async renameDataStore(dataStoreId: string, dto: RenameDataStoreDto) {
		const existingTable = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
		});

		if (existingTable === null) {
			throw new UserError('tried to rename non-existent data store');
		}

		const hasNameClash = await this.dataStoreRepository.existsBy({
			name: dto.name,
			projectId: existingTable.projectId,
		});

		if (hasNameClash) {
			throw new UserError(`name '${dto.name}' is already taken in this project`);
		}

		await this.dataStoreRepository.update({ id: dataStoreId }, dto);

		return true;
	}

	async deleteDataStoreByProjectId(projectId: string) {
		const existingTables = await this.dataStoreRepository.findBy({ projectId });

		let changed = false;
		for (const match of existingTables) {
			const result = await this.deleteDataStore(match.id);
			changed = changed || result;
		}

		return changed;
	}

	async deleteDataStoreAll() {
		const existingMatches = await this.dataStoreRepository.findBy({});
		let changed = false;
		for (const match of existingMatches) {
			const result = await this.deleteDataStore(match.id);
			changed = changed || result;
		}

		return changed;
	}

	async deleteDataStore(dataStoreId: string) {
		const existingMatch = await this.dataStoreRepository.existsBy({
			id: dataStoreId,
		});

		if (!existingMatch) {
			throw new Error('tried to delete non-existent data store');
		}

		await this.dataStoreRepository.delete({ id: dataStoreId });
		await this.dataStoreRepository.deleteUserTable(toTableName(dataStoreId));

		return true;
	}

	async addColumn(dataStoreId: string, dto: AddDataStoreColumnDto) {
		const existingTableMatch = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
		});

		if (existingTableMatch === null) {
			throw new UserError('tried to add column to non-existent data store');
		}

		const existingColumnMatch = await this.dataStoreColumnRepository.existsBy({
			name: dto.name,
			dataStoreId,
		});

		if (existingColumnMatch) {
			throw new UserError(
				`column name '${dto.name}' already taken in data store '${existingTableMatch.name}'`,
			);
		}

		if (dto.columnIndex === undefined) {
			const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
			dto.columnIndex = columns.length;
		} else {
			await this.dataStoreColumnRepository.shiftColumns(dataStoreId, dto.columnIndex, 1);
		}

		const column = this.dataStoreColumnRepository.create({
			...dto,
			dataStoreId,
		});

		await this.dataStoreColumnRepository.insert(column);
		await this.dataStoreColumnRepository.addColumn(toTableName(dataStoreId), column);

		return column;
	}

	async moveColumn(dataStoreId: string, dto: MoveDataStoreColumnDto) {
		const existingTable = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
		});

		if (existingTable === null) {
			throw new UserError('tried to move columns from non-existent data store');
		}

		const columnCount = await this.dataStoreColumnRepository.countBy({ dataStoreId });

		if (dto.columnIndex >= columnCount) {
			throw new UserError('tried to move column to index larger than column count');
		}

		if (dto.columnIndex < 0) {
			throw new UserError('tried to move column to negative index');
		}

		const existingColumn = await this.dataStoreColumnRepository.findOneBy({
			id: dto.columnId,
			dataStoreId,
		});

		if (existingColumn === null) {
			throw new UserError(`tried to move column not present in data store '${existingTable.name}'`);
		}

		await this.dataStoreColumnRepository.shiftColumns(dataStoreId, existingColumn.columnIndex, -1);
		await this.dataStoreColumnRepository.shiftColumns(dataStoreId, dto.columnIndex, 1);
		await this.dataStoreColumnRepository.update(
			{ id: existingColumn.id },
			{ columnIndex: dto.columnIndex },
		);

		return true;
	}

	async deleteColumn(dataStoreId: string, dto: DeleteDataStoreColumnDto) {
		const existingTable = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
		});

		if (!existingTable) {
			throw new UserError('tried to delete column from non-existent table');
		}

		const existingColumnMatch = await this.dataStoreColumnRepository.findBy({
			id: dto.columnId,
			dataStoreId,
		});

		if (existingColumnMatch.length === 0) {
			throw new UserError(
				`tried to delete column with name not present in data store '${existingTable.name}'`,
			);
		}

		await this.dataStoreColumnRepository.remove(existingColumnMatch);
		await this.dataStoreColumnRepository.deleteColumn(
			toTableName(dataStoreId),
			existingColumnMatch[0].name,
		);
		await this.dataStoreColumnRepository.shiftColumns(
			dataStoreId,
			existingColumnMatch[0].columnIndex,
			-1,
		);
		// should we update the main table entry's `updatedAt` field here?

		return true;
	}

	async getManyAndCount(options: DataStoreListOptions) {
		return await this.dataStoreRepository.getManyAndCount(options);
	}

	async getManyRowsAndCount(dataStoreId: string, dto: Partial<ListDataStoreContentQueryDto>) {
		// unclear if we should validate here, only use case would be to reduce the chance of
		// a renamed/removed column appearing here (or added column missing) if the store was
		// modified between when the frontend sent the request and we received it
		return await this.dataStoreRowsRepository.getManyAndCount(toTableName(dataStoreId), dto);
	}

	async getColumns(dataStoreId: string) {
		return await this.dataStoreColumnRepository.getColumns(dataStoreId);
	}

	private async validateRows(dataStoreId: string, rows: DataStoreRows) {
		const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
		if (columns.length === 0) {
			throw new UserError('no columns found for this data store or data store not found');
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
		return true;
	}

	async appendRows(dataStoreId: string, rows: DataStoreRows) {
		const validationResult = await this.validateRows(dataStoreId, rows);
		if (!validationResult) {
			return validationResult;
		}

		return await this.dataStoreRowsRepository.appendRows(toTableName(dataStoreId), rows);
	}
}
