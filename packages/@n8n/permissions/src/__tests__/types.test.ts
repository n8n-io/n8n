import type { ApiKeyScope, Scope } from '@/types.ee';

// These are a type-level tests,
// that will be catch issues in the `typecheck` step instead of in an actual test run
describe('ApiKeyScope', () => {
	test('Valid scopes', () => {
		const validScopes: ApiKeyScope[] = [
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
		// Useless assertion to avoid disabling noUnusedLocals
		expect(validScopes).toBeDefined();
	});

	test('Invalid scopes', () => {
		const invalidScopes: ApiKeyScope[] = [
			// @ts-expect-error - Operations does not exist for workflows
			'workflows:invalid',
			// @ts-expect-error - Operations does not exist for credentials
			'credentials:invalid',
			// @ts-expect-error - Cross-resource mismatches
			'workflow:pull',
		];
		// Useless assertion to avoid disabling noUnusedLocals
		expect(invalidScopes).toBeDefined();
	});
});

// These are a type-level tests,
// that will be catch issues in the `typecheck` step instead of in an actual test run
describe('Scope', () => {
	test('Valid scopes', () => {
		// non-exhaustive list
		const validScopes: Scope[] = [
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
		// Useless assertion to avoid disabling noUnusedLocals
		expect(validScopes).toBeDefined();
	});

	test('Invalid scopes', () => {
		const invalidScopes: Scope[] = [
			// @ts-expect-error - Operations does not exist for workflows
			'workflows:invalid',
			// @ts-expect-error - Operations does not exist for credentials
			'credentials:invalid',
			// @ts-expect-error - Cross-resource mismatches
			'workflow:resetPassword',
		];
		// Useless assertion to avoid disabling noUnusedLocals
		expect(invalidScopes).toBeDefined();
	});
});
