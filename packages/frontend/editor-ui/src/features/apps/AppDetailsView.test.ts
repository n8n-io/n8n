import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { MODAL_CONFIRM } from '@/app/constants';

import AppDetailsView from './AppDetailsView.vue';
import { useAppsStore } from './apps.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { APP_DETAILS, APP_PAGE_DETAILS, PROJECT_APPS } from './apps.constants';
import type { DescribedBinding } from '@n8n/api-types';
import type { App, AppVersion } from './apps.types';

const openAppArtifactThread = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
const clipboardCopy = vi.hoisted(() => vi.fn());
const instanceAiAvailable = vi.hoisted(() => ({ value: true }));
const toast = vi.hoisted(() => ({ showError: vi.fn(), showMessage: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => toast,
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: clipboardCopy }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', async () => {
	const { computed } = await import('vue');
	return {
		useInstanceAiAvailable: () => computed(() => instanceAiAvailable.value),
		useInstanceAiReady: () => computed(() => instanceAiAvailable.value),
	};
});

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ openAppArtifactThread }),
}));

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/projects/:projectId/apps', name: PROJECT_APPS, component: { template: '<div />' } },
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

const renderComponent = createComponentRenderer(AppDetailsView, {
	global: {
		plugins: [router],
		stubs: {
			PageViewLayout: { template: '<div data-test-id="page-view-layout"><slot /></div>' },
			AppBreadcrumbs: { template: '<nav data-test-id="app-breadcrumbs" />' },
			AppThemeEditor: {
				props: ['projectId', 'app', 'threadId'],
				emits: ['saved'],
				template:
					'<div data-test-id="app-theme-editor-stub" :data-thread-id="threadId" @click="$emit(\'saved\', { ...app, hasUnpublishedChanges: true })" />',
			},
			TimeAgo: { template: '<span data-test-id="time-ago-stub" />' },
			AppCodeViewer: { template: '<div data-test-id="app-code-viewer-stub" />' },
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

describe('AppDetailsView', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(async () => {
		createTestingPinia();
		openAppArtifactThread.mockReset();
		confirm.mockReset();
		clipboardCopy.mockReset();
		toast.showError.mockReset();
		toast.showMessage.mockReset();
		instanceAiAvailable.value = true;
		await router.push('/projects/proj-1/apps/app-1');
		await router.isReady();

		appsStore = mockedStore(useAppsStore);
		appsStore.pages = [];
		appsStore.versions = [];
		appsStore.fetchPages.mockResolvedValue(undefined);
		appsStore.bindings = [];
		appsStore.bindingWarnings = [];
		appsStore.fetchBindings.mockResolvedValue(undefined);
		appsStore.deleteBinding.mockResolvedValue(undefined);
		confirm.mockReset();
		appsStore.fetchVersions.mockResolvedValue(undefined);
	});

	async function renderApp(app: App, props: Record<string, unknown> = {}) {
		appsStore.getApp.mockResolvedValue(app);
		const rendered = renderComponent({ props: { projectId: 'proj-1', appId: app.id, ...props } });
		await waitAllPromises();
		return rendered;
	}

	it('opens on Build when the app has no version yet', async () => {
		const { getByTestId, queryByTestId } = await renderApp(makeApp());

		expect(getByTestId('app-builder-build')).toBeInTheDocument();
		expect(getByTestId('app-builder-tabs')).toBeInTheDocument();
		expect(queryByTestId('app-builder-preview')).not.toBeInTheDocument();
	});

	it('opens on Preview and shows the active version in the iframe', async () => {
		const { getByTestId, queryByTestId } = await renderApp(makeApp({ activeVersionId: 'v-7' }));

		expect(getByTestId('app-builder-preview')).toBeInTheDocument();
		expect(queryByTestId('app-builder-build')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/?v=v-7',
		);
	});

	it('renders neither Build nor Preview until the app has loaded', async () => {
		let resolveApp: (app: App) => void = () => {};
		appsStore.getApp.mockReturnValue(new Promise<App>((resolve) => (resolveApp = resolve)));
		const { getByTestId, queryByTestId } = renderComponent({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();

		expect(queryByTestId('app-builder-build')).not.toBeInTheDocument();
		expect(queryByTestId('app-builder-preview')).not.toBeInTheDocument();

		resolveApp(makeApp({ activeVersionId: 'v-7' }));
		await waitAllPromises();

		expect(getByTestId('app-builder-preview')).toBeInTheDocument();
		expect(queryByTestId('app-builder-build')).not.toBeInTheDocument();
	});

	it('switches between Build and Preview from the mode control', async () => {
		const { getByTestId, queryByTestId } = await renderApp(makeApp({ activeVersionId: 'v-7' }));

		await userEvent.click(getByTestId('radio-button-build'));
		expect(getByTestId('app-builder-build')).toBeInTheDocument();
		expect(queryByTestId('app-builder-preview')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('radio-button-preview'));
		expect(getByTestId('app-builder-preview')).toBeInTheDocument();
	});

	it('shows the empty preview with a way into the assistant before the first build', async () => {
		const { getByTestId, queryByTestId } = await renderApp(makeApp());

		await userEvent.click(getByTestId('radio-button-preview'));

		expect(getByTestId('app-preview-empty')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-app-preview-iframe')).not.toBeInTheDocument();
		expect(getByTestId('app-preview-refresh')).toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(getByTestId('app-preview-empty-open-in-assistant'));
		expect(openAppArtifactThread).toHaveBeenCalledWith(
			{ type: 'app', appId: 'app-1', projectId: 'proj-1', name: 'Greeter' },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: 'app-1' } },
		);
	});

	it('tells the user to build the app themselves when the assistant is unavailable', async () => {
		instanceAiAvailable.value = false;
		const { getByTestId, queryByTestId } = await renderApp(makeApp());

		await userEvent.click(getByTestId('radio-button-preview'));

		expect(getByTestId('app-preview-empty')).toHaveTextContent('Build this app to see it here.');
		expect(queryByTestId('app-preview-empty-open-in-assistant')).not.toBeInTheDocument();
		expect(queryByTestId('app-open-in-assistant')).not.toBeInTheDocument();
	});

	it('narrows the frame to a phone width on the mobile toggle', async () => {
		const { getByTestId } = await renderApp(makeApp({ activeVersionId: 'v-7' }));

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveStyle({ width: '100%' });

		await userEvent.click(getByTestId('app-preview-device-mobile'));
		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveStyle({ width: '390px' });

		await userEvent.click(getByTestId('app-preview-device-desktop'));
		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveStyle({ width: '100%' });
	});

	it('reloads the iframe on refresh', async () => {
		const { getByTestId } = await renderApp(makeApp({ activeVersionId: 'v-7' }));

		await userEvent.click(getByTestId('app-preview-refresh'));

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/?v=v-7&r=1',
		);
	});

	describe('publish menu', () => {
		const appUrl = `${window.location.origin}/apps/greeter/`;

		async function openPublishMenu(app: App) {
			const rendered = await renderApp(app);
			await userEvent.click(rendered.getByTestId('app-publish-menu-button'));
			return rendered;
		}

		it('is hidden until something is published', async () => {
			const { queryByTestId } = await renderApp(makeApp());

			expect(queryByTestId('app-publish-menu-button')).not.toBeInTheDocument();
		});

		it('opens the served app in a new tab', async () => {
			const open = vi.spyOn(window, 'open').mockReturnValue(null);
			const { getByTestId } = await openPublishMenu(makeApp({ activeVersionId: 'v-7' }));

			await userEvent.click(getByTestId('app-publish-menu-item-open'));

			expect(open).toHaveBeenCalledWith(appUrl, '_blank', 'noopener');
			open.mockRestore();
		});

		it('copies the served app URL and confirms', async () => {
			const { getByTestId } = await openPublishMenu(makeApp({ activeVersionId: 'v-7' }));

			await userEvent.click(getByTestId('app-publish-menu-item-copy-url'));

			expect(clipboardCopy).toHaveBeenCalledWith(appUrl);
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: 'Copied to clipboard',
				type: 'success',
			});
		});

		it('unpublishes the app after confirmation and hides itself', async () => {
			confirm.mockResolvedValue('confirm');
			appsStore.setActiveVersion.mockResolvedValue(
				makeApp({ activeVersionId: null, hasUnpublishedChanges: true }),
			);
			const { getByTestId, queryByTestId } = await openPublishMenu(
				makeApp({ activeVersionId: 'v-7' }),
			);

			await userEvent.click(getByTestId('app-publish-menu-item-unpublish'));
			await waitAllPromises();

			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining('/apps/greeter/'),
				'Unpublish app?',
				expect.objectContaining({ confirmButtonText: 'Unpublish app' }),
			);
			expect(appsStore.setActiveVersion).toHaveBeenCalledWith('proj-1', 'app-1', null);
			expect(queryByTestId('app-publish-menu-button')).not.toBeInTheDocument();
			expect(queryByTestId('app-publish-indicator')).not.toBeInTheDocument();
			expect(getByTestId('app-publish')).toBeEnabled();
		});
	});

	describe('publish', () => {
		const published = { versionId: 'v-8', url: 'http://localhost/apps/greeter/' };

		it('reads "Published" with a green dot, disabled, when the published version is the newest', async () => {
			const { getByTestId } = await renderApp(
				makeApp({ activeVersionId: 'v-7', hasUnpublishedChanges: false }),
			);

			expect(getByTestId('app-publish')).toBeDisabled();
			expect(getByTestId('app-publish')).toHaveTextContent('Published');
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorPublished');
			expect(getByTestId('app-publish-menu-button')).toBeInTheDocument();
		});

		it('is enabled with a yellow dot when a draft is newer than the published version', async () => {
			const { getByTestId } = await renderApp(
				makeApp({ activeVersionId: 'v-7', hasUnpublishedChanges: true }),
			);

			expect(getByTestId('app-publish')).toBeEnabled();
			expect(getByTestId('app-publish')).toHaveTextContent('Publish');
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorChanges');
			expect(getByTestId('app-publish-menu-button')).toBeInTheDocument();
		});

		it('is enabled without a dot or menu when nothing is published yet', async () => {
			const { getByTestId, queryByTestId } = await renderApp(
				makeApp({ activeVersionId: null, hasUnpublishedChanges: true }),
			);

			expect(getByTestId('app-publish')).toBeEnabled();
			expect(getByTestId('app-publish')).toHaveTextContent('Publish');
			expect(queryByTestId('app-publish-indicator')).not.toBeInTheDocument();
			expect(queryByTestId('app-publish-menu-button')).not.toBeInTheDocument();
		});

		it('publishes the thread draft in artifact mode, then refreshes the app and confirms', async () => {
			appsStore.publishApp.mockResolvedValue(published);
			const { getByTestId } = await renderApp(makeApp({ hasUnpublishedChanges: true }), {
				artifactMode: true,
				threadId: 'thread-1',
			});
			appsStore.getApp.mockResolvedValue(
				makeApp({ activeVersionId: 'v-8', hasUnpublishedChanges: false }),
			);

			await userEvent.click(getByTestId('app-publish'));
			await waitAllPromises();

			expect(appsStore.publishApp).toHaveBeenCalledWith('proj-1', 'app-1', 'thread-1');
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: 'App published',
				message: published.url,
				type: 'success',
			});
			expect(getByTestId('app-publish')).toBeDisabled();
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorPublished');
			expect(getByTestId('app-publish-menu-button')).toBeInTheDocument();
		});

		it('publishes without a thread outside artifact mode', async () => {
			appsStore.publishApp.mockResolvedValue(published);
			const { getByTestId } = await renderApp(makeApp({ hasUnpublishedChanges: true }));

			await userEvent.click(getByTestId('app-publish'));
			await waitAllPromises();

			expect(appsStore.publishApp).toHaveBeenCalledWith('proj-1', 'app-1', undefined);
		});

		it('shows the build failure with its log tail and keeps the draft flagged', async () => {
			appsStore.publishApp.mockResolvedValue({
				error: true,
				stage: 'build',
				message: 'vite build exited with code 1.',
				log: 'src/pages/Home.vue: unexpected token',
			});
			const { getByTestId } = await renderApp(makeApp({ hasUnpublishedChanges: true }));
			appsStore.getApp.mockClear();

			await userEvent.click(getByTestId('app-publish'));
			await waitAllPromises();

			expect(toast.showMessage).toHaveBeenCalledWith({
				title: "Couldn't publish the app",
				message: 'vite build exited with code 1.\nsrc/pages/Home.vue: unexpected token',
				type: 'error',
			});
			expect(appsStore.getApp).not.toHaveBeenCalled();
			expect(getByTestId('app-publish')).toBeEnabled();
			expect(getByTestId('app-publish')).toHaveTextContent('Publish');
		});

		it('reports a request failure through the error toast', async () => {
			appsStore.publishApp.mockRejectedValue(new Error('network'));
			const { getByTestId } = await renderApp(makeApp({ hasUnpublishedChanges: true }));

			await userEvent.click(getByTestId('app-publish'));
			await waitAllPromises();

			expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't publish the app");
		});
	});

	describe('publish state after a turn', () => {
		const published = makeApp({ activeVersionId: 'v-7', hasUnpublishedChanges: false });

		it('re-reads the app when refreshKey changes and flips the dot to the fetched state', async () => {
			const { getByTestId, rerender, emitted } = await renderApp(published, {
				artifactMode: true,
				refreshKey: 0,
			});
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorPublished');
			expect(emitted('app-loaded')).toEqual([[published]]);
			const changed = makeApp({ activeVersionId: 'v-7', hasUnpublishedChanges: true });
			appsStore.getApp.mockResolvedValue(changed);

			await rerender({ artifactMode: true, refreshKey: 1 });
			await waitAllPromises();

			expect(appsStore.getApp).toHaveBeenCalledTimes(2);
			expect(appsStore.fetchVersions).not.toHaveBeenCalled();
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorChanges');
			expect(getByTestId('app-publish')).toBeEnabled();
			expect(emitted('app-loaded')).toEqual([[published], [changed]]);
		});

		it('refreshes the version list too while the versions tab is open', async () => {
			const { getByTestId, getByRole, rerender } = await renderApp(published, { refreshKey: 0 });
			await userEvent.click(getByTestId('radio-button-build'));
			await userEvent.click(getByRole('tab', { name: 'Versions' }));
			await waitAllPromises();
			appsStore.fetchVersions.mockClear();

			await rerender({ refreshKey: 1 });
			await waitAllPromises();

			expect(appsStore.fetchVersions).toHaveBeenCalledTimes(1);
		});

		it('toasts when the re-read fails and keeps the last state', async () => {
			const { getByTestId, rerender } = await renderApp(published, { refreshKey: 0 });
			appsStore.getApp.mockRejectedValue(new Error('offline'));

			await rerender({ refreshKey: 1 });
			await waitAllPromises();

			expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), 'Error loading app');
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorPublished');
		});

		it('shows changes as soon as the live preview is ahead, without a re-read', async () => {
			const { getByTestId, rerender } = await renderApp(published, { artifactMode: true });
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorPublished');

			await rerender({ artifactMode: true, draftDirty: true });

			expect(appsStore.getApp).toHaveBeenCalledTimes(1);
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorChanges');
			expect(getByTestId('app-publish')).toBeEnabled();
			expect(getByTestId('app-publish')).toHaveTextContent('Publish');

			await rerender({ artifactMode: true, draftDirty: false });

			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorPublished');
			expect(getByTestId('app-publish')).toBeDisabled();
		});
	});

	it('hands the app off to the assistant from the toolbar', async () => {
		const { getByTestId } = await renderApp(makeApp());

		await userEvent.click(getByTestId('app-open-in-assistant'));

		expect(openAppArtifactThread).toHaveBeenCalledWith(
			{ type: 'app', appId: 'app-1', projectId: 'proj-1', name: 'Greeter' },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: 'app-1' } },
		);
	});

	it('drops the page chrome and navigation actions in artifact mode', async () => {
		const { getByTestId, queryByTestId } = await renderApp(makeApp(), { artifactMode: true });

		expect(queryByTestId('page-view-layout')).not.toBeInTheDocument();
		expect(queryByTestId('app-breadcrumbs')).not.toBeInTheDocument();
		expect(queryByTestId('app-delete')).not.toBeInTheDocument();
		expect(queryByTestId('app-open-in-assistant')).not.toBeInTheDocument();
		expect(getByTestId('app-builder-mode')).toBeInTheDocument();
		expect(getByTestId('app-publish')).toBeInTheDocument();

		await userEvent.click(getByTestId('radio-button-preview'));
		expect(getByTestId('app-preview-empty')).toBeInTheDocument();
		expect(queryByTestId('app-preview-empty-open-in-assistant')).not.toBeInTheDocument();
	});

	describe('versions tab', () => {
		const version = (overrides: Partial<AppVersion>): AppVersion => ({
			id: 'v-1',
			appId: 'app-1',
			createdAt: '2026-04-02T00:00:00.000Z',
			hasDist: true,
			isActive: false,
			kind: 'publish',
			...overrides,
		});
		const versions = [
			version({ id: 's-3', hasDist: false, kind: 'snapshot' }),
			version({ id: 'v-2', isActive: true }),
			version({ id: 'v-1' }),
		];

		async function openVersionsTab(app: App) {
			const rendered = await renderApp(app);
			await userEvent.click(rendered.getByTestId('radio-button-build'));
			await userEvent.click(rendered.getByRole('tab', { name: 'Versions' }));
			await waitAllPromises();
			return rendered;
		}

		it('fetches the versions when opened and lists them with kind, badge, and actions', async () => {
			appsStore.fetchVersions.mockImplementation(async () => {
				appsStore.versions = versions;
			});
			const { getAllByTestId, getAllByRole, getByTestId } = await openVersionsTab(
				makeApp({ activeVersionId: 'v-2' }),
			);

			expect(appsStore.fetchVersions).toHaveBeenCalledWith('proj-1', 'app-1');
			const rows = getAllByTestId('app-version-row');
			expect(rows).toHaveLength(3);
			expect(rows[0]).toHaveTextContent('Draft snapshot');
			expect(rows[1]).toHaveTextContent('Published build');
			expect(getByTestId('app-version-active')).toBe(
				rows[1].querySelector('[data-test-id="app-version-active"]'),
			);
			expect(rows[0].querySelector('[data-test-id="app-version-activate"]')).toBeNull();
			expect(rows[1].querySelector('[data-test-id="app-version-unpublish"]')).not.toBeNull();
			expect(rows[2].querySelector('[data-test-id="app-version-activate"]')).not.toBeNull();
			expect(getAllByRole('button', { name: 'Publish this version' })).toHaveLength(1);
		});

		it('shows an empty state without versions', async () => {
			const { getByTestId } = await openVersionsTab(makeApp());

			expect(getByTestId('app-versions')).toHaveTextContent('No versions yet');
		});

		it('publishes an older built version, then refreshes the app and the list', async () => {
			appsStore.fetchVersions.mockImplementation(async () => {
				appsStore.versions = versions;
			});
			const updated = makeApp({ activeVersionId: 'v-1', hasUnpublishedChanges: true });
			appsStore.setActiveVersion.mockResolvedValue(updated);
			const { getByTestId } = await openVersionsTab(makeApp({ activeVersionId: 'v-2' }));

			await userEvent.click(getByTestId('app-version-activate'));
			await waitAllPromises();

			expect(appsStore.setActiveVersion).toHaveBeenCalledWith('proj-1', 'app-1', 'v-1');
			expect(appsStore.fetchVersions).toHaveBeenCalledTimes(2);
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: 'Version published',
				type: 'success',
			});
			expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorChanges');
		});

		it('unpublishes the active version after confirmation', async () => {
			appsStore.fetchVersions.mockImplementation(async () => {
				appsStore.versions = versions;
			});
			confirm.mockResolvedValue('confirm');
			appsStore.setActiveVersion.mockResolvedValue(
				makeApp({ activeVersionId: null, hasUnpublishedChanges: true }),
			);
			const { getByTestId, queryByTestId } = await openVersionsTab(
				makeApp({ activeVersionId: 'v-2' }),
			);

			await userEvent.click(getByTestId('app-version-unpublish'));
			await waitAllPromises();

			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining('/apps/greeter/'),
				'Unpublish app?',
				expect.objectContaining({ confirmButtonText: 'Unpublish app' }),
			);
			expect(appsStore.setActiveVersion).toHaveBeenCalledWith('proj-1', 'app-1', null);
			expect(toast.showMessage).toHaveBeenCalledWith({ title: 'App unpublished', type: 'success' });
			expect(queryByTestId('app-publish-menu-button')).not.toBeInTheDocument();
		});

		it('keeps the version when the unpublish is cancelled', async () => {
			appsStore.fetchVersions.mockImplementation(async () => {
				appsStore.versions = versions;
			});
			confirm.mockResolvedValue('cancel');
			const { getByTestId } = await openVersionsTab(makeApp({ activeVersionId: 'v-2' }));

			await userEvent.click(getByTestId('app-version-unpublish'));
			await waitAllPromises();

			expect(appsStore.setActiveVersion).not.toHaveBeenCalled();
		});

		it('reports a failed activation through the error toast', async () => {
			appsStore.fetchVersions.mockImplementation(async () => {
				appsStore.versions = versions;
			});
			appsStore.setActiveVersion.mockRejectedValue(new Error('no build'));
			const { getByTestId } = await openVersionsTab(makeApp({ activeVersionId: 'v-2' }));

			await userEvent.click(getByTestId('app-version-activate'));
			await waitAllPromises();

			expect(toast.showError).toHaveBeenCalledWith(
				expect.any(Error),
				"Couldn't publish this version",
			);
		});
	});

	it('shows the Theme tab, enabled, alongside Pages and Code', async () => {
		const { getByTestId, getByRole, queryByTestId } = await renderApp(makeApp());

		const themeTab = getByRole('tab', { name: 'Theme' });
		expect(getByTestId('tab-theme')).toBeInTheDocument();
		expect(themeTab).not.toHaveAttribute('aria-disabled', 'true');
		expect(queryByTestId('app-theme-editor-stub')).not.toBeInTheDocument();

		await userEvent.click(themeTab);

		expect(getByTestId('app-theme-editor-stub')).toBeInTheDocument();
	});

	it('hands adding a root page off to the assistant with a pre-filled, unsent prompt', async () => {
		const { getByTestId } = await renderApp(makeApp());

		await userEvent.click(getByTestId('app-page-add-root'));

		expect(openAppArtifactThread).toHaveBeenCalledWith(
			{ type: 'app', appId: 'app-1', projectId: 'proj-1', name: 'Greeter' },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: 'app-1' } },
			{ initialDraft: 'Add a new page to this app.' },
		);
	});

	it("hands a page card's add/edit/delete actions off to the assistant with the page's route", async () => {
		appsStore.pages = [{ id: 'p1', parentPageId: null, route: 'clients' }];
		const { getByTestId } = await renderApp(makeApp());

		await userEvent.click(getByTestId('app-page-add-child'));
		expect(openAppArtifactThread).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {
			initialDraft: 'Add a new page nested under "/clients" in this app.',
		});

		await userEvent.click(getByTestId('app-page-edit'));
		expect(openAppArtifactThread).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {
			initialDraft: 'Update the page at "/clients" in this app.',
		});

		await userEvent.click(getByTestId('app-page-delete'));
		expect(openAppArtifactThread).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {
			initialDraft: 'Remove the page at "/clients" from this app.',
		});
	});

	it("shows a page's direct children indented right beneath it, and acts on their own route", async () => {
		appsStore.pages = [
			{ id: 'p1', parentPageId: null, route: 'clients' },
			{ id: 'p2', parentPageId: 'p1', route: ':id' },
		];
		const { getAllByTestId } = await renderApp(makeApp());

		const routes = getAllByTestId('app-page-route').map((el) => el.textContent);
		expect(routes).toEqual(['/clients', '/:id']);

		await userEvent.click(getAllByTestId('app-page-edit')[1]);
		expect(openAppArtifactThread).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {
			initialDraft: 'Update the page at "/clients/:id" in this app.',
		});
	});

	describe('Connections tab', () => {
		const bindings: DescribedBinding[] = [
			{
				key: 'submit',
				kind: 'workflow',
				workflowId: 'wf-1',
				name: 'Echo',
				published: true,
				input: { type: 'object', properties: { message: { type: 'string' } } },
				output: { type: 'array', items: { type: 'object', additionalProperties: true } },
				outputSource: { kind: 'unknown' },
			},
			{
				key: 'notify',
				kind: 'workflow',
				workflowId: 'wf-2',
				name: 'Notify',
				published: false,
				input: { type: 'object', additionalProperties: true },
				output: { type: 'array', items: { type: 'object', additionalProperties: true } },
				outputSource: { kind: 'unknown' },
			},
		];

		it('lists the connected workflows with a link and per-binding warning', async () => {
			appsStore.bindings = bindings;
			appsStore.bindingWarnings = [
				'Binding \'notify\': workflow "Notify" is not published.',
				"Binding 'gone': workflow 'wf-3' no longer exists in the app's project.",
			];
			const { getByRole, getByTestId, getAllByTestId } = await renderApp(makeApp());

			expect(appsStore.fetchBindings).toHaveBeenCalledWith('proj-1', 'app-1');
			await userEvent.click(getByRole('tab', { name: 'Connections' }));

			const rows = getAllByTestId('app-connection');
			expect(rows).toHaveLength(2);
			const links = getAllByTestId('app-connection-workflow');
			expect(links[0]).toHaveAttribute('href', '/workflow/wf-1');
			expect(links[0]).toHaveAttribute('target', '_blank');
			expect(links[0]).toHaveTextContent('Echo');
			expect(rows[0].querySelector('[data-test-id="app-connection-warning"]')).toBeNull();
			const warned = rows[1].querySelector('[data-test-id="app-connection-warning"]');
			expect(warned).not.toBeNull();
			await userEvent.hover(warned!);
			const tooltip = await screen.findByText(/workflow "Notify" is not published/);
			expect(tooltip).not.toHaveTextContent("Binding 'notify'");
			expect(getAllByTestId('app-connection-delete')).toHaveLength(2);
			expect(getByTestId('app-connections-warning')).toHaveTextContent("Binding 'gone'");
			expect(getByTestId('app-connections-warning')).not.toHaveTextContent("Binding 'notify'");
		});

		const tasksBinding: DescribedBinding = {
			key: 'tasks',
			kind: 'dataTable',
			dataTableId: 'dt-1',
			name: 'Tasks',
			permissions: ['read', 'write'],
			columns: [{ name: 'title', type: 'string' }],
			row: { type: 'object' },
		};

		it('lists a connected data table with a link and its access level', async () => {
			appsStore.bindings = [tasksBinding, { ...tasksBinding, key: 'log', permissions: ['read'] }];
			const { getByRole, getAllByTestId, queryByTestId } = await renderApp(makeApp());

			await userEvent.click(getByRole('tab', { name: 'Connections' }));

			const rows = getAllByTestId('app-connection');
			expect(rows).toHaveLength(2);
			const links = getAllByTestId('app-connection-data-table');
			expect(links[0]).toHaveAttribute('href', '/projects/proj-1/datatables/dt-1');
			expect(links[0]).toHaveAttribute('target', '_blank');
			expect(links[0]).toHaveTextContent('Tasks');
			expect(rows[0].querySelector('[data-icon="table"]')).not.toBeNull();
			const access = getAllByTestId('app-connection-access');
			expect(access[0]).toHaveTextContent('Read & write');
			expect(access[1]).toHaveTextContent('Read');
			expect(access[1]).not.toHaveTextContent('write');
			expect(queryByTestId('app-connection-workflow')).toBeNull();
			expect(queryByTestId('app-connection-warning')).toBeNull();
		});

		it('shows write-only access for a data table the app cannot read', async () => {
			appsStore.bindings = [{ ...tasksBinding, permissions: ['write'] }];
			const { getByRole, getByTestId } = await renderApp(makeApp());

			await userEvent.click(getByRole('tab', { name: 'Connections' }));

			expect(getByTestId('app-connection-access')).toHaveTextContent('Write');
			expect(getByTestId('app-connection-access')).not.toHaveTextContent('Read');
		});

		it('lists a missing connection without a link and disconnects it with its kind copy', async () => {
			appsStore.bindings = [
				{ key: 'tasks', kind: 'dataTable', name: 'tasks', missing: true },
				{ key: 'submit', kind: 'workflow', name: 'submit', missing: true },
			];
			appsStore.bindingWarnings = [
				"Binding 'tasks': data table 'dt-1' no longer exists in the app's project.",
				"Binding 'submit': workflow 'wf-1' no longer exists in the app's project.",
			];
			confirm.mockResolvedValue(MODAL_CONFIRM);
			const { getByRole, getAllByTestId, queryByTestId } = await renderApp(makeApp());

			await userEvent.click(getByRole('tab', { name: 'Connections' }));

			const rows = getAllByTestId('app-connection');
			expect(rows).toHaveLength(2);
			expect(rows[0].querySelector('a')).toBeNull();
			expect(rows[1].querySelector('a')).toBeNull();
			expect(getAllByTestId('app-connection-missing')[0]).toHaveTextContent('tasks');
			expect(getAllByTestId('app-connection-missing')[1]).toHaveTextContent('submit');
			expect(rows[0].querySelector('[data-icon="table"]')).not.toBeNull();
			expect(rows[1].querySelector('[data-icon="workflow"]')).not.toBeNull();
			expect(queryByTestId('app-connection-data-table')).toBeNull();
			expect(queryByTestId('app-connection-workflow')).toBeNull();
			expect(queryByTestId('app-connection-access')).toBeNull();
			expect(queryByTestId('app-connections-warning')).toBeNull();

			const warned = rows[0].querySelector('[data-test-id="app-connection-warning"]');
			expect(warned).not.toBeNull();
			await userEvent.hover(warned!);
			expect(await screen.findByText(/data table 'dt-1' no longer exists/)).toBeInTheDocument();

			await userEvent.click(getAllByTestId('app-connection-delete')[0]);
			expect(confirm).toHaveBeenLastCalledWith(
				expect.stringContaining('disconnect the "tasks" table'),
				'Disconnect data table',
				expect.objectContaining({ confirmButtonText: 'Disconnect' }),
			);
			expect(appsStore.deleteBinding).toHaveBeenLastCalledWith('proj-1', 'app-1', 'tasks');

			await userEvent.click(getAllByTestId('app-connection-delete')[1]);
			expect(confirm).toHaveBeenLastCalledWith(
				expect.stringContaining('disconnect the "submit" workflow'),
				'Disconnect workflow',
				expect.objectContaining({ confirmButtonText: 'Disconnect' }),
			);
			expect(appsStore.deleteBinding).toHaveBeenLastCalledWith('proj-1', 'app-1', 'submit');
		});

		it('disconnects a data table after confirmation with the table copy', async () => {
			appsStore.bindings = [tasksBinding];
			confirm.mockResolvedValue(MODAL_CONFIRM);
			const { getByRole, getByTestId } = await renderApp(makeApp());

			await userEvent.click(getByRole('tab', { name: 'Connections' }));
			await userEvent.click(getByTestId('app-connection-delete'));

			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining(
					'disconnect the "Tasks" table? The app will no longer be able to read or change its rows.',
				),
				'Disconnect data table',
				expect.objectContaining({ confirmButtonText: 'Disconnect' }),
			);
			expect(appsStore.deleteBinding).toHaveBeenCalledWith('proj-1', 'app-1', 'tasks');
		});

		it('deletes a connection after confirmation', async () => {
			appsStore.bindings = bindings;
			confirm.mockResolvedValue(MODAL_CONFIRM);
			const { getByRole, getAllByTestId } = await renderApp(makeApp());

			await userEvent.click(getByRole('tab', { name: 'Connections' }));
			await userEvent.click(getAllByTestId('app-connection-delete')[1]);

			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining('disconnect the "Notify" workflow'),
				'Disconnect workflow',
				expect.objectContaining({ confirmButtonText: 'Disconnect' }),
			);
			expect(appsStore.deleteBinding).toHaveBeenCalledWith('proj-1', 'app-1', 'notify');
		});

		it('keeps the connection when the confirmation is cancelled', async () => {
			appsStore.bindings = bindings;
			confirm.mockResolvedValue('cancel');
			const { getByRole, getAllByTestId } = await renderApp(makeApp());

			await userEvent.click(getByRole('tab', { name: 'Connections' }));
			await userEvent.click(getAllByTestId('app-connection-delete')[0]);

			expect(appsStore.deleteBinding).not.toHaveBeenCalled();
		});

		it('shows the empty state when nothing is connected', async () => {
			const { getByRole, getByTestId, queryByTestId } = await renderApp(makeApp());

			await userEvent.click(getByRole('tab', { name: 'Connections' }));

			expect(getByTestId('app-connections-empty')).toHaveTextContent(
				'No workflows or data tables connected yet.',
			);
			expect(queryByTestId('app-connection')).not.toBeInTheDocument();
		});
	});

	it('hands the thread to the theme editor and flags the draft after a save, staying on Build', async () => {
		const { getByTestId, getByRole, queryByTestId } = await renderApp(
			makeApp({ activeVersionId: 'v-7' }),
			{ artifactMode: true, threadId: 'thread-1' },
		);
		await userEvent.click(getByTestId('radio-button-build'));

		await userEvent.click(getByRole('tab', { name: 'Theme' }));
		expect(getByTestId('app-theme-editor-stub')).toHaveAttribute('data-thread-id', 'thread-1');
		expect(getByTestId('app-publish')).toBeDisabled();

		await userEvent.click(getByTestId('app-theme-editor-stub'));

		expect(getByTestId('app-publish')).toBeEnabled();
		expect(getByTestId('app-publish-indicator')).toHaveClass('indicatorChanges');
		expect(getByTestId('app-builder-build')).toBeInTheDocument();
		expect(queryByTestId('app-builder-preview')).not.toBeInTheDocument();
	});

	it('switches to the live preview after a theme save when the dev server is showing', async () => {
		const { getByTestId, getByRole } = await renderApp(makeApp(), {
			artifactMode: true,
			threadId: 'thread-1',
			liveUrl: '/apps-preview/tok/',
			liveStatus: { status: 'ready', url: '/apps-preview/tok/', expiresAt: '2026-09-09T00:00:00Z' },
		});
		await userEvent.click(getByTestId('radio-button-build'));
		await userEvent.click(getByRole('tab', { name: 'Theme' }));

		await userEvent.click(getByTestId('app-theme-editor-stub'));

		expect(getByTestId('app-builder-preview')).toBeInTheDocument();
	});

	it('shows the Code tab, enabled, and renders AppCodeViewer with the active version', async () => {
		const { getByRole, getByTestId, queryByTestId } = await renderApp(
			makeApp({ activeVersionId: 'v-7' }),
		);
		await userEvent.click(getByTestId('radio-button-build'));
		const codeTab = getByRole('tab', { name: 'Code' });
		expect(codeTab).not.toHaveAttribute('aria-disabled', 'true');
		expect(queryByTestId('app-code-viewer-stub')).not.toBeInTheDocument();

		await userEvent.click(codeTab);

		expect(getByTestId('app-code-viewer-stub')).toBeInTheDocument();
	});

	it('prefers the thread build over the stored version and switches to Preview on the first build', async () => {
		const { getByTestId, queryByTestId, rerender } = await renderApp(makeApp(), {
			artifactMode: true,
		});

		expect(getByTestId('app-builder-build')).toBeInTheDocument();

		await rerender({
			projectId: 'proj-1',
			appId: 'app-1',
			artifactMode: true,
			artifactVersionId: 'v-1',
		});

		expect(queryByTestId('app-builder-build')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/?v=v-1',
		);
	});

	describe('live preview', () => {
		const liveProps = {
			projectId: 'proj-1',
			appId: 'app-1',
			artifactMode: true,
			liveUrl: '/apps-preview/tok/',
			liveStatus: { status: 'ready', url: '/apps-preview/tok/', expiresAt: '2026-09-09T00:00:00Z' },
		};

		function postFromFrame(iframe: HTMLIFrameElement, data: unknown, source?: MessageEventSource) {
			window.dispatchEvent(
				new MessageEvent('message', {
					data,
					origin: 'null',
					source: source ?? iframe.contentWindow,
				}),
			);
		}

		it('shows the live URL over the build, marks it Live, and keeps the frame across builds', async () => {
			const { getByTestId, queryByTestId, rerender } = await renderApp(
				makeApp({ activeVersionId: 'v-7' }),
				liveProps,
			);

			const iframe = getByTestId('instance-ai-app-preview-iframe');
			expect(iframe).toHaveAttribute('src', '/apps-preview/tok/');
			expect(queryByTestId('app-preview-live-banner')).not.toBeInTheDocument();

			await rerender({ ...liveProps, artifactVersionId: 'v-8' });

			expect(getByTestId('instance-ai-app-preview-iframe')).toBe(iframe);
			expect(iframe).toHaveAttribute('src', '/apps-preview/tok/');
		});

		it('reloads the live document on refresh', async () => {
			const { getByTestId } = await renderApp(makeApp(), liveProps);

			await userEvent.click(getByTestId('app-preview-refresh'));

			expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
				'src',
				'/apps-preview/tok/?r=1',
			);
		});

		it('opens Preview on the live URL even before the first build', async () => {
			const { getByTestId, queryByTestId, rerender } = await renderApp(makeApp(), {
				artifactMode: true,
			});
			expect(getByTestId('app-builder-build')).toBeInTheDocument();

			await rerender(liveProps);

			expect(queryByTestId('app-builder-build')).not.toBeInTheDocument();
			expect(queryByTestId('app-preview-empty')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
				'src',
				'/apps-preview/tok/',
			);
		});

		it.each([
			[{ status: 'starting' }, 'Starting live preview…'],
			[
				{ status: 'no-source' },
				"Live preview isn't available in this chat yet. This is the last build.",
			],
			[
				{ status: 'unsupported', reason: 'provider' },
				"Live preview isn't supported on this instance. This is the last build.",
			],
			[
				{ status: 'unavailable', reason: 'sandbox' },
				"Live preview isn't available right now. This is the last build.",
			],
			[
				{ status: 'unavailable', reason: 'start-failed' },
				"Live preview couldn't start. This is the last build.",
			],
		])('shows the %o banner above the last build', async (liveStatus, text) => {
			const { getByTestId } = await renderApp(makeApp({ activeVersionId: 'v-7' }), {
				artifactMode: true,
				liveStatus,
			});

			expect(getByTestId('app-preview-live-banner')).toHaveTextContent(text);
			expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
				'src',
				'/apps/greeter/?v=v-7',
			);
		});

		it.each([
			[{ status: 'starting' }, 'Starting live preview…'],
			[
				{ status: 'unsupported', reason: 'provider' },
				"Live preview isn't supported on this instance.",
			],
			[{ status: 'unavailable', reason: 'sandbox' }, "Live preview isn't available right now."],
			[{ status: 'unavailable', reason: 'start-failed' }, "Live preview couldn't start."],
		])(
			'opens Preview with only the %o banner while an app without a build restores',
			async (liveStatus, text) => {
				const { getByTestId, queryByTestId } = await renderApp(makeApp(), {
					artifactMode: true,
					liveStatus,
				});

				expect(queryByTestId('app-builder-build')).not.toBeInTheDocument();
				expect(getByTestId('app-preview-live-banner')).toHaveTextContent(text);
				expect(getByTestId('app-preview-live-banner')).not.toHaveTextContent('last build');
				expect(queryByTestId('app-preview-empty')).not.toBeInTheDocument();
				expect(queryByTestId('instance-ai-app-preview-iframe')).not.toBeInTheDocument();
			},
		);

		it('switches from the empty state to Preview once the first ensure answer arrives', async () => {
			const { getByTestId, queryByTestId, rerender } = await renderApp(makeApp(), {
				artifactMode: true,
			});
			expect(getByTestId('app-builder-build')).toBeInTheDocument();

			await rerender({ artifactMode: true, liveStatus: { status: 'starting' } });

			expect(queryByTestId('app-builder-build')).not.toBeInTheDocument();
			expect(getByTestId('app-preview-live-banner')).toHaveTextContent('Starting live preview…');
			expect(queryByTestId('app-preview-empty')).not.toBeInTheDocument();
		});

		it('shows the empty state for an app with no stored source and no build', async () => {
			const { getByTestId, queryByTestId } = await renderApp(makeApp(), {
				artifactMode: true,
				liveStatus: { status: 'no-source' },
			});

			await userEvent.click(getByTestId('radio-button-preview'));

			expect(getByTestId('app-preview-empty')).toHaveTextContent('Nothing to preview yet');
			expect(queryByTestId('app-preview-live-banner')).not.toBeInTheDocument();
		});

		it('stays on Build for a starting preview outside artifact mode', async () => {
			const { getByTestId } = await renderApp(makeApp(), { liveStatus: { status: 'starting' } });

			expect(getByTestId('app-builder-build')).toBeInTheDocument();
		});

		it('arms the inspector in the live frame and stages the picked element in the thread', async () => {
			const instanceAiStore = mockedStore(useInstanceAiStore);
			const { getByTestId } = await renderApp(makeApp({ activeVersionId: 'v-7' }), liveProps);
			const iframe = getByTestId<HTMLIFrameElement>('instance-ai-app-preview-iframe');
			const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
			const element = { tagName: 'button', text: 'Submit', selector: '#go', route: '/clients' };

			await userEvent.click(getByTestId('app-preview-inspect'));
			iframe.dispatchEvent(new Event('load'));
			postFromFrame(iframe, { source: 'n8nable', type: 'inspect:selected', element });
			await waitAllPromises();

			expect(postMessage.mock.calls.map(([data]) => data)).toEqual([
				{ source: 'n8nable', type: 'inspect:enable' },
				{ source: 'n8nable', type: 'inspect:enable' },
				{ source: 'n8nable', type: 'inspect:disable' },
			]);
			expect(instanceAiStore.stageElementSelection).toHaveBeenCalledWith({
				type: 'element',
				appId: 'app-1',
				...element,
			});
			expect(instanceAiStore.requestComposerFocus).toHaveBeenCalled();
			expect(openAppArtifactThread).not.toHaveBeenCalled();
		});

		it('emits a diagnostic only for a valid message from its own frame', async () => {
			const { getByTestId, emitted } = await renderApp(makeApp(), liveProps);
			const iframe = getByTestId<HTMLIFrameElement>('instance-ai-app-preview-iframe');
			const payload = {
				source: 'n8n-app-preview',
				v: 1,
				at: '2026-09-08T10:00:00.000Z',
				kind: 'uncaught',
				message: 'boom',
				file: '/src/pages/Home.vue',
				line: 12,
			};

			postFromFrame(iframe, payload, window);
			postFromFrame(iframe, { ...payload, source: 'someone-else' });
			postFromFrame(iframe, { ...payload, v: 2 });
			postFromFrame(iframe, { ...payload, kind: 'console' });
			postFromFrame(iframe, 'not an object');
			expect(emitted('diagnostic')).toBeUndefined();

			postFromFrame(iframe, payload);

			expect(emitted('diagnostic')).toEqual([
				[
					{
						at: '2026-09-08T10:00:00.000Z',
						kind: 'uncaught',
						message: 'boom',
						file: '/src/pages/Home.vue',
						line: 12,
					},
				],
			]);
		});
	});
});
