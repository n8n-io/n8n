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
