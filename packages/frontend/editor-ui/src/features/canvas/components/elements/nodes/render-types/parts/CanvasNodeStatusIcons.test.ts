import CanvasNodeStatusIcons from './CanvasNodeStatusIcons.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide, createCanvasProvide } from '@/features/canvas/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { CanvasNodeDirtiness, CanvasNodeRenderType } from '../../../../../canvas.types';

const renderComponent = createComponentRenderer(CanvasNodeStatusIcons, {
	pinia: createTestingPinia(),
});

describe('CanvasNodeStatusIcons', () => {
	it('should render correctly for a pinned node', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({ data: { pinnedData: { count: 5, visible: true } } }),
				},
			},
		});

		expect(getByTestId('canvas-node-status-pinned')).toBeInTheDocument();
	});

	it('should not render pinned icon when disabled', () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: { disabled: true, pinnedData: { count: 5, visible: true } },
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-pinned')).not.toBeInTheDocument();
	});

	describe('executing', () => {
		it('should not show node as executing if workflow is not executing', () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide({
							isExecuting: false,
						}),
						...createCanvasNodeProvide({ data: { execution: { running: true } } }),
					},
				},
			});

			expect(() => getByTestId('canvas-node-status-running')).toThrow();
		});

		it('should render running node correctly', () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide({
							isExecuting: true,
						}),
						...createCanvasNodeProvide({ data: { execution: { running: true } } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-running')).toBeVisible();
		});
	});

	it('should render correctly for a node that ran successfully', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'success', running: false },
							runData: { outputMap: {}, iterations: 15, visible: true },
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-status-success')).toHaveTextContent('15');
	});

	it('should not render success icon for a node that was canceled', () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'canceled', running: false },
							runData: { outputMap: {}, iterations: 15, visible: true },
						},
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-success')).not.toBeInTheDocument();
	});

	it('should render correctly for a dirty node that has run successfully', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							runData: { outputMap: {}, iterations: 15, visible: true },
							render: {
								type: CanvasNodeRenderType.Default,
								options: { dirtiness: CanvasNodeDirtiness.PARAMETERS_UPDATED },
							},
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-status-warning')).toBeInTheDocument();
	});

	describe('status precedence', () => {
		it('should render executing status even if node is invalid', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide({
							isExecuting: true,
						}),
						...createCanvasNodeProvide({
							data: {
								execution: { running: true },
								runData: { outputMap: {}, iterations: 15, visible: true },
								render: {
									type: CanvasNodeRenderType.Default,
									options: { dirtiness: CanvasNodeDirtiness.PARAMETERS_UPDATED },
								},
							},
						}),
					},
				},
			});

			expect(getByTestId('canvas-node-status-running')).toBeVisible();
			expect(queryByTestId('canvas-node-status-warning')).not.toBeInTheDocument();
		});

		it('should render executing status even if node is disabled', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide({
							isExecuting: true,
						}),
						...createCanvasNodeProvide({
							data: {
								disabled: true,
								execution: { running: true },
								runData: { outputMap: {}, iterations: 15, visible: true },
								render: {
									type: CanvasNodeRenderType.Default,
									options: { dirtiness: CanvasNodeDirtiness.PARAMETERS_UPDATED },
								},
							},
						}),
					},
				},
			});

			expect(getByTestId('canvas-node-status-running')).toBeVisible();
			expect(queryByTestId('canvas-node-status-warning')).not.toBeInTheDocument();
		});
	});
});
