import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { AzureBlobStore } from '@/executions/blob-storage/azure-blob-store.ee';
import { BlobBundleStore } from '@/executions/blob-storage/bundle-store';

import { AgentExecutionLogWriteError } from './agent-execution-log-write.error';
import { agentExecutionLogKey, AGENT_EXECUTION_LOG_BUNDLE_VERSION } from './constants';
import { CorruptedAgentExecutionLogError } from './corrupted-agent-execution-log.error';
import type {
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStore,
} from './types';

@Service()
export class AzureStore
	extends BlobBundleStore<AgentExecutionLogRef, AgentExecutionLogPayload>
	implements AgentExecutionLogStore
{
	constructor(blobStore: AzureBlobStore, errorReporter: ErrorReporter) {
		super({
			blobStore,
			errorReporter,
			version: AGENT_EXECUTION_LOG_BUNDLE_VERSION,
			key: agentExecutionLogKey,
			getId: ({ executionId }) => executionId,
			createWriteError: (ref, error) => new AgentExecutionLogWriteError(ref, error),
			createCorruptedError: (ref, error) => new CorruptedAgentExecutionLogError(ref, error),
		});
	}
}
