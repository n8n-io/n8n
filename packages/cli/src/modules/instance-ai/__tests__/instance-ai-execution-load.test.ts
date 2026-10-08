import { Container } from '@n8n/di';
import type { IExecutionResponse } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';

import { loadInstanceAiExecution } from '../instance-ai-execution-load';

const V2_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';

describe('loadInstanceAiExecution', () => {
	const executionPersistence = mock<ExecutionPersistence>();
	const reader = mock<EngineV2ExecutionReader>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ExecutionPersistence) return executionPersistence;
			if (token === EngineV2ExecutionReader) return reader;
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reads a v1 execution from the control plane with its data', async () => {
		const execution = { id: '42' } as IExecutionResponse;
		executionPersistence.findSingleExecution.mockResolvedValue(execution);

		await expect(loadInstanceAiExecution('42')).resolves.toBe(execution);
		expect(executionPersistence.findSingleExecution).toHaveBeenCalledWith('42', {
			includeData: true,
			unflattenData: true,
		});
		expect(reader.findOneUnscoped).not.toHaveBeenCalled();
	});

	it('reads a v2 execution from the data plane', async () => {
		const execution = { id: V2_ID } as IExecutionResponse;
		reader.findOneUnscoped.mockResolvedValue(execution);

		await expect(loadInstanceAiExecution(V2_ID)).resolves.toBe(execution);
		expect(reader.findOneUnscoped).toHaveBeenCalledWith(V2_ID);
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
	});
});
