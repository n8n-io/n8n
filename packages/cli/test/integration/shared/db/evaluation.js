'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTestCaseExecution = exports.createTestRun = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const createTestRun = async (workflowId, options = {}) => {
	const testRunRepository = di_1.Container.get(db_1.TestRunRepository);
	const testRun = testRunRepository.create({
		workflow: { id: workflowId },
		status: options.status ?? 'new',
		runAt: options.runAt ?? null,
		completedAt: options.completedAt ?? null,
		metrics: options.metrics ?? {},
		errorCode: options.errorCode,
		errorDetails: options.errorDetails,
	});
	return await testRunRepository.save(testRun);
};
exports.createTestRun = createTestRun;
const createTestCaseExecution = async (testRunId, options = {}) => {
	const testCaseExecutionRepository = di_1.Container.get(db_1.TestCaseExecutionRepository);
	const testCaseExecution = testCaseExecutionRepository.create({
		testRun: { id: testRunId },
		status: options.status ?? 'success',
		runAt: options.runAt ?? null,
		completedAt: options.completedAt ?? null,
		metrics: options.metrics ?? {},
		errorCode: options.errorCode,
		errorDetails: options.errorDetails,
		executionId: options.executionId,
	});
	return await testCaseExecutionRepository.save(testCaseExecution);
};
exports.createTestCaseExecution = createTestCaseExecution;
//# sourceMappingURL=evaluation.js.map
