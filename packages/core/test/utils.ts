import type { Constructable } from '@n8n/di';
import { Container } from '@n8n/di';
import { Duplex } from 'stream';
import { mock } from '../nodes-testing/mock-extended';

export const mockInstance = <T>(
	constructor: Constructable<T>,
	data?: Parameters<typeof mock<T>>[0],
) => {
	const instance = mock<T>(data);
	Container.set(constructor, instance as T);
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
