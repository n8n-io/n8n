import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';

import PageView from './PageView.vue';
import { useAppsStore } from './apps.store';
import { APP_DETAILS, APP_PAGE_DETAILS } from './apps.constants';
import type { App } from './apps.types';

const openAppArtifactThread = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ openAppArtifactThread }),
}));

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/projects/:projectId/apps/:appId',
			name: APP_DETAILS,
			component: { template: '<div />' },
		},
		{
			path: '/projects/:projectId/apps/:appId/pages/:pageId',
			name: APP_PAGE_DETAILS,
			component: { template: '<div />' },
		},
	],
});

const renderComponent = createComponentRenderer(PageView, {
	global: {
		plugins: [router],
		stubs: {
			PageViewLayout: {
				template: '<div data-test-id="page-view-layout"><slot name="header" /><slot /></div>',
			},
			AppBreadcrumbs: { template: '<nav data-test-id="app-breadcrumbs" />' },
		},
	},
});

function makeApp(overrides: Partial<App> = {}): App {
	return {
		id: 'app-1',
		name: 'Greeter',
		namespace: 'greeter',
		theme: null,
		projectId: 'proj-1',
		activeVersionId: null,
		hasUnpublishedChanges: false,
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
		...overrides,
	};
}

describe('PageView', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(async () => {
		createTestingPinia();
		openAppArtifactThread.mockReset();
		await router.push('/projects/proj-1/apps/app-1/pages/p1');
		await router.isReady();

		appsStore = mockedStore(useAppsStore);
		appsStore.fetchPages.mockResolvedValue(undefined);
	});

	async function renderPage(
		app: App,
		pages = [{ id: 'p1', parentPageId: null, route: 'clients' }],
	) {
		appsStore.pages = pages;
		appsStore.getApp.mockResolvedValue(app);
		const rendered = renderComponent({
			props: { projectId: 'proj-1', appId: app.id, pageId: 'p1' },
		});
		await waitAllPromises();
		return rendered;
	}

	it('opens on Build when the app has no version yet', async () => {
		const { getByTestId, queryByTestId } = await renderPage(makeApp());

		expect(getByTestId('page-content-placeholder')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-app-preview-iframe')).not.toBeInTheDocument();
	});

	it("opens on Preview and shows the active version scoped to this page's own path", async () => {
		const { getByTestId } = await renderPage(makeApp({ activeVersionId: 'v-7' }));

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/clients?v=v-7',
		);
	});

	it('switches between Build and Preview from the mode control', async () => {
		const { getByTestId, queryByTestId } = await renderPage(makeApp({ activeVersionId: 'v-7' }));

		await userEvent.click(getByTestId('radio-button-build'));
		expect(getByTestId('page-content-placeholder')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-app-preview-iframe')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('radio-button-preview'));
		expect(getByTestId('instance-ai-app-preview-iframe')).toBeInTheDocument();
	});

	it('hands off to the assistant from the empty preview state', async () => {
		const { getByTestId } = await renderPage(makeApp());

		await userEvent.click(getByTestId('radio-button-preview'));
		expect(getByTestId('page-preview-empty')).toBeInTheDocument();

		await userEvent.click(getByTestId('page-preview-empty-edit'));
		expect(openAppArtifactThread).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {
			initialDraft: 'Update the page at "/clients" in this app.',
		});
	});

	it('hands off to the assistant from the content placeholder in Build', async () => {
		const { getByTestId } = await renderPage(makeApp());

		await userEvent.click(getByTestId('page-content-edit'));
		expect(openAppArtifactThread).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {
			initialDraft: 'Update the page at "/clients" in this app.',
		});
	});
});
