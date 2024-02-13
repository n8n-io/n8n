import { Container } from 'typedi';
import { ExecutionMetadataRepository } from '@db/repositories/executionMetadata.repository';
import { ExecutionMetadataService } from '@/services/executionMetadata.service';
import { mockInstance } from '../shared/mocking';

describe('ExecutionMetadataService', () => {
	const repository = mockInstance(ExecutionMetadataRepository);

	test('Execution metadata is saved in a batch', async () => {
		const toSave = {
			test1: 'value1',
			test2: 'value2',
		};
		const executionId = '1234';

		await Container.get(ExecutionMetadataService).save(executionId, toSave);

		expect(repository.save).toHaveBeenCalledTimes(1);
		expect(repository.save.mock.calls[0]).toEqual([
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
