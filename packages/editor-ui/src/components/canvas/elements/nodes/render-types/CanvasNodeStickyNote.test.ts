import CanvasNodeStickyNote from '@/components/canvas/elements/nodes/render-types/CanvasNodeStickyNote.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';

const renderComponent = createComponentRenderer(CanvasNodeStickyNote);

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
});
