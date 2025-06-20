import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createCanvasNodeProvide, createCanvasProvide } from '@/__tests__/data';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CanvasConnectionMode, CanvasNodeRenderType } from '@/types';
import { fireEvent } from '@testing-library/vue';

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

	describe('inputs and outputs', () => {
		it.each([
			[1, 1, '100px'],
			[3, 1, '100px'],
			[4, 1, '140px'],
			[1, 1, '100px'],
			[1, 3, '100px'],
			[1, 4, '140px'],
			[4, 4, '140px'],
		])(
			'should adjust height css variable based on the number of inputs and outputs (%i inputs, %i outputs)',
			(inputCount, outputCount, expected) => {
				const { getByText } = renderComponent({
					global: {
						provide: {
							...createCanvasNodeProvide({
								data: {
									inputs: Array.from({ length: inputCount }).map(() => ({
										type: NodeConnectionTypes.Main,
										index: 0,
									})),
									outputs: Array.from({ length: outputCount }).map(() => ({
										type: NodeConnectionTypes.Main,
										index: 0,
									})),
								},
							}),
						},
					},
				});

				const nodeElement = getByText('Test Node').closest('.node');
				expect(nodeElement).toHaveStyle({ '--canvas-node--height': expected });
			},
		);
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
								inputs: [{ type: NodeConnectionTypes.Main, index: 0 }],
								outputs: [{ type: NodeConnectionTypes.Main, index: 0 }],
								connections: {
									[CanvasConnectionMode.Input]: {
										[NodeConnectionTypes.Main]: [
											[{ node: 'node', type: NodeConnectionTypes.Main, index: 0 }],
										],
									},
									[CanvasConnectionMode.Output]: {
										[NodeConnectionTypes.Main]: [
											[{ node: 'node', type: NodeConnectionTypes.Main, index: 0 }],
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
			it.each([
				[
					'1 required',
					[{ type: NodeConnectionTypes.AiLanguageModel, index: 0, required: true }],
					'240px',
				],
				[
					'2 required, 1 optional',
					[
						{ type: NodeConnectionTypes.AiTool, index: 0 },
						{ type: NodeConnectionTypes.AiDocument, index: 0, required: true },
						{ type: NodeConnectionTypes.AiMemory, index: 0, required: true },
					],
					'240px',
				],
				[
					'2 required, 2 optional',
					[
						{ type: NodeConnectionTypes.AiTool, index: 0 },
						{ type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						{ type: NodeConnectionTypes.AiDocument, index: 0, required: true },
						{ type: NodeConnectionTypes.AiMemory, index: 0, required: true },
					],
					'240px',
				],
				[
					'1 required, 4 optional',
					[
						{ type: NodeConnectionTypes.AiLanguageModel, index: 0, required: true },
						{ type: NodeConnectionTypes.AiTool, index: 0 },
						{ type: NodeConnectionTypes.AiDocument, index: 0 },
						{ type: NodeConnectionTypes.AiMemory, index: 0 },
						{ type: NodeConnectionTypes.AiMemory, index: 0 },
					],
					'280px',
				],
			])(
				'should adjust width css variable based on the number of non-main inputs (%s)',
				(_, nonMainInputs, expected) => {
					const { getByText } = renderComponent({
						global: {
							provide: {
								...createCanvasNodeProvide({
									data: {
										inputs: [{ type: NodeConnectionTypes.Main, index: 0 }, ...nonMainInputs],
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
					expect(nodeElement).toHaveStyle({ '--canvas-node--width': expected });
				},
			);
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

	it('should emit "activate" on double click', async () => {
		const { getByText, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await fireEvent.dblClick(getByText('Test Node'));

		expect(emitted()).toHaveProperty('activate');
	});
});
