import type { UiExtensionView } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { nextTick } from 'vue';

import { useUsersStore } from '@n8n/stores/users.store';

import * as api from './ui-extensions.api';
import { BUILTIN_PAGE_SUMMARY_VIEW_ID } from './ui-extensions.constants';
import { useSidePanelStore } from './ui-extensions.store';

vi.mock('./ui-extensions.api');

const view = (id: string, updatedAt = '2026-01-01T00:00:00.000Z'): UiExtensionView => ({
	id,
	title: `View ${id}`,
	source: 'export default {}',
	updatedAt,
});

const respond = (views: UiExtensionView[]) =>
	vi.mocked(api.fetchUiExtensionViews).mockResolvedValueOnce(views);

beforeEach(() => {
	localStorage.clear();
	vi.mocked(api.fetchUiExtensionViews).mockReset();
});

describe('useSidePanelStore', () => {
	it('lists the built-in view first, then the user views from the oldest change', async () => {
		const store = useSidePanelStore();
		respond([view('b', '2026-01-02T00:00:00.000Z'), view('a', '2026-01-01T00:00:00.000Z')]);

		await store.fetchViews();

		expect(store.views.map((v) => v.id)).toEqual([BUILTIN_PAGE_SUMMARY_VIEW_ID, 'a', 'b']);
		expect(store.views[0]).toMatchObject({ builtin: true, title: 'Page summary' });
		expect(store.views[1].builtin).toBe(false);
	});

	it('shows the built-in view before any fetch', () => {
		const store = useSidePanelStore();

		expect(store.views.map((v) => v.id)).toEqual([BUILTIN_PAGE_SUMMARY_VIEW_ID]);
		expect(store.activeView.id).toBe(BUILTIN_PAGE_SUMMARY_VIEW_ID);
	});

	it('opens nothing on the first fetch', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);

		await store.fetchViews();

		expect(store.isOpen).toBe(false);
		expect(store.activeViewId).toBe(BUILTIN_PAGE_SUMMARY_VIEW_ID);
	});

	it('opens the panel on a view that appears after the first fetch', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);
		await store.fetchViews();

		respond([view('a'), view('b', '2026-02-01T00:00:00.000Z')]);
		await store.fetchViews();

		expect(store.isOpen).toBe(true);
		expect(store.activeViewId).toBe('b');
	});

	it('opens the panel on a view that changed after the first fetch', async () => {
		const store = useSidePanelStore();
		respond([view('a'), view('b')]);
		await store.fetchViews();

		respond([view('a', '2026-03-01T00:00:00.000Z'), view('b')]);
		await store.fetchViews();

		expect(store.activeViewId).toBe('a');
	});

	it('keeps the active tab when nothing changed', async () => {
		const store = useSidePanelStore();
		respond([view('a'), view('b')]);
		await store.fetchViews();
		store.activeViewId = 'b';

		respond([view('a'), view('b')]);
		await store.fetchViews();

		expect(store.activeViewId).toBe('b');
		expect(store.isOpen).toBe(false);
	});

	it('falls back to the built-in view when the active view is gone', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);
		await store.fetchViews();
		store.activeViewId = 'a';

		respond([]);
		await store.fetchViews();

		expect(store.activeViewId).toBe(BUILTIN_PAGE_SUMMARY_VIEW_ID);
	});

	it('treats a 403 as no views', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);
		await store.fetchViews();

		vi.mocked(api.fetchUiExtensionViews).mockRejectedValueOnce(
			new ResponseError('forbidden', { httpStatusCode: 403 }),
		);
		await store.fetchViews();

		expect(store.views).toHaveLength(1);
	});

	it('keeps the views on another error', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);
		await store.fetchViews();

		vi.mocked(api.fetchUiExtensionViews).mockRejectedValueOnce(new Error('offline'));
		await store.fetchViews();

		expect(store.views).toHaveLength(2);
	});

	it('ignores a response that arrives after a newer one', async () => {
		const store = useSidePanelStore();
		const slow = createDeferredPromise<UiExtensionView[]>();
		vi.mocked(api.fetchUiExtensionViews).mockReturnValueOnce(slow.promise);
		respond([view('new')]);

		const first = store.fetchViews();
		await store.fetchViews();
		slow.resolve([view('old')]);
		await first;

		expect(store.views.map((v) => v.id)).toEqual([BUILTIN_PAGE_SUMMARY_VIEW_ID, 'new']);
	});

	it('keeps a good response that arrives after a newer request failed', async () => {
		const store = useSidePanelStore();
		respond([]);
		await store.fetchViews();
		const slow = createDeferredPromise<UiExtensionView[]>();
		vi.mocked(api.fetchUiExtensionViews).mockReturnValueOnce(slow.promise);
		vi.mocked(api.fetchUiExtensionViews).mockRejectedValueOnce(new Error('offline'));

		const first = store.fetchViews();
		await store.fetchViews();
		slow.resolve([view('new')]);
		await first;

		expect(store.views.map((v) => v.id)).toEqual([BUILTIN_PAGE_SUMMARY_VIEW_ID, 'new']);
		expect(store.activeViewId).toBe('new');
	});

	it('starts over when another user signs in, without opening their views', async () => {
		const store = useSidePanelStore();
		const usersStore = useUsersStore();
		usersStore.currentUserId = 'user-1';
		respond([view('a')]);
		await store.fetchViews();

		usersStore.currentUserId = 'user-2';
		respond([view('b')]);
		await store.fetchViews();

		expect(store.views.map((v) => v.id)).toEqual([BUILTIN_PAGE_SUMMARY_VIEW_ID, 'b']);
		expect(store.isOpen).toBe(false);
	});

	it('drops a response for a user who is no longer signed in', async () => {
		const store = useSidePanelStore();
		const usersStore = useUsersStore();
		usersStore.currentUserId = 'user-1';
		const slow = createDeferredPromise<UiExtensionView[]>();
		vi.mocked(api.fetchUiExtensionViews).mockReturnValueOnce(slow.promise);

		const first = store.fetchViews();
		usersStore.currentUserId = 'user-2';
		respond([view('b')]);
		await store.fetchViews();
		slow.resolve([view('a')]);
		await first;

		expect(store.views.map((v) => v.id)).toEqual([BUILTIN_PAGE_SUMMARY_VIEW_ID, 'b']);
	});

	it('keeps the panel state and the width in local storage, inside the limits', async () => {
		const store = useSidePanelStore();

		store.toggle();
		store.width = 10_000;
		await nextTick();

		expect(store.isOpen).toBe(true);
		expect(store.width).toBe(720);
		expect(localStorage.getItem('N8N_UI_EXTENSIONS_SIDE_PANEL_OPEN')).toBe('true');

		store.width = 1;
		expect(store.width).toBe(280);
	});
});
