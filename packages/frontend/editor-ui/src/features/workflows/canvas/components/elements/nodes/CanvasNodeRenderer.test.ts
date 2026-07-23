import CanvasNodeRenderer from './CanvasNodeRenderer.vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CanvasNodeRenderType } from '../../../canvas.types';

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({ value: actual.createEmptyCanvasRenderData() })),
	};
});

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

	it('should dispatch to the agent card for AI Agent nodes', async () => {
		// Stub the card itself — this asserts the renderer dispatches to it; the
		// card's own behaviour is covered in CanvasNodeAgent.test.ts.
		const { getByTestId } = renderComponent({
			global: {
				stubs: {
					CanvasNodeAgent: { template: '<div data-test-id="canvas-node-agent" />' },
				},
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							type: 'n8n-nodes-base.messageAnAgent',
							render: {
								type: CanvasNodeRenderType.Agent,
								options: { agentId: { __rl: true, mode: 'list', value: '' } },
							},
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-agent')).toBeInTheDocument();
	});
});
