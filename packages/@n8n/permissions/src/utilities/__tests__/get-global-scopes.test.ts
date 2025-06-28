import { GLOBAL_SCOPE_MAP } from '../../roles/role-maps.ee';
import type { GlobalRole } from '../../types.ee';
import { getGlobalScopes } from '../get-global-scopes.ee';

describe('getGlobalScopes', () => {
	test.each(['global:owner', 'global:admin', 'global:member'] as const)(
		'should return correct scopes for %s',
		(role) => {
			const scopes = getGlobalScopes({ role });

			expect(scopes).toEqual(GLOBAL_SCOPE_MAP[role]);
		},
	);

	test('should return empty array for non-existent role', () => {
		const scopes = getGlobalScopes({ role: 'non:existent' as GlobalRole });

		expect(scopes).toEqual([]);
	});
});
