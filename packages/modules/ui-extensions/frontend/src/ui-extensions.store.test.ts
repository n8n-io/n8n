import type { UiExtensionView } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { nextTick } from 'vue';

import { useUsersStore } from '@n8n/stores/users.store';

import * as api from './ui-extensions.api';
import { BUILTIN_PAGES, BUILTIN_VIEWS } from './ui-extensions.builtin';
import { BUILTIN_RECENT_RUNS_VIEW_ID } from './ui-extensions.constants';
import { useSidePanelStore } from './ui-extensions.store';

vi.mock('./ui-extensions.api');

const BUILTIN_IDS = BUILTIN_VIEWS.map((view) => view.id);

const view = (id: string, updatedAt = '2026-01-01T00:00:00.000Z'): UiExtensionView => ({
	id,
	kind: 'view',
	title: `View ${id}`,
	source: 'export default {}',
	updatedAt,
});

const page = (id: string, updatedAt = '2026-01-01T00:00:00.000Z'): UiExtensionView => ({
	...view(id, updatedAt),
	kind: 'page',
	title: `Page ${id}`,
});

const respond = (views: UiExtensionView[]) =>
	vi.mocked(api.fetchUiExtensionViews).mockResolvedValueOnce(views);

beforeEach(() => {
	localStorage.clear();
	vi.mocked(api.fetchUiExtensionViews).mockReset();
	vi.mocked(api.deleteUiExtensionView).mockReset().mockResolvedValue();
});

describe('useSidePanelStore', () => {
	it('lists the built-in view first, then the user views from the oldest change', async () => {
		const store = useSidePanelStore();
		respond([view('b', '2026-01-02T00:00:00.000Z'), view('a', '2026-01-01T00:00:00.000Z')]);

		await store.fetchViews();

		expect(store.views.map((v) => v.id)).toEqual([...BUILTIN_IDS, 'a', 'b']);
		expect(store.views.map((v) => v.title).slice(0, 3)).toEqual([
			'Recent runs',
			'Service data',
			'Arcade',
		]);
		expect(store.views.slice(0, 3).every((v) => v.builtin)).toBe(true);
		expect(store.views[3].builtin).toBe(false);
	});

	it('shows the built-in view before any fetch', () => {
		const store = useSidePanelStore();

		expect(store.views.map((v) => v.id)).toEqual(BUILTIN_IDS);
		expect(store.activeView.id).toBe(BUILTIN_RECENT_RUNS_VIEW_ID);
	});

	it('opens nothing on the first fetch', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);

		await store.fetchViews();

		expect(store.isOpen).toBe(false);
		expect(store.activeViewId).toBe(BUILTIN_RECENT_RUNS_VIEW_ID);
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

		expect(store.activeViewId).toBe(BUILTIN_RECENT_RUNS_VIEW_ID);
	});

	it('treats a 403 as no views', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);
		await store.fetchViews();

		vi.mocked(api.fetchUiExtensionViews).mockRejectedValueOnce(
			new ResponseError('forbidden', { httpStatusCode: 403 }),
		);
		await store.fetchViews();

		expect(store.views).toHaveLength(BUILTIN_IDS.length);
	});

	it('keeps the views on another error', async () => {
		const store = useSidePanelStore();
		respond([view('a')]);
		await store.fetchViews();

		vi.mocked(api.fetchUiExtensionViews).mockRejectedValueOnce(new Error('offline'));
		await store.fetchViews();

		expect(store.views).toHaveLength(BUILTIN_IDS.length + 1);
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

		expect(store.views.map((v) => v.id)).toEqual([...BUILTIN_IDS, 'new']);
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

		expect(store.views.map((v) => v.id)).toEqual([...BUILTIN_IDS, 'new']);
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

		expect(store.views.map((v) => v.id)).toEqual([...BUILTIN_IDS, 'b']);
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

		expect(store.views.map((v) => v.id)).toEqual([...BUILTIN_IDS, 'b']);
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

	describe('pages', () => {
		it('splits the records by kind, with the built-in pages first', async () => {
			const store = useSidePanelStore();
			respond([page('p2', '2026-01-03T00:00:00.000Z'), view('v'), page('p1')]);

			await store.fetchViews();

			expect(store.views.map((v) => v.id)).toEqual([...BUILTIN_IDS, 'v']);
			expect(store.pages.map((p) => p.id)).toEqual([...BUILTIN_PAGES.map((p) => p.id), 'p1', 'p2']);
			expect(store.pages[0]).toMatchObject({
				kind: 'page',
				builtin: true,
				title: 'Automation dashboard',
			});
			expect(store.pages[1]).toMatchObject({ kind: 'page', builtin: true, title: 'Notion docs' });
			expect(store.pages.slice(BUILTIN_PAGES.length).every((p) => !p.builtin)).toBe(true);
		});

		it('shows the built-in pages before any fetch', () => {
			expect(useSidePanelStore().pages.map((p) => p.id)).toEqual([
				'builtin:automation-dashboard',
				'builtin:notion-docs',
			]);
		});

		it('does not open the panel for a new page', async () => {
			const store = useSidePanelStore();
			respond([]);
			await store.fetchViews();

			respond([page('p1', '2026-02-01T00:00:00.000Z')]);
			await store.fetchViews();

			expect(store.isOpen).toBe(false);
			expect(store.activeViewId).toBe(BUILTIN_RECENT_RUNS_VIEW_ID);
			expect(store.pages.map((p) => p.id)).toContain('p1');
		});
	});

	describe('remove', () => {
		it('deletes the record, then loads the records again', async () => {
			const store = useSidePanelStore();
			respond([view('a'), page('p')]);
			await store.fetchViews();

			respond([view('a')]);
			await store.remove('p');

			expect(api.deleteUiExtensionView).toHaveBeenCalledWith(expect.anything(), 'p');
			expect(api.fetchUiExtensionViews).toHaveBeenCalledTimes(2);
			expect(store.pages.map((p) => p.id)).not.toContain('p');
			expect(store.isOpen).toBe(false);
		});

		it('loads the records again when another editor removed it first', async () => {
			const store = useSidePanelStore();
			respond([view('a')]);
			await store.fetchViews();
			vi.mocked(api.deleteUiExtensionView).mockRejectedValue(
				new ResponseError('Not found', { httpStatusCode: 404 }),
			);

			respond([]);
			await expect(store.remove('a')).resolves.toBeUndefined();

			expect(store.views.map((v) => v.id)).toEqual(BUILTIN_IDS);
		});

		it('keeps the record and rethrows another error', async () => {
			const store = useSidePanelStore();
			respond([view('a')]);
			await store.fetchViews();
			vi.mocked(api.deleteUiExtensionView).mockRejectedValue(new Error('offline'));

			await expect(store.remove('a')).rejects.toThrow('offline');

			expect(api.fetchUiExtensionViews).toHaveBeenCalledTimes(1);
			expect(store.views.map((v) => v.id)).toContain('a');
		});

		it('falls back to Recent runs when the active view goes', async () => {
			const store = useSidePanelStore();
			respond([view('a')]);
			await store.fetchViews();
			store.activeViewId = 'a';

			respond([]);
			await store.remove('a');

			expect(store.activeViewId).toBe(BUILTIN_RECENT_RUNS_VIEW_ID);
			expect(store.activeView.id).toBe(BUILTIN_RECENT_RUNS_VIEW_ID);
		});
	});
});
