import CanvasNodeStickyNote from './CanvasNodeStickyNote.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore } from '@/__tests__/utils';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: vi.fn().mockReturnValue({ options: { history: { base: '/' } } }),
}));

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({ value: actual.createEmptyCanvasRenderData() })),
	};
});

const renderComponent = createComponentRenderer(CanvasNodeStickyNote, {
	global: {
		stubs: {
			StickyLinkedPage: {
				props: ['pageId', 'readOnly'],
				emits: ['editLink'],
				template:
					'<div data-test-id="sticky-linked-page" :data-page-id="pageId" :data-read-only="String(readOnly)"><button data-test-id="edit-link" @click="$emit(\'editLink\')" /></div>',
			},
		},
	},
});

function provideStickyWithContent(content: string, options: { readOnly?: boolean } = {}) {
	return createCanvasNodeProvide({
		id: 'sticky',
		readOnly: options.readOnly,
		data: { render: { type: CanvasNodeRenderType.StickyNote, options: { content } } },
	});
}

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasNodeStickyNote', () => {
	it('should render node correctly', () => {
		const { html } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						id: 'sticky',
					}),
				},
			},
		});

		expect(html()).toMatchSnapshot();
	});

	it('should disable resizing when node is readonly', () => {
		const { container } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						id: 'sticky',
						readOnly: true,
					}),
				},
			},
		});

		const resizeControls = container.querySelectorAll('.vue-flow__resize-control');

		expect(resizeControls).toHaveLength(0);
	});

	it('should disable sticky options when in edit mode', async () => {
		const { container } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						id: 'sticky',
						readOnly: false,
					}),
				},
			},
		});

		const stickyTextarea = container.querySelector('.sticky-textarea');

		if (!stickyTextarea) return;

		await fireEvent.dblClick(stickyTextarea);

		const stickyOptions = container.querySelector('.sticky-options');

		if (!stickyOptions) return;

		expect(getComputedStyle(stickyOptions).display).toBe('none');
	});

	it('should emit "activate" on double click', async () => {
		const { container, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						id: 'sticky',
					}),
				},
			},
		});

		const sticky = container.querySelector('.sticky-textarea');
		if (!sticky) throw new Error('Sticky not found');

		await fireEvent.dblClick(sticky);

		expect(emitted()).toHaveProperty('activate');
	});

	it('should emit "deactivate" on blur', async () => {
		const { container, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						id: 'sticky',
					}),
				},
			},
		});

		const sticky = container.querySelector('.sticky-textarea');

		if (!sticky) throw new Error('Sticky not found');

		await fireEvent.dblClick(sticky);

		const stickyTextarea = container.querySelector('.sticky-textarea textarea');
		if (!stickyTextarea) throw new Error('Textarea not found');

		await fireEvent.blur(stickyTextarea);

		expect(emitted()).toHaveProperty('deactivate');
	});

	describe('linked page', () => {
		beforeEach(() => {
			mockedStore(useSettingsStore).isModuleActive.mockReturnValue(true);
		});

		it.each([
			['a path', '/page/abc123'],
			['an absolute URL of this instance', `${window.location.origin}/page/abc123`],
			['a markdown link', '[Runbook](/page/abc123)'],
		])('should render the page when the content is only %s', (_, content) => {
			const { getByTestId } = renderComponent({
				global: { provide: provideStickyWithContent(content) },
			});

			expect(getByTestId('sticky-linked-page')).toHaveAttribute('data-page-id', 'abc123');
		});

		it.each([
			['plain text', "I'm a note"],
			['a link inside a sentence', 'See /page/abc123 for details'],
			['a link to a workflow', '/workflow/abc123'],
		])('should render the markdown when the content is %s', (_, content) => {
			const { queryByTestId } = renderComponent({
				global: { provide: provideStickyWithContent(content) },
			});

			expect(queryByTestId('sticky-linked-page')).not.toBeInTheDocument();
		});

		it('should render the markdown when the page module is off', () => {
			mockedStore(useSettingsStore).isModuleActive.mockReturnValue(false);

			const { queryByTestId, getByText } = renderComponent({
				global: { provide: provideStickyWithContent('/page/abc123') },
			});

			expect(queryByTestId('sticky-linked-page')).not.toBeInTheDocument();
			expect(getByText('/page/abc123')).toBeInTheDocument();
		});

		it('should pass the read-only mode of the canvas to the page', () => {
			const { getByTestId } = renderComponent({
				global: { provide: provideStickyWithContent('/page/abc123', { readOnly: true }) },
			});

			expect(getByTestId('sticky-linked-page')).toHaveAttribute('data-read-only', 'true');
		});

		it('should switch to the text editing of the link on request', async () => {
			const { getByTestId, queryByTestId, emitted } = renderComponent({
				global: { provide: provideStickyWithContent('/page/abc123') },
			});

			await fireEvent.click(getByTestId('edit-link'));

			expect(emitted()).toHaveProperty('activate');
			expect(queryByTestId('sticky-linked-page')).not.toBeInTheDocument();
		});
	});
});
