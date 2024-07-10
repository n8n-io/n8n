import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { NodeConnectionType } from 'n8n-workflow';
import { createCanvasNodeProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

const renderComponent = createComponentRenderer(CanvasNodeDefault);

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasNodeDefault', () => {
	it('should render node correctly', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		expect(getByTestId('canvas-default-node')).toMatchSnapshot();
	});

	describe('outputs', () => {
		it('should adjust height css variable based on the number of outputs (1 output)', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								outputs: [{ type: NodeConnectionType.Main, index: 0 }],
							},
						}),
					},
				},
			});

			const nodeElement = getByText('Test Node').closest('.node');
			expect(nodeElement).toHaveStyle({ '--canvas-node--main-output-count': '1' }); // height calculation based on the number of outputs
		});

		it('should adjust height css variable based on the number of outputs (multiple outputs)', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								outputs: [
									{ type: NodeConnectionType.Main, index: 0 },
									{ type: NodeConnectionType.Main, index: 0 },
									{ type: NodeConnectionType.Main, index: 0 },
								],
							},
						}),
					},
				},
			});

			const nodeElement = getByText('Test Node').closest('.node');
			expect(nodeElement).toHaveStyle({ '--canvas-node--main-output-count': '3' }); // height calculation based on the number of outputs
		});
	});

	describe('selected', () => {
		it('should apply selected class when node is selected', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({ selected: true }),
					},
				},
			});
			expect(getByText('Test Node').closest('.node')).toHaveClass('selected');
		});

		it('should not apply selected class when node is not selected', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});
			expect(getByText('Test Node').closest('.node')).not.toHaveClass('selected');
		});
	});

	describe('disabled', () => {
		it('should apply disabled class when node is disabled', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								disabled: true,
							},
						}),
					},
				},
			});

			expect(getByText('Test Node').closest('.node')).toHaveClass('disabled');
			expect(getByText('(Deactivated)')).toBeVisible();
		});

		it('should not apply disabled class when node is enabled', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});
			expect(getByText('Test Node').closest('.node')).not.toHaveClass('disabled');
		});
	});

	describe('running', () => {
		it('should apply running class when node is running', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({ data: { execution: { running: true } } }),
					},
				},
			});
			expect(getByText('Test Node').closest('.node')).toHaveClass('running');
		});
	});

	describe('configurable', () => {
		it('should render configurable node correctly', () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								render: {
									type: 'default',
									options: { configurable: true },
								},
							},
						}),
					},
				},
			});

			expect(getByTestId('canvas-configurable-node')).toMatchSnapshot();
		});

		describe('inputs', () => {
			it('should adjust width css variable based on the number of non-main inputs', () => {
				const { getByText } = renderComponent({
					global: {
						provide: {
							...createCanvasNodeProvide({
								data: {
									inputs: [
										{ type: NodeConnectionType.Main, index: 0 },
										{ type: NodeConnectionType.AiTool, index: 0 },
										{ type: NodeConnectionType.AiDocument, index: 0, required: true },
										{ type: NodeConnectionType.AiMemory, index: 0, required: true },
									],
									render: {
										type: 'default',
										options: {
											configurable: true,
										},
									},
								},
							}),
						},
					},
				});

				const nodeElement = getByText('Test Node').closest('.node');
				expect(nodeElement).toHaveStyle({ '--configurable-node--input-count': '3' });
			});
		});
	});

	describe('configuration', () => {
		it('should render configuration node correctly', () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								render: {
									type: 'default',
									options: { configuration: true },
								},
							},
						}),
					},
				},
			});

			expect(getByTestId('canvas-configuration-node')).toMatchSnapshot();
		});

		it('should render configurable configuration node correctly', () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								render: {
									type: 'default',
									options: { configurable: true, configuration: true },
								},
							},
						}),
					},
				},
			});

			expect(getByTestId('canvas-configurable-node')).toMatchSnapshot();
		});
	});
});
