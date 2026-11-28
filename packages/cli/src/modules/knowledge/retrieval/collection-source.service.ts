import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { KnowledgeCollection, KnowledgeFile } from '../entities';
import { assertKnowledgePathSegment, tryKnowledgeContentFileName } from '../files/storage-naming';
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
 * The collections that a scope can search, with their files. Reads the
 * database on every call, so a change reaches the next search or read.
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

	/** True when the agent is linked to a collection that it can search. The collection can be empty. */
	async hasSearchableCollection(scope: KnowledgeConsumerScope): Promise<boolean> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			return false;
		}

		return await this.collectionRepository.hasSearchableByAgent(scope.agentId, scope.projectId, {});
	}

	/** True when a collection that the agent can search has a file. The sandbox needs one; the tools do not. */
	async hasSearchableCollectionFile(scope: KnowledgeConsumerScope): Promise<boolean> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			return false;
		}

		return await this.collectionRepository.hasSearchableFileByAgent(
			scope.agentId,
			scope.projectId,
			{},
		);
	}

	/**
	 * The collections that the agent can search, and their files. The path of a
	 * file is `<collection slug>/<file name>`. Skips a collection or a file whose
	 * name cannot be a path, with a warning.
	 */
	async loadSearchableCollections(
		scope: KnowledgeConsumerScope,
	): Promise<KnowledgeCollectionSource> {
		if (!(await this.availabilityService.isCollectionsEnabled())) {
			return EMPTY_SOURCE;
		}

		const collections = (
			await this.collectionRepository.findSearchableByAgent(scope.agentId, scope.projectId, {})
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
			const reference = toFileReference(file, dir);
			if (reference === undefined) {
				this.logger.warn('Skipped a knowledge collection file whose name cannot be a file name', {
					collectionId: file.knowledgeCollectionId,
					fileId: file.id,
					projectId: scope.projectId,
					agentId: scope.agentId,
				});
				return [];
			}
			fileCounts.set(
				file.knowledgeCollectionId,
				(fileCounts.get(file.knowledgeCollectionId) ?? 0) + 1,
			);
			return [reference];
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

	/** Only a slug changed by hand fails. Skip it, so that one row cannot stop the retrieval of the rest. */
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

function toFileReference(file: KnowledgeFile, dir: string): KnowledgeFileReference | undefined {
	const name = tryKnowledgeContentFileName(file.name);
	if (name === undefined) return undefined;

	return {
		file: `${dir}/${name}`,
		fileId: file.id,
		storedAt: file.storedAt,
		storageKey: file.storageKey,
		displayName: file.name,
		mimeType: file.mimeType,
		fileSizeBytes: file.fileSizeBytes,
		createdAt: file.createdAt.toISOString(),
	};
}
