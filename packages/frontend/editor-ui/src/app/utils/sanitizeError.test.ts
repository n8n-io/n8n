import { describe, it, expect } from 'vitest';
import { sanitizeError } from './sanitizeError';

describe('sanitizeError', () => {
	it('should return non-object values as-is', () => {
		expect(sanitizeError(null)).toBe(null);
		expect(sanitizeError(undefined)).toBe(undefined);
		expect(sanitizeError('error')).toBe('error');
		expect(sanitizeError(123)).toBe(123);
	});

	it('should sanitize a simple error object', () => {
		const error = {
			name: 'NodeOperationError',
			message: 'Something went wrong',
			description: 'Error in sub-node',
			timestamp: 1234567890,
			level: 'warning',
			functionality: 'configuration-node',
			stack: 'Error: Something went wrong\n    at ...',
		};

		const sanitized = sanitizeError(error);

		expect(sanitized).toEqual({
			name: 'NodeOperationError',
			message: 'Something went wrong',
			description: 'Error in sub-node',
			timestamp: 1234567890,
			level: 'warning',
			functionality: 'configuration-node',
			stack: 'Error: Something went wrong\n    at ...',
		});
	});

	it('should strip node parameters to prevent circular references', () => {
		const error = {
			name: 'NodeOperationError',
			message: 'Error occurred',
			node: {
				name: 'Simple Memory',
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				typeVersion: 1.3,
				position: [448, 208],
				id: 'd3295ab0-ac44-46d7-8f9f-aac7f0f2c206',
				parameters: {
					// These parameters might contain circular references
					sessionKey: '={{ json.nonexisting }}',
					contextWindowLength: 5,
					someComplexObject: { nested: { deeply: { circular: null } } },
				},
			},
		};

		const sanitized = sanitizeError(error);

		expect(sanitized.node).toEqual({
			name: 'Simple Memory',
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			typeVersion: 1.3,
			position: [448, 208],
			id: 'd3295ab0-ac44-46d7-8f9f-aac7f0f2c206',
		});
		expect(sanitized.node.parameters).toBeUndefined();
	});

	it('should handle circular references', () => {
		const error: any = {
			name: 'Error',
			message: 'Circular error',
		};
		// Create circular reference
		error.self = error;

		const sanitized = sanitizeError(error);

		expect(sanitized.name).toBe('Error');
		expect(sanitized.message).toBe('Circular error');
		expect(sanitized.self).toBeUndefined();
	});

	it('should remove functions from error object', () => {
		const error = {
			name: 'Error',
			message: 'Error with function',
			someFunction: () => 'should be removed',
			validProperty: 'should be kept',
		};

		const sanitized = sanitizeError(error);

		expect(sanitized.someFunction).toBeUndefined();
		expect(sanitized.validProperty).toBe('should be kept');
	});

	it('should sanitize error context', () => {
		const error = {
			name: 'Error',
			message: 'Error with context',
			context: {
				itemIndex: 0,
				type: 'configuration',
				someData: 'value',
			},
		};

		const sanitized = sanitizeError(error);

		expect(sanitized.context).toEqual({
			itemIndex: 0,
			type: 'configuration',
			someData: 'value',
		});
	});

	it('should handle error with messages array', () => {
		const error = {
			name: 'Error',
			message: 'Error with messages',
			messages: ['Message 1', 'Message 2'],
		};

		const sanitized = sanitizeError(error);

		expect(sanitized.messages).toEqual(['Message 1', 'Message 2']);
	});

	it('should handle error with tags', () => {
		const error = {
			name: 'Error',
			message: 'Error with tags',
			tags: {
				packageName: 'workflow',
				severity: 'high',
			},
		};

		const sanitized = sanitizeError(error);

		expect(sanitized.tags).toEqual({
			packageName: 'workflow',
			severity: 'high',
		});
	});

	it('should preserve line number', () => {
		const error = {
			name: 'Error',
			message: 'Error with line number',
			lineNumber: 42,
		};

		const sanitized = sanitizeError(error);

		expect(sanitized.lineNumber).toBe(42);
	});

	it('should handle complex nested circular references', () => {
		const node: any = {
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			id: 'test-id',
			parameters: {},
		};
		// Create circular reference in parameters
		node.parameters.self = node;
		node.parameters.nested = { deep: { ref: node } };

		const error = {
			name: 'Error',
			message: 'Complex circular error',
			node,
		};

		const sanitized = sanitizeError(error);

		// Should not throw and should have sanitized node
		expect(sanitized.name).toBe('Error');
		expect(sanitized.node.name).toBe('Test Node');
		expect(sanitized.node.parameters).toBeUndefined();
	});

	it('should handle errors with circular references in context', () => {
		const context: any = {
			itemIndex: 0,
		};
		context.self = context;

		const error = {
			name: 'Error',
			message: 'Error with circular context',
			context,
		};

		const sanitized = sanitizeError(error);

		// Should fallback to only keeping primitive values
		expect(sanitized.context.itemIndex).toBe(0);
		expect(sanitized.context.self).toBeUndefined();
	});
});
