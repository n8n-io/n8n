import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ensureUserId, getUserScopedSlot } from './userScoped';

const mockNode = { name: 'TestNode', type: 'test' } as any;

describe('getUserScopedSlot', () => {
	it('should return prefix_userId', () => {
		const context = mock<IExecuteFunctions>({ additionalData: { userId: 'user123' } } as any);
		context.getNode.mockReturnValue(mockNode);

		expect(getUserScopedSlot(context, 'my_table')).toBe('my_table_user123');
	});

	it('should replace all hyphens in userId with underscores', () => {
		const context = mock<IExecuteFunctions>({
			additionalData: { userId: 'abc-def-123-xyz' },
		} as any);
		context.getNode.mockReturnValue(mockNode);

		expect(getUserScopedSlot(context, 'ns')).toBe('ns_abc_def_123_xyz');
	});

	it('should replace non-alphanumeric characters in prefix with underscores', () => {
		const context = mock<IExecuteFunctions>({ additionalData: { userId: 'user123' } } as any);
		context.getNode.mockReturnValue(mockNode);

		expect(getUserScopedSlot(context, 'my-table.name')).toBe('my_table_name_user123');
	});

	it('should sanitize both prefix and userId together', () => {
		const context = mock<IExecuteFunctions>({ additionalData: { userId: 'abc-def-123' } } as any);
		context.getNode.mockReturnValue(mockNode);

		expect(getUserScopedSlot(context, 'my.prefix')).toBe('my_prefix_abc_def_123');
	});

	it('should throw NodeOperationError when userId is not available', () => {
		const context = mock<IExecuteFunctions>({});
		context.getNode.mockReturnValue(mockNode);

		expect(() => getUserScopedSlot(context, 'ns')).toThrow(NodeOperationError);
	});
});

describe('ensureUserId', () => {
	it('should return the userId from context', () => {
		const context = mock<IExecuteFunctions>({ additionalData: { userId: 'user-123' } } as any);
		context.getNode.mockReturnValue(mockNode);

		expect(ensureUserId(context)).toBe('user-123');
	});

	it('should throw NodeOperationError when userId is empty string', () => {
		const context = mock<IExecuteFunctions>({ additionalData: { userId: '' } } as any);
		context.getNode.mockReturnValue(mockNode);

		expect(() => ensureUserId(context)).toThrow(NodeOperationError);
	});
});
