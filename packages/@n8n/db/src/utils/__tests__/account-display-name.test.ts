import { UnexpectedError } from 'n8n-workflow';

import { Person, ServiceAccount, ServiceAccountDetails } from '../../entities';
import { accountFirstName, accountFullName, accountSummary } from '../account-display-name';

describe('account display name', () => {
	it('names a person by their first and last name', () => {
		const person = Object.assign(new Person(), { firstName: 'Ada', lastName: 'Lovelace' });

		expect(accountFullName(person)).toBe('Ada Lovelace');
		expect(accountFirstName(person)).toBe('Ada');
	});

	it('names a service account by the name in its details', () => {
		const serviceAccount = Object.assign(new ServiceAccount(), {
			details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
		});

		expect(accountFullName(serviceAccount)).toBe('Deploy bot');
		expect(accountFirstName(serviceAccount)).toBe('Deploy bot');
	});

	it('throws when the details of a service account were not loaded', () => {
		const serviceAccount = Object.assign(new ServiceAccount(), { id: 'service-1' });

		expect(() => accountFullName(serviceAccount)).toThrow(UnexpectedError);
		expect(() => accountFirstName(serviceAccount)).toThrow(UnexpectedError);
	});

	describe('accountSummary', () => {
		it("returns a person's email and name", () => {
			const person = Object.assign(new Person(), {
				id: 'person-1',
				email: 'ada@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
			});

			expect(accountSummary(person)).toEqual({
				id: 'person-1',
				email: 'ada@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
			});
		});

		it('returns the name of a service account as its first name, with no email', () => {
			const serviceAccount = Object.assign(new ServiceAccount(), {
				id: 'service-1',
				details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
			});

			expect(accountSummary(serviceAccount)).toEqual({
				id: 'service-1',
				email: null,
				firstName: 'Deploy bot',
				lastName: null,
			});
		});
	});
});
