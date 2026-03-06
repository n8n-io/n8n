import type { CallbackManager } from '@langchain/core/callbacks/manager';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

import { getTracingConfig } from './tracing';

describe('getTracingConfig', () => {
	const mockWorkflow = {
		id: 'workflow-123',
		name: 'Test Workflow',
		active: true,
	};

	const mockNode = {
		name: 'AI Agent',
		type: 'n8n-nodes-langchain.agent',
		typeVersion: 3,
	};

	describe('with IExecuteFunctions context', () => {
		it('should return correct runName format', () => {
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');

			const result = getTracingConfig(mockContext);

			expect(result.runName).toBe('[Test Workflow] AI Agent');
		});

		it('should return correct metadata', () => {
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');

			const result = getTracingConfig(mockContext);

			expect(result.metadata).toEqual({
				execution_id: 'exec-456',
				workflow: mockWorkflow,
				node: 'AI Agent',
			});
		});

		it('should include parent callback manager when available', () => {
			const mockCallbackManager = mock<CallbackManager>();
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');
			mockContext.getParentCallbackManager.mockReturnValue(mockCallbackManager);

			const result = getTracingConfig(mockContext);

			expect(result.callbacks).toBe(mockCallbackManager);
		});

		it('should set callbacks to undefined when getParentCallbackManager returns undefined', () => {
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');
			mockContext.getParentCallbackManager.mockReturnValue(undefined);

			const result = getTracingConfig(mockContext);

			expect(result.callbacks).toBeUndefined();
		});

		it('should merge additionalMetadata when provided', () => {
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');

			const result = getTracingConfig(mockContext, {
				additionalMetadata: {
					custom_field: 'custom_value',
					another_field: 123,
				},
			});

			expect(result.metadata).toEqual({
				execution_id: 'exec-456',
				workflow: mockWorkflow,
				node: 'AI Agent',
				custom_field: 'custom_value',
				another_field: 123,
			});
		});

		it('should handle empty additionalMetadata', () => {
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');

			const result = getTracingConfig(mockContext, { additionalMetadata: {} });

			expect(result.metadata).toEqual({
				execution_id: 'exec-456',
				workflow: mockWorkflow,
				node: 'AI Agent',
			});
		});
	});

	describe('with ISupplyDataFunctions context', () => {
		it('should return correct config without getParentCallbackManager', () => {
			// ISupplyDataFunctions doesn't have getParentCallbackManager
			const mockContext = {
				getWorkflow: jest.fn().mockReturnValue(mockWorkflow),
				getNode: jest.fn().mockReturnValue(mockNode),
				getExecutionId: jest.fn().mockReturnValue('exec-789'),
			} as unknown as ISupplyDataFunctions;

			const result = getTracingConfig(mockContext);

			expect(result.runName).toBe('[Test Workflow] AI Agent');
			expect(result.metadata).toEqual({
				execution_id: 'exec-789',
				workflow: mockWorkflow,
				node: 'AI Agent',
			});
			expect(result.callbacks).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('should handle workflow names with special characters', () => {
			const specialWorkflow = {
				...mockWorkflow,
				name: 'Workflow [with] special (chars)',
			};
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(specialWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');

			const result = getTracingConfig(mockContext);

			expect(result.runName).toBe('[Workflow [with] special (chars)] AI Agent');
		});

		it('should handle node names with special characters', () => {
			const specialNode = {
				...mockNode,
				name: 'Node "with" quotes',
			};
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(specialNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');

			const result = getTracingConfig(mockContext);

			expect(result.runName).toBe('[Test Workflow] Node "with" quotes');
		});

		it('should use default empty config when none provided', () => {
			const mockContext = mock<IExecuteFunctions>();
			mockContext.getWorkflow.mockReturnValue(mockWorkflow);
			mockContext.getNode.mockReturnValue(mockNode as ReturnType<IExecuteFunctions['getNode']>);
			mockContext.getExecutionId.mockReturnValue('exec-456');

			const result = getTracingConfig(mockContext);

			// Should not throw and should have correct structure
			expect(result).toHaveProperty('runName');
			expect(result).toHaveProperty('metadata');
			expect(result).toHaveProperty('callbacks');
		});
	});
});
