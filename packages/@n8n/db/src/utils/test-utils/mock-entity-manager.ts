import { DataSource, EntityManager, type EntityMetadata } from '@n8n/typeorm';
import type { Class } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { mockInstance } from './mock-instance';

export const mockEntityManager = (entityClass: Class) => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, {
		manager: entityManager,
		getMetadata: () => mock<EntityMetadata>({ target: entityClass }),
	});
	Object.assign(entityManager, { connection: dataSource });
	return entityManager;
};
