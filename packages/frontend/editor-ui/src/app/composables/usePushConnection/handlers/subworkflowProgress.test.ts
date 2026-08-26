import { createPinia, setActivePinia } from 'pinia';
import { subworkflowExecutionStarted } from './subworkflowExecutionStarted';
import { subworkflowNodeProgress } from './subworkflowNodeProgress';
import { subworkflowExecutionFinished } from './subworkflowExecutionFinished';
import { useSubworkflowProgressStore } from '@/app/stores/subworkflowProgress.store';

describe('subworkflow progress push handlers', () => {
	let store: ReturnType<typeof useSubworkflowProgressStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useSubworkflowProgressStore();
	});

	it('subworkflowExecutionStarted seeds the store', async () => {
		await subworkflowExecutionStarted({
			type: 'subworkflowExecutionStarted',
			data: {
				parentExecutionId: 'p1',
				parentNodeName: 'Sub',
				executionId: 'c1',
				totalNodes: 7,
			},
		});

		expect(store.getFor('p1', 'Sub')).toMatchObject({
			executionId: 'c1',
			totalNodes: 7,
			phase: 'running',
		});
	});

	it('subworkflowNodeProgress updates phase and current node', async () => {
		await subworkflowExecutionStarted({
			type: 'subworkflowExecutionStarted',
			data: {
				parentExecutionId: 'p1',
				parentNodeName: 'Sub',
				executionId: 'c1',
				totalNodes: 7,
			},
		});

		await subworkflowNodeProgress({
			type: 'subworkflowNodeProgress',
			data: {
				parentExecutionId: 'p1',
				parentNodeName: 'Sub',
				executionId: 'c1',
				currentNodeName: 'Wait',
				currentNodeIndex: 3,
				totalNodes: 7,
				phase: 'running',
			},
		});

		expect(store.getFor('p1', 'Sub')).toMatchObject({
			currentNodeName: 'Wait',
			currentNodeIndex: 3,
		});
	});

	it('subworkflowExecutionFinished clears the entry', async () => {
		await subworkflowExecutionStarted({
			type: 'subworkflowExecutionStarted',
			data: {
				parentExecutionId: 'p1',
				parentNodeName: 'Sub',
				executionId: 'c1',
				totalNodes: 7,
			},
		});

		await subworkflowExecutionFinished({
			type: 'subworkflowExecutionFinished',
			data: {
				parentExecutionId: 'p1',
				parentNodeName: 'Sub',
				executionId: 'c1',
				status: 'success',
			},
		});

		expect(store.getFor('p1', 'Sub')).toBeUndefined();
	});
});
