import { createPinia, setActivePinia } from 'pinia';
import { subworkflowNodeProgress } from './subworkflowNodeProgress';
import { useSubworkflowProgressStore } from '@/app/stores/subworkflowProgress.store';

describe('subworkflowNodeProgress', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('creates the entry from the first snapshot', async () => {
		await subworkflowNodeProgress({
			type: 'subworkflowNodeProgress',
			data: {
				parentExecutionId: 'p1',
				parentNodeName: 'Sub',
				executionId: 'c1',
				currentNodeName: 'Wait',
				currentNodeIndex: 3,
				totalNodes: 7,
			},
		});

		expect(useSubworkflowProgressStore().getFor('p1', 'Sub')).toEqual({
			executionId: 'c1',
			currentNodeName: 'Wait',
			currentNodeIndex: 3,
			totalNodes: 7,
		});
	});
});
