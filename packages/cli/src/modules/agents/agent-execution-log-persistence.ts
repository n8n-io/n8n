import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { DbStore } from './agent-execution-log/db-store';
import { FsStore } from './agent-execution-log/fs-store';
import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStore,
} from './agent-execution-log/types';

type StoredAgentExecutionLogRef = AgentExecutionLogRef & {
	storedAt: ExecutionDataStorageLocation;
};

@Service()
export class AgentExecutionLogPersistence {
	private s3Store: AgentExecutionLogStore | undefined;

	private azStore: AgentExecutionLogStore | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly config: AgentsConfig,
		private readonly fsStore: FsStore,
		private readonly dbStore: DbStore,
	) {}

	get currentLocation(): ExecutionDataStorageLocation {
		return this.config.executionLogStorageModeTag;
	}

	setS3Store(store: AgentExecutionLogStore) {
		this.s3Store = store;
	}

	setAzStore(store: AgentExecutionLogStore) {
		this.azStore = store;
	}

	async write(
		ref: AgentExecutionLogRef,
		payload: AgentExecutionLogPayload,
		location: ExecutionDataStorageLocation = this.currentLocation,
	) {
		return await this.getStoreFor(location).write(ref, payload);
	}

	async read(ref: AgentExecutionLogRef, location: ExecutionDataStorageLocation) {
		return await this.getStoreFor(location).read(ref);
	}

	async readMany(refs: StoredAgentExecutionLogRef[]) {
		const bundles = new Map<string, AgentExecutionLogBundle>();
		const refsByLocation = new Map<ExecutionDataStorageLocation, AgentExecutionLogRef[]>();

		for (const { storedAt, ...ref } of refs) {
			const group = refsByLocation.get(storedAt) ?? [];
			group.push(ref);
			refsByLocation.set(storedAt, group);
		}

		for (const [location, group] of refsByLocation) {
			const storeBundles = await this.getStoreFor(location).readMany(group);
			for (const [executionId, bundle] of storeBundles) {
				bundles.set(executionId, bundle);
			}
		}

		return bundles;
	}

	async delete(refs: StoredAgentExecutionLogRef[]) {
		const refsByLocation = new Map<ExecutionDataStorageLocation, AgentExecutionLogRef[]>();

		for (const { storedAt, ...ref } of refs) {
			const group = refsByLocation.get(storedAt) ?? [];
			group.push(ref);
			refsByLocation.set(storedAt, group);
		}

		await Promise.all(
			[...refsByLocation].map(async ([location, group]) => {
				const store = this.getStoreForDeletion(location);
				if (!store) {
					this.logger.warn('Skipped deleting agent execution logs - store is not initialized', {
						location,
						executionIds: group.map((ref) => ref.executionId),
					});
					return;
				}

				await store.delete(group);
			}),
		);
	}

	private getStoreFor(location: ExecutionDataStorageLocation): AgentExecutionLogStore {
		switch (location) {
			case 'db':
				return this.dbStore;
			case 'fs':
				return this.fsStore;
			case 's3':
				if (!this.s3Store) {
					throw new UnexpectedError(
						'Agent execution logs are stored on S3 but the S3 store is not initialized. Check that S3 is configured.',
					);
				}
				return this.s3Store;
			case 'az':
				if (!this.azStore) {
					throw new UnexpectedError(
						'Agent execution logs are stored on Azure Blob Storage but the Azure store is not initialized. Check that Azure is configured.',
					);
				}
				return this.azStore;
		}
		const _exhaustive: never = location;
		throw new UnexpectedError(
			`Unknown agent execution log storage location: ${String(_exhaustive)}`,
		);
	}

	private getStoreForDeletion(
		location: ExecutionDataStorageLocation,
	): AgentExecutionLogStore | undefined {
		switch (location) {
			case 'db':
				return this.dbStore;
			case 'fs':
				return this.fsStore;
			case 's3':
				return this.s3Store;
			case 'az':
				return this.azStore;
		}
		const _exhaustive: never = location;
		throw new UnexpectedError(
			`Unknown agent execution log storage location: ${String(_exhaustive)}`,
		);
	}
}
