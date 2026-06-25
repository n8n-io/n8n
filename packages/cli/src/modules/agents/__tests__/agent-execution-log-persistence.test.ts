import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { AgentExecutionLogPersistence } from '../agent-execution-log-persistence';
import type { AgentExecutionLogStore } from '../agent-execution-log/types';
import type { DbStore } from '../agent-execution-log/db-store';
import type { FsStore } from '../agent-execution-log/fs-store';

describe('AgentExecutionLogPersistence', () => {
	it('skips deleting historical S3 logs when the S3 store is not initialized', async () => {
		const logger = mockLogger();
		const fsStore = mock<AgentExecutionLogStore>();
		const dbStore = mock<AgentExecutionLogStore>();
		const persistence = new AgentExecutionLogPersistence(
			logger,
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
		).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped deleting agent execution logs - store is not initialized',
			{ location: 's3', executionIds: ['execution-1'] },
		);
	});
});
