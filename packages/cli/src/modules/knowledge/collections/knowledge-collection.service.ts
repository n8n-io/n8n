import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import type { KnowledgeCollection } from '../entities';
import { KnowledgeAvailabilityService } from '../knowledge-availability.service';
import { KnowledgeCollectionRepository } from '../repositories/knowledge-collection.repository';

/** A collection as a route addresses it: by its id and the project in the path. */
export interface KnowledgeCollectionRef {
	projectId: string;
	collectionId: string;
}

/** Access to a knowledge collection through its home project. */
@Service()
export class KnowledgeCollectionService {
	constructor(
		private readonly collectionRepository: KnowledgeCollectionRepository,
		private readonly availabilityService: KnowledgeAvailabilityService,
	) {}

	/**
	 * Returns the collection when the project is its home project. The route
	 * checks the scope of the user on that project.
	 *
	 * A collection of another project answers the same as a missing one.
	 */
	async getInProject(ref: KnowledgeCollectionRef): Promise<KnowledgeCollection> {
		const collection = (await this.availabilityService.isCollectionsEnabled())
			? await this.collectionRepository.findByIdAndProjectId(ref, {})
			: null;

		if (!collection) {
			throw new NotFoundError('Knowledge collection not found');
		}

		return collection;
	}

	/** The ids of the agents that use the collection. */
	async listAgentIds(ref: KnowledgeCollectionRef): Promise<string[]> {
		await this.getInProject(ref);
		return await this.collectionRepository.findAgentIds(ref.collectionId, {});
	}
}
