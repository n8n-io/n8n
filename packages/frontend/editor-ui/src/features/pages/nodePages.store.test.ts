import type { PageSummary } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore, type MockedStore } from '@/__tests__/utils';

import { useNodePagesStore } from './nodePages.store';

const toSummary = (id: string, updatedAt: string): PageSummary => ({
	id,
	title: id,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt,
});

const older = toSummary('older', '2026-11-02T00:00:00.000Z');
const newer = toSummary('newer', '2026-11-05T00:00:00.000Z');

describe('useNodePagesStore', () => {
	let pageStore: MockedStore<typeof usePageStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		pageStore = mockedStore(usePageStore);
		pageStore.listNodeReferences = vi.fn().mockResolvedValue([]);
	});

	it('should load the pages of each node with one request, newest first', async () => {
		pageStore.listNodeReferences.mockResolvedValue([{ nodeId: 'n1', pages: [older, newer] }]);
		const store = useNodePagesStore();

		await store.refresh('w1');

		expect(pageStore.listNodeReferences).toHaveBeenCalledTimes(1);
		expect(pageStore.listNodeReferences).toHaveBeenCalledWith('w1');
		expect(store.pagesOf('w1', 'n1')).toEqual([newer, older]);
		expect(store.pagesOf('w1', 'n2')).toEqual([]);
	});

	it('should give no pages for a workflow that is not the loaded one', async () => {
		pageStore.listNodeReferences.mockResolvedValue([{ nodeId: 'n1', pages: [older] }]);
		const store = useNodePagesStore();

		await store.refresh('w1');

		expect(store.pagesOf('w2', 'n1')).toEqual([]);
	});

	it('should keep the last pages when a refresh fails', async () => {
		pageStore.listNodeReferences.mockResolvedValueOnce([{ nodeId: 'n1', pages: [older] }]);
		const store = useNodePagesStore();
		await store.refresh('w1');
		pageStore.listNodeReferences.mockRejectedValueOnce(new Error('offline'));

		await store.refresh('w1');

		expect(store.pagesOf('w1', 'n1')).toEqual([older]);
	});

	it('should ignore a slow answer for the previous workflow', async () => {
		let answerFirst: (references: Array<{ nodeId: string; pages: PageSummary[] }>) => void =
			() => {};
		pageStore.listNodeReferences
			.mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
			.mockResolvedValueOnce([{ nodeId: 'n1', pages: [newer] }]);
		const store = useNodePagesStore();

		const first = store.refresh('w1');
		await store.refresh('w2');
		answerFirst([{ nodeId: 'n1', pages: [older] }]);
		await first;

		expect(store.pagesOf('w2', 'n1')).toEqual([newer]);
		expect(store.pagesOf('w1', 'n1')).toEqual([]);
	});
});
