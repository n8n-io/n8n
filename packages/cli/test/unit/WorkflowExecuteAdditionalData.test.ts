import { saveExecutionMetadata } from '@/WorkflowExecuteAdditionalData';
import * as Db from '@/Db';
import { ExecutionMetadata } from '@/databases/entities/ExecutionMetadata';

const fnSave = jest.fn();

// const fnTransaction = jest.fn();

const fnTransaction = jest.spyOn(Db, 'transaction').mockImplementation((fn: Function) => {
	return fn({
		save: fnSave,
	});
});

describe('WorkflowExecuteAdditionalData', () => {
	test('Execution metadata is saved in a transaction', async () => {
		const toSave = {
			test1: 'value1',
			test2: 'value2',
		};
		const executionId = '1234';

		await saveExecutionMetadata(executionId, toSave);

		expect(fnTransaction.mock.calls.length).toBe(1);
		expect(fnSave.mock.calls.length).toBe(2);
		expect(fnSave.mock.calls[0]).toEqual([
			ExecutionMetadata,
			{
				execution: { id: executionId },
				key: 'test1',
				value: 'value1',
			},
		]);
		expect(fnSave.mock.calls[1]).toEqual([
			ExecutionMetadata,
			{
				execution: { id: executionId },
				key: 'test2',
				value: 'value2',
			},
		]);
	});
});
