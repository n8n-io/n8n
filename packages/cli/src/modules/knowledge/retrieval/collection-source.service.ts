import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { KnowledgeCollection, KnowledgeFile } from '../entities';
import { assertKnowledgePathSegment, toKnowledgeContentFileName } from '../files/storage-naming';
import { KnowledgeAvailabilityService } from '../knowledge-availability.service';
import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import { KnowledgeCollectionFileRepository } from '../repositories/knowledge-collection-file.repository';
import { KnowledgeCollectionRepository } from '../repositories/knowledge-collection.repository';
import type { KnowledgeCollectionReference, KnowledgeFileReference } from './retrieval-schemas';

/** The collections that a scope can search, and their files as mirror references. */
export interface KnowledgeCollectionSource {
	collections: KnowledgeCollectionReference[];
	files: KnowledgeFileReference[];
}

const EMPTY_SOURCE: KnowledgeCollectionSource = { collections: [], files: [] };

/**
 * Loads the collections that a consumer scope can search, with their files.
 * Every call reads the database, so a change to a collection, or to the
 * collections of the agent, reaches the next search or read. The files of a
 * collection live in one directory of the mirror, named after its slug, so
 * that file names of different collections do not collide.
 *
 * While collections are off, the scope has no collections: an agent then
 * searches only its own files.
 */
@Service()
export class KnowledgeCollectionSourceService {
	private readonly logger: Logger;

	constructor(
		private readonly availabilityService: KnowledgeAvailabilityService,
		private readonly collectionRepository: KnowledgeCollectionRepository,
		private readonly fileRepository: KnowledgeCollectionFileRepository,
		logger: Logger,
	) {
		this.logger = logger.scoped('knowledge');
	}

	/** Whether the scope can search at least one collection, with or without files. */
	async hasCollections(scope: KnowledgeConsumerScope): Promise<boolean> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			return false;
		}

		return await this.collectionRepository.hasUsableByAgent(scope.agentId, scope.projectId, {});
	}

	/**
	 * Whether a collection that the scope can search has a file, so there is
	 * something to mirror. The sandbox lifecycle asks this; the tools ask
	 * `hasCollections`, because an empty collection still gets the tools.
	 */
	async hasCollectionFiles(scope: KnowledgeConsumerScope): Promise<boolean> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			return false;
		}

		return await this.collectionRepository.hasUsableFileByAgent(scope.agentId, scope.projectId, {});
	}

	async load(scope: KnowledgeConsumerScope): Promise<KnowledgeCollectionSource> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			return EMPTY_SOURCE;
		}

		const collections = (
			await this.collectionRepository.findUsableByAgent(scope.agentId, scope.projectId, {})
		).filter((collection) => this.hasMirrorableSlug(collection, scope));
		if (collections.length === 0) {
			return EMPTY_SOURCE;
		}

		const files = await this.fileRepository.findByCollectionIds(
			collections.map((collection) => collection.id),
			{},
		);
		const dirByCollectionId = new Map(collections.map(({ id, slug }) => [id, slug]));
		const fileCounts = new Map<string, number>();
		const references = files.flatMap((file) => {
			const dir = dirByCollectionId.get(file.knowledgeCollectionId);
			if (dir === undefined) return [];
			fileCounts.set(
				file.knowledgeCollectionId,
				(fileCounts.get(file.knowledgeCollectionId) ?? 0) + 1,
			);
			return [toFileReference(file, dir)];
		});

		return {
			collections: collections.map(({ id, slug, name, description }) => ({
				dir: slug,
				name,
				description,
				fileCount: fileCounts.get(id) ?? 0,
			})),
			files: references,
		};
	}

	/**
	 * The server derives every slug, so a slug is a valid path segment. A row
	 * changed by hand is skipped, with a warning, so that it cannot stop the
	 * retrieval of the other knowledge of the agent.
	 */
	private hasMirrorableSlug(collection: KnowledgeCollection, scope: KnowledgeConsumerScope) {
		try {
			assertKnowledgePathSegment(collection.slug, 'knowledge collection slug');
			return true;
		} catch {
			this.logger.warn('Skipped a knowledge collection whose slug is not a valid directory name', {
				collectionId: collection.id,
				projectId: scope.projectId,
				agentId: scope.agentId,
			});
			return false;
		}
	}
}

function toFileReference(file: KnowledgeFile, dir: string): KnowledgeFileReference {
	return {
		file: `${dir}/${toKnowledgeContentFileName(file.name)}`,
		fileId: file.id,
		storedAt: file.storedAt,
		storageKey: file.storageKey,
		displayName: file.name,
		mimeType: file.mimeType,
		fileSizeBytes: file.fileSizeBytes,
		createdAt: file.createdAt.toISOString(),
	};
}
