import { isPerson, type Person, type User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';

export const PERSON_ONLY_MESSAGE = 'Only a person can do this action';

/** Rejects a service account on a path that only a person can use. */
export function assertPerson(user: User): asserts user is Person {
	if (!isPerson(user)) throw new ForbiddenError(PERSON_ONLY_MESSAGE);
}
