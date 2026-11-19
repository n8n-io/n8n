import { Person, ServiceAccount } from '../entities';
import type { User } from '../entities';

/*
 * Only a real child instance passes, so the narrowed type is what it promises.
 * A plain object, for example a cached copy or a test double, passes neither
 * guard. Build tests with `Object.assign(new Person(), …)`.
 */

export function isPerson(user: User): user is Person {
	return user instanceof Person;
}

export function isServiceAccount(user: User): user is ServiceAccount {
	return user instanceof ServiceAccount;
}
