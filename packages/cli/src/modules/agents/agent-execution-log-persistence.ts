import { Service } from '@n8n/di';

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
	storedAt: AgentExecutionLogStorageLocation;
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

	async read(ref: AgentExecutionLogRef): Promise<AgentExecutionLogBundle | null> {
		return await this.fsStore.read(ref);
	}

	async readMany(
		targets: AgentExecutionLogTarget[],
	): Promise<Map<string, AgentExecutionLogBundle>> {
		const bundles = new Map<string, AgentExecutionLogBundle>();
		const fsBundles = await this.fsStore.readMany(targets);

		for (const [executionId, bundle] of fsBundles) {
			bundles.set(executionId, bundle);
		}

		return bundles;
	}

	async delete(target: AgentExecutionLogTarget | AgentExecutionLogTarget[]): Promise<void> {
		const targets = Array.isArray(target) ? target : [target];
		if (targets.length > 0) await this.fsStore.delete(targets);
	}
}
