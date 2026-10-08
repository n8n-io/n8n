import type { User } from '@n8n/db';

type NamedUser = Pick<User, 'firstName' | 'lastName' | 'email'>;

/**
 * The name that other users see for `user`: the first and last name, else the email.
 * Users that SSO or LDAP adds can have no name, and a message must still say who it is.
 * The columns can be null in old rows, so every part is checked.
 */
export function userDisplayName(user: NamedUser): string {
	const name = [user.firstName, user.lastName]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(' ');
	return name || user.email?.trim() || 'Unknown';
}
