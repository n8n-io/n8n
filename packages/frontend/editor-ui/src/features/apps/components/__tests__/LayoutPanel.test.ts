import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { AppLayout } from '@n8n/api-types';
import { defineComponent, h } from 'vue';

import LayoutPanel from '@/features/apps/components/LayoutPanel.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { Page } from '@/features/apps/apps.types';

const editorMounts = vi.fn();
const editorIssues = vi.fn();
let emitLayout: ((layout: AppLayout) => void) | null = null;
vi.mock('@/features/apps/components/PageContentEditor.vue', () => ({
	default: defineComponent({
		props: {
			content: { type: Array, required: true },
			projectId: String,
			schema: String,
			externalIssues: Object,
		},
		emits: ['update:content', 'update:layout'],
		setup(props, { emit }) {
			editorMounts(props.schema, props.content);
			editorIssues(props.externalIssues);
			emitLayout = (layout) => emit('update:layout', layout);
			return () => h('div', { 'data-test-id': 'page-content-editor' });
		},
	}),
}));

const homeLayout: AppLayout = [
	{ id: 'menu', type: 'html', data: { template: '<nav></nav>' } },
	{ id: 'slot', type: 'slot', data: {} },
];

const page = (id: string, route: string, layout: AppLayout | null): Page => ({
	id,
	appId: 'app1',
	parentPageId: id === 'home' ? null : 'home',
	route,
	content: [],
	layout,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
});

const renderComponent = createComponentRenderer(LayoutPanel, { pinia: createTestingPinia() });

describe('LayoutPanel', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		appsStore = mockedStore(useAppsStore);
		appsStore.pages = [page('home', '', homeLayout), page('about', 'about', null)];
		appsStore.updatePage.mockResolvedValue(appsStore.pages[1]);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('names the owner page of an inherited layout', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[1],
				ownerPageId: 'home',
				renderErrors: {},
			},
		});

		expect(getByTestId('page-layout-inherited').textContent).toContain('Inherited from Home');
		expect(queryByTestId('page-content-editor')).toBeNull();
	});

	it('shows the default layout when no ancestor defines one', () => {
		const { getByTestId } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[1],
				ownerPageId: null,
				renderErrors: {},
			},
		});

		expect(getByTestId('page-layout-inherited').textContent).toContain('Default layout');
	});

	it('customize copies the owner page layout onto this page', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[1],
				ownerPageId: 'home',
				renderErrors: {},
			},
		});

		await userEvent.click(getByTestId('page-layout-customize'));

		await waitFor(() =>
			expect(appsStore.updatePage).toHaveBeenCalledWith('p1', 'app1', 'about', {
				layout: homeLayout,
			}),
		);
		expect(emitted('saved')).toHaveLength(1);
	});

	it('customize starts from a single slot when the default layout is in effect', async () => {
		const { getByTestId } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[1],
				ownerPageId: null,
				renderErrors: {},
			},
		});

		await userEvent.click(getByTestId('page-layout-customize'));

		await waitFor(() => expect(appsStore.updatePage).toHaveBeenCalledTimes(1));
		const { layout } = appsStore.updatePage.mock.calls[0][3];
		expect(layout).toEqual([{ id: expect.any(String), type: 'slot', data: {} }]);
	});

	it('edits an owned layout in a layout-schema editor and autosaves it', async () => {
		const { emitted } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[0],
				ownerPageId: 'home',
				renderErrors: {},
			},
		});
		expect(editorMounts).toHaveBeenCalledWith('layout', homeLayout);
		const edited: AppLayout = [{ id: 'slot', type: 'slot', data: {} }];

		emitLayout?.(edited);
		await vi.advanceTimersByTimeAsync(5000);

		await waitFor(() =>
			expect(appsStore.updatePage).toHaveBeenCalledWith('p1', 'app1', 'home', { layout: edited }),
		);
		expect(emitted('saved')).toHaveLength(1);
	});

	it('lists render errors per block and hands them to the editor as external issues', () => {
		const renderErrors = { menu: 'boom' };
		const { getAllByTestId } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[0],
				ownerPageId: 'home',
				renderErrors,
			},
		});

		const lines = getAllByTestId('page-layout-render-error');
		expect(lines).toHaveLength(1);
		expect(lines[0].textContent).toContain('Block menu: boom');
		expect(editorIssues).toHaveBeenCalledWith(renderErrors);
	});

	it('lists render errors of an inherited layout too', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[1],
				ownerPageId: 'home',
				renderErrors: { menu: 'boom' },
			},
		});

		expect(getAllByTestId('page-layout-render-error')).toHaveLength(1);
	});

	it('inherit resets the layout to null and drops pending edits', async () => {
		const { getByTestId } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				page: appsStore.pages[0],
				ownerPageId: 'home',
				renderErrors: {},
			},
		});

		emitLayout?.([{ id: 'slot', type: 'slot', data: {} }]);
		await userEvent.click(getByTestId('page-layout-inherit'));
		await vi.advanceTimersByTimeAsync(5000);

		expect(appsStore.updatePage).toHaveBeenCalledTimes(1);
		expect(appsStore.updatePage).toHaveBeenCalledWith('p1', 'app1', 'home', { layout: null });
	});
});
