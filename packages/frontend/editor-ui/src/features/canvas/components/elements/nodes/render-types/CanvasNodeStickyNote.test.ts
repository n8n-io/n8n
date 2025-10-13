import CanvasNodeStickyNote from './CanvasNodeStickyNote.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/canvas/__tests__/utils';
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
});
