import { getApiKeyScopesForRole } from '@/public-api-permissions.ee';
import { getGlobalScopes } from '@/utilities/get-global-scopes.ee';
import { getAuthPrincipalScopes } from '@/utilities/get-role-scopes.ee';
import { hasGlobalScope } from '@/utilities/has-global-scope.ee';
import type { AuthMethod, Principal, SecurityContext } from '@/principal.ee';
import type { AuthPrincipal } from '@/types.ee';

const principal: Principal = {
	id: 'user-1',
	type: 'human',
	role: { slug: 'global:member', scopes: [{ slug: 'workflow:read' }] },
};

// These are type-level tests. The `typecheck` step catches failures, not the test run.
describe('Principal', () => {
	test('is assignable to AuthPrincipal', () => {
		expectTypeOf<Principal>().toExtend<AuthPrincipal>();
	});

	test('works with the checks that take an AuthPrincipal', () => {
		expect(getAuthPrincipalScopes(principal)).toEqual(['workflow:read']);
		expect(hasGlobalScope(principal, 'workflow:read')).toBe(true);
		expect(getGlobalScopes(principal)).toEqual(['workflow:read']);
		expect(getApiKeyScopesForRole(principal)).toContain('workflow:read');
	});
});

describe('SecurityContext', () => {
	test('requires subject and authMethod', () => {
		expectTypeOf<SecurityContext>().toHaveProperty('subject').toEqualTypeOf<Principal>();
		expectTypeOf<SecurityContext>().toHaveProperty('authMethod').toEqualTypeOf<AuthMethod>();
		// @ts-expect-error subject and authMethod are required
		const context: SecurityContext = {};
		expect(context).toEqual({});
	});

	test('has no token-like key', () => {
		type TokenLikeKey = Extract<keyof SecurityContext, `${string}${'token' | 'Token'}` | 'bearer'>;
		expectTypeOf<Exclude<TokenLikeKey, 'tokenScopes'>>().toBeNever();
	});
});

describe('AuthMethod', () => {
	test("has no 'none' member", () => {
		expectTypeOf<Extract<AuthMethod, 'none'>>().toBeNever();
	});
});
