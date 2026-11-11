import type { Principal } from '@n8n/permissions';

import type { User } from '../entities';
import { isPerson } from './account-guards';

export function principalFromUser(user: User): Principal {
	const principal = { id: user.id, type: user.kind, role: user.role };
	if (!isPerson(user)) return principal;

	// The columns are nullable, but the entity types them as `string`.
	return {
		...principal,
		email: user.email ?? undefined,
		firstName: user.firstName ?? undefined,
		lastName: user.lastName ?? undefined,
	};
}
