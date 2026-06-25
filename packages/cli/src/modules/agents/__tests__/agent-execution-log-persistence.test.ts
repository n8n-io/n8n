import { mock } from 'jest-mock-extended';

import { AgentExecutionLogPersistence } from '../agent-execution-log-persistence';
import type { AgentExecutionLogFsStore } from '../agent-execution-log/fs-store';
import type { AgentExecutionLogPayload, AgentExecutionLogRef } from '../agent-execution-log/types';

describe('AgentExecutionLogPersistence', () => {
	let fsStore: jest.Mocked<AgentExecutionLogFsStore>;
	let persistence: AgentExecutionLogPersistence;

	const ref: AgentExecutionLogRef = {
		agentId: 'agent-1',
		threadId: 'thread-1',
		executionId: 'execution-1',
	};
	const payload: AgentExecutionLogPayload = {
		userMessage: 'Hello',
		assistantResponse: 'Hi',
		toolCalls: null,
		timeline: null,
		error: null,
	};

	beforeEach(() => {
		fsStore = mock<AgentExecutionLogFsStore>();
		fsStore.readMany.mockResolvedValue(new Map());
		persistence = new AgentExecutionLogPersistence(fsStore);
	});

	it('exposes the filesystem write location before writing', () => {
		expect(persistence.getWriteStorageLocation()).toBe('fs');
	});

	it('writes new agent execution logs to filesystem storage', async () => {
		fsStore.write.mockResolvedValue(42);

		await expect(persistence.write(ref, payload)).resolves.toEqual({
			storedAt: 'fs',
			sizeBytes: 42,
		});
		expect(fsStore.write).toHaveBeenCalledWith(ref, payload);
	});

	it('reads many filesystem-backed logs by execution id', async () => {
		const bundle = { ...payload, version: 1 as const };
		fsStore.readMany.mockResolvedValue(new Map([['execution-1', bundle]]));

		const result = await persistence.readMany([{ ...ref, storedAt: 'fs' }]);

		expect(result).toEqual(new Map([['execution-1', bundle]]));
		expect(fsStore.readMany).toHaveBeenCalledWith([{ ...ref, storedAt: 'fs' }]);
	});

	it('does not read or delete legacy inline rows without storage pointers', async () => {
		await expect(persistence.readMany([{ ...ref, storedAt: null }])).resolves.toEqual(new Map());

		await persistence.delete([{ ...ref, storedAt: null }]);

		expect(fsStore.readMany).toHaveBeenCalledWith([]);
		expect(fsStore.delete).not.toHaveBeenCalled();
	});

	it('deletes filesystem-backed logs', async () => {
		await persistence.delete([{ ...ref, storedAt: 'fs' }]);

		expect(fsStore.delete).toHaveBeenCalledWith([{ ...ref, storedAt: 'fs' }]);
	});
});
