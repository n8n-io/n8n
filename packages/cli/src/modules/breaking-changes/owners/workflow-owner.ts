import type { BreakingChangeWorkflowOwner, MigrationOwnerSource } from '@n8n/api-types';
import { accountSummary, isPerson, type User } from '@n8n/db';

/** The owner as the report shows it. A service account has its name and no email. */
export function toWorkflowOwner(
	user: User,
	source: MigrationOwnerSource,
): BreakingChangeWorkflowOwner {
	return { ...accountSummary(user), source };
}

/**
 * An account that can sign in, so it can open the workflow and fix it. A person
 * who has not accepted the invite cannot. Needs the role and the auth identities loaded.
 */
export function canOwnFindings(user: User): boolean {
	return !user.disabled && !(isPerson(user) && user.isPending);
}
