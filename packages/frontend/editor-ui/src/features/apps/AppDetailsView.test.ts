import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';

import AppDetailsView from './AppDetailsView.vue';
import { useAppsStore } from './apps.store';
import { APP_DETAILS, APP_PAGE_DETAILS, PROJECT_APPS } from './apps.constants';
import type { App } from './apps.types';

const openAppArtifactThread = vi.hoisted(() => vi.fn());
const instanceAiAvailable = vi.hoisted(() => ({ value: true }));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
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
			AppThemeEditor: { template: '<div data-test-id="app-theme-editor-stub" />' },
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
		instanceAiAvailable.value = true;
		await router.push('/projects/proj-1/apps/app-1');
		await router.isReady();

		appsStore = mockedStore(useAppsStore);
		appsStore.pages = [];
		appsStore.fetchPages.mockResolvedValue(undefined);
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

	it('links and copies the served app URL', async () => {
		const { getByTestId } = await renderApp(makeApp());

		expect(getByTestId('app-open')).toHaveAttribute(
			'href',
			`${window.location.origin}/apps/greeter/`,
		);
		expect(getByTestId('app-open')).toHaveAttribute('target', '_blank');
		expect(getByTestId('app-url')).toHaveTextContent(`${window.location.origin}/apps/greeter/`);
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
		expect(getByTestId('app-open')).toBeInTheDocument();

		await userEvent.click(getByTestId('radio-button-preview'));
		expect(getByTestId('app-preview-empty')).toBeInTheDocument();
		expect(queryByTestId('app-preview-empty-open-in-assistant')).not.toBeInTheDocument();
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
			expect(getByTestId('app-preview-live-badge')).toHaveTextContent('Live');
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
				'Live preview stopped. This is the last build.',
			],
		])('shows the %o banner above the last build', async (liveStatus, text) => {
			const { getByTestId, queryByTestId } = await renderApp(makeApp({ activeVersionId: 'v-7' }), {
				artifactMode: true,
				liveStatus,
			});

			expect(getByTestId('app-preview-live-banner')).toHaveTextContent(text);
			expect(queryByTestId('app-preview-live-badge')).not.toBeInTheDocument();
			expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
				'src',
				'/apps/greeter/?v=v-7',
			);
		});

		it('keeps the empty state instead of a banner when there is no build to fall back to', async () => {
			const { getByTestId, queryByTestId } = await renderApp(makeApp(), {
				artifactMode: true,
				liveStatus: { status: 'starting' },
			});

			await userEvent.click(getByTestId('radio-button-preview'));

			expect(getByTestId('app-preview-empty')).toBeInTheDocument();
			expect(queryByTestId('app-preview-live-banner')).not.toBeInTheDocument();
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
