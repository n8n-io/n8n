import { type Actor, ServiceAccount, type User } from '../entities';

/*
 * Human is the default, as it is for the `type` column. A row only counts as
 * a service account when it says so. This also covers an object built without
 * the class, for example one read back from the cache or a test double.
 */

export function isServiceAccount(actor: Actor): actor is ServiceAccount {
	return actor instanceof ServiceAccount || actor.type === 'service';
}

export function isUser(actor: Actor): actor is User {
	return !isServiceAccount(actor);
}
