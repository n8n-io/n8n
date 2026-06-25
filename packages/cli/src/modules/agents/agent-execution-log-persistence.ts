import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { AgentExecutionLogFsStore } from './agent-execution-log/fs-store';
import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStorageLocation,
} from './agent-execution-log/types';

export type AgentExecutionLogWriteResult = {
	storedAt: AgentExecutionLogStorageLocation;
	sizeBytes: number;
};

export type AgentExecutionLogTarget = AgentExecutionLogRef & {
	storedAt: AgentExecutionLogStorageLocation | null;
};

@Service()
export class AgentExecutionLogPersistence {
	constructor(private readonly fsStore: AgentExecutionLogFsStore) {}

	getWriteStorageLocation(): AgentExecutionLogStorageLocation {
		return 'fs';
	}

	async write(
		ref: AgentExecutionLogRef,
		payload: AgentExecutionLogPayload,
	): Promise<AgentExecutionLogWriteResult> {
		const sizeBytes = await this.fsStore.write(ref, payload);
		return { storedAt: 'fs', sizeBytes };
	}

	async read(
		ref: AgentExecutionLogRef,
		storedAt: AgentExecutionLogStorageLocation | null,
	): Promise<AgentExecutionLogBundle | null> {
		if (!storedAt) return null;
		return await this.storeFor(storedAt).read(ref);
	}

	async readMany(
		targets: AgentExecutionLogTarget[],
	): Promise<Map<string, AgentExecutionLogBundle>> {
		const bundles = new Map<string, AgentExecutionLogBundle>();
		const fsRefs = targets.filter((target) => target.storedAt === 'fs');
		const fsBundles = await this.fsStore.readMany(fsRefs);

		for (const [executionId, bundle] of fsBundles) {
			bundles.set(executionId, bundle);
		}

		for (const target of targets) {
			if (!target.storedAt || target.storedAt === 'fs') continue;
			const bundle = await this.storeFor(target.storedAt).read(target);
			if (bundle) bundles.set(target.executionId, bundle);
		}

		return bundles;
	}

	async delete(target: AgentExecutionLogTarget | AgentExecutionLogTarget[]): Promise<void> {
		const targets = Array.isArray(target) ? target : [target];
		const fsRefs = targets.filter((t) => t.storedAt === 'fs');
		if (fsRefs.length > 0) await this.fsStore.delete(fsRefs);
	}

	private storeFor(storedAt: AgentExecutionLogStorageLocation) {
		if (storedAt === 'fs') return this.fsStore;
		throw new UnexpectedError(`Agent execution logs stored at ${storedAt} are not supported`);
	}
}
