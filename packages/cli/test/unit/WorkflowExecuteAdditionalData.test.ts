import { saveExecutionMetadata } from '@/WorkflowExecuteAdditionalData';
import * as Db from '@/Db';
import { mocked } from 'jest-mock';

jest.mock('@/Db', () => {
	return {
		collections: {
			ExecutionMetadata: {
				save: jest.fn(async () => Promise.resolve([])),
			},
		},
	};
});

describe('WorkflowExecuteAdditionalData', () => {
	test('Execution metadata is saved in a batch', async () => {
		const toSave = {
			test1: 'value1',
			test2: 'value2',
		};
		const executionId = '1234';

		await saveExecutionMetadata(executionId, toSave);

		expect(mocked(Db.collections.ExecutionMetadata.save)).toHaveBeenCalledTimes(1);
		expect(mocked(Db.collections.ExecutionMetadata.save).mock.calls[0]).toEqual([
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
