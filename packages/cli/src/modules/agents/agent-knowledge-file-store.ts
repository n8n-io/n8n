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

type AgentKnowledgeFileRef = { agentId: string; fileId: string };
type StoredAgentKnowledgeFileRef = AgentKnowledgeFileRef & { storedAt: StorageLocation };

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
		ref: AgentKnowledgeFileRef,
		body: Buffer | Readable,
		metadata: PreWriteBlobMetadata,
	): Promise<StorageLocation> {
		const loc = this.writeLocation;
		await this.getByteStore(loc).write(this.key(ref), body, metadata);
		return loc;
	}

	async readAsBuffer(ref: StoredAgentKnowledgeFileRef): Promise<Buffer | null> {
		return await this.getByteStore(ref.storedAt).read(this.key(ref));
	}

	async delete(refs: StoredAgentKnowledgeFileRef[]): Promise<void> {
		if (refs.length === 0) return;

		const groups = new Map<StorageLocation, StoredAgentKnowledgeFileRef[]>();
		for (const ref of refs) {
			const group = groups.get(ref.storedAt) ?? [];
			group.push(ref);
			groups.set(ref.storedAt, group);
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
				await store.delete(group.map((ref) => this.key(ref)));
			}),
		);
	}

	private key(ref: AgentKnowledgeFileRef) {
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
