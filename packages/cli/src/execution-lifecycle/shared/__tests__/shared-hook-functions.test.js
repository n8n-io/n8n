'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const shared_hook_functions_1 = require('../shared-hook-functions');
describe('determineFinalExecutionStatus', () => {
	describe('When waitTill is not set', () => {
		test.each(['canceled', 'crashed', 'error', 'success'])('should return "%s"', (status) => {
			const runData = { status, data: {} };
			expect((0, shared_hook_functions_1.determineFinalExecutionStatus)(runData)).toBe(status);
		});
	});
	it('should return "error" when resultData.error exists', () => {
		const runData = {
			status: 'running',
			data: {
				resultData: {
					error: new n8n_workflow_1.NodeOperationError(
						(0, jest_mock_extended_1.mock)(),
						'An error occurred',
					),
				},
			},
		};
		expect((0, shared_hook_functions_1.determineFinalExecutionStatus)(runData)).toBe('error');
	});
	it('should return "waiting" when waitTill is defined', () => {
		const runData = {
			status: 'running',
			data: {},
			waitTill: new Date('2022-01-01T00:00:00'),
		};
		expect((0, shared_hook_functions_1.determineFinalExecutionStatus)(runData)).toBe('waiting');
	});
});
//# sourceMappingURL=shared-hook-functions.test.js.map
