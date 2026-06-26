import { Logger } from '@n8n/backend-common';
import { AgentsConfig, type AgentExecutionLogStorageLocation } from '@n8n/config';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { FsStore } from './agent-execution-log/fs-store';
import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
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
	) {}

	get currentLocation(): AgentExecutionLogStorageLocation {
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
		location: AgentExecutionLogStorageLocation = this.currentLocation,
	) {
		return await this.getStoreFor(location).write(ref, payload);
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

	async deleteExternal(refs: ExternalAgentExecutionLogRef[]) {
		await Promise.all(
			[...this.groupByLocation(refs)].map(async ([location, group]) => {
				const store = this.getExternalStoreForCleanup(location, group);
				if (store) await store.delete(group);
			}),
		);
	}

	private groupByLocation<TLocation extends AgentExecutionLogStorageLocation>(
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

	private getExternalStoreForCleanup(
		location: ExternalAgentExecutionLogRef['storedAt'],
		refs: AgentExecutionLogRef[],
	): DeletableAgentExecutionLogStore | undefined {
		const store = this.getExternalStore(location);
		if (store) return store;

		const storeName = this.externalStoreName(location);
		this.logger.warn(
			`Skipped deleting ${storeName} agent execution logs - ${storeName} store is not initialized`,
			{
				executionIds: refs.map((r) => r.executionId),
			},
		);
		return undefined;
	}

	private getStoreFor(location: AgentExecutionLogStorageLocation): DeletableAgentExecutionLogStore {
		const store = this.getExternalStore(location);
		if (store) return store;

		const storageName = this.externalStorageName(location);
		const storeName = this.externalStoreName(location);
		throw new UnexpectedError(
			`Agent execution logs are stored on ${storageName} but the ${storeName} store is not initialized. Check that ${storeName} is configured.`,
		);
	}

	private getExternalStore(
		location: ExternalAgentExecutionLogRef['storedAt'],
	): DeletableAgentExecutionLogStore | undefined {
		switch (location) {
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

	private externalStoreName(location: ExternalAgentExecutionLogRef['storedAt']) {
		return location === 'az' ? 'Azure' : location.toUpperCase();
	}

	private externalStorageName(location: ExternalAgentExecutionLogRef['storedAt']) {
		return location === 'az' ? 'Azure Blob Storage' : this.externalStoreName(location);
	}
}
