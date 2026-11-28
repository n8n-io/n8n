import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { getExecutionOrigin } from '../execution-origin';

const workflowData = {
	id: 'workflow-id',
	name: 'Workflow',
	active: true,
	activeVersionId: null,
	isArchived: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	nodes: [],
	connections: {},
};

const parentAgentRun = {
	agentId: 'agent1',
	projectId: 'project1',
	threadId: 'thread1',
	runId: 'run1',
	toolCallId: 'toolCall1',
};

const parentExecution = { executionId: 'parent1', workflowId: 'parentWorkflow1' };

const run = (
	executionData: Parameters<typeof createRunExecutionData>[0] = {},
	extra: Partial<IWorkflowExecutionDataProcess> = {},
): IWorkflowExecutionDataProcess => ({
	executionMode: 'webhook',
	workflowData,
	executionData: createRunExecutionData(executionData),
	...extra,
});

describe('getExecutionOrigin', () => {
	it('returns nothing when no agent, parent workflow or public API call started the run', () => {
		expect(getExecutionOrigin(run())).toBeUndefined();
	});

	it('sets the caller to agent when an agent started the run', () => {
		expect(getExecutionOrigin(run({ parentAgentRun }))).toEqual({ caller: 'agent' });
	});

	it('sets the caller to workflow when a parent workflow started the run', () => {
		expect(getExecutionOrigin(run({ parentExecution }))).toEqual({ caller: 'workflow' });
	});

	it('sets the caller to instance_ai when Instance AI started the run', () => {
		expect(getExecutionOrigin(run({}, { source: 'instance_ai' }))).toEqual({
			caller: 'instance_ai',
		});
	});

	it('sets the caller to instance_ai from the source saved with the execution', () => {
		const resumed = run({ manualData: { source: 'instance_ai' } });

		expect(getExecutionOrigin(resumed)).toEqual({ caller: 'instance_ai' });
	});

	it('keeps the caller that a public API endpoint set', () => {
		const publicApiRun = run({}, { telemetryMetadata: { origin: { caller: 'public_api' } } });

		expect(getExecutionOrigin(publicApiRun)).toEqual({ caller: 'public_api' });
	});

	it('keeps the public API caller when a retry still has the parent of the original run', () => {
		const retry = run(
			{ parentExecution, parentAgentRun },
			{ executionMode: 'retry', telemetryMetadata: { origin: { caller: 'public_api' } } },
		);

		expect(getExecutionOrigin(retry)).toEqual({ caller: 'public_api' });
	});

	it('returns nothing for a retry that only has the parent of the original run', () => {
		const retry = run({ parentExecution, parentAgentRun }, { executionMode: 'retry' });

		expect(getExecutionOrigin(retry)).toBeUndefined();
	});
});
