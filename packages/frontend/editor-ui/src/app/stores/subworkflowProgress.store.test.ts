import { createPinia, setActivePinia } from 'pinia';
import { useSubworkflowProgressStore } from './subworkflowProgress.store';

describe('subworkflowProgress.store', () => {
	let store: ReturnType<typeof useSubworkflowProgressStore>;

	const snapshot = (parentNodeName: string, executionId: string, currentNodeIndex = 1) => ({
		parentExecutionId: 'p1',
		parentNodeName,
		executionId,
		currentNodeName: `Node ${currentNodeIndex}`,
		currentNodeIndex,
		totalNodes: 5,
	});

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useSubworkflowProgressStore();
	});

	it('records the latest snapshot for a parent node', () => {
		store.updateProgress(snapshot('Sub', 'c1', 1));
		store.updateProgress(snapshot('Sub', 'c1', 2));

		expect(store.getFor('p1', 'Sub')).toEqual({
			executionId: 'c1',
			currentNodeName: 'Node 2',
			currentNodeIndex: 2,
			totalNodes: 5,
		});
	});

	it('lets a newer child of the same node replace the previous one', () => {
		store.updateProgress(snapshot('Sub', 'c1', 4));
		store.updateProgress(snapshot('Sub', 'c2', 1));

		expect(store.getFor('p1', 'Sub')).toMatchObject({ executionId: 'c2', currentNodeIndex: 1 });
	});

	it('clears progress for one parent node only', () => {
		store.updateProgress(snapshot('A', 'cA'));
		store.updateProgress(snapshot('B', 'cB'));

		store.clear('p1', 'A');

		expect(store.getFor('p1', 'A')).toBeUndefined();
		expect(store.getFor('p1', 'B')).toBeDefined();
	});

	it('reset wipes all entries', () => {
		store.updateProgress(snapshot('A', 'cA'));
		store.updateProgress({ ...snapshot('A', 'cA'), parentExecutionId: 'p2' });

		store.reset();

		expect(store.getFor('p1', 'A')).toBeUndefined();
		expect(store.getFor('p2', 'A')).toBeUndefined();
	});
});
