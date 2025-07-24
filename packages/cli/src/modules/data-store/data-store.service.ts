import {
	AddDataStoreColumnsDto,
	CreateDataStoreDto,
	DeleteDataStoreColumnsDto,
} from '@n8n/api-types';
import { RenameDataStoreDto } from '@n8n/api-types/src/dto/data-store/rename-data-store.dto';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { DataStoreConfig } from './data-store';
import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRepository } from './data-store.repository';
import type { DataStoreUserTableName } from './data-store.types';

function toTableName(dataStoreId: string): DataStoreUserTableName {
	return `data_store_user_${dataStoreId}`;
}

function isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
	return array.length > 0;
}

@Service()
export class DataStoreService {
	private intervalId?: NodeJS.Timeout;

	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
		private readonly dataStoreColumnRepository: DataStoreColumnRepository,
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

	async createDataStore(dto: CreateDataStoreDto) {
		const dataStore = this.dataStoreRepository.create(dto);
		const existingMatch = await this.dataStoreRepository.existsBy({
			name: dto.name,
			projectId: dto.projectId,
		});
		if (existingMatch) {
			return 'duplicate data store name in project';
		}
		await this.dataStoreRepository.insert(dataStore);
		await this.dataStoreRepository.createUserTable(toTableName(dataStore.id), dto.columns);

		return dataStore;
	}

	async getMetaData(dataStoreId: string) {
		const existingMatch = await this.dataStoreRepository.findBy({
			id: dataStoreId,
		});

		if (!existingMatch) {
			return 'tried to rename non-existent table';
		}

		return existingMatch;
	}

	async getMetaDataByProjectIds(projectIds: string[]) {
		return await this.dataStoreRepository.findBy(projectIds.map((projectId) => ({ projectId })));
	}

	async getMetaDataAll() {
		return await this.dataStoreRepository.find({});
	}

	async renameDataStore(dataStoreId: string, dto: RenameDataStoreDto) {
		const existingMatch = await this.dataStoreRepository.existsBy({
			id: dataStoreId,
		});

		if (!existingMatch) {
			return 'tried to rename non-existent table';
		}

		await this.dataStoreRepository.update({ id: dataStoreId }, dto);

		return true;
	}

	async deleteDataStoreAll() {
		const existingMatches = await this.dataStoreRepository.findBy({});

		let changed = false;
		for (const match of existingMatches) {
			changed = changed || true === (await this.deleteDataStore(match.id));
		}

		return changed;
	}

	async deleteDataStore(dataStoreId: string) {
		const existingMatch = await this.dataStoreRepository.existsBy({
			id: dataStoreId,
		});

		if (!existingMatch) {
			return 'tried to delete non-existent table';
		}

		await this.dataStoreRepository.delete({ id: dataStoreId });
		await this.dataStoreRepository.deleteUserTable(toTableName(dataStoreId));

		return true;
	}

	async addColumns(dataStoreId: string, dto: AddDataStoreColumnsDto) {
		const existingTableMatch = await this.dataStoreRepository.existsBy({
			id: dataStoreId,
		});

		if (!existingTableMatch) {
			return 'tried to add columns to non-existent table';
		}

		const columns = dto.columns.map((x) => this.dataStoreColumnRepository.create(x));
		if (!isNonEmpty(columns)) return;

		const existingColumnMatch = await this.dataStoreColumnRepository.findBy(
			columns.map((x) => ({ name: x.name, dataStoreId })),
		);

		if (isNonEmpty(existingColumnMatch)) {
			return 'tried to add column with name already present in this data store';
		}

		await this.dataStoreColumnRepository.addColumn(toTableName(dataStoreId), columns);
		await this.dataStoreColumnRepository.insert(columns);

		return true;
	}

	async deleteColumns(dataStoreId: string, dto: DeleteDataStoreColumnsDto) {
		const existingTableMatch = await this.dataStoreRepository.existsBy({
			id: dataStoreId,
		});

		if (!existingTableMatch) {
			return 'tried to delete columns from non-existent table';
		}

		const existingColumnMatch = await this.dataStoreColumnRepository.findBy(
			dto.columnNames.map((name) => ({ name, dataStoreId })),
		);

		if (existingColumnMatch.length !== dto.columnNames.length) {
			return 'tried to delete column with name not present in this data store';
		}

		if (!isNonEmpty(dto.columnNames)) {
			return false;
		}

		await this.dataStoreColumnRepository.deleteColumn(toTableName(dataStoreId), dto.columnNames);
		await this.dataStoreColumnRepository.remove(existingColumnMatch);
		// should we update the main table entry's `updatedAt` field here?

		return true;
	}
}
