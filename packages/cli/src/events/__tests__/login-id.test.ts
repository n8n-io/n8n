import type { OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { loginIdOf } from '../login-id';

describe('loginIdOf', () => {
	it('returns the login id from the security context', () => {
		const security = mock<SecurityContext>({ subIdentityId: 'login-1' });

		expect(loginIdOf({ security })).toBe('login-1');
	});

	it.each<[string, OperationContext | undefined]>([
		[
			'a security context without a login',
			{ security: mock<SecurityContext>({ subIdentityId: undefined }) },
		],
		['an operation context without security', {}],
		['no operation context', undefined],
	])('returns undefined for %s', (_, ctx) => {
		expect(loginIdOf(ctx)).toBeUndefined();
	});
});
