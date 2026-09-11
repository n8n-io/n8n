import {
	ByteStoreRegistry,
	SkippedEntryDeletionError,
	type ByteStore,
	type StorageLocation,
} from '@n8n/blob-storage';
import { BinaryDataRepository, type ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter, FsByteStoreService, StorageConfig } from 'n8n-core';
import { v4 as uuid } from 'uuid';

/** Where a tarball's bytes live, as recorded on its `app_version` row. */
export type StoredAppVersionBlob = {
	storedAt: ExecutionDataStorageLocation;
	storageKey: string;
};

type AppVersionBlobKind = 'source' | 'dist';

const TARBALL_MIME_TYPE = 'application/gzip';

/** Keeps a `DELETE ... WHERE fileId IN (...)` under SQLite's bound-parameter limit. */
const DELETE_BATCH_SIZE = 500;

/**
 * Stores app version tarballs wherever the execution data storage mode points:
 * in `db` mode the bytes go into the `binary_data` table keyed by a uuid,
 * otherwise into a byte store keyed by a path. The `fs` byte store is always
 * available; `s3` and `az` are registered at module init when configured.
 *
 * A copy of `AgentKnowledgeFileStore` with its own key layout.
 */
@Service()
export class AppVersionBlobStore {
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
		ref: { appId: string; versionId: string; kind: AppVersionBlobKind },
		body: Buffer,
	): Promise<StoredAppVersionBlob> {
		const storedAt = this.storageConfig.modeTag;

		if (storedAt === 'db') {
			const storageKey = uuid();
			await this.binaryDataRepository.insert({
				fileId: storageKey,
				sourceType: 'app_version',
				sourceId: ref.versionId,
				data: body,
				mimeType: TARBALL_MIME_TYPE,
				fileName: `${ref.kind}.tgz`,
				fileSize: body.length,
			});
			return { storedAt, storageKey };
		}

		const storageKey = this.keyFor(ref);
		await this.byteStores.get(storedAt).write(storageKey, body, {
			mimeType: TARBALL_MIME_TYPE,
			fileName: `${ref.kind}.tgz`,
		});
		return { storedAt, storageKey };
	}

	async readAsBuffer(blob: StoredAppVersionBlob): Promise<Buffer | null> {
		if (blob.storedAt === 'db') {
			return await this.binaryDataRepository.findContentByFileId(blob.storageKey);
		}

		return await this.byteStores.get(blob.storedAt).read(blob.storageKey);
	}

	async delete(blobs: StoredAppVersionBlob[]): Promise<void> {
		if (blobs.length === 0) return;

		const groups = new Map<ExecutionDataStorageLocation, string[]>();
		for (const blob of blobs) {
			const keys = groups.get(blob.storedAt) ?? [];
			keys.push(blob.storageKey);
			groups.set(blob.storedAt, keys);
		}

		await Promise.all(
			[...groups].map(async ([loc, keys]) => {
				if (loc === 'db') {
					for (const batch of chunk(keys, DELETE_BATCH_SIZE)) {
						await this.binaryDataRepository.deleteByFileIds(batch);
					}
					return;
				}

				const store = this.byteStores.find(loc);
				if (!store) {
					this.errorReporter.error(new SkippedEntryDeletionError(loc, keys.length));
					return;
				}
				await store.delete(keys);
			}),
		);
	}

	private keyFor(ref: { appId: string; versionId: string; kind: AppVersionBlobKind }) {
		return [
			'apps',
			encodeURIComponent(ref.appId),
			'versions',
			encodeURIComponent(ref.versionId),
			`${ref.kind}.tgz`,
		].join('/');
	}
}
