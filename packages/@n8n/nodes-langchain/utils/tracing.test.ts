import type { CallbackManager } from '@langchain/core/callbacks/manager';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

import { buildTracingMetadata, getTracingConfig } from './tracing';

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

describe('buildTracingMetadata', () => {
	describe('legacy untyped format', () => {
		it('should map valid entries into metadata', () => {
			const result = buildTracingMetadata([
				{ key: 'team', value: 'ai' } as any,
				{ key: 'trace_id', value: 'abc123' } as any,
			]);

			expect(result).toEqual({ team: 'ai', trace_id: 'abc123' });
		});

		it('should ignore empty keys and values', () => {
			const result = buildTracingMetadata([
				{ key: '', value: 'ignored' } as any,
				{ key: '   ', value: 'ignored' } as any,
				{ key: 'valid', value: '' } as any,
				{ key: 'ok', value: 'yes' } as any,
			]);

			expect(result).toEqual({ ok: 'yes' });
		});
	});

	describe('typed format', () => {
		describe('string type', () => {
			it('should handle string values', () => {
				const result = buildTracingMetadata([
					{ key: 'session_id', type: 'stringValue', stringValue: 'abc123' },
				]);

				expect(result).toEqual({ session_id: 'abc123' });
			});

			it('should skip empty string values', () => {
				const result = buildTracingMetadata([
					{ key: 'empty', type: 'stringValue', stringValue: '' },
					{ key: 'valid', type: 'stringValue', stringValue: 'value' },
				]);

				expect(result).toEqual({ valid: 'value' });
			});
		});

		describe('number type', () => {
			it('should convert number strings to numbers', () => {
				const result = buildTracingMetadata([
					{ key: 'integer', type: 'numberValue', numberValue: '100' },
					{ key: 'float', type: 'numberValue', numberValue: '3.14' },
					{ key: 'negative', type: 'numberValue', numberValue: '-42' },
				]);

				expect(result).toEqual({ integer: 100, float: 3.14, negative: -42 });
			});

			it('should skip invalid number values', () => {
				const result = buildTracingMetadata([
					{ key: 'invalid', type: 'numberValue', numberValue: 'not-a-number' },
					{ key: 'valid', type: 'numberValue', numberValue: '123' },
				]);

				expect(result).toEqual({ valid: 123 });
			});
		});

		describe('boolean type', () => {
			it('should convert boolean strings to booleans', () => {
				const result = buildTracingMetadata([
					{ key: 'is_active', type: 'booleanValue', booleanValue: 'true' },
					{ key: 'is_disabled', type: 'booleanValue', booleanValue: 'false' },
				]);

				expect(result).toEqual({ is_active: true, is_disabled: false });
			});
		});

		describe('array type', () => {
			it('should parse array strings into arrays', () => {
				const result = buildTracingMetadata([
					{ key: 'tags', type: 'arrayValue', arrayValue: '["ai", "agent", "test"]' },
					{ key: 'numbers', type: 'arrayValue', arrayValue: '[1, 2, 3]' },
				]);

				expect(result).toEqual({
					tags: ['ai', 'agent', 'test'],
					numbers: [1, 2, 3],
				});
			});

			it('should skip invalid array values', () => {
				const result = buildTracingMetadata([
					{ key: 'invalid', type: 'arrayValue', arrayValue: 'not-an-array' },
					{ key: 'valid', type: 'arrayValue', arrayValue: '["test"]' },
				]);

				expect(result).toEqual({ valid: ['test'] });
			});
		});

		describe('object type', () => {
			it('should parse JSON strings into objects', () => {
				const result = buildTracingMetadata([
					{
						key: 'config',
						type: 'objectValue',
						objectValue: '{"threshold": 0.8, "enabled": true}',
					},
				]);

				expect(result).toEqual({ config: { threshold: 0.8, enabled: true } });
			});

			it('should skip invalid JSON values', () => {
				const result = buildTracingMetadata([
					{ key: 'invalid', type: 'objectValue', objectValue: '{invalid json}' },
					{ key: 'valid', type: 'objectValue', objectValue: '{"key": "value"}' },
				]);

				expect(result).toEqual({ valid: { key: 'value' } });
			});
		});

		it('should handle mixed types in one call', () => {
			const result = buildTracingMetadata([
				{ key: 'session_id', type: 'stringValue', stringValue: 'abc123' },
				{ key: 'user_id', type: 'numberValue', numberValue: '42' },
				{ key: 'is_active', type: 'booleanValue', booleanValue: 'true' },
				{ key: 'tags', type: 'arrayValue', arrayValue: '["ai", "test"]' },
				{ key: 'config', type: 'objectValue', objectValue: '{"threshold": 0.8}' },
			]);

			expect(result).toEqual({
				session_id: 'abc123',
				user_id: 42,
				is_active: true,
				tags: ['ai', 'test'],
				config: { threshold: 0.8 },
			});
		});

		it('should trim whitespace from keys', () => {
			const result = buildTracingMetadata([
				{ key: '  session_id  ', type: 'stringValue', stringValue: 'test' },
			]);

			expect(result).toEqual({ session_id: 'test' });
		});

		it('should skip entries with empty keys', () => {
			const result = buildTracingMetadata([
				{ key: '', type: 'stringValue', stringValue: 'ignored' },
				{ key: '   ', type: 'stringValue', stringValue: 'ignored' },
				{ key: 'valid', type: 'stringValue', stringValue: 'kept' },
			]);

			expect(result).toEqual({ valid: 'kept' });
		});

		it('should skip entries with undefined or null values', () => {
			const result = buildTracingMetadata([
				{ key: 'undefined_val', type: 'stringValue', stringValue: undefined },
				{ key: 'null_val', type: 'stringValue', stringValue: null as any },
				{ key: 'valid', type: 'stringValue', stringValue: 'kept' },
			]);

			expect(result).toEqual({ valid: 'kept' });
		});
	});

	it('should handle undefined or empty input', () => {
		expect(buildTracingMetadata(undefined)).toEqual({});
		expect(buildTracingMetadata([])).toEqual({});
	});
});
