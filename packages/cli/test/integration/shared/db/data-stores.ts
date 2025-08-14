import type { CreateDataStoreColumnDto } from '@n8n/api-types';
import { randomName } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { DataStoreRepository } from '@/modules/data-store/data-store.repository';

export const createDataStore = async (
	project: Project,
	options: {
		name?: string;
		columns?: CreateDataStoreColumnDto[];
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

	return dataStore;
};
