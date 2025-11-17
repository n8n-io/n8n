import { Container, type Constructable } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { DeepPartial } from 'ts-essentials';

export const mockInstance = <T>(
	serviceClass: Constructable<T>,
	data: DeepPartial<T> | undefined = undefined,
) => {
	// @ts-expect-error - ts-essentials version conflict
	const instance = mock<T>(data as any);
	Container.set(serviceClass, instance);
	return instance;
};
