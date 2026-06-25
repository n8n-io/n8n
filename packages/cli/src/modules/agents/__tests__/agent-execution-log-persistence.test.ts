import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { AgentExecutionLogPersistence } from '../agent-execution-log-persistence';
import type { AgentExecutionLogStore } from '../agent-execution-log/types';
import type { DbStore } from '../agent-execution-log/db-store';
import type { FsStore } from '../agent-execution-log/fs-store';

describe('AgentExecutionLogPersistence', () => {
	it('fails deleting historical S3 logs when the S3 store is not initialized', async () => {
		const fsStore = mock<AgentExecutionLogStore>();
		const dbStore = mock<AgentExecutionLogStore>();
		const persistence = new AgentExecutionLogPersistence(
			{ executionLogStorageModeTag: 'fs' } as AgentsConfig,
			fsStore as unknown as FsStore,
			dbStore as unknown as DbStore,
		);

		await expect(
			persistence.delete([
				{
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 'execution-1',
					storedAt: 's3',
				},
			]),
		).rejects.toThrow('Agent execution logs are stored on S3 but the S3 store is not initialized');
	});
});
