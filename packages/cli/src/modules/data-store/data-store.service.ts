import { AddDataStoreColumnDto, CreateDataStoreDto } from '@n8n/api-types';
import { RenameDataStoreDto } from '@n8n/api-types/src/dto/datastore/rename-data-store.dto';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { DataStoreConfig } from './data-store';
import { DataStoreRepository } from './data-store.repository';
import type { DataStoreUserTableName } from './data-store.types';

function toTableName(datastoreId: string): DataStoreUserTableName {
	return `dataStore_userTable_${datastoreId}`;
}

@Service()
export class DataStoreService {
	private intervalId?: NodeJS.Timeout;

	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
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
		const result = await this.dataStoreRepository.save(dataStore);

		await this.dataStoreRepository.createUserTable(toTableName(result.id), dto.fields);

		return dataStore;
	}

	async renameDataStore(dto: RenameDataStoreDto) {
		await this.dataStoreRepository.update(dto.id, dto);
	}

	async addColumn(dto: AddDataStoreColumnDto) {
		await this.dataStoreRepository.insert(dto);
	}
}
