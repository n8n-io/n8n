import {
	classifyMcpTool,
	compileMcpToolPermissions,
	resolveMcpToolPermission,
} from '../mcp-tool-permissions';

describe('MCP tool permissions', () => {
	describe('classifyMcpTool', () => {
		it.each([
			[{ name: 'anything', annotations: { readOnlyHint: true } }, 'read'],
			[{ name: 'search_records' }, 'read'],
			[{ name: 'getAccount' }, 'read'],
			[{ name: 'anything', annotations: { readOnlyHint: false } }, 'write'],
			[{ name: 'search_records', annotations: { destructiveHint: true } }, 'write'],
			[{ name: 'create_record', annotations: { readOnlyHint: true } }, 'read'],
			[{ name: 'create_record' }, 'write'],
			[{ name: 'unknown_operation' }, 'write'],
		] as const)('classifies %o as %s', (tool, expected) => {
			expect(classifyMcpTool(tool)).toBe(expected);
		});

		it('prefers explicit write hints when annotations conflict', () => {
			expect(
				classifyMcpTool({
					name: 'search',
					annotations: { readOnlyHint: true, destructiveHint: true },
				}),
			).toBe('write');
		});

		it('prefers write name segments over read name segments', () => {
			expect(classifyMcpTool({ name: 'search_and_delete' })).toBe('write');
		});
	});

	describe('resolveMcpToolPermission', () => {
		it('uses a tool override before its category permission', () => {
			const policy = {
				categories: { read: 'allow', write: 'ask' },
				tools: { search: 'block' },
			} as const;

			expect(resolveMcpToolPermission(policy, { name: 'search' })).toBe('block');
			expect(resolveMcpToolPermission(policy, { name: 'create' })).toBe('ask');
		});
	});

	describe('compileMcpToolPermissions', () => {
		it('compiles category permissions and overrides into SDK settings', () => {
			const policy = {
				categories: { read: 'allow', write: 'ask' },
				tools: { lookup: 'ask', remove: 'block', create: 'allow' },
			} as const;

			expect(
				compileMcpToolPermissions(policy, [
					{ name: 'search', annotations: { readOnlyHint: true } },
					{ name: 'lookup', annotations: { readOnlyHint: true } },
					{ name: 'create', annotations: { readOnlyHint: false } },
					{ name: 'update', annotations: { readOnlyHint: false } },
					{ name: 'remove', annotations: { readOnlyHint: false } },
				]),
			).toEqual({
				toolFilter: { mode: 'exclude', tools: ['remove'] },
				requireApproval: ['lookup', 'update'],
			});
		});

		it('keeps empty compiled lists explicit', () => {
			expect(
				compileMcpToolPermissions({ categories: { read: 'allow', write: 'allow' } }, [
					{ name: 'search' },
					{ name: 'create' },
				]),
			).toEqual({
				toolFilter: { mode: 'exclude', tools: [] },
				requireApproval: [],
			});
		});
	});
});
