import { UnexpectedError } from '@n8n/errors';

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

/*
 * These helpers are the only place that decides how an account looks.
 * An account that is neither a `Person` nor a `ServiceAccount` comes from a query
 * that did not select `kind`. It gets no email and no name, so a missing column
 * never fails a request.
 */

/** The full name of a person, or the name of a service account. */
export function accountFullName(account: User): string {
	if (isServiceAccount(account)) return serviceAccountName(account);
	if (isPerson(account)) return `${account.firstName} ${account.lastName}`;
	return '';
}

/** The first name of a person, or the name of a service account. */
export function accountFirstName(account: User): string {
	if (isServiceAccount(account)) return serviceAccountName(account);
	if (isPerson(account)) return account.firstName;
	return '';
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
	const { id } = account;
	if (isServiceAccount(account)) {
		return { id, email: null, firstName: serviceAccountName(account), lastName: null };
	}
	if (isPerson(account)) {
		// A partial select can leave the columns undefined.
		const { email, firstName, lastName } = account;
		return { id, email: email ?? null, firstName: firstName ?? null, lastName: lastName ?? null };
	}
	return { id, email: null, firstName: null, lastName: null };
}
