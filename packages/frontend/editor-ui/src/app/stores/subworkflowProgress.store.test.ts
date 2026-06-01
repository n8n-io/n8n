import { createPinia, setActivePinia } from 'pinia';
import { useSubworkflowProgressStore } from './subworkflowProgress.store';

describe('subworkflowProgress.store', () => {
	let store: ReturnType<typeof useSubworkflowProgressStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useSubworkflowProgressStore();
	});

	it('records a started sub-execution at index 0', () => {
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'Sub',
			executionId: 'c1',
			totalNodes: 5,
		});

		expect(store.getFor('p1', 'Sub')).toEqual({
			executionId: 'c1',
			currentNodeIndex: 0,
			totalNodes: 5,
			phase: 'running',
		});
	});

	it('updates progress with phase and node identity', () => {
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'Sub',
			executionId: 'c1',
			totalNodes: 5,
		});

		store.updateProgress({
			parentExecutionId: 'p1',
			parentNodeName: 'Sub',
			executionId: 'c1',
			currentNodeName: 'Wait',
			currentNodeIndex: 2,
			totalNodes: 5,
			phase: 'running',
		});

		expect(store.getFor('p1', 'Sub')).toMatchObject({
			currentNodeName: 'Wait',
			currentNodeIndex: 2,
			phase: 'running',
		});
	});

	it('ignores progress updates from a stale child execution', () => {
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'Sub',
			executionId: 'c2',
			totalNodes: 5,
		});

		store.updateProgress({
			parentExecutionId: 'p1',
			parentNodeName: 'Sub',
			executionId: 'c1', // older
			currentNodeName: 'Old',
			currentNodeIndex: 9,
			totalNodes: 5,
			phase: 'running',
		});

		expect(store.getFor('p1', 'Sub')).toMatchObject({
			executionId: 'c2',
			currentNodeIndex: 0,
		});
	});

	it('clears progress for a specific parent node', () => {
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'A',
			executionId: 'cA',
			totalNodes: 1,
		});
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'B',
			executionId: 'cB',
			totalNodes: 1,
		});

		store.clear({ parentExecutionId: 'p1', parentNodeName: 'A' });

		expect(store.getFor('p1', 'A')).toBeUndefined();
		expect(store.getFor('p1', 'B')).toBeDefined();
	});

	it('resets all entries for a parent execution', () => {
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'A',
			executionId: 'cA',
			totalNodes: 1,
		});
		store.setStarted({
			parentExecutionId: 'p2',
			parentNodeName: 'A',
			executionId: 'cA',
			totalNodes: 1,
		});

		store.resetForExecution('p1');

		expect(store.getFor('p1', 'A')).toBeUndefined();
		expect(store.getFor('p2', 'A')).toBeDefined();
	});

	it('keys are independent per parent node so parallel sub-workflows do not collide', () => {
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'A',
			executionId: 'cA',
			totalNodes: 2,
		});
		store.setStarted({
			parentExecutionId: 'p1',
			parentNodeName: 'B',
			executionId: 'cB',
			totalNodes: 8,
		});

		store.updateProgress({
			parentExecutionId: 'p1',
			parentNodeName: 'B',
			executionId: 'cB',
			currentNodeName: 'X',
			currentNodeIndex: 4,
			totalNodes: 8,
			phase: 'running',
		});

		expect(store.getFor('p1', 'A')).toMatchObject({ executionId: 'cA', currentNodeIndex: 0 });
		expect(store.getFor('p1', 'B')).toMatchObject({ executionId: 'cB', currentNodeIndex: 4 });
	});
});
