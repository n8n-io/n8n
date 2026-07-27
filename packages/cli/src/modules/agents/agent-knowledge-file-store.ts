import { Logger } from '@n8n/backend-common';
import {
	FsByteStore,
	type ByteStore,
	type PreWriteBlobMetadata,
	type StorageLocation,
} from '@n8n/blob-storage';
import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import type { Readable } from 'node:stream';

/** Where a knowledge file's bytes live, as recorded on its `agent_files` row. */
type StoredAgentKnowledgeFile = { storedAt: StorageLocation; storageKey: string };

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
 * Stores agent knowledge file bytes via pluggable backends. The `fs` backend is
 * always available; `s3` and `az` are registered at module init when configured.
 * When execution data storage mode is `database`, writes fall back to `fs`.
 * In multi-main deployments that fallback path must be on a shared filesystem.
 *
 * Keys are generated on write and persisted, so files written by the former
 * BinaryDataService layout keep resolving under their original key.
 */
@Service()
export class AgentKnowledgeFileStore {
	private readonly byteStores = new Map<StorageLocation, ByteStore>();
	private warnedAboutDbFallback = false;

	constructor(
		fsByteStore: AgentKnowledgeFileFsByteStore,
		private readonly storageConfig: StorageConfig,
		private readonly logger: Logger,
	) {
		this.byteStores.set('fs', fsByteStore);
	}

	registerByteStore(loc: StorageLocation, store: ByteStore) {
		this.byteStores.set(loc, store);
	}

	private get writeLocation(): StorageLocation {
		if (this.storageConfig.modeTag === 'db') {
			if (!this.warnedAboutDbFallback) {
				this.warnedAboutDbFallback = true;
				this.logger.warn(
					"Execution data storage mode is 'database'; agent knowledge files will be stored on the local filesystem. In multi-main deployments this path must be on a shared filesystem.",
				);
			}
			return 'fs';
		}
		return this.storageConfig.modeTag;
	}

	async write(
		ref: { agentId: string; fileId: string },
		body: Buffer | Readable,
		metadata: PreWriteBlobMetadata,
	): Promise<StoredAgentKnowledgeFile> {
		const storedAt = this.writeLocation;
		const storageKey = this.newKeyFor(ref);
		await this.getByteStore(storedAt).write(storageKey, body, metadata);
		return { storedAt, storageKey };
	}

	async readAsBuffer(file: StoredAgentKnowledgeFile): Promise<Buffer | null> {
		return await this.getByteStore(file.storedAt).read(file.storageKey);
	}

	async delete(files: StoredAgentKnowledgeFile[]): Promise<void> {
		if (files.length === 0) return;

		const groups = new Map<StorageLocation, StoredAgentKnowledgeFile[]>();
		for (const file of files) {
			const group = groups.get(file.storedAt) ?? [];
			group.push(file);
			groups.set(file.storedAt, group);
		}

		await Promise.all(
			[...groups].map(async ([loc, group]) => {
				const store = this.byteStores.get(loc);
				if (!store) {
					this.logger.warn('Skipped deleting agent knowledge files for unconfigured storage', {
						storedAt: loc,
						count: group.length,
					});
					return;
				}
				await store.delete(group.map((file) => file.storageKey));
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
