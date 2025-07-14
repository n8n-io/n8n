import CanvasNodeRenderer from '@/components/canvas/elements/nodes/CanvasNodeRenderer.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide, createCanvasProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CanvasNodeRenderType } from '@/types';

const renderComponent = createComponentRenderer(CanvasNodeRenderer);

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasNodeRenderer', () => {
	it('should render default node correctly', async () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide(),
				},
			},
		});

		expect(getByTestId('canvas-default-node')).toBeInTheDocument();
	});

	it('should render configuration node correctly', async () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.Default,
								options: { configuration: true },
							},
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-configuration-node')).toBeInTheDocument();
	});

	it('should render configurable node correctly', async () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.Default,
								options: { configurable: true },
							},
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-configurable-node')).toBeInTheDocument();
	});
});
