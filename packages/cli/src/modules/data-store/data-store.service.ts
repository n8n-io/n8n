import {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	DeleteDataStoreColumnDto,
} from '@n8n/api-types';
import { RenameDataStoreDto } from '@n8n/api-types/src/dto/data-store/rename-data-store.dto';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { DataStoreConfig } from './data-store';
import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRepository } from './data-store.repository';
import type { DataStoreListOptions, DataStoreUserTableName } from './data-store.types';

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

	// async getMetaData(dataStoreId: string) {
	// 	const existingMatch = await this.dataStoreRepository.findBy({
	// 		id: dataStoreId,
	// 	});

	// 	if (!existingMatch) {
	// 		return 'tried to rename non-existent table';
	// 	}

	// 	return existingMatch;
	// }

	// async getMetaDataByProjectIds(projectIds: string[]) {
	// 	return await this.dataStoreRepository.findBy(projectIds.map((projectId) => ({ projectId })));
	// }

	// async getMetaDataAll() {
	// 	return await this.dataStoreRepository.find({});
	// }

	async renameDataStore(dataStoreId: string, dto: RenameDataStoreDto) {
		const existingTable = await this.dataStoreRepository.findOneBy({
			id: dataStoreId,
		});

		if (!existingTable) {
			return 'tried to rename non-existent table';
		}

		const hasNameClash = await this.dataStoreRepository.existsBy({
			name: dto.name,
			projectId: existingTable.projectId,
		});

		if (hasNameClash) {
			return 'tried to rename to name that is already taken in this project';
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

	async addColumn(dataStoreId: string, dto: AddDataStoreColumnDto) {
		const existingTableMatch = await this.dataStoreRepository.existsBy({
			id: dataStoreId,
		});

		if (!existingTableMatch) {
			return 'tried to add column to non-existent table';
		}

		const column = this.dataStoreColumnRepository.create({
			...dto.column,
			dataStoreId,
		});

		const existingColumnMatch = await this.dataStoreColumnRepository.findBy({
			name: column.name,
			dataStoreId,
		});

		if (isNonEmpty(existingColumnMatch)) {
			return 'tried to add column with name already present in this data store';
		}

		await this.dataStoreColumnRepository.insert(column);
		await this.dataStoreColumnRepository.addColumn(toTableName(dataStoreId), column);

		return true;
	}

	async deleteColumn(dataStoreId: string, dto: DeleteDataStoreColumnDto) {
		const existingTableMatch = await this.dataStoreRepository.existsBy({
			id: dataStoreId,
		});

		if (!existingTableMatch) {
			return 'tried to delete columns from non-existent table';
		}

		const existingColumnMatch = await this.dataStoreColumnRepository.findBy({
			name: dto.columnName,
			dataStoreId,
		});

		if (existingColumnMatch.length === 0) {
			return 'tried to delete column with name not present in this data store';
		}

		await this.dataStoreColumnRepository.remove(existingColumnMatch);
		await this.dataStoreColumnRepository.deleteColumn(toTableName(dataStoreId), dto.columnName);
		// should we update the main table entry's `updatedAt` field here?

		return true;
	}

	async getManyAndCount(options: DataStoreListOptions) {
		return await this.dataStoreRepository.getManyAndCount(options);
	}
}
