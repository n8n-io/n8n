import type { IRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import { buildSeededRunData, recordSeededRunData } from '../instance-ai-step-run-provenance';

function executionWith(startData: Record<string, unknown>) {
	return {
		id: '1',
		data: {
			version: 1,
			startData,
			resultData: { runData: {} },
		} as unknown as IRunExecutionData,
	};
}

describe('buildSeededRunData', () => {
	it('reports mocked nodes', () => {
		expect(buildSeededRunData({ mocked: ['Trigger', 'Fetch'], replayed: [] })).toEqual({
			mocked: ['Trigger', 'Fetch'],
		});
	});

	it('reports replayed nodes with the execution they came from', () => {
		expect(
			buildSeededRunData({
				mocked: [],
				replayed: ['Trigger'],
				replayedFromExecutionId: '97',
			}),
		).toEqual({ replayed: ['Trigger'], replayedFromExecutionId: '97' });
	});

	it('omits the source execution when nothing was replayed', () => {
		expect(
			buildSeededRunData({
				mocked: ['Trigger'],
				replayed: [],
				replayedFromExecutionId: '97',
			}),
		).toEqual({ mocked: ['Trigger'] });
	});

	it('returns nothing for a chain run, which seeds nothing', () => {
		expect(buildSeededRunData({ mocked: [], replayed: [] })).toBeUndefined();
	});
});

describe('recordSeededRunData', () => {
	it('writes the disclosure into the execution start data', async () => {
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValue(
			executionWith({
				destinationNode: { nodeName: 'Send', mode: 'inclusive' },
				runNodeFilter: ['Trigger', 'Send'],
			}) as never,
		);

		await recordSeededRunData({
			executionPersistence,
			executionId: '5',
			seededRunData: { mocked: ['Trigger'] },
		});

		expect(executionPersistence.updateExistingExecution).toHaveBeenCalledTimes(1);
		const [id, update] = executionPersistence.updateExistingExecution.mock.calls[0];
		expect(id).toBe('5');
		expect(update.data?.startData).toEqual({
			// The fields the engine wrote survive.
			destinationNode: { nodeName: 'Send', mode: 'inclusive' },
			runNodeFilter: ['Trigger', 'Send'],
			seededRunData: { mocked: ['Trigger'] },
		});
	});

	it('spends no write when nothing was seeded', async () => {
		const executionPersistence = mock<ExecutionPersistence>();

		await recordSeededRunData({
			executionPersistence,
			executionId: '5',
			seededRunData: undefined,
		});

		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
	});

	it('does nothing when the execution has no data to update', async () => {
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValue(undefined as never);

		await recordSeededRunData({
			executionPersistence,
			executionId: '5',
			seededRunData: { mocked: ['Trigger'] },
		});

		expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
	});
});
