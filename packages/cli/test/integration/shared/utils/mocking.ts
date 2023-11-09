import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';
import type { DeepPartial } from 'ts-essentials';

export const mockInstance = <T>(
	ctor: new (...args: unknown[]) => T,
	data: DeepPartial<T> | undefined = undefined,
) => {
	const instance = mock<T>(data);
	Container.set(ctor, instance);
	return instance;
};
