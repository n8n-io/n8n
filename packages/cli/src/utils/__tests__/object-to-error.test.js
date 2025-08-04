'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const object_to_error_1 = require('../object-to-error');
describe('objectToError', () => {
	describe('node error handling', () => {
		it('should create `NodeOperationError` when node is found', () => {
			const errorObject = {
				message: 'Test error',
				node: {
					name: 'testNode',
				},
			};
			const workflow = (0, jest_mock_extended_1.mock)();
			const node = (0, jest_mock_extended_1.mock)();
			workflow.getNode.mockReturnValue(node);
			const result = (0, object_to_error_1.objectToError)(errorObject, workflow);
			expect(workflow.getNode).toHaveBeenCalledWith('testNode');
			expect(result).toBeInstanceOf(n8n_workflow_1.NodeOperationError);
		});
		it('should create `Error` when node is not found', () => {
			const errorObject = {
				message: 'Test error',
				node: {},
			};
			const workflow = (0, jest_mock_extended_1.mock)();
			const result = (0, object_to_error_1.objectToError)(errorObject, workflow);
			expect(workflow.getNode).not.toHaveBeenCalled();
			expect(result).toBeInstanceOf(Error);
			expect(result).not.toBeInstanceOf(n8n_workflow_1.NodeOperationError);
			expect(result.message).toBe('Test error');
		});
	});
});
//# sourceMappingURL=object-to-error.test.js.map
