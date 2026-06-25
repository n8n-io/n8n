import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter } from 'n8n-core';
import { jsonParse, jsonStringify } from 'n8n-workflow';

import { FsBlobStore } from '@/executions/blob-storage/fs-blob-store';

import { AgentExecutionLogWriteError } from './agent-execution-log-write.error';
import {
	AGENT_EXECUTION_LOG_BUNDLE_FILENAME,
	AGENT_EXECUTION_LOG_BUNDLE_VERSION,
} from './constants';
import { CorruptedAgentExecutionLogError } from './corrupted-agent-execution-log.error';
import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStore,
} from './types';

const MAX_READ_CONCURRENCY = 50;

@Service()
export class FsStore implements AgentExecutionLogStore {
	constructor(
		private readonly blobStore: FsBlobStore,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		await this.blobStore.init?.();
	}

	async write(ref: AgentExecutionLogRef, payload: AgentExecutionLogPayload): Promise<number> {
		try {
			const serialized = jsonStringify({
				...payload,
				version: AGENT_EXECUTION_LOG_BUNDLE_VERSION,
			});
			return await this.blobStore.write(this.key(ref), Buffer.from(serialized, 'utf-8'));
		} catch (error) {
			throw new AgentExecutionLogWriteError(ref, error);
		}
	}

	async read(ref: AgentExecutionLogRef): Promise<AgentExecutionLogBundle | null> {
		const content = await this.blobStore.read(this.key(ref));
		if (!content) return null;

		try {
			return jsonParse<AgentExecutionLogBundle>(content.toString('utf-8'));
		} catch (error) {
			throw new CorruptedAgentExecutionLogError(ref, error);
		}
	}

	async readMany(refs: AgentExecutionLogRef[]) {
		const bundles = new Map<string, AgentExecutionLogBundle>();
		if (refs.length === 0) return bundles;

		for (const batch of chunk(refs, MAX_READ_CONCURRENCY)) {
			const bundlesInBatch = await Promise.all(batch.map(async (ref) => await this.tryRead(ref)));

			for (const [idx, bundle] of bundlesInBatch.entries()) {
				if (bundle) bundles.set(batch[idx].executionId, bundle);
			}
		}

		return bundles;
	}

	async delete(ref: AgentExecutionLogRef | AgentExecutionLogRef[]) {
		const refs = Array.isArray(ref) ? ref : [ref];
		await this.blobStore.delete(refs.map((r) => this.key(r)));
	}

	private key({ agentId, threadId, executionId }: AgentExecutionLogRef) {
		return [
			'agents',
			agentId,
			'threads',
			threadId,
			'executions',
			executionId,
			'execution_log',
			AGENT_EXECUTION_LOG_BUNDLE_FILENAME,
		].join('/');
	}

	private async tryRead(ref: AgentExecutionLogRef): Promise<AgentExecutionLogBundle | null> {
		try {
			return await this.read(ref);
		} catch (error) {
			if (error instanceof CorruptedAgentExecutionLogError) {
				this.errorReporter.error(error);
				return null;
			}
			throw error;
		}
	}
}
