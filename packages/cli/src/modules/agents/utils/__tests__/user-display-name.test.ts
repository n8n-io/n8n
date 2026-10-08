import type { User } from '@n8n/db';
import fc from 'fast-check';

import { userDisplayName } from '../user-display-name';

const named = (firstName: string | null, lastName: string | null, email: string | null) =>
	({ firstName, lastName, email }) as Pick<User, 'firstName' | 'lastName' | 'email'>;

describe('userDisplayName', () => {
	it('shows the first and the last name', () => {
		expect(userDisplayName(named('Ada', 'Lovelace', 'ada@example.com'))).toBe('Ada Lovelace');
	});

	it('shows the one name part that is set', () => {
		expect(userDisplayName(named('Ada', '', 'ada@example.com'))).toBe('Ada');
		expect(userDisplayName(named(null, 'Lovelace', 'ada@example.com'))).toBe('Lovelace');
	});

	it('trims each name part and joins them with one space', () => {
		expect(userDisplayName(named('  Ada ', ' Lovelace  ', 'ada@example.com'))).toBe('Ada Lovelace');
	});

	it.each([
		['empty names', named('', '', 'sso-user@example.com')],
		['names of spaces', named('  ', ' ', 'sso-user@example.com')],
		['missing names', named(null, null, 'sso-user@example.com')],
	])('falls back to the email for %s', (_label, user) => {
		expect(userDisplayName(user)).toBe('sso-user@example.com');
	});

	it('says "Unknown" only when there is no name and no email', () => {
		expect(userDisplayName(named('', '', ''))).toBe('Unknown');
		expect(userDisplayName(named(null, null, null))).toBe('Unknown');
	});

	const partArb = fc.oneof(fc.constant(null), fc.constant(''), fc.constant('  '), fc.string());

	it('always gives a name without spaces at the ends', () => {
		fc.assert(
			fc.property(partArb, partArb, partArb, (firstName, lastName, email) => {
				const name = userDisplayName(named(firstName, lastName, email));
				expect(name.length).toBeGreaterThan(0);
				expect(name).toBe(name.trim());
			}),
		);
	});

	it('never shows the email when a name part is set', () => {
		fc.assert(
			fc.property(
				fc.string().filter((part) => part.trim().length > 0),
				partArb,
				(firstName, lastName) => {
					const email = 'hidden@example.com';
					const name = userDisplayName(named(firstName, lastName, email));
					expect(name.startsWith(firstName.trim())).toBe(true);
					expect(name).not.toBe(email);
				},
			),
		);
	});
});
