import type { Principal } from '@n8n/permissions';

import { isUser } from './actor-guards';
import type { Actor } from '../entities';

export function principalFromUser(actor: Actor): Principal {
	if (!isUser(actor)) {
		return { id: actor.id, type: actor.type, role: actor.role };
	}
	// The columns are nullable, but the entity types them as `string`.
	return {
		id: actor.id,
		type: actor.type,
		role: actor.role,
		email: actor.email ?? undefined,
		firstName: actor.firstName ?? undefined,
		lastName: actor.lastName ?? undefined,
	};
}
