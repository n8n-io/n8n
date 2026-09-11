import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

import AppBuilderView from './AppBuilderView.vue';
import { APP_DETAILS } from './apps.constants';
import { useAppsStore } from './apps.store';
import type { App } from './apps.types';

const routerPush = vi.hoisted(() => vi.fn());
const routerReplace = vi.hoisted(() => vi.fn());
const routeState = vi.hoisted(() => ({ query: {} as Record<string, string> }));
const createAppArtifactThread = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => routeState,
	useRouter: () => ({ push: routerPush, replace: routerReplace }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ createAppArtifactThread }),
}));

const app: App = {
	id: 'app-1',
	name: 'Greeter',
	namespace: 'greeter',
	theme: null,
	projectId: 'proj-1',
	activeVersionId: null,
	hasUnpublishedChanges: false,
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-04-01T00:00:00.000Z',
};

const appThread = (id: string, updatedAt: string) => ({
	id,
	title: id,
	resourceId: 'user-1',
	createdAt: updatedAt,
	updatedAt,
	appId: 'app-1',
});

const renderView = createComponentRenderer(AppBuilderView, {
	props: { projectId: 'proj-1', appId: 'app-1' },
	global: {
		stubs: {
			InstanceAiSidebar: {
				props: ['appScope'],
				template: '<div data-test-id="thread-list-stub" :data-app-id="appScope?.appId" />',
			},
			InstanceAiThreadView: {
				props: ['threadId'],
				template: '<div data-test-id="thread-view-stub" :data-thread-id="threadId" />',
			},
		},
	},
});

describe('AppBuilderView', () => {
	let appsStore: MockedStore<typeof useAppsStore>;
	let instanceAiStore: MockedStore<typeof useInstanceAiStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		appsStore.getApp.mockResolvedValue(app);
		appsStore.fetchThreads.mockResolvedValue([]);
		instanceAiStore = mockedStore(useInstanceAiStore);
		instanceAiStore.loadThreads.mockResolvedValue(true);
		instanceAiStore.fetchCredits.mockResolvedValue(undefined);
		const settingsStore = mockedStore(useInstanceAiSettingsStore);
		settingsStore.refreshModuleSettings.mockResolvedValue(undefined);
		settingsStore.ensurePreferencesLoaded.mockResolvedValue(undefined);
		routerPush.mockReset();
		routerReplace.mockReset();
		createAppArtifactThread.mockReset();
		routeState.query = {};
		sessionStorage.clear();
	});

	it('resumes the newest thread the server lists for this app and puts it in the URL', async () => {
		appsStore.fetchThreads.mockResolvedValue([
			appThread('t-new', '2026-04-02T00:00:00.000Z'),
			appThread('t-old', '2026-04-01T00:00:00.000Z'),
		]);
		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('thread-view-stub')).toHaveAttribute('data-thread-id', 't-new'),
		);
		expect(appsStore.fetchThreads).toHaveBeenCalledWith('proj-1', 'app-1');
		expect(createAppArtifactThread).not.toHaveBeenCalled();
		expect(routerReplace).toHaveBeenCalledWith({
			name: APP_DETAILS,
			params: { projectId: 'proj-1', appId: 'app-1' },
			query: { thread: 't-new' },
		});
	});

	it('creates the first thread for an app with none, attaching the app', async () => {
		createAppArtifactThread.mockResolvedValue('t-created');
		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('thread-view-stub')).toHaveAttribute('data-thread-id', 't-created'),
		);
		expect(createAppArtifactThread).toHaveBeenCalledWith(
			{ type: 'app', appId: 'app-1', projectId: 'proj-1', name: 'Greeter' },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: 'app-1' } },
		);
	});

	it('opens the thread named in the URL when it belongs to this app', async () => {
		appsStore.fetchThreads.mockResolvedValue([
			appThread('t-new', '2026-04-02T00:00:00.000Z'),
			appThread('t-old', '2026-04-01T00:00:00.000Z'),
		]);
		routeState.query = { thread: 't-old' };
		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('thread-view-stub')).toHaveAttribute('data-thread-id', 't-old'),
		);
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('starts another thread on ?thread=new even when the app has one', async () => {
		appsStore.fetchThreads.mockResolvedValue([appThread('t-old', '2026-04-01T00:00:00.000Z')]);
		routeState.query = { thread: 'new' };
		createAppArtifactThread.mockResolvedValue('t-created');
		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('thread-view-stub')).toHaveAttribute('data-thread-id', 't-created'),
		);
		expect(routerReplace).toHaveBeenCalledWith(
			expect.objectContaining({ query: { thread: 't-created' } }),
		);
	});

	it('ignores a URL thread that is not bound to this app and resumes the newest one', async () => {
		appsStore.fetchThreads.mockResolvedValue([appThread('t-mine', '2026-04-01T00:00:00.000Z')]);
		routeState.query = { thread: 't-someone-elses' };
		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('thread-view-stub')).toHaveAttribute('data-thread-id', 't-mine'),
		);
		expect(createAppArtifactThread).not.toHaveBeenCalled();
	});

	it('scopes the thread list to the app', async () => {
		appsStore.fetchThreads.mockResolvedValue([appThread('t-old', '2026-04-01T00:00:00.000Z')]);
		const { getByTestId } = renderView();

		await waitFor(() =>
			expect(getByTestId('thread-list-stub')).toHaveAttribute('data-app-id', 'app-1'),
		);
	});
});
