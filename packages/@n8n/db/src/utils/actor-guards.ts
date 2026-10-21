import { type Actor, ServiceAccount, type User } from '../entities';

/*
 * Human is the default, as it is for the `kind` column. An account is a
 * service account only when it says so. This also covers an object that was
 * not built from the class, for example a cached copy or a test double.
 */

export function isServiceAccount(actor: Actor): actor is ServiceAccount {
	return actor instanceof ServiceAccount || actor.kind === 'service';
}

export function isUser(actor: Actor): actor is User {
	return !isServiceAccount(actor);
}
