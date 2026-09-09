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
}));

const app: App = {
	id: 'app1',
	name: 'My app',
	namespace: 'my-app',
	theme: null,
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

	it('fetchPreview() forwards path and params to the API', async () => {
		vi.mocked(appsApi.fetchPreviewApi).mockResolvedValue('<html></html>');
		const store = useAppsStore();

		const html = await store.fetchPreview('p1', 'app1', 'page1', {
			path: 'clients/:id',
			params: { id: '42' },
		});

		expect(appsApi.fetchPreviewApi).toHaveBeenCalledWith(expect.anything(), 'p1', 'app1', 'page1', {
			path: 'clients/:id',
			params: { id: '42' },
		});
		expect(html).toBe('<html></html>');
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
