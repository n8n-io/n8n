import { CredentialsFinderService } from '@n8n/backend-services';
import { SharedCredentialsRepository, type CredentialsEntity, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

/**
 * Decides which credentials of a project a user can promote on their own. A project owns a
 * credential when it holds the `credential:owner` sharing. A credential that only shares into the
 * project and an instance credential are not selectable. A credential with no values is: a package
 * never carries a secret, so Promote sends its name, type and description either way.
 */
@Service()
export class PromotionCredentialSelectionService {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialsFinder: CredentialsFinderService,
	) {}

	/** The ids of the credentials that the user can select in this project, in a stable order. */
	async findSelectableIds(user: User, projectId: string): Promise<string[]> {
		const owned = await this.findOwned(projectId);
		const readable = await this.credentialsFinder.findCredentialIdsWithScopeForUser(
			owned.map(({ id }) => id),
			user,
			['credential:read'],
		);
		return owned
			.map(({ id }) => id)
			.filter((id) => readable.has(id))
			.sort();
	}

	/**
	 * Stops a Promote that names a credential the user cannot select. An id that the project does not
	 * own is a bad request. An owned credential that the user cannot read is forbidden.
	 */
	async assertSelectable(user: User, projectId: string, credentialIds: string[]): Promise<void> {
		if (credentialIds.length === 0) return;

		const owned = new Set((await this.findOwned(projectId)).map(({ id }) => id));
		const notOwned = credentialIds.filter((id) => !owned.has(id));
		if (notOwned.length > 0) {
			throw new BadRequestError(
				`The following credentials are not selectable in this project: ${notOwned.join(', ')}`,
			);
		}

		const readable = await this.credentialsFinder.findCredentialIdsWithScopeForUser(
			credentialIds,
			user,
			['credential:read'],
		);
		if (credentialIds.some((id) => !readable.has(id))) {
			throw new ForbiddenError('You cannot read one of the selected credentials');
		}
	}

	/** Credentials that this project owns and that only this project can use. */
	private async findOwned(projectId: string): Promise<CredentialsEntity[]> {
		const owned = await this.sharedCredentialsRepository.findOwnedCredentialsByProjects([
			projectId,
		]);
		return owned.filter(({ usageScope }) => usageScope !== 'instance');
	}
}
