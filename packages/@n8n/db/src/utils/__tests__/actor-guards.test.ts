import { Actor, ServiceAccount, User } from '../../entities';
import { isServiceAccount, isUser } from '../actor-guards';

describe('actor guards', () => {
	it('accepts a ServiceAccount instance as a service account only', () => {
		const actor = new ServiceAccount();

		expect(isServiceAccount(actor)).toBe(true);
		expect(isUser(actor)).toBe(false);
	});

	it('accepts a User instance as a user only', () => {
		const actor = new User();

		expect(isUser(actor)).toBe(true);
		expect(isServiceAccount(actor)).toBe(false);
	});

	it.each([
		['a plain object with the human kind', { id: 'id', kind: 'human' }],
		['a plain object with the service kind', { id: 'id', kind: 'service' }],
		['a bare Actor instance', Object.create(Actor.prototype)],
	])('rejects %s', (_, value) => {
		const actor = value as Actor;

		expect(isUser(actor)).toBe(false);
		expect(isServiceAccount(actor)).toBe(false);
	});
});
