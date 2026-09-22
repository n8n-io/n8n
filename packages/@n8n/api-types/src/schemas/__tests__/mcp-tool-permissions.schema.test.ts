import { mcpToolPermissionsSchema } from '../mcp-tool-permissions.schema';

describe('mcpToolPermissionsSchema', () => {
	it('accepts category permissions with tool overrides', () => {
		const permissions = {
			categories: { read: 'allow', write: 'ask' },
			tools: { search: 'block', update: 'allow' },
		};

		expect(mcpToolPermissionsSchema.parse(permissions)).toEqual(permissions);
	});

	it.each([
		{ categories: { read: 'allow' } },
		{ categories: { read: 'allow', write: 'prompt' } },
		{ categories: { read: 'allow', write: 'ask', other: 'block' } },
		{ categories: { read: 'allow', write: 'ask' }, tools: { search: 'prompt' } },
		{ categories: { read: 'allow', write: 'ask' }, tools: { '': 'allow' } },
		{ categories: { read: 'allow', write: 'ask' }, version: 1 },
	])('rejects invalid permissions: %o', (permissions) => {
		expect(mcpToolPermissionsSchema.safeParse(permissions).success).toBe(false);
	});
});
