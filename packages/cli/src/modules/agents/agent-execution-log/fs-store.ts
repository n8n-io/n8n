import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

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
	constructor(blobStore: FsBlobStore, errorReporter: ErrorReporter) {
		super({
			blobStore,
			errorReporter,
			version: AGENT_EXECUTION_LOG_BUNDLE_VERSION,
			key: agentExecutionLogKey,
			getId: ({ executionId }) => executionId,
			createWriteError: (ref, error) => new AgentExecutionLogWriteError(ref, error),
			createCorruptedError: (ref, error) => new CorruptedAgentExecutionLogError(ref, error),
			corruptedErrorClass: CorruptedAgentExecutionLogError,
		});
	}
}
