import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { ensureUserId, getUserScopedSlot } from './userScoped';

const mockNode = { name: 'TestNode', type: 'test' } as any;

describe('getUserScopedSlot', () => {
	it('should return prefix_userId', async () => {
		const context = mock<IExecuteFunctions>();
		context.getUserId.mockResolvedValue('user123');
		context.getNode.mockReturnValue(mockNode);

		await expect(getUserScopedSlot(context, 'my_table')).resolves.toBe('my_table_user123');
	});

	it('should replace all hyphens in userId with underscores', async () => {
		const context = mock<IExecuteFunctions>();
		context.getUserId.mockResolvedValue('abc-def-123-xyz');
		context.getNode.mockReturnValue(mockNode);

		await expect(getUserScopedSlot(context, 'ns')).resolves.toBe('ns_abc_def_123_xyz');
	});

	it('should replace non-alphanumeric characters in prefix with underscores', async () => {
		const context = mock<IExecuteFunctions>();
		context.getUserId.mockResolvedValue('user123');
		context.getNode.mockReturnValue(mockNode);

		await expect(getUserScopedSlot(context, 'my-table.name')).resolves.toBe(
			'my_table_name_user123',
		);
	});

	it('should sanitize both prefix and userId together', async () => {
		const context = mock<IExecuteFunctions>();
		context.getUserId.mockResolvedValue('abc-def-123');
		context.getNode.mockReturnValue(mockNode);

		await expect(getUserScopedSlot(context, 'my.prefix')).resolves.toBe('my_prefix_abc_def_123');
	});

	it('should reject when getUserId rejects', async () => {
		const context = mock<IExecuteFunctions>();
		context.getUserId.mockRejectedValue(new Error('No identity'));
		context.getNode.mockReturnValue(mockNode);

		await expect(getUserScopedSlot(context, 'ns')).rejects.toThrow('No identity');
	});
});

describe('ensureUserId', () => {
	it('should return the userId from context', async () => {
		const context = mock<IExecuteFunctions>();
		context.getUserId.mockResolvedValue('user-123');
		context.getNode.mockReturnValue(mockNode);

		await expect(ensureUserId(context)).resolves.toBe('user-123');
	});

	it('should reject when getUserId rejects', async () => {
		const context = mock<IExecuteFunctions>();
		context.getUserId.mockRejectedValue(new Error('No identity'));
		context.getNode.mockReturnValue(mockNode);

		await expect(ensureUserId(context)).rejects.toThrow('No identity');
	});
});
