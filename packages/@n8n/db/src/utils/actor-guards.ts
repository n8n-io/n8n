import { Actor, ServiceAccount, User } from '../entities';

/*
 * Human is the default, as it is for the `kind` column. A plain object, for
 * example a cached copy or a test double, counts as a user unless its `kind`
 * says `service`. A bare `Actor` instance counts as neither: TypeORM returns
 * one for a partial select, and it has none of the `User` methods.
 */

export function isServiceAccount(actor: Actor): actor is ServiceAccount {
	return actor instanceof ServiceAccount || actor.kind === 'service';
}

export function isUser(actor: Actor): actor is User {
	if (actor instanceof User) return true;
	return !(actor instanceof Actor) && !isServiceAccount(actor);
}
