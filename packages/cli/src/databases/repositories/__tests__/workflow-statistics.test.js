'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const jest_mock_extended_1 = require('jest-mock-extended');
const mocking_1 = require('@test/mocking');
describe('insertWorkflowStatistics', () => {
	const entityManager = (0, mocking_1.mockEntityManager)(db_1.WorkflowStatistics);
	const workflowStatisticsRepository = di_1.Container.get(db_1.WorkflowStatisticsRepository);
	beforeEach(() => {
		(0, jest_mock_extended_1.mockClear)(entityManager.insert);
	});
	it('Successfully inserts data when it is not yet present', async () => {
		entityManager.findOne.mockResolvedValueOnce(null);
		entityManager.insert.mockResolvedValueOnce((0, jest_mock_extended_1.mock)());
		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			'data_loaded',
			'workflowId',
		);
		expect(insertionResult).toBe('insert');
	});
	it('Does not insert when data is present', async () => {
		entityManager.findOne.mockResolvedValueOnce((0, jest_mock_extended_1.mock)());
		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			'data_loaded',
			'workflowId',
		);
		expect(insertionResult).toBe('alreadyExists');
		expect(entityManager.insert).not.toHaveBeenCalled();
	});
	it('throws an error when insertion fails', async () => {
		entityManager.findOne.mockResolvedValueOnce(null);
		entityManager.insert.mockImplementation(async () => {
			throw new typeorm_1.QueryFailedError('Query', [], new Error('driver error'));
		});
		const insertionResult = await workflowStatisticsRepository.insertWorkflowStatistics(
			'data_loaded',
			'workflowId',
		);
		expect(insertionResult).toBe('failed');
	});
});
describe('upsertWorkflowStatistics', () => {
	let repository;
	beforeAll(async () => {
		di_1.Container.reset();
		await backend_test_utils_1.testDb.init();
		repository = di_1.Container.get(db_1.WorkflowStatisticsRepository);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['WorkflowStatistics']);
	});
	test('Successfully inserts data when it is not yet present', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({});
		const upsertResult = await repository.upsertWorkflowStatistics(
			'production_success',
			workflow.id,
			true,
		);
		expect(upsertResult).toBe('insert');
		const insertedData = await repository.find();
		expect(insertedData).toHaveLength(1);
		expect(insertedData[0].workflowId).toBe(workflow.id);
		expect(insertedData[0].name).toBe('production_success');
		expect(insertedData[0].count).toBe(1);
		expect(insertedData[0].rootCount).toBe(1);
	});
	test('Successfully updates data when it is already present', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)({});
		await repository.insert({
			workflowId: workflow.id,
			name: 'production_success',
			count: 1,
			rootCount: 1,
			latestEvent: new Date(),
		});
		const result = await repository.upsertWorkflowStatistics(
			'production_success',
			workflow.id,
			false,
		);
		expect(result).toBe('update');
		const updatedData = await repository.find();
		expect(updatedData).toHaveLength(1);
		expect(updatedData[0].workflowId).toBe(workflow.id);
		expect(updatedData[0].name).toBe('production_success');
		expect(updatedData[0].count).toBe(2);
		expect(updatedData[0].rootCount).toBe(1);
	});
});
//# sourceMappingURL=workflow-statistics.test.js.map
