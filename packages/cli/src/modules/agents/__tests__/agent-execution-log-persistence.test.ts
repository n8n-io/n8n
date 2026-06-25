import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { AgentExecutionLogPersistence } from '../agent-execution-log-persistence';
import type { AgentExecutionLogBundle, AgentExecutionLogStore } from '../agent-execution-log/types';
import type { DbStore } from '../agent-execution-log/db-store';
import type { FsStore } from '../agent-execution-log/fs-store';

const bundle = (assistantResponse: string): AgentExecutionLogBundle => ({
	assistantResponse,
	toolCalls: null,
	timeline: null,
	error: null,
	version: 1,
});

describe('AgentExecutionLogPersistence', () => {
	const createPersistence = (logger = mockLogger()) => {
		const fsStore = mock<AgentExecutionLogStore>();
		const dbStore = mock<AgentExecutionLogStore>();
		const persistence = new AgentExecutionLogPersistence(
			logger,
			{ executionLogStorageModeTag: 'fs' } as AgentsConfig,
			fsStore as unknown as FsStore,
			dbStore as unknown as DbStore,
		);

		return { dbStore, fsStore, logger, persistence };
	};

	it('delegates bulk reads to each storage location', async () => {
		const { dbStore, fsStore, persistence } = createPersistence();
		fsStore.readMany.mockResolvedValue(new Map([['fs-execution', bundle('fs')]]));
		dbStore.readMany.mockResolvedValue(new Map([['db-execution', bundle('db')]]));

		const result = await persistence.readMany([
			{
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionId: 'db-execution',
				storedAt: 'db',
			},
			{
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionId: 'fs-execution',
				storedAt: 'fs',
			},
		]);

		expect(result).toEqual(
			new Map([
				['db-execution', bundle('db')],
				['fs-execution', bundle('fs')],
			]),
		);
		expect(dbStore.readMany).toHaveBeenCalledWith([
			{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'db-execution' },
		]);
		expect(fsStore.readMany).toHaveBeenCalledWith([
			{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'fs-execution' },
		]);
	});

	it('skips deleting historical S3 logs when the S3 store is not initialized', async () => {
		const logger = mockLogger();
		const { persistence } = createPersistence(logger);

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
			'Skipped deleting S3 agent execution logs - S3 store is not initialized',
			{ executionIds: ['execution-1'] },
		);
	});
});
