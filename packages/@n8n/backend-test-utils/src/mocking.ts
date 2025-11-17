import { Container, type Constructable } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { DeepPartial } from 'ts-essentials';

export const mockInstance = <T>(
	serviceClass: Constructable<T>,
	data: DeepPartial<T> | undefined = undefined,
) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
	const instance = mock<T>(data as any);
	Container.set(serviceClass, instance);
	return instance;
};
