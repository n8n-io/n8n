import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';
import type { DeepPartial } from 'ts-essentials';
import type { Class } from 'n8n-core';

export const mockInstance = <T>(ctor: Class<T>, data: DeepPartial<T> | undefined = undefined) => {
	const instance = mock<T>(data);
	Container.set(ctor, instance);
	return instance;
};
