import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter } from 'n8n-core';
import { jsonParse, jsonStringify } from 'n8n-workflow';

import { AzureBlobStore } from '@/executions/blob-storage/azure-blob-store.ee';

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
const MAX_DELETE_CONCURRENCY = 50;

@Service()
export class AzureStore implements AgentExecutionLogStore {
	constructor(
		private readonly blobStore: AzureBlobStore,
		private readonly errorReporter: ErrorReporter,
	) {}

	async write(ref: AgentExecutionLogRef, payload: AgentExecutionLogPayload): Promise<number> {
		const body = Buffer.from(
			jsonStringify({ ...payload, version: AGENT_EXECUTION_LOG_BUNDLE_VERSION }),
			'utf-8',
		);

		try {
			return await this.blobStore.write(this.key(ref), body, { mimeType: 'application/json' });
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

		for (const batch of chunk(refs, MAX_DELETE_CONCURRENCY)) {
			await this.blobStore.delete(batch.map((r) => this.key(r)));
		}
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
