import type { CreateKnowledgeCollectionDto, KnowledgeCollectionDto } from '@n8n/api-types';
import { isUniqueConstraintError, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UnexpectedError } from '@n8n/errors';
import { customAlphabet } from 'nanoid';

import { userHasScopes } from '@/permissions.ee/check-access';

import { KnowledgeAvailabilityService } from '../knowledge-availability.service';
import {
	KnowledgeCollectionRepository,
	type KnowledgeCollectionSummary,
} from '../repositories/knowledge-collection.repository';
import { SLUG_SUFFIX_LENGTH, slugFromName, slugWithSuffix } from './collection-slug';

const MAX_SLUG_ATTEMPTS = 5;
const randomSlugSuffix = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', SLUG_SUFFIX_LENGTH);

/**
 * Creates shared knowledge collections and returns them as the collection
 * list shows them.
 */
@Service()
export class KnowledgeCollectionCatalogService {
	constructor(
		private readonly collectionRepository: KnowledgeCollectionRepository,
		private readonly availabilityService: KnowledgeAvailabilityService,
	) {}

	/**
	 * Collections have no scopes of their own yet, so a create needs
	 * `agent:update` on the home project.
	 */
	async create(
		user: User,
		{ name, description, projectId }: CreateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			throw new NotFoundError('Knowledge collections are not enabled');
		}

		if (!(await userHasScopes(user, ['agent:update'], false, { projectId }))) {
			throw new ForbiddenError(
				'You do not have permission to create a knowledge collection in this project.',
			);
		}

		// The unique index also holds this rule. The check gives a clear error first.
		if (await this.collectionRepository.existsByProjectIdAndName(projectId, name, {})) {
			throw this.nameTakenError();
		}

		const slug = await this.findFreeSlug(name);

		try {
			const collection = await this.collectionRepository.insertShared(
				{ name, description, slug, projectId, createdById: user.id },
				{},
			);

			return await this.getDtoOrThrow(collection.id);
		} catch (error) {
			// Make sure a create that loses the race for the name gets the same error.
			if (
				isUniqueConstraintError(error) &&
				(await this.collectionRepository.existsByProjectIdAndName(projectId, name, {}))
			) {
				throw this.nameTakenError();
			}

			throw error;
		}
	}

	private async findFreeSlug(name: string): Promise<string> {
		const slug = slugFromName(name);

		if (!(await this.collectionRepository.existsBySlug(slug, {}))) {
			return slug;
		}

		for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
			const candidate = slugWithSuffix(slug, randomSlugSuffix());

			if (!(await this.collectionRepository.existsBySlug(candidate, {}))) {
				return candidate;
			}
		}

		throw new UnexpectedError('Could not find a free slug for the knowledge collection');
	}

	private async getDtoOrThrow(collectionId: string): Promise<KnowledgeCollectionDto> {
		const summary = await this.collectionRepository.findSharedSummaryById(collectionId, {});

		if (!summary) {
			throw new NotFoundError('Knowledge collection not found');
		}

		return toDto(summary);
	}

	private nameTakenError() {
		return new ConflictError('A collection with this name already exists in this project.');
	}
}

function toDto({
	collection,
	homeProject,
	fileCount,
	totalFileSizeBytes,
	agentCount,
}: KnowledgeCollectionSummary): KnowledgeCollectionDto {
	return {
		id: collection.id,
		name: collection.name,
		// Only a private collection of an agent has no description.
		description: collection.description ?? '',
		homeProject,
		fileCount,
		totalFileSizeBytes,
		agentCount,
		createdAt: collection.createdAt.toISOString(),
		updatedAt: collection.updatedAt.toISOString(),
	};
}
