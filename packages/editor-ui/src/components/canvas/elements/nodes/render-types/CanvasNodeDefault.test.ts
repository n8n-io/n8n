import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { NodeConnectionType } from 'n8n-workflow';
import { createCanvasNodeProvide, createCanvasProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';

const renderComponent = createComponentRenderer(CanvasNodeDefault, {
	global: {
		provide: {
			...createCanvasProvide(),
		},
	},
});

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

	describe('inputs', () => {
		it('should adjust height css variable based on the number of inputs (1 input)', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								inputs: [{ type: NodeConnectionType.Main, index: 0 }],
							},
						}),
					},
				},
			});

			const nodeElement = getByText('Test Node').closest('.node');
			expect(nodeElement).toHaveStyle({ '--canvas-node--main-input-count': '1' }); // height calculation based on the number of inputs
		});

		it('should adjust height css variable based on the number of inputs (multiple inputs)', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								inputs: [
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
			expect(nodeElement).toHaveStyle({ '--canvas-node--main-input-count': '3' }); // height calculation based on the number of inputs
		});
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

		it('should render strike-through when node is disabled and has node input and output handles', () => {
			const { container } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								disabled: true,
								inputs: [{ type: NodeConnectionType.Main, index: 0 }],
								outputs: [{ type: NodeConnectionType.Main, index: 0 }],
								connections: {
									[CanvasConnectionMode.Input]: {
										[NodeConnectionType.Main]: [
											[{ node: 'node', type: NodeConnectionType.Main, index: 0 }],
										],
									},
									[CanvasConnectionMode.Output]: {
										[NodeConnectionType.Main]: [
											[{ node: 'node', type: NodeConnectionType.Main, index: 0 }],
										],
									},
								},
							},
						}),
					},
				},
			});

			expect(container.querySelector('.disabledStrikeThrough')).toBeVisible();
		});
	});

	describe('waiting', () => {
		it('should apply waiting class when node is waiting', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({ data: { execution: { running: true, waiting: '123' } } }),
					},
				},
			});
			expect(getByText('Test Node').closest('.node')).toHaveClass('waiting');
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
									type: CanvasNodeRenderType.Default,
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
										type: CanvasNodeRenderType.Default,
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
									type: CanvasNodeRenderType.Default,
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
									type: CanvasNodeRenderType.Default,
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

	describe('trigger', () => {
		it('should render trigger node correctly', () => {
			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								render: {
									type: CanvasNodeRenderType.Default,
									options: { trigger: true },
								},
							},
						}),
					},
				},
			});

			expect(getByTestId('canvas-trigger-node')).toMatchSnapshot();
		});
	});
});
