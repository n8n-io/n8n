import { RESOURCES } from '@/constants.ee';
import {
	GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS,
	PROJECT_CUSTOM_ROLE_OPERATIONS,
} from '@/roles/custom-role-scopes.ee';
import { GLOBAL_SCOPE_MAP, PROJECT_SCOPE_MAP } from '@/roles/role-maps.ee';
import { scopeInformation } from '@/scope-information';

const allScopes = [
	'mcpServer:create',
	'mcpServer:read',
	'mcpServer:update',
	'mcpServer:delete',
	'mcpServer:list',
	'mcpServer:connect',
];

const mcpServerScopesOf = (scopes: string[]) =>
	scopes.filter((scope) => scope.startsWith('mcpServer:')).sort();

/** Custom MCP servers: builders manage servers in a project, and members connect AI clients. */
describe('mcpServer scopes', () => {
	it('offer the default operations and connect', () => {
		expect([...RESOURCES.mcpServer].sort()).toEqual(
			['connect', 'create', 'delete', 'list', 'read', 'update'].sort(),
		);
	});

	it.each(['project:admin', 'project:personalOwner', 'project:editor'] as const)(
		'are granted in full to %s',
		(role) => {
			expect(mcpServerScopesOf(PROJECT_SCOPE_MAP[role])).toEqual([...allScopes].sort());
		},
	);

	it('let project viewers read, list, and connect', () => {
		expect(mcpServerScopesOf(PROJECT_SCOPE_MAP['project:viewer'])).toEqual(
			['mcpServer:connect', 'mcpServer:list', 'mcpServer:read'].sort(),
		);
	});

	it('let project chat users only connect', () => {
		expect(mcpServerScopesOf(PROJECT_SCOPE_MAP['project:chatUser'])).toEqual(['mcpServer:connect']);
	});

	it.each(['global:owner', 'global:admin'] as const)('are granted in full to %s', (role) => {
		expect(mcpServerScopesOf(GLOBAL_SCOPE_MAP[role])).toEqual([...allScopes].sort());
	});

	it.each(['global:member', 'global:chatUser'] as const)(
		'are withheld from %s, who get them from a project role',
		(role) => {
			expect(mcpServerScopesOf(GLOBAL_SCOPE_MAP[role])).toEqual([]);
		},
	);

	it('show in the custom role editors with labels', () => {
		expect([...PROJECT_CUSTOM_ROLE_OPERATIONS.mcpServer].sort()).toEqual(
			['connect', 'create', 'delete', 'list', 'read', 'update'].sort(),
		);
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.mcpServer).toEqual({
			View: ['mcpServer:list', 'mcpServer:read'],
			Manage: [
				'mcpServer:list',
				'mcpServer:read',
				'mcpServer:create',
				'mcpServer:update',
				'mcpServer:delete',
			],
		});
		for (const scope of allScopes) {
			expect(scopeInformation[scope as keyof typeof scopeInformation]?.displayName).toEqual(
				expect.any(String),
			);
		}
	});
});
