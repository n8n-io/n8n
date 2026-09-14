import type { User } from '@n8n/db';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Verifies the requesting user has access to every credential referenced by a
 * log streaming destination, mirroring the credential access check applied to
 * credentials referenced by workflow nodes. Credential access is project-scoped
 * while the eventBusDestination scopes are global, so destination credentials
 * must be authorized explicitly here.
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

		const credential = await credentialsFinderService.findCredentialForUser(credentialId, user, [
			'credential:read',
		]);

		if (!credential) {
			throw new ForbiddenError(
				'You do not have access to the credentials selected for this log streaming destination.',
			);
		}
	}
}
