import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import fs from 'node:fs/promises';
import path from 'node:path';

import { BlobBundleStore } from '@/executions/blob-storage/bundle-store';
import { FsBlobStore } from '@/executions/blob-storage/fs-blob-store';

import { AgentExecutionLogWriteError } from './agent-execution-log-write.error';
import { agentExecutionLogKey, AGENT_EXECUTION_LOG_BUNDLE_VERSION } from './constants';
import { CorruptedAgentExecutionLogError } from './corrupted-agent-execution-log.error';
import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStore,
} from './types';

@Service()
export class FsStore
	extends BlobBundleStore<AgentExecutionLogRef, AgentExecutionLogPayload, AgentExecutionLogBundle>
	implements AgentExecutionLogStore
{
	constructor(
		blobStore: FsBlobStore,
		private readonly storageConfig: StorageConfig,
		errorReporter: ErrorReporter,
	) {
		super({
			blobStore,
			errorReporter,
			version: AGENT_EXECUTION_LOG_BUNDLE_VERSION,
			key: agentExecutionLogKey,
			getId: ({ executionId }) => executionId,
			createWriteError: (ref, error) => new AgentExecutionLogWriteError(ref, error),
			corruptedErrorClass: CorruptedAgentExecutionLogError,
		});
	}

	async delete(ref: AgentExecutionLogRef | AgentExecutionLogRef[]) {
		const refs = Array.isArray(ref) ? ref : [ref];
		if (refs.length === 0) return;

		await Promise.all(
			refs.map(
				async (r) => await fs.rm(this.resolveExecutionDir(r), { recursive: true, force: true }),
			),
		);
	}

	private resolveExecutionDir({ agentId, threadId, executionId }: AgentExecutionLogRef) {
		return path.join(
			this.storageConfig.storagePath,
			'agents',
			encodeURIComponent(agentId),
			'threads',
			encodeURIComponent(threadId),
			'executions',
			encodeURIComponent(executionId),
		);
	}
}
