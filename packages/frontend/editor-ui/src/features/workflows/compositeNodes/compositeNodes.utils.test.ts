import type { INode, IRunData, ITaskData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { toInnerNodeStatuses } from './compositeNodes.utils';

const node = (name: string): INode => ({
	id: name,
	name,
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const task = (overrides: Partial<ITaskData>): ITaskData => ({
	startTime: 0,
	executionIndex: 0,
	executionTime: 12,
	source: [],
	...overrides,
});

describe('toInnerNodeStatuses', () => {
	const nodes = [node('Poll › request 1'), node('Poll › request 2'), node('Poll')];

	it('marks only the inner nodes that ran, with the status of their last run', () => {
		const runData: IRunData = {
			'Poll › request 1': [task({ executionStatus: 'success' })],
			Poll: [task({ executionStatus: 'waiting' }), task({ executionStatus: 'success' })],
			'Other node': [task({ executionStatus: 'success' })],
		};

		expect(toInnerNodeStatuses(nodes, runData)).toEqual({
			'Poll › request 1': { executionStatus: 'success', executionTime: 12 },
			Poll: { executionStatus: 'success', executionTime: 12 },
		});
	});

	it('keeps the error of a step that failed', () => {
		const error = new NodeOperationError(nodes[1], 'Service unavailable');
		const runData: IRunData = {
			'Poll › request 2': [task({ executionStatus: 'error', error })],
		};

		expect(toInnerNodeStatuses(nodes, runData)['Poll › request 2']).toMatchObject({
			executionStatus: 'error',
			error: { message: 'Service unavailable', name: 'NodeOperationError' },
		});
	});

	it('marks nothing without an execution', () => {
		expect(toInnerNodeStatuses(nodes, undefined)).toEqual({});
	});
});
