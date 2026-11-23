import type {
	CreateKnowledgeCollectionDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionListResponse,
	UpdateKnowledgeCollectionDto,
} from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import { isUniqueConstraintError, ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UnexpectedError } from '@n8n/errors';
import { customAlphabet } from 'nanoid';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { KnowledgeCollection } from '../entities';
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
 * Creates, lists, changes and deletes shared knowledge collections, in the
 * shape that the collection list shows.
 */
@Service()
export class KnowledgeCollectionCatalogService {
	constructor(
		private readonly collectionRepository: KnowledgeCollectionRepository,
		private readonly availabilityService: KnowledgeAvailabilityService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	async create(
		user: User,
		projectId: string,
		{ name, description }: CreateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		const trimmedName = name.trim();
		const trimmedDescription = description.trim();

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
		if (await this.collectionRepository.existsByProjectIdAndName(projectId, trimmedName, {})) {
			throw this.nameTakenError();
		}

		for (let attempt = 1; ; attempt++) {
			const slug = await this.findFreeSlug(trimmedName);

			try {
				const collection = await this.collectionRepository.insertShared(
					{
						name: trimmedName,
						description: trimmedDescription,
						slug,
						projectId,
						createdById: user.id,
					},
					{},
				);

				return await this.getDtoOrThrow(collection.id);
			} catch (error) {
				if (!isUniqueConstraintError(error)) {
					throw error;
				}

				// Make sure a create that loses the race for the name gets the same error.
				if (await this.collectionRepository.existsByProjectIdAndName(projectId, trimmedName, {})) {
					throw this.nameTakenError();
				}

				// Another create took the slug after the check. Try again with a new slug.
				if (attempt >= MAX_INSERT_ATTEMPTS) {
					throw error;
				}
			}
		}
	}

	async update(
		user: User,
		projectId: string,
		collectionId: string,
		{ name, description }: UpdateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		const collection = await this.findEditableOrThrow(user, projectId, collectionId);

		const trimmedName = name?.trim();
		const trimmedDescription = description?.trim();

		const inputNameIsDefined = trimmedName !== undefined && trimmedName !== '';
		const inputDescriptionIsDefined = trimmedDescription !== undefined;

		// The current name of the same collection is not a conflict.
		const isNameTakenWithinProject =
			inputNameIsDefined &&
			(await this.collectionRepository.isNameTakenInProject(
				projectId,
				trimmedName,
				collection.id,
				{},
			));

		if (isNameTakenWithinProject) {
			throw this.nameTakenError();
		}

		const changes: { name?: string; description?: string } = {
			...(inputNameIsDefined ? { name: trimmedName } : {}),
			...(inputDescriptionIsDefined ? { description: trimmedDescription } : {}),
		};

		if (Object.keys(changes).length > 0) {
			try {
				await this.collectionRepository.updateNameAndDescription(collection.id, changes, {});
			} catch (error) {
				// Make sure a rename that loses the race for the name gets the same error.
				if (isUniqueConstraintError(error)) {
					throw this.nameTakenError();
				}

				throw error;
			}
		}

		return await this.getDtoOrThrow(collection.id);
	}

	/**
	 * A missing collection, or one of another project, also answers success and
	 * nothing is deleted, as the delete of a missing knowledge file does.
	 */
	async delete(user: User, projectId: string, collectionId: string): Promise<{ success: true }> {
		await this.assertCanChangeCollections(user, projectId, 'delete');

		// The stored file bytes stay: no code writes a collection file yet, and the upload
		// brings their cleanup (see the module AGENTS.md).
		await this.collectionRepository.deleteSharedInProject(collectionId, projectId, {});

		return { success: true };
	}

	/**
	 * Collections have no scopes of their own yet (TBD), so the list shows the
	 * collections of the projects where the user can list agents, as the agent
	 * list does.
	 */
	async listForUser(user: User): Promise<KnowledgeCollectionListResponse> {
		const collectionsEnabled = await this.availabilityService.isCollectionsEnabled();
		if (!collectionsEnabled) {
			throw new NotFoundError('Knowledge collections are not enabled');
		}

		// `null` means a global `agent:list` scope, which covers every project.
		const listableProjectIds = await this.projectScopeService.getProjectIds(user, ['agent:list']);
		const summaries = await this.collectionRepository.findSharedSummaries(
			listableProjectIds ?? 'all',
			{},
		);
		const data = summaries.map(toDto);

		return { count: data.length, data };
	}

	/**
	 * The lookup uses the project of the URL, so a collection of another project
	 * answers like a missing one.
	 */
	private async findEditableOrThrow(
		user: User,
		projectId: string,
		collectionId: string,
	): Promise<KnowledgeCollection> {
		await this.assertCanChangeCollections(user, projectId, 'change');

		const collection = await this.collectionRepository.findSharedInProject(
			collectionId,
			projectId,
			{},
		);
		if (!collection) {
			throw new NotFoundError('Knowledge collection not found');
		}

		return collection;
	}

	/**
	 * Collections have no scopes of their own yet (TBD), so a change or a delete
	 * needs `agent:update` on the home project.
	 */
	private async assertCanChangeCollections(
		user: User,
		projectId: string,
		action: 'change' | 'delete',
	): Promise<void> {
		const collectionsEnabled = await this.availabilityService.isCollectionsEnabled();
		if (!collectionsEnabled) {
			throw new NotFoundError('Knowledge collections are not enabled');
		}

		const canUpdateAgents = await userHasScopes(user, ['agent:update'], false, { projectId });
		if (!canUpdateAgents) {
			throw new ForbiddenError(
				`You do not have permission to ${action} a knowledge collection in this project.`,
			);
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
		slug: collection.slug,
		homeProject,
		fileCount,
		totalFileSizeBytes,
		agentCount,
		createdAt: collection.createdAt.toISOString(),
		updatedAt: collection.updatedAt.toISOString(),
	};
}
