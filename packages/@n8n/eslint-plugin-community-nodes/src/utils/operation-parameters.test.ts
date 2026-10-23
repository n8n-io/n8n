import { describe, expect, it } from 'vitest';

import { repeatsResource } from './operation-parameters.js';

describe('repeatsResource', () => {
	it('matches a verb with the resource, or the resource alone', () => {
		expect(repeatsResource('Get Directory Context', 'directoryContext')).toBe(true);
		expect(repeatsResource('Run an Actor', 'actor')).toBe(true);
		expect(repeatsResource('Get Contacts', 'contact')).toBe(true);
		expect(repeatsResource('Get a Company (Account View)', 'company')).toBe(true);
		expect(repeatsResource('Search', 'search')).toBe(true);
		expect(repeatsResource('Get HTTP Endpoint', 'httpEndpoint')).toBe(true);
		expect(repeatsResource('Delete Sub-Account', 'sub_account')).toBe(true);
	});

	it('allows operations that name another object', () => {
		expect(repeatsResource('Create Payment Link', 'payment')).toBe(false);
		expect(repeatsResource('Get Post Analytics', 'analytics')).toBe(false);
		expect(repeatsResource('Get Order', 'order_item')).toBe(false);
		expect(repeatsResource('Get Many', 'contact')).toBe(false);
	});
});
