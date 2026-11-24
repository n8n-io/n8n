import { CredentialsFinderService } from '@n8n/backend-services';
import { SharedCredentialsRepository, type CredentialsEntity, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { LruCache } from '@n8n/utils/lru-cache';
import { Credentials } from 'n8n-core';

const NO_VALUES_CACHE_SIZE = 1000;

/** A value is empty when it is unset, a blank string, or an object or array that holds only empty values. `false` and `0` are values. */
function isEmptyValue(value: unknown): boolean {
	if (value === undefined || value === null || value === '') return true;
	if (Array.isArray(value)) return value.every(isEmptyValue);
	if (typeof value === 'object') return Object.values(value).every(isEmptyValue);
	return false;
}

/** A credential has no values when it holds no key, or when every value is empty. */
async function hasNoValues(credential: CredentialsEntity): Promise<boolean> {
	const data = await new Credentials(
		{ id: credential.id, name: credential.name },
		credential.type,
		credential.data,
	).getData();
	return isEmptyValue(data);
}

/**
 * Decides which credentials of a project a user can promote on their own. A project owns a
 * credential when it holds the `credential:owner` sharing. A credential that only shares into the
 * project, an instance credential and a credential with no values are not selectable.
 */
@Service()
export class PromotionCredentialSelectionService {
	private readonly noValuesCache = new LruCache<string, boolean>(NO_VALUES_CACHE_SIZE);

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
		const candidates = owned.filter(({ id }) => readable.has(id));
		const empty = await Promise.all(candidates.map(async (entry) => await this.isEmpty(entry)));
		return candidates
			.filter((_, index) => !empty[index])
			.map(({ id }) => id)
			.sort();
	}

	/**
	 * Stops a Promote that names a credential the user cannot select. An id that the project does not
	 * own is a bad request. An owned credential that the user cannot read is forbidden.
	 */
	async assertSelectable(user: User, projectId: string, credentialIds: string[]): Promise<void> {
		if (credentialIds.length === 0) return;

		const owned = new Map((await this.findOwned(projectId)).map((entry) => [entry.id, entry]));
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

		const empty = await Promise.all(
			credentialIds.map(async (id) => await this.isEmpty(owned.get(id)!)),
		);
		const emptyId = credentialIds.find((_, index) => empty[index]);
		if (emptyId !== undefined) {
			throw new BadRequestError(`The credential "${emptyId}" has no values and cannot be promoted`);
		}
	}

	/**
	 * The credentials of the project that the user cannot read. Apply hides them, so that the
	 * preview shows no name or type of a credential the user cannot see, and refuses to select them.
	 */
	async findUnreadableOwnedIds(user: User, projectId: string): Promise<Set<string>> {
		const ids = (await this.findOwned(projectId)).map(({ id }) => id);
		const readable = await this.credentialsFinder.findCredentialIdsWithScopeForUser(ids, user, [
			'credential:read',
		]);
		return new Set(ids.filter((id) => !readable.has(id)));
	}

	/** A credential keeps its "no values" answer until it changes, so decrypting once per update is enough. */
	private async isEmpty(credential: CredentialsEntity): Promise<boolean> {
		const stamp = credential.updatedAt?.getTime();
		if (stamp === undefined) return await hasNoValues(credential);
		const key = `${credential.id}:${stamp}`;
		const cached = this.noValuesCache.get(key);
		if (cached !== undefined) return cached;
		const result = await hasNoValues(credential);
		this.noValuesCache.set(key, result);
		return result;
	}

	/** Credentials that this project owns and that only this project can use. */
	private async findOwned(projectId: string): Promise<CredentialsEntity[]> {
		const owned = await this.sharedCredentialsRepository.findOwnedCredentialsByProjects([
			projectId,
		]);
		return owned.filter(({ usageScope }) => usageScope !== 'instance');
	}
}
