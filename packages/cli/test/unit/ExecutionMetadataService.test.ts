import { Container } from 'typedi';
import { ExecutionMetadataService } from '@/services/executionMetadata.service';
import { mockInstance } from '../shared/mocking';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { ExecutionMetadata } from '@/databases/entities/ExecutionMetadata';

describe('ExecutionMetadataService', () => {
	const dataSource = mockInstance(DataSource);
	const trx = mock<EntityManager>();
	// @ts-expect-error TS infers this incorrectly
	dataSource.transaction.mockImplementation((cb) => cb(trx));

	test('Execution metadata is saved in a batch', async () => {
		const toSave = {
			test1: 'value1',
			test2: 'value2',
		};
		const executionId = '1234';

		await Container.get(ExecutionMetadataService).save(executionId, toSave);

		expect(trx.save).toHaveBeenCalledTimes(1);
		expect(trx.save.mock.calls[0]).toEqual([
			ExecutionMetadata,
			[
				{
					execution: { id: executionId },
					key: 'test1',
					value: 'value1',
				},
				{
					execution: { id: executionId },
					key: 'test2',
					value: 'value2',
				},
			],
		]);
	});
});
