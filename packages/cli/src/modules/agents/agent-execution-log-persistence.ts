import { AgentsConfig } from '@n8n/config';
import type { EntityManager, ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
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

const MAX_READ_CONCURRENCY = 50;

@Service()
export class AgentExecutionLogPersistence {
	private s3Store: AgentExecutionLogStore | undefined;

	private azStore: AgentExecutionLogStore | undefined;

	constructor(
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
		tx?: EntityManager,
	) {
		return await this.getStoreFor(location).write(ref, payload, tx);
	}

	async readMany(refs: StoredAgentExecutionLogRef[]) {
		const bundles = new Map<string, AgentExecutionLogBundle>();

		for (const [location, group] of this.groupByLocation(refs)) {
			const store = this.getStoreFor(location);
			for (const batch of chunk(group, MAX_READ_CONCURRENCY)) {
				const batchBundles = await Promise.all(
					batch.map(async (ref) => [ref.executionId, await store.read(ref)] as const),
				);

				for (const [executionId, bundle] of batchBundles) {
					if (bundle) bundles.set(executionId, bundle);
				}
			}
		}

		return bundles;
	}

	async delete(refs: StoredAgentExecutionLogRef[]) {
		await Promise.all(
			[...this.groupByLocation(refs)].map(async ([location, group]) => {
				await this.getStoreFor(location).delete(group);
			}),
		);
	}

	private groupByLocation(refs: StoredAgentExecutionLogRef[]) {
		const refsByLocation = new Map<ExecutionDataStorageLocation, AgentExecutionLogRef[]>();

		for (const { storedAt, ...ref } of refs) {
			const group = refsByLocation.get(storedAt) ?? [];
			group.push(ref);
			refsByLocation.set(storedAt, group);
		}

		return refsByLocation;
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
}
