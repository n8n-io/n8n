import type { CreateDataStoreColumnDto } from '@n8n/api-types';
import { randomName } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type { DataStoreRows } from 'n8n-workflow';

import { DataStoreColumnRepository } from '@/modules/data-table/data-store-column.repository';
import { DataStoreRowsRepository } from '@/modules/data-table/data-store-rows.repository';
import { DataStoreRepository } from '@/modules/data-table/data-store.repository';

export const createDataStore = async (
	project: Project,
	options: {
		name?: string;
		columns?: CreateDataStoreColumnDto[];
		data?: DataStoreRows;
		updatedAt?: Date;
	} = {},
) => {
	const dataStoreRepository = Container.get(DataStoreRepository);
	const dataStore = await dataStoreRepository.createDataStore(
		project.id,
		options.name ?? randomName(),
		options.columns ?? [],
	);

	if (options.updatedAt) {
		await dataStoreRepository.update(dataStore.id, {
			updatedAt: options.updatedAt,
		});
		dataStore.updatedAt = options.updatedAt;
	}

	if (options.data) {
		const dataStoreColumnRepository = Container.get(DataStoreColumnRepository);
		const columns = await dataStoreColumnRepository.getColumns(dataStore.id);

		const dataStoreRowsRepository = Container.get(DataStoreRowsRepository);
		await dataStoreRowsRepository.insertRows(dataStore.id, options.data, columns, 'count');
	}

	return dataStore;
};
