import { UnexpectedError } from 'n8n-workflow';

import type { ServiceAccount, User } from '../entities';
import { isServiceAccount } from './account-guards';

function serviceAccountName(serviceAccount: ServiceAccount): string {
	// `details` loads eagerly, so this fails only for a query builder that skipped the join.
	if (!serviceAccount.details) {
		throw new UnexpectedError('Service account details were not loaded', {
			extra: { userId: serviceAccount.id },
		});
	}
	return serviceAccount.details.name;
}

/** The full name of a person, or the name of a service account. */
export function accountFullName(account: User): string {
	if (isServiceAccount(account)) return serviceAccountName(account);
	return `${account.firstName} ${account.lastName}`;
}

/** The first name of a person, or the name of a service account. */
export function accountFirstName(account: User): string {
	if (isServiceAccount(account)) return serviceAccountName(account);
	return account.firstName;
}
