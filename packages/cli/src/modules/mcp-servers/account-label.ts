import { isPerson, type User } from '@n8n/db';

/** The email of a person, else the account id (service accounts have no email). */
export function accountEmail(user: User | null | undefined): string {
	if (!user) return '';
	return isPerson(user) ? user.email : user.id;
}

/** A display name: first and last name, else the email. */
export function accountName(user: User | null | undefined): string {
	if (!user) return '';
	if (!isPerson(user)) return user.id;
	return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
}
