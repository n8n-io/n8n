import { isReservedGlobalRole } from '../is-reserved-global-role.ee';

describe('isReservedGlobalRole', () => {
	test.each(['global:owner', 'global:agent'])('returns true for %s', (slug) => {
		expect(isReservedGlobalRole(slug)).toBe(true);
	});

	test.each(['global:admin', 'global:member', 'global:chatUser', 'custom:my-role'])(
		'returns false for %s',
		(slug) => {
			expect(isReservedGlobalRole(slug)).toBe(false);
		},
	);
});
