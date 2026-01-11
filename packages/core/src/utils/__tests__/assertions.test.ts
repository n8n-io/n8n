import { mock } from 'jest-mock-extended';
import type { IRunExecutionData, IWorkflowExecuteAdditionalData, Workflow } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { assertExecutionDataExists } from '../assertions';

describe('assertExecutionDataExists', () => {
	const mockWorkflow = mock<Workflow>({ id: 'test-workflow-123' });
	const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>({
		executionId: 'test-execution-456',
	});
	const mode = 'manual';

	describe('when executionData is valid', () => {
		it('should not throw when executionData exists', () => {
			const validExecutionData = {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			};

			expect(() =>
				assertExecutionDataExists(validExecutionData, mockWorkflow, mockAdditionalData, mode),
			).not.toThrow();
		});

		it('should not throw when executionData has minimal properties', () => {
			const minimalExecutionData = {
				nodeExecutionStack: [],
			};

			expect(() =>
				assertExecutionDataExists(
					minimalExecutionData as unknown as IRunExecutionData['executionData'],
					mockWorkflow,
					mockAdditionalData,
					mode,
				),
			).not.toThrow();
		});
	});

	describe('when executionData is missing', () => {
		it('should throw UnexpectedError when executionData is undefined', () => {
			expect(() =>
				assertExecutionDataExists(undefined, mockWorkflow, mockAdditionalData, mode),
			).toThrow(UnexpectedError);
		});

		it('should throw UnexpectedError when executionData is null', () => {
			expect(() =>
				assertExecutionDataExists(
					null as unknown as IRunExecutionData['executionData'],
					mockWorkflow,
					mockAdditionalData,
					mode,
				),
			).toThrow(UnexpectedError);
		});

		it('should throw error with correct message', () => {
			expect(() =>
				assertExecutionDataExists(undefined, mockWorkflow, mockAdditionalData, mode),
			).toThrow(/missing execution data/i);
		});

		it('should include workflow metadata in error', () => {
			try {
				assertExecutionDataExists(undefined, mockWorkflow, mockAdditionalData, mode);
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(UnexpectedError);
				const unexpectedError = error as UnexpectedError;
				expect(unexpectedError.extra).toEqual({
					workflowId: 'test-workflow-123',
					executionId: 'test-execution-456',
					mode: 'manual',
				});
			}
		});
	});

	describe('with different execution modes', () => {
		it('should work with trigger mode', () => {
			const validExecutionData = { nodeExecutionStack: [] };

			expect(() =>
				assertExecutionDataExists(
					validExecutionData as unknown as IRunExecutionData['executionData'],
					mockWorkflow,
					mockAdditionalData,
					'trigger',
				),
			).not.toThrow();
		});

		it('should include mode in error metadata', () => {
			try {
				assertExecutionDataExists(undefined, mockWorkflow, mockAdditionalData, 'webhook');
				fail('Expected error to be thrown');
			} catch (error) {
				const unexpectedError = error as UnexpectedError;
				expect(unexpectedError.extra?.mode).toBe('webhook');
			}
		});
	});
});
