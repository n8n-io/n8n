'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const execution_metadata_service_1 = require('@/services/execution-metadata.service');
describe('ExecutionMetadataService', () => {
	const repository = (0, backend_test_utils_1.mockInstance)(db_1.ExecutionMetadataRepository);
	test('Execution metadata is saved in a batch', async () => {
		const toSave = {
			test1: 'value1',
			test2: 'value2',
		};
		const executionId = '1234';
		await di_1.Container.get(execution_metadata_service_1.ExecutionMetadataService).save(
			executionId,
			toSave,
		);
		expect(repository.upsert).toHaveBeenCalledTimes(1);
		expect(repository.upsert.mock.calls[0]).toEqual([
			[
				{
					executionId,
					key: 'test1',
					value: 'value1',
				},
				{
					executionId,
					key: 'test2',
					value: 'value2',
				},
			],
			{
				conflictPaths: {
					executionId: true,
					key: true,
				},
			},
		]);
	});
});
//# sourceMappingURL=execution-metadata.service.test.js.map
