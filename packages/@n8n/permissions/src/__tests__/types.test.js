'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
describe('ApiKeyScope', () => {
	test('Valid scopes', () => {
		const validScopes = [
			'credential:create',
			'credential:delete',
			'credential:move',
			'execution:delete',
			'execution:get',
			'execution:list',
			'execution:read',
			'project:create',
			'project:delete',
			'project:list',
			'project:update',
			'securityAudit:generate',
			'sourceControl:pull',
			'tag:create',
			'tag:delete',
			'tag:list',
			'tag:read',
			'tag:update',
			'user:changeRole',
			'user:create',
			'user:delete',
			'user:list',
			'user:read',
			'variable:create',
			'variable:delete',
			'variable:list',
			'workflow:activate',
			'workflow:create',
			'workflow:deactivate',
			'workflow:delete',
			'workflow:list',
			'workflow:move',
			'workflow:read',
			'workflow:update',
			'workflowTags:list',
			'workflowTags:update',
		];
		expect(validScopes).toBeDefined();
	});
	test('Invalid scopes', () => {
		const invalidScopes = ['workflows:invalid', 'credentials:invalid', 'workflow:pull'];
		expect(invalidScopes).toBeDefined();
	});
});
describe('Scope', () => {
	test('Valid scopes', () => {
		const validScopes = [
			'credential:create',
			'credential:delete',
			'credential:move',
			'ldap:sync',
			'project:create',
			'project:delete',
			'project:list',
			'project:update',
			'securityAudit:generate',
			'sourceControl:pull',
			'tag:create',
			'tag:delete',
			'tag:list',
			'tag:read',
			'tag:update',
			'user:changeRole',
			'user:create',
			'user:delete',
			'user:list',
			'user:read',
			'variable:create',
			'variable:delete',
			'variable:list',
			'workflow:create',
			'workflow:delete',
			'workflow:list',
			'workflow:move',
			'workflow:read',
			'workflow:update',
		];
		expect(validScopes).toBeDefined();
	});
	test('Invalid scopes', () => {
		const invalidScopes = ['workflows:invalid', 'credentials:invalid', 'workflow:resetPassword'];
		expect(invalidScopes).toBeDefined();
	});
});
//# sourceMappingURL=types.test.js.map
