import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import PageEditor from '@/features/apps/components/PageEditor.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App, Page } from '@/features/apps/apps.types';

const editorMounts = vi.fn();
let emitContent: ((content: unknown) => void) | null = null;
vi.mock('@/features/apps/components/PageContentEditor.vue', () => ({
	default: defineComponent({
		props: { content: { type: Array, required: true }, projectId: String },
		emits: ['update:content'],
		setup(props, { emit }) {
			editorMounts(props.content);
			emitContent = (content) => emit('update:content', content);
			return () => h('div', { 'data-test-id': 'page-content-editor' });
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
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
});

const renderComponent = createComponentRenderer(PageEditor, { pinia: createTestingPinia() });

describe('PageEditor', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		appsStore = mockedStore(useAppsStore);
		appsStore.pages = [page('home', '', 'Home text'), page('about', 'about', 'About text')];
		appsStore.updatePage.mockResolvedValue(appsStore.pages[0]);
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
});
