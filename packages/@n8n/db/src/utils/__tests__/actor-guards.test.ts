import { mock } from 'vitest-mock-extended';

import { Actor, ServiceAccount, User } from '../../entities';
import { isServiceAccount, isUser } from '../actor-guards';

describe('actor guards', () => {
	it('treats a ServiceAccount instance as a service account', () => {
		const actor = new ServiceAccount();

		expect(isServiceAccount(actor)).toBe(true);
		expect(isUser(actor)).toBe(false);
	});

	it('treats an object with the service kind as a service account', () => {
		const actor = mock<Actor>({ kind: 'service' });

		expect(isServiceAccount(actor)).toBe(true);
		expect(isUser(actor)).toBe(false);
	});

	it('treats a User instance as a user', () => {
		expect(isUser(new User())).toBe(true);
	});

	it('treats an object without a kind as a user', () => {
		const actor = { id: 'id' } as Actor;

		expect(isUser(actor)).toBe(true);
		expect(isServiceAccount(actor)).toBe(false);
	});

	it('treats a bare Actor instance as neither kind', () => {
		const actor = Object.create(Actor.prototype) as Actor;

		expect(isUser(actor)).toBe(false);
		expect(isServiceAccount(actor)).toBe(false);
	});
});
