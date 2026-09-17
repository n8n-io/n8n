import type { User } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsFinderService } from './credentials-finder.service';

/** What a caller needs to name a credential in an error message. */
export type CredentialRef = {
	id: string;
	name: string;
	/** Display name of the project that owns the credential, when resolvable. */
	ownerName?: string;
};

/**
 * Answers "may this user bind this credential to a node that executes".
 *
 * Being able to read a credential no longer implies being able to use it, so
 * every gate that lets a credential reach a third party — execution, publish,
 * save, execution-data reveal — asks this service rather than inferring
 * capability from visibility.
 */
@Service()
export class CredentialUsabilityService {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	/**
	 * Of `credentialIds`, the ones `user` cannot use.
	 *
	 * A user can reach the same credential through several projects, and the
	 * effective access is the best of those routes — so a member of a project
	 * holding a usable grant passes even when another project's grant does not.
	 */
	async findUnusableByUser(user: User, credentialIds: string[]): Promise<CredentialRef[]> {
		if (credentialIds.length === 0) return [];

		const usable = await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
			credentialIds,
			user,
			['credential:use'],
		);
		const unusableIds = credentialIds.filter((id) => !usable.has(id));
		if (unusableIds.length === 0) return [];

		return await this.describe(unusableIds);
	}

	/** Names and owners for `credentialIds`, for error copy. */
	async describe(credentialIds: string[]): Promise<CredentialRef[]> {
		const [credentials, ownerProjects] = await Promise.all([
			this.credentialsRepository.getManyByIds(credentialIds),
			this.sharedCredentialsRepository.findOwnerProjectsByCredentialIds(credentialIds),
		]);

		return credentials.map((credential) => ({
			id: credential.id,
			name: credential.name,
			ownerName: ownerProjects.get(credential.id)?.name ?? undefined,
		}));
	}
}
