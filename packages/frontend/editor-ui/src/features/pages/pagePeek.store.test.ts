import { createPinia, setActivePinia } from 'pinia';

import { usePagePeekStore } from './pagePeek.store';

describe('pagePeek store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should hold no page at the start', () => {
		expect(usePagePeekStore().pageId).toBeUndefined();
	});

	it('should hold the last page that was opened', () => {
		const store = usePagePeekStore();

		store.open('page-1');
		store.open('page-2');

		expect(store.pageId).toBe('page-2');
	});

	it('should hold no page after a close', () => {
		const store = usePagePeekStore();
		store.open('page-1');

		store.close();

		expect(store.pageId).toBeUndefined();
	});
});
