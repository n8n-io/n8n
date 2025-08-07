import { Container, type Constructable } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { DeepPartial } from 'ts-essentials';

export const mockInstance = <T>(serviceClass: Constructable<T>, data?: DeepPartial<T>) => {
	const instance = mock<T>(data);
	Container.set(serviceClass, instance as T);
	return instance;
};
