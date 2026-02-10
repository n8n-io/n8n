import { describe, it, expect } from '@jest/globals';
import type { IRunExecutionData } from 'n8n-workflow';

import { buildNodeExecutionStatus, formatExecutionStatusJSDoc } from './execution-status';

type ExecutionResultData = IRunExecutionData['resultData'];

// Helper to create minimal task data for tests
function mockTaskData(overrides: Record<string, unknown> = {}) {
	return {
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: [],
		...overrides,
	};
}

// Helper to create minimal error for tests
function mockError(message: string): Record<string, unknown> {
	return { message, name: 'Error' };
}

describe('execution-status', () => {
	describe('buildNodeExecutionStatus', () => {
		it('returns success status for executed nodes without errors', () => {
			const data = {
				runData: {
					'Fetch Users': [mockTaskData({ executionTime: 100, data: { main: [[{ json: {} }]] } })],
				},
			} as ExecutionResultData;

			const result = buildNodeExecutionStatus(data);

			expect(result.get('Fetch Users')).toEqual({ status: 'success' });
		});

		it('returns error status with message for nodes with errors', () => {
			const data = {
				runData: {
					'Process User': [
						mockTaskData({
							executionTime: 50,
							error: mockError('Cannot read property name of undefined'),
						}),
					],
				},
			} as ExecutionResultData;

			const result = buildNodeExecutionStatus(data);

			expect(result.get('Process User')).toEqual({
				status: 'error',
				errorMessage: 'Cannot read property name of undefined',
			});
		});

		it('includes error description when available', () => {
			const data = {
				runData: {
					'API Node': [
						mockTaskData({
							executionTime: 50,
							error: {
								message: 'The resource you are requesting could not be found',
								description: 'city not found',
								name: 'NodeApiError',
							},
						}),
					],
				},
			} as ExecutionResultData;

			const result = buildNodeExecutionStatus(data);

			expect(result.get('API Node')).toEqual({
				status: 'error',
				errorMessage: 'The resource you are requesting could not be found: city not found',
			});
		});

		it('truncates long error messages', () => {
			const longMessage = 'Error: ' + 'x'.repeat(200);
			const data = {
				runData: {
					Node: [mockTaskData({ executionTime: 10, error: mockError(longMessage) })],
				},
			} as ExecutionResultData;

			const result = buildNodeExecutionStatus(data);
			const status = result.get('Node');

			expect(status?.status).toBe('error');
			expect(status?.errorMessage?.length).toBeLessThanOrEqual(153); // 150 + "..."
			expect(status?.errorMessage).toContain('...');
		});

		it('returns empty map for undefined data', () => {
			const result = buildNodeExecutionStatus(undefined);

			expect(result.size).toBe(0);
		});

		it('returns empty map for empty runData', () => {
			const data = { runData: {} } as ExecutionResultData;

			const result = buildNodeExecutionStatus(data);

			expect(result.size).toBe(0);
		});

		it('handles multiple nodes with different statuses', () => {
			const data = {
				runData: {
					Trigger: [mockTaskData({ executionTime: 10 })],
					'Success Node': [mockTaskData({ executionTime: 20, data: { main: [[{ json: {} }]] } })],
					'Error Node': [mockTaskData({ executionTime: 5, error: mockError('Failed') })],
				},
			} as ExecutionResultData;

			const result = buildNodeExecutionStatus(data);

			expect(result.get('Trigger')).toEqual({ status: 'success' });
			expect(result.get('Success Node')).toEqual({ status: 'success' });
			expect(result.get('Error Node')).toEqual({
				status: 'error',
				errorMessage: 'Failed',
			});
		});
	});

	describe('formatExecutionStatusJSDoc', () => {
		it('formats successful execution status', () => {
			const data = {
				lastNodeExecuted: 'Final Node',
				runData: {
					'Final Node': [mockTaskData({ executionTime: 100 })],
				},
			} as ExecutionResultData;

			const result = formatExecutionStatusJSDoc(data);

			expect(result).toContain('@lastExecuted "Final Node"');
			expect(result).toContain('@workflowExecutionStatus success');
		});

		it('formats error execution status', () => {
			const data = {
				lastNodeExecuted: 'Error Node',
				error: mockError('Workflow failed'),
				runData: {},
			} as unknown as ExecutionResultData;

			const result = formatExecutionStatusJSDoc(data);

			expect(result).toContain('@lastExecuted "Error Node"');
			expect(result).toContain('@workflowExecutionStatus error');
		});

		it('detects error from node runData', () => {
			const data = {
				lastNodeExecuted: 'Failed Node',
				runData: {
					'Failed Node': [mockTaskData({ executionTime: 10, error: mockError('Node failed') })],
				},
			} as ExecutionResultData;

			const result = formatExecutionStatusJSDoc(data);

			expect(result).toContain('@workflowExecutionStatus error');
		});

		it('returns empty string for undefined data', () => {
			const result = formatExecutionStatusJSDoc(undefined);

			expect(result).toBe('');
		});

		it('omits lastExecuted if not present', () => {
			const data = {
				runData: {
					Node: [mockTaskData({ executionTime: 10 })],
				},
			} as ExecutionResultData;

			const result = formatExecutionStatusJSDoc(data);

			expect(result).not.toContain('@lastExecuted');
			expect(result).toContain('@workflowExecutionStatus success');
		});
	});
});
