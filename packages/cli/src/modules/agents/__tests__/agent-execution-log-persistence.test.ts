import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { AgentExecutionLogPersistence } from '../agent-execution-log-persistence';
import type {
	AgentExecutionLogBundle,
	DeletableAgentExecutionLogStore,
} from '../agent-execution-log/types';
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
		const fsStore = mock<DeletableAgentExecutionLogStore>();
		const persistence = new AgentExecutionLogPersistence(
			logger,
			{ executionLogStorageModeTag: 'fs' } as AgentsConfig,
			fsStore as unknown as FsStore,
		);

		return { fsStore, logger, persistence };
	};

	it('delegates bulk reads to each external storage location', async () => {
		const { fsStore, persistence } = createPersistence();
		const s3Store = mock<DeletableAgentExecutionLogStore>();
		fsStore.readMany.mockResolvedValue(new Map([['fs-execution', bundle('fs')]]));
		s3Store.readMany.mockResolvedValue(new Map([['s3-execution', bundle('s3')]]));
		persistence.setS3Store(s3Store);

		const result = await persistence.readMany([
			{
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionId: 'fs-execution',
				storedAt: 'fs',
			},
			{
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionId: 's3-execution',
				storedAt: 's3',
			},
		]);

		expect(result).toEqual(
			new Map([
				['fs-execution', bundle('fs')],
				['s3-execution', bundle('s3')],
			]),
		);
		expect(fsStore.readMany).toHaveBeenCalledWith([
			{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'fs-execution' },
		]);
		expect(s3Store.readMany).toHaveBeenCalledWith([
			{ agentId: 'agent-1', threadId: 'thread-1', executionId: 's3-execution' },
		]);
	});

	it('skips deleting S3 logs when the S3 store is not initialized', async () => {
		const logger = mockLogger();
		const { persistence } = createPersistence(logger);

		await expect(
			persistence.deleteExternal([
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
