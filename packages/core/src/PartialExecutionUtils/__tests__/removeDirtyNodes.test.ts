import type { IRunData } from 'n8n-workflow';

import { createNodeData, toITaskData } from './helpers';
import { removeDirtyNodes } from '../removeDirtyNodes';

describe('removeDirtyNodes', () => {
	test('ignores run data for dirty nodes', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const node1 = createNodeData({ name: 'node1' });
		const destination = createNodeData({ name: 'destination' });
		const runData: IRunData = {
			[trigger.name]: [toITaskData([{ data: { name: 'trigger' } }])],
			[node1.name]: [toITaskData([{ data: { name: 'node1' } }])],
			[destination.name]: [toITaskData([{ data: { name: 'destination' } }])],
		};
		const dirtyNodeNames = [node1.name];

		// ACT
		const prunedRunData = removeDirtyNodes(runData, dirtyNodeNames);

		// ASSERT
		expect(prunedRunData).not.toHaveProperty(node1.name);
	});
});
