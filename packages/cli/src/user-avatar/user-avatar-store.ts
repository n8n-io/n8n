import {
	ByteStoreRegistry,
	SkippedEntryDeletionError,
	type ByteStore,
	type StorageLocation,
} from '@n8n/blob-storage';
import { BinaryDataRepository, type StoredUserAvatarImage } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter, FsByteStoreService, StorageConfig } from 'n8n-core';
import { createHash } from 'node:crypto';
import { v4 as uuid } from 'uuid';

import type { UserAvatarMimeType } from '@n8n/api-types';

/**
 * Stores profile picture bytes wherever the execution data storage mode
 * points, like `AgentKnowledgeFileStore`: in `db` mode the bytes go into the
 * `binary_data` table under the `user_avatar` source type, otherwise into a
 * byte store keyed by a path. The `fs` byte store is always available; `s3`
 * and `az` are registered at startup when configured.
 *
 * Pictures are small (clients resize to 512px before uploading, the server caps
 * at 1 MB) so they are read and written as whole buffers.
 */
@Service()
export class UserAvatarStore {
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
		userId: string,
		kind: 'upload' | 'sso',
		data: Buffer,
		mimeType: UserAvatarMimeType,
	): Promise<StoredUserAvatarImage> {
		const storedAt = this.storageConfig.modeTag;
		const hash = createHash('sha256').update(data).digest('hex').slice(0, 16);

		if (storedAt === 'db') {
			const storageKey = uuid();
			await this.binaryDataRepository.insert({
				fileId: storageKey,
				sourceType: 'user_avatar',
				sourceId: userId,
				data,
				mimeType,
				fileName: `${kind}-avatar`,
				fileSize: data.length,
			});
			return { storedAt, storageKey, mimeType, hash };
		}

		const storageKey = ['users', encodeURIComponent(userId), 'avatar', kind, uuid()].join('/');
		await this.byteStores.get(storedAt).write(storageKey, data, { mimeType });
		return { storedAt, storageKey, mimeType, hash };
	}

	async read(image: StoredUserAvatarImage): Promise<Buffer | null> {
		if (image.storedAt === 'db') {
			return await this.binaryDataRepository.findContentByFileId(image.storageKey);
		}

		return await this.byteStores.get(image.storedAt).read(image.storageKey);
	}

	/** Best effort: a picture whose bytes can't be removed is reported, not fatal. */
	async delete(images: StoredUserAvatarImage[]): Promise<void> {
		if (images.length === 0) return;

		const groups = new Map<StoredUserAvatarImage['storedAt'], string[]>();
		for (const image of images) {
			const keys = groups.get(image.storedAt) ?? [];
			keys.push(image.storageKey);
			groups.set(image.storedAt, keys);
		}

		await Promise.all(
			[...groups].map(async ([loc, keys]) => {
				if (loc === 'db') {
					await this.binaryDataRepository.deleteByFileIds(keys);
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
}
