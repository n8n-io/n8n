import { DataSource, EntityManager, type EntityMetadata } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { Class } from 'n8n-core';
import type { DeepPartial } from 'ts-essentials';
import { Container } from 'typedi';

import type { Logger } from '@/logging/logger.service';

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
