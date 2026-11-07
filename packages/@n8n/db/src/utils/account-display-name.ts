import { UnexpectedError } from 'n8n-workflow';

import type { ServiceAccount, User } from '../entities';
import { isPerson, isServiceAccount } from './account-guards';

function serviceAccountName(serviceAccount: ServiceAccount): string {
	// `details` loads eagerly, so this fails only for a query builder that skipped the join.
	if (!serviceAccount.details) {
		throw new UnexpectedError('Service account details were not loaded', {
			extra: { userId: serviceAccount.id },
		});
	}
	return serviceAccount.details.name;
}

function unknownKind(account: User) {
	return new UnexpectedError('Account is neither a person nor a service account', {
		extra: { userId: account.id },
	});
}

/** The full name of a person, or the name of a service account. */
export function accountFullName(account: User): string {
	if (isServiceAccount(account)) return serviceAccountName(account);
	if (isPerson(account)) return `${account.firstName} ${account.lastName}`;
	throw unknownKind(account);
}

/** The first name of a person, or the name of a service account. */
export function accountFirstName(account: User): string {
	if (isServiceAccount(account)) return serviceAccountName(account);
	if (isPerson(account)) return account.firstName;
	throw unknownKind(account);
}

/** The id, email and name that a list or a mail shows for an account. */
export type AccountSummary = {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
};

/**
 * A person's email and name. A service account has no email and no last name,
 * so it shows its name as the first name.
 */
export function accountSummary(account: User): AccountSummary {
	if (isServiceAccount(account)) {
		return { id: account.id, email: null, firstName: serviceAccountName(account), lastName: null };
	}
	if (isPerson(account)) {
		const { id, email, firstName, lastName } = account;
		return { id, email, firstName, lastName };
	}
	throw unknownKind(account);
}
