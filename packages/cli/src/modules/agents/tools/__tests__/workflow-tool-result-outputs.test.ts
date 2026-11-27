import { Container } from '@n8n/di';
import { createRunExecutionData, type IRunData, type WorkflowSettings } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import { extractResult } from '../workflow-tool-factory';

function nodeRun(value: string): IRunData[string] {
	return [
		{
			startTime: 0,
			executionIndex: 0,
			executionTime: 0,
			source: [],
			data: { main: [[{ json: { value } }]] },
		},
	];
}

function persistExecution(redactionPolicy: WorkflowSettings.RedactionPolicy) {
	const execution = {
		id: 'exec-1',
		status: 'success',
		mode: 'integrated',
		workflowData: { settings: { redactionPolicy }, nodes: [] },
		data: createRunExecutionData({
			resultData: { runData: { First: nodeRun('first'), Last: nodeRun('last') } },
		}),
	};
	Container.set(ExecutionPersistence, {
		findSingleExecution: vi.fn().mockResolvedValue(execution),
	} as unknown as ExecutionPersistence);
}

describe('extractResult with allOutputs', () => {
	afterEach(() => {
		Container.reset();
	});

	it('should return the output of every node when the workflow does not redact its data', async () => {
		persistExecution('none');

		const result = await extractResult('exec-1', true);

		expect(result.data).toEqual({ First: [{ value: 'first' }], Last: [{ value: 'last' }] });
	});

	it('should return only the last node output when the workflow redacts its data', async () => {
		persistExecution('all');

		const result = await extractResult('exec-1', true);

		expect(result.data).toEqual({ Last: [{ value: 'last' }] });
	});

	it('should follow the policy for the mode of the run', async () => {
		persistExecution('manual-only');

		const result = await extractResult('exec-1', true);

		expect(result.data).toEqual({ First: [{ value: 'first' }], Last: [{ value: 'last' }] });
	});
});
