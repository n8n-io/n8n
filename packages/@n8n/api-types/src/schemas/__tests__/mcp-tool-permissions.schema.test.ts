import { mcpToolPermissionsSchema } from '../mcp-tool-permissions.schema';

describe('mcpToolPermissionsSchema', () => {
	it('accepts category permissions with tool overrides', () => {
		const permissions = {
			categories: { read: 'always_allow', write: 'require_approval' },
			tools: { search: 'blocked', update: 'always_allow' },
		};

		expect(mcpToolPermissionsSchema.parse(permissions)).toEqual(permissions);
	});

	it.each([
		{ categories: { read: 'always_allow' } },
		{ categories: { read: 'always_allow', write: 'prompt' } },
		{
			categories: { read: 'always_allow', write: 'require_approval', other: 'blocked' },
		},
		{
			categories: { read: 'always_allow', write: 'require_approval' },
			tools: { search: 'prompt' },
		},
		{
			categories: { read: 'always_allow', write: 'require_approval' },
			tools: { '': 'always_allow' },
		},
		{ categories: { read: 'always_allow', write: 'require_approval' }, version: 1 },
	])('rejects invalid permissions: %o', (permissions) => {
		expect(mcpToolPermissionsSchema.safeParse(permissions).success).toBe(false);
	});
});
