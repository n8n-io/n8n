'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const execution_metadata_service_1 = require('@/services/execution-metadata.service');
const executions_1 = require('@test-integration/db/executions');
let executionMetadataRepository;
let executionMetadataService;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	executionMetadataRepository = di_1.Container.get(db_1.ExecutionMetadataRepository);
	executionMetadataService = di_1.Container.get(
		execution_metadata_service_1.ExecutionMetadataService,
	);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
afterEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
});
describe('ProjectService', () => {
	describe('save', () => {
		it('should deduplicate entries by exeuctionId and key, keeping the latest one', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const execution = await (0, executions_1.createExecution)({}, workflow);
			const key = 'key';
			const value1 = 'value1';
			const value2 = 'value2';
			await executionMetadataService.save(execution.id, { [key]: value1 });
			await executionMetadataService.save(execution.id, { [key]: value2 });
			const rows = await executionMetadataRepository.find({
				where: { executionId: execution.id, key },
			});
			expect(rows).toHaveLength(1);
			expect(rows[0]).toHaveProperty('value', value2);
		});
	});
});
//# sourceMappingURL=execution-metadata.service.test.js.map
