import { mockInstance } from '@n8n/backend-test-utils';
import { DataSource, EntityManager, type EntityMetadata } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { Cipher, Class } from 'n8n-core';

export const mockEntityManager = (entityClass: Class) => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, {
		manager: entityManager,
		getMetadata: () => mock<EntityMetadata>({ target: entityClass }),
	});
	Object.assign(entityManager, { connection: dataSource });
	return entityManager;
};

export const mockCipher = () =>
	mock<Cipher>({
		encrypt: (data) => (typeof data === 'string' ? data : JSON.stringify(data)),
		decrypt: (data) => data,
	});
