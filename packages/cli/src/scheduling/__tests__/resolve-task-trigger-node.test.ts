import type { ClaimedTask } from '@n8n/scheduler';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { resolveTaskTriggerNode } from '../resolve-task-trigger-node';

describe('resolveTaskTriggerNode', () => {
	const triggerNode = mock<INode>({ id: 'node-1', name: 'Schedule Trigger', disabled: false });

	const buildWorkflowData = (nodes: INode[]): IWorkflowBase =>
		({ id: 'wf-1', nodes }) as IWorkflowBase;

	const task = mock<ClaimedTask>({ id: 'task-1', jobId: 7 });

	const errorMessage = 'Trigger task points to a node that is missing or disabled';

	test('returns the node the task points to', () => {
		const node = resolveTaskTriggerNode(
			buildWorkflowData([triggerNode]),
			'node-1',
			task,
			errorMessage,
		);

		expect(node).toBe(triggerNode);
	});

	test.each<[string, INode[]]>([
		['missing', []],
		['disabled', [mock<INode>({ id: 'node-1', disabled: true })]],
	])('throws the caller message with the task extras when the node is %s', (_case, nodes) => {
		let caught: UnexpectedError | undefined;
		try {
			resolveTaskTriggerNode(buildWorkflowData(nodes), 'node-1', task, errorMessage);
		} catch (error) {
			caught = error as UnexpectedError;
		}

		expect(caught).toBeInstanceOf(UnexpectedError);
		expect(caught?.message).toBe(errorMessage);
		expect(caught?.extra).toEqual({
			taskId: 'task-1',
			jobId: 7,
			workflowId: 'wf-1',
			nodeId: 'node-1',
		});
	});
});
