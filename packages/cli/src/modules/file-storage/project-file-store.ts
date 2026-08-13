import { binaryToBuffer } from '@n8n/backend-network';
import {
	ByteStoreRegistry,
	SkippedEntryDeletionError,
	type ByteStore,
	type ByteStoreListEntry,
	type PreWriteBlobMetadata,
	type StorageLocation,
} from '@n8n/blob-storage';
import { GlobalConfig } from '@n8n/config';
import { BinaryDataRepository, type ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter, FsByteStoreService } from 'n8n-core';
import { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

/** Where a project file's bytes live, as recorded on its `project_files` row. */
export type StoredProjectFile = {
	storedAt: ExecutionDataStorageLocation;
	storageKey: string;
};

/** Key prefix all project-file byte-store keys live under. */
export const PROJECT_FILES_KEY_PREFIX = 'project-files/';

/**
 * Stores project file bytes wherever `N8N_FILE_STORAGE_MODE` points: in `db`
 * mode the bytes go into the `binary_data` table keyed by a uuid, otherwise
 * into a byte store keyed by a path. The `fs` byte store is always available;
 * `s3` and `az` are registered at module init when configured and licensed.
 *
 * Keys are id-based (never name-based — rename is a DB-only operation),
 * generated on write and persisted on the row, so rows keep resolving across
 * key-scheme or storage-mode changes. A replace writes a fresh key and swaps
 * the row's reference; the old key is reclaimed by the orphan sweeper.
 */
@Service()
export class ProjectFileStore {
	private readonly byteStores: ByteStoreRegistry;

	constructor(
		fsByteStore: FsByteStoreService,
		private readonly globalConfig: GlobalConfig,
		private readonly binaryDataRepository: BinaryDataRepository,
		private readonly errorReporter: ErrorReporter,
	) {
		this.byteStores = new ByteStoreRegistry({ fs: fsByteStore });
	}

	get mode(): ExecutionDataStorageLocation {
		return this.globalConfig.fileStorage.mode;
	}

	registerByteStore(loc: StorageLocation, store: ByteStore) {
		this.byteStores.register(loc, store);
	}

	async write(
		ref: { projectId: string; fileId: string },
		body: Buffer | Readable,
		metadata: PreWriteBlobMetadata,
	): Promise<StoredProjectFile & { bytesWritten: number }> {
		const storedAt = this.mode;

		if (storedAt === 'db') {
			const buffer = await binaryToBuffer(body);
			const storageKey = uuid();
			await this.binaryDataRepository.insert({
				fileId: storageKey,
				sourceType: 'project_file',
				sourceId: ref.fileId,
				data: buffer,
				mimeType: metadata.mimeType ?? null,
				fileName: metadata.fileName ?? null,
				fileSize: buffer.length,
			});
			return { storedAt, storageKey, bytesWritten: buffer.length };
		}

		const storageKey = this.newKeyFor(ref);
		const bytesWritten = await this.byteStores.get(storedAt).write(storageKey, body, metadata);
		return { storedAt, storageKey, bytesWritten };
	}

	/** Content bytes as a stream, or null when the key resolves to nothing (e.g. a read racing a replace). */
	async readStream(file: StoredProjectFile): Promise<Readable | null> {
		if (file.storedAt === 'db') {
			const buffer = await this.binaryDataRepository.findContentByFileId(file.storageKey);
			return buffer === null ? null : Readable.from(buffer);
		}

		return await this.byteStores.get(file.storedAt).readStream(file.storageKey);
	}

	async delete(files: StoredProjectFile[]): Promise<void> {
		if (files.length === 0) return;

		const groups = new Map<ExecutionDataStorageLocation, StoredProjectFile[]>();
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
				await store.delete(group.map((file) => file.storageKey));
			}),
		);
	}

	/**
	 * All keys the active byte-store backend holds under the project-files
	 * prefix. Only meaningful for non-db modes; the sweeper diffs these against
	 * the persisted row keys.
	 */
	async listStoredKeys(): Promise<ByteStoreListEntry[]> {
		const storedAt = this.mode;
		if (storedAt === 'db') return [];

		return await this.byteStores.get(storedAt).list(PROJECT_FILES_KEY_PREFIX);
	}

	private newKeyFor(ref: { projectId: string; fileId: string }) {
		return [
			'project-files',
			encodeURIComponent(ref.projectId),
			encodeURIComponent(ref.fileId),
		].join('/');
	}
}
