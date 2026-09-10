import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import PageEditor from '@/features/apps/components/PageEditor.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App, LayoutPreview, Page } from '@/features/apps/apps.types';

const editorMounts = vi.fn();
let emitContent: ((content: unknown) => void) | null = null;
vi.mock('@/features/apps/components/PageContentEditor.vue', () => ({
	default: defineComponent({
		props: { content: { type: Array, required: true }, projectId: String, schema: String },
		emits: ['update:content', 'update:layout'],
		setup(props, { emit }) {
			editorMounts(props.content);
			emitContent = (content) => emit('update:content', content);
			return () => h('div', { 'data-test-id': 'page-content-editor' });
		},
	}),
}));

const panelSaved = vi.fn();
vi.mock('@/features/apps/components/LayoutPanel.vue', () => ({
	default: defineComponent({
		props: {
			projectId: String,
			appId: String,
			page: Object,
			ownerPageId: String,
			renderErrors: Object,
		},
		emits: ['saved'],
		setup(props, { emit }) {
			panelSaved.mockImplementation(() => emit('saved'));
			return () =>
				h('aside', { 'data-test-id': 'page-layout-panel' }, JSON.stringify(props.renderErrors));
		},
	}),
}));

const app: App = {
	id: 'app1',
	name: 'My app',
	namespace: 'my-app',
	theme: { colors: { primary: '#ff0000' }, radius: 'lg' },
	auth: 'public',
	projectId: 'p1',
	activeVersionId: null,
	publishedAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const page = (id: string, route: string, text: string): Page => ({
	id,
	appId: 'app1',
	parentPageId: null,
	route,
	content: [{ id: `${id}-b1`, type: 'paragraph', data: { text } }],
	layout: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
});

const noLayout: LayoutPreview = { ownerPageId: null, html: null, errors: {} };
const layout: LayoutPreview = {
	ownerPageId: 'home',
	html: '<div class="app-layout" data-app-root><div class="app-block" data-block-id="menu">Menu<a href="http://localhost:5678/apps/my-app/about/" data-test-id="layout-page-link">About</a><a href="https://example.com/x" data-test-id="layout-external-link">Ext</a></div><main class="app-main" data-app-slot></main></div>',
	errors: {},
};

const clickLink = (link: HTMLElement) => {
	const event = new MouseEvent('click', { bubbles: true, cancelable: true });
	link.dispatchEvent(event);
	return event.defaultPrevented;
};

const renderComponent = createComponentRenderer(PageEditor, { pinia: createTestingPinia() });

describe('PageEditor', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		appsStore = mockedStore(useAppsStore);
		appsStore.pages = [page('home', '', 'Home text'), page('about', 'about', 'About text')];
		appsStore.updatePage.mockResolvedValue(appsStore.pages[0]);
		appsStore.fetchLayoutPreview.mockResolvedValue(noLayout);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('renders the shell with the theme, the page menu and the editor for the page', () => {
		const { getByTestId, getAllByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});

		expect(editorMounts).toHaveBeenCalledWith(appsStore.pages[0].content);
		const menu = getByTestId('page-editor-menu');
		expect(menu.textContent).toContain('Home');
		expect(menu.textContent).toContain('about');
		expect(getAllByTestId('page-editor-menu-link')).toHaveLength(1);
		const canvas = getByTestId('page-editor-canvas');
		expect(canvas.getAttribute('style')).toContain('--app-color-primary: #ff0000');
		expect(canvas).toHaveClass('app-canvas');
		expect(canvas.querySelector('.app-shell > nav.app-menu + main.app-main')).not.toBeNull();
	});

	it('renders the theme custom CSS scoped to the canvas', () => {
		const customCss = '.app-main { max-width: 80rem; }';
		const { getByTestId } = renderComponent({
			props: {
				projectId: 'p1',
				appId: 'app1',
				pageId: 'home',
				app: { ...app, theme: { customCss } },
			},
		});

		const style = getByTestId('page-editor-custom-css');
		expect(style.tagName).toBe('STYLE');
		expect(style.textContent).toContain(`@scope ([data-app-canvas]) { ${customCss} }`);
	});

	it('renders no custom CSS style element when the theme has none', () => {
		const { queryByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});

		expect(queryByTestId('page-editor-custom-css')).toBeNull();
	});

	it('emits the page chosen in the menu', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});

		await userEvent.click(getAllByTestId('page-editor-menu-link')[0]);

		expect(emitted('update:pageId')).toEqual([['about']]);
	});

	it('autosaves edited content to the page it was edited on, even after switching', async () => {
		const { rerender } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});
		const edited = [{ id: 'home-b1', type: 'paragraph', data: { text: 'Edited' } }];

		emitContent?.(edited);
		await rerender({ projectId: 'p1', appId: 'app1', pageId: 'about', app });

		await waitFor(() =>
			expect(appsStore.updatePage).toHaveBeenCalledWith('p1', 'app1', 'home', { content: edited }),
		);
		expect(editorMounts).toHaveBeenLastCalledWith(appsStore.pages[1].content);
	});

	it('does not save when nothing was edited', async () => {
		renderComponent({ props: { projectId: 'p1', appId: 'app1', pageId: 'home', app } });

		await vi.advanceTimersByTimeAsync(5000);

		expect(appsStore.updatePage).not.toHaveBeenCalled();
	});

	it('fetches the layout preview for the page on mount and on page change', async () => {
		const { rerender } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});

		await waitFor(() =>
			expect(appsStore.fetchLayoutPreview).toHaveBeenCalledWith('p1', 'app1', 'home'),
		);
		await rerender({ projectId: 'p1', appId: 'app1', pageId: 'about', app });
		await waitFor(() =>
			expect(appsStore.fetchLayoutPreview).toHaveBeenCalledWith('p1', 'app1', 'about'),
		);
	});

	it('keeps the editor inside the shell replica when the page has no layout', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});

		await waitFor(() => expect(appsStore.fetchLayoutPreview).toHaveBeenCalled());
		await waitFor(() =>
			expect(
				getByTestId('page-editor-menu').parentElement?.querySelector(
					'main.app-main [data-test-id="page-content-editor"]',
				),
			).not.toBeNull(),
		);
		expect(queryByTestId('page-editor-layout')).toBeNull();
	});

	it('renders the layout html and teleports the editor into its slot', async () => {
		appsStore.fetchLayoutPreview.mockResolvedValue(layout);
		const { getByTestId, queryByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});

		await waitFor(() => expect(getByTestId('page-editor-layout').textContent).toContain('Menu'));
		await waitFor(() =>
			expect(
				getByTestId('page-editor-layout').querySelector(
					'[data-app-slot] > [data-test-id="page-content-editor"]',
				),
			).not.toBeNull(),
		);
		expect(queryByTestId('page-editor-menu')).toBeNull();
	});

	it('keeps the last rendered layout and forwards the errors when the refetched layout fails', async () => {
		appsStore.fetchLayoutPreview.mockResolvedValue(layout);
		const { getByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});
		await waitFor(() => expect(getByTestId('page-editor-layout').textContent).toContain('Menu'));
		await userEvent.click(getByTestId('page-editor-layout-toggle'));

		appsStore.fetchLayoutPreview.mockResolvedValue({
			ownerPageId: 'home',
			html: '<div class="app-layout" data-app-root><main data-app-slot></main></div>',
			errors: { menu: 'boom' },
		});
		panelSaved();

		await waitFor(() =>
			expect(getByTestId('page-layout-panel').textContent).toContain('"menu":"boom"'),
		);
		expect(getByTestId('page-editor-layout').textContent).toContain('Menu');
	});

	it('switches the edited page for a layout link to a page of the app and swallows other links', async () => {
		appsStore.fetchLayoutPreview.mockResolvedValue(layout);
		const { getByTestId, emitted } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});
		await waitFor(() => expect(getByTestId('page-editor-layout').textContent).toContain('Menu'));

		expect(clickLink(getByTestId('layout-page-link'))).toBe(true);
		expect(emitted('update:pageId')).toEqual([['about']]);

		expect(clickLink(getByTestId('layout-external-link'))).toBe(true);
		expect(emitted('update:pageId')).toHaveLength(1);
	});

	it('toggles the layout panel and refetches the preview after it saves', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { projectId: 'p1', appId: 'app1', pageId: 'home', app },
		});
		await waitFor(() => expect(appsStore.fetchLayoutPreview).toHaveBeenCalledTimes(1));
		expect(queryByTestId('page-layout-panel')).toBeNull();

		await userEvent.click(getByTestId('page-editor-layout-toggle'));
		expect(getByTestId('page-layout-panel')).toBeInTheDocument();

		panelSaved();
		await waitFor(() => expect(appsStore.fetchLayoutPreview).toHaveBeenCalledTimes(2));

		await userEvent.click(getByTestId('page-editor-layout-toggle'));
		expect(queryByTestId('page-layout-panel')).toBeNull();
	});
});
