import { describe, expect, it } from 'vitest';

import { operationAction, repeatsResource } from './operation-parameters.js';

describe('operationAction', () => {
	it('keeps the standard names of several words together', () => {
		expect(operationAction('Get Many Contacts')).toBe('Get Many');
		expect(operationAction('Create or Update Contact')).toBe('Create or Update');
		expect(operationAction('insert or append row')).toBe('insert or append');
	});

	it('uses the first word otherwise', () => {
		expect(operationAction('Delete Contact')).toBe('Delete');
		expect(operationAction('Get Contact')).toBe('Get');
		expect(operationAction('Search')).toBe('Search');
	});
});

describe('repeatsResource', () => {
	it('matches a verb with the resource, or the resource alone', () => {
		expect(repeatsResource('Get Directory Context', 'directoryContext')).toBe(true);
		expect(repeatsResource('Run an Actor', 'actor')).toBe(true);
		expect(repeatsResource('Get a Company (Account View)', 'company')).toBe(true);
		expect(repeatsResource('Search', 'search')).toBe(true);
		expect(repeatsResource('Get HTTP Endpoint', 'httpEndpoint')).toBe(true);
		expect(repeatsResource('Delete Sub-Account', 'sub_account')).toBe(true);
		expect(repeatsResource('Send HTTP Request', 'httpRequest')).toBe(true);
	});

	it('ignores plurals in the name and in the resource', () => {
		expect(repeatsResource('Get Contacts', 'contact')).toBe(true);
		expect(repeatsResource('Delete File', 'files')).toBe(true);
		expect(repeatsResource('List Orders', 'orders')).toBe(true);
		expect(repeatsResource('List Activities', 'activity')).toBe(true);
		expect(repeatsResource('Get Statuses', 'status')).toBe(true);
		expect(repeatsResource('Get Status', 'status')).toBe(true);
		expect(repeatsResource('List People', 'person')).toBe(true);
	});

	it('matches the standard names of several words with the resource', () => {
		expect(repeatsResource('Get Many Contacts', 'contact')).toBe(true);
		expect(repeatsResource('Create or Update a Contact', 'contact')).toBe(true);
		expect(repeatsResource('Insert or Append Rows', 'row')).toBe(true);
		expect(repeatsResource('Create or Update', 'contact')).toBe(false);
	});

	it('allows operations that name another object', () => {
		expect(repeatsResource('Create Payment Link', 'payment')).toBe(false);
		expect(repeatsResource('Get Post Analytics', 'analytics')).toBe(false);
		expect(repeatsResource('Get Order', 'order_item')).toBe(false);
		expect(repeatsResource('Get Many', 'contact')).toBe(false);
	});
});
