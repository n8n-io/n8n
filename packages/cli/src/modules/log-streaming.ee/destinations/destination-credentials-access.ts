import type { User } from '@n8n/db';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import type { CredentialsFinderService } from '@n8n/backend-services';
import { ForbiddenError } from '@n8n/errors';

/**
 * Verifies that the user can use every credential referenced by a destination.
 * Destinations send credential secrets on each delivery and test. The finder
 * excludes see-only project or sharing roles. Credential access is project-scoped,
 * so global eventBusDestination scopes do not authorize credential use.
 */
export async function assertUserCanUseDestinationCredentials(
	credentialsFinderService: CredentialsFinderService,
	user: User,
	options: Pick<MessageEventBusDestinationOptions, 'credentials'>,
): Promise<void> {
	const { credentials } = options;
	if (!credentials) return;

	for (const reference of Object.values(credentials)) {
		const credentialId = reference?.id;
		if (!credentialId) continue;

		const credential = await credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
			{ excludeSeeOnlyRoles: true },
		);

		if (!credential) {
			throw new ForbiddenError(
				'You do not have access to the credentials selected for this log streaming destination.',
			);
		}
	}
}
