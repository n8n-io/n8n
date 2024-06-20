import { defineComponent, nextTick, watch } from 'vue';
import type { PropType } from 'vue';
import { createPinia } from 'pinia';
import { screen, fireEvent } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { mockSimplifiedNodeType } from './utils';
import NodesListPanel from '../Panel/NodesListPanel.vue';
import { REGULAR_NODE_CREATOR_VIEW } from '@/constants';
import type { NodeFilterType } from '@/Interface';
import { createComponentRenderer } from '@/__tests__/render';

function getWrapperComponent(setup: () => void) {
	const wrapperComponent = defineComponent({
		components: {
			NodesListPanel,
		},
		props: {
			nodeTypes: {
				type: Array as PropType<INodeTypeDescription[]>,
				required: false,
			},
		},
		setup,
		template: '<NodesListPanel @nodeTypeSelected="e => $emit(\'nodeTypeSelected\', e)" />',
	});

	return createComponentRenderer(wrapperComponent, {
		global: {
			plugins: [createPinia()],
		},
	})();
}

describe('NodesListPanel', () => {
	describe('should render nodes', () => {
		it('should render trigger items', async () => {
			const mockedTriggerNodes = [...Array(2).keys()].map((n) =>
				mockSimplifiedNodeType({
					name: `Trigger Node ${n}`,
					displayName: `Trigger Node ${n}`,
					group: ['trigger'],
				}),
			);
			const mockedRegularNodes = [...Array(2).keys()].map((n) =>
				mockSimplifiedNodeType({
					name: `Regular Node ${n}`,
					displayName: `Regular Node ${n}`,
					group: ['input'],
				}),
			);

			const { container } = getWrapperComponent(() => {
				const { setMergeNodes } = useNodeCreatorStore();

				setMergeNodes([...mockedTriggerNodes, ...mockedRegularNodes]);
				return {};
			});

			await nextTick();
			expect(screen.getByText('What triggers this workflow?')).toBeInTheDocument();
			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
			screen.getByText('On app event').click();
			await nextTick();
			expect(screen.queryByTestId('node-creator-search-bar')).not.toBeInTheDocument();
			mockedTriggerNodes.forEach((n) => {
				expect(screen.queryByText(n.name)).toBeInTheDocument();
			});

			mockedRegularNodes.forEach((n) => {
				expect(screen.queryByText(n.name)).not.toBeInTheDocument();
			});

			expect(container.querySelector('.backButton')).toBeInTheDocument();

			await fireEvent.click(container.querySelector('.backButton')!);
			await nextTick();

			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(8);
		});

		it('should render regular nodes', async () => {
			const mockedNodes = [...Array(8).keys()].map((n) =>
				mockSimplifiedNodeType({
					name: `Node ${n}`,
					displayName: `Node ${n}`,
					group: ['input'],
				}),
			);

			const wrapperComponent = defineComponent({
				components: {
					NodesListPanel,
				},
				props: {
					nodeTypes: {
						type: Array as PropType<INodeTypeDescription[]>,
						required: true,
					},
					selectedView: {
						type: String as PropType<NodeFilterType>,
						default: REGULAR_NODE_CREATOR_VIEW,
						required: false,
					},
				},
				setup(props) {
					const { setActions, setMergeNodes, setSelectedView } = useNodeCreatorStore();

					watch(
						() => props.nodeTypes,
						(nodeTypes: INodeTypeDescription[]) => {
							setMergeNodes([...nodeTypes]);
						},
						{ immediate: true },
					);
					watch(
						() => props.selectedView,
						(selectedView: NodeFilterType) => {
							setSelectedView(selectedView);
						},
						{ immediate: true },
					);
				},
				template: '<NodesListPanel @nodeTypeSelected="e => $emit(\'nodeTypeSelected\', e)" />',
			});

			const renderComponent = createComponentRenderer(wrapperComponent);

			renderComponent({
				pinia: createPinia(),
				props: {
					nodeTypes: mockedNodes,
					selectedView: REGULAR_NODE_CREATOR_VIEW,
				},
			});

			await nextTick();
			expect(screen.getByText('What happens next?')).toBeInTheDocument();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(5);

			screen.getByText('Action in an app').click();
			await nextTick();
			mockedNodes.forEach((n) => {
				expect(screen.queryByText(n.displayName)).toBeInTheDocument();
			});
		});
	});

	describe('should search nodes', () => {
		const mockedNodes = [...Array(8).keys()].map((n) =>
			mockSimplifiedNodeType({
				name: `Node ${n}`,
				displayName: `Node ${n}`,
				group: ['trigger'],
			}),
		);

		const wrapperComponent = defineComponent({
			components: {
				NodesListPanel,
			},
			props: {
				nodeTypes: {
					type: Array as PropType<INodeTypeDescription[]>,
					required: true,
				},
			},
			setup(props) {
				const { setMergeNodes } = useNodeCreatorStore();

				watch(
					() => props.nodeTypes,
					(nodeTypes: INodeTypeDescription[]) => {
						setMergeNodes([...nodeTypes]);
					},
					{ immediate: true },
				);
			},
			template: '<NodesListPanel @nodeTypeSelected="e => $emit(\'nodeTypeSelected\', e)" />',
		});

		const renderComponent = createComponentRenderer(wrapperComponent, {
			pinia: createPinia(),
			props: {
				nodeTypes: mockedNodes,
			},
		});

		it('should be visible in the root view', async () => {
			renderComponent();
			await nextTick();

			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
		});
		it('should not be visible if subcategory contains less than 9 items', async () => {
			renderComponent();
			await nextTick();

			screen.getByText('On app event').click();
			await nextTick();
			expect(screen.queryByTestId('node-creator-search-bar')).not.toBeInTheDocument();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(8);
		});
		it('should be visible if subcategory contains 9 or more items', async () => {
			const { rerender } = renderComponent();
			await nextTick();

			mockedNodes.push(
				mockSimplifiedNodeType({
					name: 'Ninth node',
					displayName: 'Ninth node',
					group: ['trigger'],
				}),
			);

			await rerender({ nodeTypes: [...mockedNodes] });
			await nextTick();

			screen.getByText('On app event').click();
			await nextTick();

			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(9);
			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
		});

		it('should correctly handle search', async () => {
			const { container } = renderComponent();
			await nextTick();

			screen.getByText('On app event').click();
			await nextTick();

			await fireEvent.input(screen.getByTestId('node-creator-search-bar'), {
				target: { value: 'Ninth' },
			});
			await nextTick();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(1);

			await fireEvent.input(screen.getByTestId('node-creator-search-bar'), {
				target: { value: 'Non sense' },
			});
			await nextTick();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(0);
			expect(screen.queryByText("We didn't make that... yet")).toBeInTheDocument();

			await fireEvent.click(container.querySelector('.clear')!);
			await nextTick();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(9);
		});
	});
});
