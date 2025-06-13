import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { DataSource, EntityManager, type EntityMetadata } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { Cipher, Class } from 'n8n-core';
import type { DeepPartial } from 'ts-essentials';

export const mockInstance = <T>(
	serviceClass: Class<T>,
	data: DeepPartial<T> | undefined = undefined,
) => {
	const instance = mock<T>(data);
	Container.set(serviceClass, instance);
	return instance;
};

export const mockEntityManager = (entityClass: Class) => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, {
		manager: entityManager,
		getMetadata: () => mock<EntityMetadata>({ target: entityClass }),
	});
	Object.assign(entityManager, { connection: dataSource });
	return entityManager;
};

export const mockLogger = () => mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });

export const mockCipher = () =>
	mock<Cipher>({
		encrypt: (data) => (typeof data === 'string' ? data : JSON.stringify(data)),
		decrypt: (data) => data,
	});
