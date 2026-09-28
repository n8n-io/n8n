import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

/**
 * Resolves a credential through the agent's project rather than a signed-in
 * user, because the routes that need it run without one.
 *
 * Shared so that a setup step and the check that gates it cannot disagree about
 * which credentials a project may read. They did: a globally shared credential
 * that setup accepted was reported as missing by the check.
 *
 * `ChatIntegrationService.decryptCredentialForProject` still resolves the same
 * way for the running channel and has not been moved here, so this is not yet
 * the only copy.
 */
@Service()
export class AgentCredentialLookupService {
	constructor(private readonly credentialsService: CredentialsService) {}

	/**
	 * Returns the decrypted credential, or null when the user may not use it in
	 * this project, or it is not of the expected type.
	 *
	 * The filter is the one connecting a channel uses, so a route that reads a
	 * credential and the route that connects it agree on who may name it.
	 */
	async decryptForUser(user: User, projectId: string, credentialId: string, expectedType: string) {
		const usable = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
			projectId,
		});
		if (!usable.some((item) => item.id === credentialId)) return null;
		return await this.decryptForProject(projectId, credentialId, expectedType);
	}

	/**
	 * Returns the decrypted credential, or null when it is not visible to the
	 * project or is not of the expected type.
	 *
	 * No user is consulted, so this is only for a route that has none and is
	 * authorised another way. Anything reached by a signed-in caller should use
	 * `decryptForUser`.
	 */
	async decryptForProject(projectId: string, credentialId: string, expectedType: string) {
		const projectCredentials =
			await this.credentialsService.findAllCredentialIdsForProject(projectId);
		// Global credentials are only consulted on a miss: the query reads every
		// global credential, data column included.
		const credential =
			projectCredentials.find((item) => item.id === credentialId) ??
			(await this.credentialsService.findAllGlobalCredentialIds(true)).find(
				(item) => item.id === credentialId,
			);

		if (!credential || credential.type !== expectedType) return null;
		return await this.credentialsService.decrypt(credential, true);
	}
}
