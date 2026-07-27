import { Logger } from '@n8n/backend-common';
import { binaryToBuffer } from '@n8n/backend-network';
import {
	FsByteStore,
	type ByteStore,
	type PreWriteBlobMetadata,
	type StorageLocation,
} from '@n8n/blob-storage';
import { BinaryDataRepository, type ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import type { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

/** Where a knowledge file's bytes live, as recorded on its `agent_files` row. */
export type StoredAgentKnowledgeFile = {
	storedAt: ExecutionDataStorageLocation;
	storageKey: string;
};

@Service()
export class AgentKnowledgeFileFsByteStore extends FsByteStore {
	constructor(storageConfig: StorageConfig, errorReporter: ErrorReporter) {
		super({
			storagePath: storageConfig.storagePath,
			reportError: (error) => errorReporter.error(error),
		});
	}
}

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
	private readonly byteStores = new Map<StorageLocation, ByteStore>();

	constructor(
		fsByteStore: AgentKnowledgeFileFsByteStore,
		private readonly storageConfig: StorageConfig,
		private readonly binaryDataRepository: BinaryDataRepository,
		private readonly logger: Logger,
	) {
		this.byteStores.set('fs', fsByteStore);
	}

	registerByteStore(loc: StorageLocation, store: ByteStore) {
		this.byteStores.set(loc, store);
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
		await this.getByteStore(storedAt).write(storageKey, body, metadata);
		return { storedAt, storageKey };
	}

	async readAsBuffer(file: StoredAgentKnowledgeFile): Promise<Buffer | null> {
		if (file.storedAt === 'db') {
			return await this.binaryDataRepository.findContentByFileId(file.storageKey);
		}

		return await this.getByteStore(file.storedAt).read(file.storageKey);
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
				const keys = group.map((file) => file.storageKey);

				if (loc === 'db') {
					await this.binaryDataRepository.deleteAgentFilesByFileIds(keys);
					return;
				}

				const store = this.byteStores.get(loc);
				if (!store) {
					this.logger.warn('Skipped deleting agent knowledge files for unconfigured storage', {
						storedAt: loc,
						count: group.length,
					});
					return;
				}
				await store.delete(keys);
			}),
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

	private getByteStore(loc: StorageLocation): ByteStore {
		const store = this.byteStores.get(loc);
		if (!store) {
			throw new UnexpectedError(`Knowledge file store for location "${loc}" is not configured.`);
		}
		return store;
	}
}
