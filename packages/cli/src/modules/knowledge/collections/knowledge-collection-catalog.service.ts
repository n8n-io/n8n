import type {
	CreateKnowledgeCollectionDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionListResponse,
} from '@n8n/api-types';
import { RoleService } from '@n8n/backend-services';
import {
	isUniqueConstraintError,
	ProjectRelationRepository,
	ProjectRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UnexpectedError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { customAlphabet } from 'nanoid';

import { userHasScopes } from '@/permissions.ee/check-access';

import { KnowledgeAvailabilityService } from '../knowledge-availability.service';
import {
	KnowledgeCollectionRepository,
	type KnowledgeCollectionSummary,
} from '../repositories/knowledge-collection.repository';
import { SLUG_SUFFIX_LENGTH, slugFromName, slugWithSuffix } from './collection-slug';

const MAX_SLUG_ATTEMPTS = 5;
const MAX_INSERT_ATTEMPTS = 2;
const randomSlugSuffix = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', SLUG_SUFFIX_LENGTH);

/**
 * Creates and lists shared knowledge collections, in the shape that the
 * collection list shows.
 */
@Service()
export class KnowledgeCollectionCatalogService {
	constructor(
		private readonly collectionRepository: KnowledgeCollectionRepository,
		private readonly availabilityService: KnowledgeAvailabilityService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
	) {}

	async create(
		user: User,
		projectId: string,
		{ name, description }: CreateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			throw new NotFoundError('Knowledge collections are not enabled');
		}

		/**
		 * Collections have no scopes of their own yet (TBD), so a create needs
		 * `agent:update` on the home project. The route checks it, and this method
		 * checks it again for callers that do not go through the route.
		 */
		if (!(await userHasScopes(user, ['agent:update'], false, { projectId }))) {
			throw new ForbiddenError(
				'You do not have permission to create a knowledge collection in this project.',
			);
		}

		// A global scope passes the scope check for any id, so make sure the project exists.
		if (!(await this.projectRepository.existsBy({ id: projectId }))) {
			throw new NotFoundError('Project not found');
		}

		// The unique index also holds this rule. The check gives a clear error first.
		if (await this.collectionRepository.existsByProjectIdAndName(projectId, name, {})) {
			throw this.nameTakenError();
		}

		for (let attempt = 1; ; attempt++) {
			const slug = await this.findFreeSlug(name);

			try {
				const collection = await this.collectionRepository.insertShared(
					{ name, description, slug, projectId, createdById: user.id },
					{},
				);

				return await this.getDtoOrThrow(collection.id);
			} catch (error) {
				if (!isUniqueConstraintError(error)) {
					throw error;
				}

				// Make sure a create that loses the race for the name gets the same error.
				if (await this.collectionRepository.existsByProjectIdAndName(projectId, name, {})) {
					throw this.nameTakenError();
				}

				// Another create took the slug after the check. Try again with a new slug.
				if (attempt >= MAX_INSERT_ATTEMPTS) {
					throw error;
				}
			}
		}
	}

	async listForUser(user: User): Promise<KnowledgeCollectionListResponse> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			throw new NotFoundError('Knowledge collections are not enabled');
		}

		const projectIds = await this.findReadableProjectIds(user);
		const summaries = await this.collectionRepository.findSharedSummaries(projectIds, {});
		const data = summaries.map(toDto);

		return { count: data.length, data };
	}

	/**
	 * Collections have no scopes of their own yet (TBD), so the list shows the
	 * collections of the projects where the user has `agent:read`. A global
	 * `agent:read` scope covers every project.
	 */
	private async findReadableProjectIds(user: User): Promise<string[] | 'all'> {
		if (hasGlobalScope(user, 'agent:read')) {
			return 'all';
		}

		const roles = await this.roleService.rolesWithScope('project', ['agent:read']);
		return await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles);
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
		slug: collection.slug,
		homeProject,
		fileCount,
		totalFileSizeBytes,
		agentCount,
		createdAt: collection.createdAt.toISOString(),
		updatedAt: collection.updatedAt.toISOString(),
	};
}
