import { binaryToBuffer } from '@n8n/backend-network';
import {
	ByteStoreRegistry,
	SkippedEntryDeletionError,
	type ByteStore,
	type PreWriteBlobMetadata,
	type StorageLocation,
} from '@n8n/blob-storage';
import { BinaryDataRepository, type ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter, FsByteStoreService, StorageConfig } from 'n8n-core';
import type { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

/** Where a knowledge file's bytes live, as recorded on its `agent_files` row. */
export type StoredAgentKnowledgeFile = {
	storedAt: ExecutionDataStorageLocation;
	storageKey: string;
};

/**
 * Marks a key written by the former BinaryDataService layout. On `fs` those
 * carry a companion `<key>.metadata` entry, which has to go with the content.
 */
const LEGACY_KEY_SEGMENT = '/binary_data/';

/**
 * Stores agent knowledge file bytes wherever the execution data storage mode
 * points: in `db` mode the bytes go into the `binary_data` table keyed by a
 * uuid, otherwise into a byte store keyed by a path. The `fs` byte store is
 * always available; `s3` and `az` are registered at module init when configured.
 *
 * Keys are generated on write and persisted, so files written by the former
 * BinaryDataService layout keep resolving under their original key.
 */
@Service()
export class AgentKnowledgeFileStore {
	private readonly byteStores: ByteStoreRegistry;

	constructor(
		fsByteStore: FsByteStoreService,
		private readonly storageConfig: StorageConfig,
		private readonly binaryDataRepository: BinaryDataRepository,
		private readonly errorReporter: ErrorReporter,
	) {
		this.byteStores = new ByteStoreRegistry({ fs: fsByteStore });
	}

	registerByteStore(loc: StorageLocation, store: ByteStore) {
		this.byteStores.register(loc, store);
	}

	async write(
		ref: { agentId: string; fileId: string },
		body: Buffer | Readable,
		metadata: PreWriteBlobMetadata,
	): Promise<StoredAgentKnowledgeFile> {
		const storedAt = this.storageConfig.modeTag;

		if (storedAt === 'db') {
			const buffer = await binaryToBuffer(body);
			const storageKey = uuid();
			await this.binaryDataRepository.insert({
				fileId: storageKey,
				sourceType: 'agent_file',
				sourceId: ref.fileId,
				data: buffer,
				mimeType: metadata.mimeType ?? null,
				fileName: metadata.fileName ?? null,
				fileSize: buffer.length,
			});
			return { storedAt, storageKey };
		}

		const storageKey = this.newKeyFor(ref);
		await this.byteStores.get(storedAt).write(storageKey, body, metadata);
		return { storedAt, storageKey };
	}

	async readAsBuffer(file: StoredAgentKnowledgeFile): Promise<Buffer | null> {
		if (file.storedAt === 'db') {
			return await this.binaryDataRepository.findContentByFileId(file.storageKey);
		}

		return await this.byteStores.get(file.storedAt).read(file.storageKey);
	}

	async delete(files: StoredAgentKnowledgeFile[]): Promise<void> {
		if (files.length === 0) return;

		const groups = new Map<ExecutionDataStorageLocation, StoredAgentKnowledgeFile[]>();
		for (const file of files) {
			const group = groups.get(file.storedAt) ?? [];
			group.push(file);
			groups.set(file.storedAt, group);
		}

		await Promise.all(
			[...groups].map(async ([loc, group]) => {
				if (loc === 'db') {
					await this.binaryDataRepository.deleteByFileIds(group.map((file) => file.storageKey));
					return;
				}

				const store = this.byteStores.find(loc);
				if (!store) {
					this.errorReporter.error(new SkippedEntryDeletionError(loc, group.length));
					return;
				}
				await store.delete(this.keysToDelete(loc, group));
			}),
		);
	}

	private keysToDelete(loc: StorageLocation, files: StoredAgentKnowledgeFile[]): string[] {
		// s3 and az keep metadata on the object itself, so only fs has a companion.
		if (loc !== 'fs') return files.map((file) => file.storageKey);

		return files.flatMap((file) =>
			file.storageKey.includes(LEGACY_KEY_SEGMENT)
				? [file.storageKey, `${file.storageKey}.metadata`]
				: [file.storageKey],
		);
	}

	private newKeyFor(ref: { agentId: string; fileId: string }) {
		return [
			'agents',
			encodeURIComponent(ref.agentId),
			'knowledge-files',
			encodeURIComponent(ref.fileId),
			'content',
		].join('/');
	}
}
