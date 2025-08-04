'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const execution_data_service_1 = require('../execution-data.service');
describe('ExecutionDataService', () => {
	const service = new execution_data_service_1.ExecutionDataService();
	describe('generateFailedExecutionFromError', () => {
		const mode = 'manual';
		const node = (0, jest_mock_extended_1.mock)({ name: 'Test Node' });
		const error = new n8n_workflow_1.NodeOperationError(node, 'Test error message');
		it('should generate a failed execution with error details', () => {
			const startTime = Date.now();
			const result = service.generateFailedExecutionFromError(mode, error, node, startTime);
			expect(result.mode).toBe(mode);
			expect(result.status).toBe('error');
			expect(result.startedAt).toBeInstanceOf(Date);
			expect(result.stoppedAt).toBeInstanceOf(Date);
			expect(result.data.resultData.error?.message).toBe(error.message);
			const taskData = result.data.resultData.runData[node.name][0];
			expect(taskData.error?.message).toBe(error.message);
			expect(taskData.startTime).toBe(startTime);
			expect(taskData.executionStatus).toBe('error');
			expect(result.data.resultData.lastNodeExecuted).toBe(node.name);
			expect(result.data.executionData?.nodeExecutionStack[0].node).toEqual(node);
		});
		it('should generate a failed execution without node details if node is undefined', () => {
			const result = service.generateFailedExecutionFromError(mode, error, undefined);
			expect(result.mode).toBe(mode);
			expect(result.status).toBe('error');
			expect(result.startedAt).toBeInstanceOf(Date);
			expect(result.stoppedAt).toBeInstanceOf(Date);
			expect(result.data.resultData.error?.message).toBe(error.message);
			expect(result.data.resultData.runData).toEqual({});
			expect(result.data.resultData.lastNodeExecuted).toBeUndefined();
			expect(result.data.executionData).toBeUndefined();
		});
	});
});
//# sourceMappingURL=execution-data.service.test.js.map
