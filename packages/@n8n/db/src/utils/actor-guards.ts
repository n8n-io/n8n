import { ServiceAccount, User } from '../entities';
import type { Actor } from '../entities';

/*
 * Only a real child instance passes, so the narrowed type has the methods it
 * promises. A plain object, for example a cached copy or a test double, and a
 * bare `Actor` from a partial select pass neither guard. Build tests with
 * `Object.assign(new User(), …)`.
 */

export function isServiceAccount(actor: Actor): actor is ServiceAccount {
	return actor instanceof ServiceAccount;
}

export function isUser(actor: Actor): actor is User {
	return actor instanceof User;
}
