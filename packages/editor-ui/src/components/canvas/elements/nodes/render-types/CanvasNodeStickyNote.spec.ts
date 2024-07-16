import CanvasNodeStickyNote from '@/components/canvas/elements/nodes/render-types/CanvasNodeStickyNote.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

const renderComponent = createComponentRenderer(CanvasNodeStickyNote);

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasNodeStickyNote', () => {
	it('should render node correctly', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						id: 'sticky',
					}),
				},
			},
		});

		expect(getByTestId('canvas-sticky-note-node')).toMatchSnapshot();
	});
});
