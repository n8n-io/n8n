import { FsByteStore, JsonStore } from '@n8n/blob-storage';
import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';

import { AgentExecutionLogWriteError } from './agent-execution-log-write.error';
import { CorruptedAgentExecutionLogError } from './corrupted-agent-execution-log.error';
import type { TimelineEvent } from '../execution-recorder';

export type AgentExecutionLogRef = { agentId: string; threadId: string; executionId: string };
export type AgentExecutionLogPayload = { timeline: TimelineEvent[] };

const AGENT_EXECUTION_LOG_VERSION = 1;

@Service()
export class AgentExecutionLogFsByteStore extends FsByteStore {
	constructor(storageConfig: StorageConfig, errorReporter: ErrorReporter) {
		super({
			storagePath: storageConfig.storagePath,
			reportError: (error) => errorReporter.error(error),
		});
	}
}

/**
 * Stores agent execution timelines as JSON blobs. The `fs` backend is always
 * available, but `s3` and `az` are registered at module init only if configured.
 */
@Service()
export class AgentExecutionLogStore extends JsonStore<
	AgentExecutionLogRef,
	AgentExecutionLogPayload
> {
	constructor(fsByteStore: AgentExecutionLogFsByteStore, errorReporter: ErrorReporter) {
		super({
			byteStores: { fs: fsByteStore },
			version: AGENT_EXECUTION_LOG_VERSION,
			// Encode each dynamic segment so a value containing path separators or
			// other reserved characters stays a single, well-formed path segment.
			key: ({ agentId, threadId, executionId }) =>
				[
					'agents',
					encodeURIComponent(agentId),
					'threads',
					encodeURIComponent(threadId),
					'executions',
					encodeURIComponent(executionId),
					'log.json',
				].join('/'),
			getId: (ref) => ref.executionId,
			createWriteError: (ref, cause) => new AgentExecutionLogWriteError(ref, cause),
			createCorruptedError: (ref, cause) => new CorruptedAgentExecutionLogError(ref, cause),
			reportError: (error) => errorReporter.error(error),
		});
	}
}
