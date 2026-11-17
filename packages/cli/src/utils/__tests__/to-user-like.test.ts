import { Person, ServiceAccount, ServiceAccountDetails, User } from '@n8n/db';
import type { Role } from '@n8n/db';

import { toUserLike } from '@/utils/to-user-like';

const role = { slug: 'global:member' } as Role;

describe('toUserLike', () => {
	it('should carry the email and names of a person', () => {
		const person = Object.assign(new Person(), {
			id: 'person-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
			role,
		});

		expect(toUserLike(person)).toEqual({
			id: 'person-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
			role,
		});
	});

	it('should carry only the id and role of a service account', () => {
		const serviceAccount = Object.assign(new ServiceAccount(), {
			id: 'sa-1',
			details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
			role,
		});

		expect(toUserLike(serviceAccount)).toEqual({ id: 'sa-1', role });
	});

	it('should carry only the id and role of an account of unknown kind', () => {
		const account = Object.assign(new User(), { id: 'user-1', role });

		expect(toUserLike(account)).toEqual({ id: 'user-1', role });
	});
});
