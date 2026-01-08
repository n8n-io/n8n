import type { Role } from '@n8n/db';
import type { Scope } from '@n8n/permissions';

export interface RoleScopeEnricher {
	/**
	 * The role we are looking for further scopes to append
	 *
	 * A nice addition here would be to also take a user as we'd be able to then do specific
	 * user based lookups when enriching the role
	 *
	 * @param role
	 */
	execute(role: Role): Promise<Scope[]>;
}
