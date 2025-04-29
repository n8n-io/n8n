import type { AuthPrincipal, GlobalRole, Scope } from '../../types.ee';
import { hasGlobalScope } from '../hasGlobalScope.ee';

describe('hasGlobalScope', () => {
	const owner: AuthPrincipal = { role: 'global:owner' };
	const admin: AuthPrincipal = { role: 'global:admin' };
	const member: AuthPrincipal = { role: 'global:member' };

	test('should correctly check a single scope for owner', () => {
		const result = hasGlobalScope(owner, 'workflow:create');

		expect(result).toBe(true);
	});

	test('should correctly check a single scope for member', () => {
		const result = hasGlobalScope(member, 'workflow:delete');

		expect(result).toBe(false);
	});

	test('should check multiple scopes with default oneOf mode', () => {
		const result = hasGlobalScope(admin, ['workflow:update', 'nonexistent:permission' as Scope]);

		expect(result).toBe(true);
	});

	test('should check multiple scopes with allOf mode', () => {
		const allOfResult = hasGlobalScope(owner, ['workflow:create', 'workflow:read'], {
			mode: 'allOf',
		});

		expect(allOfResult).toBe(true);

		// Owner should not have all if we include a non-existent permission
		const failedAllOfResult = hasGlobalScope(
			owner,
			['workflow:create', 'nonexistent:permission' as Scope],
			{ mode: 'allOf' },
		);

		expect(failedAllOfResult).toBe(false);
	});

	test('should handle non-existent role', () => {
		const result = hasGlobalScope({ role: 'non:existent' as GlobalRole }, 'workflow:read');

		expect(result).toBe(false);
	});

	test('should handle empty scope array', () => {
		const result = hasGlobalScope(owner, []);

		expect(result).toBe(false);
	});

	test.each<[GlobalRole, Scope, boolean]>([
		['global:owner', 'workflow:create', true],
		['global:owner', 'workflow:delete', true],
		['global:admin', 'workflow:create', true],
		['global:admin', 'user:delete', true],
		['global:member', 'workflow:read', false],
		['global:member', 'workflow:delete', false],
	])('should return %s for %s role with %s scope', (role, scope, expected) => {
		const result = hasGlobalScope({ role }, scope);

		expect(result).toBe(expected);
	});
});
