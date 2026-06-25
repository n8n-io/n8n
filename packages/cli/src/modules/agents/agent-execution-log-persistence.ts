import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { EntityManager, ExecutionDataStorageLocation } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { DbStore } from './agent-execution-log/db-store';
import { FsStore } from './agent-execution-log/fs-store';
import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStore,
	DeletableAgentExecutionLogStore,
	ExternalAgentExecutionLogRef,
	StoredAgentExecutionLogRef,
} from './agent-execution-log/types';

@Service()
export class AgentExecutionLogPersistence {
	private s3Store: DeletableAgentExecutionLogStore | undefined;

	private azStore: DeletableAgentExecutionLogStore | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly config: AgentsConfig,
		private readonly fsStore: FsStore,
		private readonly dbStore: DbStore,
	) {}

	get currentLocation(): ExecutionDataStorageLocation {
		return this.config.executionLogStorageModeTag;
	}

	setS3Store(store: DeletableAgentExecutionLogStore) {
		this.s3Store = store;
	}

	setAzStore(store: DeletableAgentExecutionLogStore) {
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
			const groupBundles = await this.getStoreFor(location).readMany(group);
			for (const [executionId, bundle] of groupBundles) {
				bundles.set(executionId, bundle);
			}
		}

		return bundles;
	}

	async delete(refs: ExternalAgentExecutionLogRef[]) {
		await Promise.all(
			[...this.groupByLocation(refs)].map(async ([location, group]) => {
				const store = this.getStoreForDelete(location, group);
				if (store) await store.delete(group);
			}),
		);
	}

	private groupByLocation<TLocation extends ExecutionDataStorageLocation>(
		refs: Array<AgentExecutionLogRef & { storedAt: TLocation }>,
	) {
		const refsByLocation = new Map<TLocation, AgentExecutionLogRef[]>();

		for (const { storedAt, ...ref } of refs) {
			const group = refsByLocation.get(storedAt) ?? [];
			group.push(ref);
			refsByLocation.set(storedAt, group);
		}

		return refsByLocation;
	}

	private getStoreForDelete(
		location: ExternalAgentExecutionLogRef['storedAt'],
		refs: AgentExecutionLogRef[],
	): DeletableAgentExecutionLogStore | undefined {
		switch (location) {
			case 'fs':
				return this.fsStore;
			case 's3':
				if (!this.s3Store) {
					this.logger.warn(
						'Skipped deleting S3 agent execution logs - S3 store is not initialized',
						{
							executionIds: refs.map((r) => r.executionId),
						},
					);
					return undefined;
				}
				return this.s3Store;
			case 'az':
				if (!this.azStore) {
					this.logger.warn(
						'Skipped deleting Azure agent execution logs - Azure store is not initialized',
						{
							executionIds: refs.map((r) => r.executionId),
						},
					);
					return undefined;
				}
				return this.azStore;
		}
		const _exhaustive: never = location;
		throw new UnexpectedError(
			`Unknown agent execution log storage location: ${String(_exhaustive)}`,
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
}
