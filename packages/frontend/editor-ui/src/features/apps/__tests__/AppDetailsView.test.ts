import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, h } from 'vue';

import AppDetailsView from '@/features/apps/AppDetailsView.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import { APP_DETAILS, APP_PAGE_DETAILS } from '@/features/apps/apps.constants';
import type { App, Page } from '@/features/apps/apps.types';

const routerPush = vi.fn();
const routerReplace = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: routerPush, replace: routerReplace }),
	useRoute: () => ({ params: {} }),
}));

const openAppArtifactThread = vi.fn();
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ openAppArtifactThread }),
}));

vi.mock('@/features/apps/components/PageContentEditor.vue', () => ({
	default: defineComponent({
		props: { content: { type: Array, required: true }, projectId: String },
		setup: () => () => h('div', { 'data-test-id': 'page-content-editor' }),
	}),
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

const rootPage: Page = {
	id: 'page1',
	appId: 'app1',
	parentPageId: null,
	route: '',
	content: [],
	layout: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const childPage: Page = { ...rootPage, id: 'page2', parentPageId: 'page1', route: 'about' };

const renderComponent = createComponentRenderer(AppDetailsView, {
	pinia: createTestingPinia(),
});

describe('AppDetailsView', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		appsStore = mockedStore(useAppsStore);
		appsStore.getApp.mockResolvedValue(app);
		appsStore.pages = [rootPage, childPage];
		appsStore.fetchPages.mockResolvedValue(undefined);
		appsStore.fetchVersions.mockResolvedValue([]);
		appsStore.fetchPreview.mockResolvedValue({ html: '<html></html>', errors: {} });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('opens in Settings on the Build tab', async () => {
		const { getByTestId } = renderComponent({ props: { projectId: 'p1', appId: 'app1' } });

		await waitFor(() => expect(getByTestId('app-basics-form')).toBeInTheDocument());
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('shows the unpublished-changes badge for an app with no active version', async () => {
		const { getByTestId } = renderComponent({ props: { projectId: 'p1', appId: 'app1' } });

		await waitFor(() => expect(getByTestId('app-unpublished-badge')).toBeInTheDocument());
	});

	it('does not show the badge once every page and the app itself predate the last publish', async () => {
		appsStore.getApp.mockResolvedValue({
			...app,
			activeVersionId: 'v1',
			publishedAt: '2024-06-01T00:00:00.000Z',
		});

		const { queryByTestId } = renderComponent({ props: { projectId: 'p1', appId: 'app1' } });

		await waitFor(() => expect(queryByTestId('app-publish')).toBeInTheDocument());
		expect(queryByTestId('app-unpublished-badge')).not.toBeInTheDocument();
	});

	it('publishes the app and refreshes the version list', async () => {
		appsStore.publish.mockResolvedValue({ versionId: 'v1', url: '/apps/my-app' });

		const { getByTestId } = renderComponent({ props: { projectId: 'p1', appId: 'app1' } });
		await waitFor(() => expect(getByTestId('app-publish')).toBeInTheDocument());

		await userEvent.click(getByTestId('app-publish'));

		await waitFor(() => {
			expect(appsStore.publish).toHaveBeenCalledWith('p1', 'app1');
			expect(appsStore.fetchVersions).toHaveBeenCalledTimes(2);
		});
	});

	it('activates a version chosen from the publish menu', async () => {
		appsStore.fetchVersions.mockResolvedValue([
			{ id: 'v1', createdAt: '2024-01-02T00:00:00.000Z', createdById: null, active: false },
		]);
		appsStore.activateVersion.mockResolvedValue({ ...app, activeVersionId: 'v1' });

		const { getByTestId, getByText } = renderComponent({
			props: { projectId: 'p1', appId: 'app1' },
		});
		await waitFor(() => expect(getByTestId('app-publish-options')).toBeInTheDocument());

		await userEvent.click(getByTestId('app-publish-options'));
		await userEvent.click(getByText(new Date('2024-01-02T00:00:00.000Z').toLocaleString()));

		await waitFor(() => expect(appsStore.activateVersion).toHaveBeenCalledWith('p1', 'app1', 'v1'));
	});

	it('opens an Instance AI thread bound to this app', async () => {
		const { getByTestId } = renderComponent({ props: { projectId: 'p1', appId: 'app1' } });
		await waitFor(() => expect(getByTestId('app-open-in-assistant')).toBeInTheDocument());

		await userEvent.click(getByTestId('app-open-in-assistant'));

		expect(openAppArtifactThread).toHaveBeenCalledWith(
			{
				type: 'app',
				projectId: 'p1',
				appId: 'app1',
				name: 'My app',
				namespace: 'my-app',
			},
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: 'app1' } },
		);
	});

	it('switches to Preview and fetches the selected page', async () => {
		const { getByTestId } = renderComponent({ props: { projectId: 'p1', appId: 'app1' } });
		await waitFor(() => expect(getByTestId('app-basics-form')).toBeInTheDocument());

		await userEvent.click(getByTestId('app-mode-preview'));

		await waitFor(() =>
			expect(appsStore.fetchPreview).toHaveBeenCalledWith('p1', 'app1', 'page1', {
				path: '',
				params: {},
			}),
		);
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('opens a page in Edit mode from the Pages tab and moves to the page route', async () => {
		const { getByTestId, getAllByTestId, getByText } = renderComponent({
			props: { projectId: 'p1', appId: 'app1' },
		});
		await waitFor(() => expect(getByTestId('app-settings-tabs')).toBeInTheDocument());

		await userEvent.click(getByText('Pages'));
		await userEvent.click(getAllByTestId('page-tree-open')[1]);

		await waitFor(() => expect(getByTestId('page-editor')).toBeInTheDocument());
		expect(routerReplace).toHaveBeenCalledWith({
			name: APP_PAGE_DETAILS,
			params: { projectId: 'p1', appId: 'app1', pageId: 'page2' },
		});
	});

	it('starts in Edit mode for the page in the route without navigating', async () => {
		const { getByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'page2' },
		});

		await waitFor(() => expect(getByTestId('page-editor')).toBeInTheDocument());
		expect(getByTestId('page-editor-menu').textContent).toContain('about');
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('leaves the page route when switching from Edit to Settings', async () => {
		const { getByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'page2' },
		});
		await waitFor(() => expect(getByTestId('page-editor')).toBeInTheDocument());

		await userEvent.click(getByTestId('app-mode-settings'));

		await waitFor(() =>
			expect(routerReplace).toHaveBeenCalledWith({
				name: APP_DETAILS,
				params: { projectId: 'p1', appId: 'app1' },
			}),
		);
	});

	it('falls back to Settings for an unknown page in the route', async () => {
		const { getByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'gone' },
		});

		await waitFor(() => expect(getByTestId('app-basics-form')).toBeInTheDocument());
		await waitFor(() =>
			expect(routerReplace).toHaveBeenCalledWith({
				name: APP_DETAILS,
				params: { projectId: 'p1', appId: 'app1' },
			}),
		);
	});

	describe('artifact mode', () => {
		it('hides the assistant button and starts in Preview on the requested page', async () => {
			const { queryByTestId } = renderComponent({
				props: { projectId: 'p1', appId: 'app1', artifactMode: true, initialPageId: 'page2' },
			});

			await waitFor(() =>
				expect(appsStore.fetchPreview).toHaveBeenCalledWith('p1', 'app1', 'page2', {
					path: 'about',
					params: {},
				}),
			);
			expect(queryByTestId('app-open-in-assistant')).not.toBeInTheDocument();
		});

		it('falls back to the first root page when the requested page is unknown', async () => {
			renderComponent({
				props: { projectId: 'p1', appId: 'app1', artifactMode: true, initialPageId: 'gone' },
			});

			await waitFor(() =>
				expect(appsStore.fetchPreview).toHaveBeenCalledWith('p1', 'app1', 'page1', {
					path: '',
					params: {},
				}),
			);
		});

		it('edits in place without touching the router', async () => {
			const { getByTestId } = renderComponent({
				props: { projectId: 'p1', appId: 'app1', artifactMode: true },
			});
			await waitFor(() => expect(getByTestId('app-builder-preview')).toBeInTheDocument());

			await userEvent.click(getByTestId('app-mode-edit'));

			await waitFor(() => expect(getByTestId('page-editor')).toBeInTheDocument());
			expect(routerReplace).not.toHaveBeenCalled();
		});
	});
});
