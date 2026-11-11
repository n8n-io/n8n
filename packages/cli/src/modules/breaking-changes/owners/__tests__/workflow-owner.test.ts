import { Person, ServiceAccount, ServiceAccountDetails } from '@n8n/db';

import { canOwnFindings, toWorkflowOwner } from '../workflow-owner';

const person = (fields: Partial<Person> = {}) =>
	Object.assign(new Person(), {
		id: 'person-1',
		email: 'ada@example.com',
		firstName: 'Ada',
		lastName: 'Lovelace',
		disabled: false,
		isPending: false,
		...fields,
	});

const serviceAccount = (fields: Partial<ServiceAccount> = {}) =>
	Object.assign(new ServiceAccount(), {
		id: 'service-1',
		disabled: false,
		details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
		...fields,
	});

describe('canOwnFindings', () => {
	it('accepts an enabled person who has accepted the invite', () => {
		expect(canOwnFindings(person())).toBe(true);
	});

	it('rejects a disabled person and a pending person', () => {
		expect(canOwnFindings(person({ disabled: true }))).toBe(false);
		expect(canOwnFindings(person({ isPending: true }))).toBe(false);
	});

	it('accepts an enabled service account, which can own a workflow', () => {
		expect(canOwnFindings(serviceAccount())).toBe(true);
	});

	it('rejects a disabled service account', () => {
		expect(canOwnFindings(serviceAccount({ disabled: true }))).toBe(false);
	});
});

describe('toWorkflowOwner', () => {
	it("returns a person's email and name", () => {
		expect(toWorkflowOwner(person(), 'assigned')).toEqual({
			id: 'person-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
			source: 'assigned',
		});
	});

	it('returns the name of a service account, with no email', () => {
		expect(toWorkflowOwner(serviceAccount(), 'suggested')).toEqual({
			id: 'service-1',
			email: null,
			firstName: 'Deploy bot',
			lastName: null,
			source: 'suggested',
		});
	});
});
