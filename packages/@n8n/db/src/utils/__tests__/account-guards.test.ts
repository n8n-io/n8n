import { Person, ServiceAccount, type User } from '../../entities';
import { isPerson, isServiceAccount } from '../account-guards';

describe('account guards', () => {
	it('accepts a ServiceAccount instance as a service account only', () => {
		const user = new ServiceAccount();

		expect(isServiceAccount(user)).toBe(true);
		expect(isPerson(user)).toBe(false);
	});

	it('accepts a Person instance as a person only', () => {
		const user = new Person();

		expect(isPerson(user)).toBe(true);
		expect(isServiceAccount(user)).toBe(false);
	});

	it.each([
		['a plain object with the person kind', { id: 'id', kind: 'person' }],
		['a plain object with the service kind', { id: 'id', kind: 'service' }],
	])('rejects %s', (_, value) => {
		const user = value as User;

		expect(isPerson(user)).toBe(false);
		expect(isServiceAccount(user)).toBe(false);
	});
});
