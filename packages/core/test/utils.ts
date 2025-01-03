import type { Constructable } from '@n8n/di';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Duplex } from 'stream';
import type { DeepPartial } from 'ts-essentials';

export const mockInstance = <T>(
	constructor: Constructable<T>,
	data: DeepPartial<T> | undefined = undefined,
) => {
	const instance = mock<T>(data);
	Container.set(constructor, instance);
	return instance;
};

export function toStream(buffer: Buffer) {
	const duplexStream = new Duplex();
	duplexStream.push(buffer);
	duplexStream.push(null);

	return duplexStream;
}

export const toFileId = (workflowId: string, executionId: string, fileUuid: string) =>
	`workflows/${workflowId}/executions/${executionId}/binary_data/${fileUuid}`;
