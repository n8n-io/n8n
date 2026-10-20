import type { ResourceGrant } from '@n8n/permissions';
import type { OAuthResourceGrant } from 'n8n-workflow';

import { User } from '../../entities';
import type { Role } from '../../entities';
import { principalFromUser } from '../principal-from-user';

const role = { slug: 'global:member', scopes: [] } as unknown as Role;

function makeUser(fields: Partial<User>) {
	return Object.assign(new User(), { id: 'user-1', role, ...fields });
}

describe('principalFromUser', () => {
	it('maps id, role, email and names, and sets type to human', () => {
		const user = makeUser({ email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' });

		expect(principalFromUser(user)).toEqual({
			id: 'user-1',
			type: 'human',
			role,
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
		});
	});

	it('turns null email and name fields into undefined', () => {
		const user = makeUser({
			email: null as unknown as string,
			firstName: null as unknown as string,
			lastName: null as unknown as string,
		});

		const principal = principalFromUser(user);

		expect(principal.email).toBeUndefined();
		expect(principal.firstName).toBeUndefined();
		expect(principal.lastName).toBeUndefined();
	});

	it('does not copy other user fields', () => {
		const user = makeUser({
			email: 'ada@example.com',
			password: 'hashed',
			settings: { userActivated: true },
		});

		expect(Object.keys(principalFromUser(user)).sort()).toEqual([
			'email',
			'firstName',
			'id',
			'lastName',
			'role',
			'type',
		]);
	});

	it('keeps ResourceGrant and OAuthResourceGrant assignable in both directions', () => {
		expectTypeOf<ResourceGrant>().toExtend<OAuthResourceGrant>();
		expectTypeOf<OAuthResourceGrant>().toExtend<ResourceGrant>();
	});
});
