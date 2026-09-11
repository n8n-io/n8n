import { createPinia, setActivePinia } from 'pinia';

import * as appsApi from '@/features/apps/apps.api';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';

vi.mock('@/features/apps/apps.api', () => ({
	fetchAppsApi: vi.fn(),
	getAppApi: vi.fn(),
	createAppApi: vi.fn(),
	updateAppApi: vi.fn(),
	deleteAppApi: vi.fn(),
	fetchPagesApi: vi.fn(),
	createPageApi: vi.fn(),
	updatePageApi: vi.fn(),
	deletePageApi: vi.fn(),
	publishAppApi: vi.fn(),
	fetchVersionsApi: vi.fn(),
	activateVersionApi: vi.fn(),
	fetchPreviewApi: vi.fn(),
	fetchLayoutPreviewApi: vi.fn(),
	fetchServedCssApi: vi.fn(),
}));

const app: App = {
	id: 'app1',
	name: 'My app',
	namespace: 'my-app',
	theme: null,
	components: null,
	auth: 'public',
	projectId: 'p1',
	activeVersionId: null,
	publishedAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('apps.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('getApp() keeps the opened app, and updateApp() replaces it', async () => {
		vi.mocked(appsApi.getAppApi).mockResolvedValue(app);
		vi.mocked(appsApi.updateAppApi).mockResolvedValue({ ...app, components: 'export {};' });
		const store = useAppsStore();

		await store.getApp('p1', 'app1');
		expect(store.app).toEqual(app);

		await store.updateApp('p1', 'app1', { components: 'export {};' });
		expect(store.app?.components).toBe('export {};');

		await store.updateApp('p1', 'other', { name: 'x' });
		expect(store.app?.id).toBe('app1');
	});

	it('createApp() sends the layout preset and adds the app to the list', async () => {
		vi.mocked(appsApi.createAppApi).mockResolvedValue(app);
		const store = useAppsStore();

		const created = await store.createApp('p1', 'My app', 'my-app', 'sidebar');

		expect(appsApi.createAppApi).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'My app',
			'my-app',
			'sidebar',
		);
		expect(created).toEqual(app);
		expect(store.apps).toEqual([app]);
	});

	it('fetchServedCss() fetches the stylesheet once and keeps it', async () => {
		vi.mocked(appsApi.fetchServedCssApi).mockResolvedValue('.app-canvas{}');
		const store = useAppsStore();

		await store.fetchServedCss();
		const css = await store.fetchServedCss();

		expect(appsApi.fetchServedCssApi).toHaveBeenCalledTimes(1);
		expect(css).toBe('.app-canvas{}');
		expect(store.servedCss).toBe('.app-canvas{}');
	});

	it('publish() calls the publish endpoint', async () => {
		vi.mocked(appsApi.publishAppApi).mockResolvedValue({ versionId: 'v1', url: '/apps/my-app' });
		const store = useAppsStore();

		const result = await store.publish('p1', 'app1');

		expect(appsApi.publishAppApi).toHaveBeenCalledWith(expect.anything(), 'p1', 'app1');
		expect(result).toEqual({ versionId: 'v1', url: '/apps/my-app' });
	});

	it('fetchVersions() returns the version list', async () => {
		vi.mocked(appsApi.fetchVersionsApi).mockResolvedValue([
			{ id: 'v1', createdAt: '2024-01-02T00:00:00.000Z', createdById: 'u1', active: true },
		]);
		const store = useAppsStore();

		const versions = await store.fetchVersions('p1', 'app1');

		expect(versions).toHaveLength(1);
		expect(versions[0].active).toBe(true);
	});

	it('activateVersion() activates a version and returns the updated app', async () => {
		vi.mocked(appsApi.activateVersionApi).mockResolvedValue({ ...app, activeVersionId: 'v1' });
		const store = useAppsStore();

		const updated = await store.activateVersion('p1', 'app1', 'v1');

		expect(appsApi.activateVersionApi).toHaveBeenCalledWith(expect.anything(), 'p1', 'app1', 'v1');
		expect(updated.activeVersionId).toBe('v1');
	});

	it('fetchPreview() forwards path and params to the API and returns html with render errors', async () => {
		const preview = { html: '<html></html>', errors: { b1: 'boom' }, code: null };
		vi.mocked(appsApi.fetchPreviewApi).mockResolvedValue(preview);
		const store = useAppsStore();

		const result = await store.fetchPreview('p1', 'app1', 'page1', {
			path: 'clients/:id',
			params: { id: '42' },
		});

		expect(appsApi.fetchPreviewApi).toHaveBeenCalledWith(expect.anything(), 'p1', 'app1', 'page1', {
			path: 'clients/:id',
			params: { id: '42' },
		});
		expect(result).toEqual(preview);
	});

	it('fetchLayoutPreview() returns the effective layout of a page', async () => {
		const preview = { ownerPageId: 'page1', html: '<div data-app-root></div>', errors: {} };
		vi.mocked(appsApi.fetchLayoutPreviewApi).mockResolvedValue(preview);
		const store = useAppsStore();

		const result = await store.fetchLayoutPreview('p1', 'app1', 'page2');

		expect(appsApi.fetchLayoutPreviewApi).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'app1',
			'page2',
		);
		expect(result).toEqual(preview);
	});

	it('createPage() forwards the parent and the title and adds the page', async () => {
		const page = {
			id: 'page2',
			appId: 'app1',
			parentPageId: 'page1',
			route: 'about',
			title: 'About us',
			content: [],
			layout: null,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		};
		vi.mocked(appsApi.createPageApi).mockResolvedValue(page);
		const store = useAppsStore();

		await store.createPage('p1', 'app1', 'about', 'page1', 'About us');

		expect(appsApi.createPageApi).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'app1',
			'about',
			'page1',
			'About us',
		);
		expect(store.pages).toEqual([page]);
	});

	it('updatePage() forwards the layout and replaces the page in the store', async () => {
		const page = {
			id: 'page1',
			appId: 'app1',
			parentPageId: null,
			route: '',
			title: null,
			content: [],
			layout: null,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		};
		const layout = [{ id: 'slot', type: 'slot' as const, data: {} }];
		vi.mocked(appsApi.updatePageApi).mockResolvedValue({ ...page, layout });
		const store = useAppsStore();
		store.pages = [page];

		await store.updatePage('p1', 'app1', 'page1', { layout });

		expect(appsApi.updatePageApi).toHaveBeenCalledWith(expect.anything(), 'p1', 'app1', 'page1', {
			layout,
		});
		expect(store.pages[0].layout).toEqual(layout);
	});

	it('updateApp() saves the theme', async () => {
		const theme = { colors: { primary: '#000' } };
		vi.mocked(appsApi.updateAppApi).mockResolvedValue({ ...app, theme });
		const store = useAppsStore();

		const updated = await store.updateApp('p1', 'app1', { theme });

		expect(appsApi.updateAppApi).toHaveBeenCalledWith(expect.anything(), 'p1', 'app1', { theme });
		expect(updated.theme).toEqual(theme);
	});
});
