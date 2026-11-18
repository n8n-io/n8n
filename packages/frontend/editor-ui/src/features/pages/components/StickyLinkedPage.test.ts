import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, h } from 'vue';
import { useRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';

import StickyLinkedPage from './StickyLinkedPage.vue';

const PageEditorStub = vi.hoisted(() => ({ component: undefined as unknown }));

vi.mock('@n8n/frontend-module-page', async (importOriginal) => {
	const { PAGE_SHORT_LINK_VIEW } =
		await importOriginal<typeof import('@n8n/frontend-module-page')>();
	PageEditorStub.component = defineComponent({
		props: { pageId: String, readonly: Boolean },
		emits: ['notFound', 'saveStatus'],
		setup(props, { emit }) {
			return () =>
				h('div', { 'data-test-id': 'page-editor-stub', 'data-readonly': String(props.readonly) }, [
					h('input', { 'data-test-id': 'page-editor-stub-input' }),
					h('button', {
						'data-test-id': 'page-editor-stub-not-found',
						onClick: () => emit('notFound'),
					}),
					h('button', {
						'data-test-id': 'page-editor-stub-saved',
						onClick: () => emit('saveStatus', 'saved'),
					}),
					props.pageId,
				]);
		},
	});
	return { PAGE_SHORT_LINK_VIEW, PageEditor: PageEditorStub.component };
});

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: vi.fn().mockReturnValue({
		push: vi.fn().mockResolvedValue(undefined),
		resolve: vi.fn(({ params }: { params: { pageId: string } }) => ({
			href: `/page/${params.pageId}`,
		})),
	}),
}));

const renderComponent = createComponentRenderer(StickyLinkedPage, {
	props: { pageId: 'abc123' },
});

/** Renders the component inside an element that records the events that reach the canvas. */
function renderInsideCanvas(eventName: string) {
	const reachedCanvas = vi.fn();
	const canvas = document.createElement('div');
	canvas.addEventListener(eventName, reachedCanvas);
	document.body.appendChild(canvas);
	return { reachedCanvas, ...renderComponent({ container: canvas }) };
}

describe('StickyLinkedPage', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should show the editor of the page', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('page-editor-stub')).toHaveTextContent('abc123');
		expect(getByTestId('page-editor-stub')).toHaveAttribute('data-readonly', 'false');
	});

	it('should show the page without editing on a read-only canvas', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { readOnly: true } });

		expect(getByTestId('page-editor-stub')).toHaveAttribute('data-readonly', 'true');
		expect(queryByTestId('sticky-linked-page-edit-link')).not.toBeInTheDocument();
	});

	it('should ask to edit the link', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('sticky-linked-page-edit-link'));

		expect(emitted()).toHaveProperty('editLink');
	});

	it('should link to the page', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('sticky-linked-page-open')).toHaveAttribute('href', '/page/abc123');
	});

	it('should open the page in this tab on a plain click', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('sticky-linked-page-open'));

		expect(useRouter().push).toHaveBeenCalledWith(
			expect.objectContaining({ params: { pageId: 'abc123' } }),
		);
	});

	it('should leave a click with a modifier key to the browser', async () => {
		const { getByTestId } = renderComponent();
		// jsdom cannot follow a link.
		getByTestId('sticky-linked-page-open').addEventListener('click', (event) =>
			event.preventDefault(),
		);

		await fireEvent.click(getByTestId('sticky-linked-page-open'), { metaKey: true });

		expect(useRouter().push).not.toHaveBeenCalled();
	});

	it('should show a message when the page is not found', async () => {
		const { getByTestId, queryByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-editor-stub-not-found'));

		expect(getByTestId('sticky-linked-page-not-found')).toHaveTextContent(
			'Page not found or not accessible',
		);
		expect(queryByTestId('page-editor-stub')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('sticky-linked-page-not-found-edit-link'));
		expect(emitted()).toHaveProperty('editLink');
	});

	it('should show the save status', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('page-editor-stub-saved'));

		expect(getByTestId('sticky-linked-page-save-status')).toHaveTextContent('Saved');
	});

	it.each(['keydown', 'dblclick', 'contextmenu'])(
		'should keep a %s in the page away from the canvas',
		async (eventName) => {
			const { reachedCanvas, getByTestId } = renderInsideCanvas(eventName);

			await fireEvent(
				getByTestId('page-editor-stub-input'),
				new Event(eventName, { bubbles: true }),
			);

			expect(reachedCanvas).not.toHaveBeenCalled();
		},
	);

	it('should mark the page area as not draggable and outside the canvas shortcuts', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('sticky-linked-page-body')).toHaveClass(
			'nodrag',
			'nopan',
			'ignore-key-press-canvas',
		);
	});
});
