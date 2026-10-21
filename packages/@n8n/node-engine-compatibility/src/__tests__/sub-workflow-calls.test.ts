import type { StepExecutionContext, WorkflowGraph } from '@n8n/engine';
import type { INode } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { RepeatedSubWorkflowCallError } from '../errors';
import { SubWorkflowCalls, toSubWorkflowOutput } from '../sub-workflow-calls';

const node: INode = {
	id: 'n',
	name: 'Subject',
	type: 'n8n-nodes-base.executeWorkflow',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};
const stepContext: StepExecutionContext = {
	executionId: 'exec-1',
	stepId: 'step-1',
	workflowId: 'wf-1',
	mode: 'manual',
	iteration: 0,
	callerContext: { hostMode: 'manual' },
	responseExpectation: { kind: 'none' },
};
const graph: WorkflowGraph = { nodes: [{ id: 't', name: 'T', type: 'trigger' }], edges: [] };
const resolved = { workflowId: 'child', graph, workflow: {}, triggerOutputs: null };

describe('SubWorkflowCalls', () => {
	it('drops the detached child too when a second call fails the run', async () => {
		const calls = new SubWorkflowCalls(node, stepContext, vi.fn().mockResolvedValue(resolved));
		await calls.call({ id: 'child' }, [], { doNotWaitToFinish: true });
		expect(calls.detached).toHaveLength(1);

		await expect(calls.call({ id: 'child' }, [])).rejects.toThrow(RepeatedSubWorkflowCallError);

		expect(calls.detached).toHaveLength(0);
		expect(calls.awaited).toBeUndefined();
	});
});

describe('toSubWorkflowOutput', () => {
	it("drops the child's own paired-item marks, which point into the child", () => {
		const output = toSubWorkflowOutput(
			[
				{
					nodeId: 'x',
					iteration: 0,
					outputs: [[{ json: { a: 1 }, pairedItem: { item: 3 } }]],
				},
			],
			false,
		);

		expect(output).toEqual([[{ json: { a: 1 } }]]);
	});

	it('hands an empty result over as one empty slot', () => {
		expect(toSubWorkflowOutput([], false)).toEqual([[]]);
	});
});
