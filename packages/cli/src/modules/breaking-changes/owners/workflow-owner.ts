import type { BreakingChangeWorkflowOwner, MigrationOwnerSource } from '@n8n/api-types';
import type { User } from '@n8n/db';

/** The owner as the report shows it. */
export function toWorkflowOwner(
	user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>,
	source: MigrationOwnerSource,
): BreakingChangeWorkflowOwner {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		source,
	};
}

/** A user who can sign in, so they can open the workflow and fix it. Needs the role and the auth identities loaded. */
export function canOwnFindings(user: Pick<User, 'disabled' | 'isPending'>): boolean {
	return !user.disabled && !user.isPending;
}
