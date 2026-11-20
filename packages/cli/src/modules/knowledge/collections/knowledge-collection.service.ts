import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { KnowledgeCollection } from '../entities';
import { KnowledgeAvailabilityService } from '../knowledge-availability.service';
import { KnowledgeCollectionRepository } from '../repositories/knowledge-collection.repository';

/** Access to a knowledge collection for a user. */
@Service()
export class KnowledgeCollectionService {
	constructor(
		private readonly collectionRepository: KnowledgeCollectionRepository,
		private readonly availabilityService: KnowledgeAvailabilityService,
	) {}

	/**
	 * Returns the collection when the user has the scope on it. Collections have
	 * no scopes of their own, so the agent scopes of the home project decide.
	 *
	 * A collection that the user cannot see answers the same as a missing one.
	 */
	async getForUser(
		user: User,
		collectionId: string,
		scope: 'agent:read' | 'agent:update',
	): Promise<KnowledgeCollection> {
		const collection = (await this.availabilityService.isCollectionsEnabled())
			? await this.collectionRepository.findById(collectionId, {})
			: null;
		const projectId = collection?.projectId;

		if (
			!collection ||
			!projectId ||
			!(await userHasScopes(user, ['agent:read'], false, { projectId }))
		) {
			throw new NotFoundError('Knowledge collection not found');
		}

		if (scope !== 'agent:read' && !(await userHasScopes(user, [scope], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to change this knowledge collection.');
		}

		return collection;
	}

	/** The ids of the agents that use the collection. */
	async listAgentIds(user: User, collectionId: string): Promise<string[]> {
		await this.getForUser(user, collectionId, 'agent:read');
		return await this.collectionRepository.findAgentIds(collectionId, {});
	}
}
