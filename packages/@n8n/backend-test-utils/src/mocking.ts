import { Container, type Constructable } from '@n8n/di';
import { mock } from 'jest-mock-extended';

export const mockInstance = <T>(serviceClass: Constructable<T>, data?: any) => {
	const instance = mock<T>(data);
	Container.set(serviceClass, instance as T);
	return instance;
};
