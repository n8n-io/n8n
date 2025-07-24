import CanvasNodeRenderer from '@/components/canvas/elements/nodes/CanvasNodeRenderer.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide, createCanvasProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CanvasNodeRenderType } from '@/types';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestWorkflowObject } from '@/__tests__/mocks';

const renderComponent = createComponentRenderer(CanvasNodeRenderer);

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const workflowsStore = useWorkflowsStore();
	const workflowObject = createTestWorkflowObject(workflowsStore.workflow);
	workflowsStore.getCurrentWorkflow = vi.fn().mockReturnValue(workflowObject);
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
