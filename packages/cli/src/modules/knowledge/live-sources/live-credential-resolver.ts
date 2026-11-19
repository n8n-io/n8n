import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { LiveSourceUnavailableError } from './live-source.errors';
import type { LiveCredentialRef, LivePrincipal } from './live-source-provider';

/**
 * The one seam between the live sources and the credential store. It resolves a
 * credential id of the agent config to `{ id, type }` and nothing more: the
 * node that runs the operation decrypts and refreshes the credential itself.
 */
@Service()
export class LiveCredentialResolver {
	constructor(private readonly credentialsRepository: CredentialsRepository) {}

	/**
	 * Resolves a credential that the project can use. The person principal
	 * follows the project access as well in this version; the per-user path
	 * through `CredentialsFinderService` comes with the picker.
	 */
	async resolve(
		projectId: string,
		_principal: LivePrincipal,
		sourceId: string,
		credentialId: string,
		allowedTypes: readonly string[],
	): Promise<LiveCredentialRef> {
		const [credential] = await this.credentialsRepository.findCredentialsUsableInProject(
			projectId,
			[credentialId],
		);
		if (!credential) {
			throw new LiveSourceUnavailableError(
				sourceId,
				'its credential does not exist or is not accessible in this project',
			);
		}
		if (!allowedTypes.includes(credential.type)) {
			throw new LiveSourceUnavailableError(
				sourceId,
				`its credential has type "${credential.type}", which this source does not accept`,
			);
		}
		return { id: credential.id, type: credential.type };
	}
}
