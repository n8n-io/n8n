import Vue, { defineComponent, watch } from 'vue';
import type { PropType } from 'vue';
import { PiniaVuePlugin, createPinia } from 'pinia';
import { render, screen, fireEvent } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { mockSimplifiedNodeType } from './utils';
import NodesListPanel from '../Panel/NodesListPanel.vue';
import { REGULAR_NODE_CREATOR_VIEW } from '@/constants';
import type { NodeFilterType } from '@/Interface';

function TelemetryPlugin(vue: typeof Vue): void {
	Object.defineProperty(vue, '$telemetry', {
		get() {
			return {
				trackNodesPanel: () => {},
			};
		},
	});
	Object.defineProperty(vue.prototype, '$telemetry', {
		get() {
			return {
				trackNodesPanel: () => {},
			};
		},
	});
}

function getWrapperComponent(setup: () => void) {
	const wrapperComponent = defineComponent({
		props: {
			nodeTypes: {
				type: Array as PropType<INodeTypeDescription[]>,
				required: false,
			},
		},
		components: {
			NodesListPanel,
		},
		setup,
		template: '<NodesListPanel @nodeTypeSelected="e => $emit(\'nodeTypeSelected\', e)" />',
	});

	return render(
		wrapperComponent,
		{
			pinia: createPinia(),
		},
		(vue) => {
			vue.use(PiniaVuePlugin);
			vue.use(TelemetryPlugin);
		},
	);
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

			await Vue.nextTick();
			expect(screen.getByText('Select a trigger')).toBeInTheDocument();
			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
			screen.getByText('On app event').click();
			await Vue.nextTick();
			expect(screen.queryByTestId('node-creator-search-bar')).not.toBeInTheDocument();
			mockedTriggerNodes.forEach((n) => {
				expect(screen.queryByText(n.name)).toBeInTheDocument();
			});

			mockedRegularNodes.forEach((n) => {
				expect(screen.queryByText(n.name)).not.toBeInTheDocument();
			});

			expect(container.querySelector('.backButton')).toBeInTheDocument();

			fireEvent.click(container.querySelector('.backButton')!);
			await Vue.nextTick();

			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(6);
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
				components: {
					NodesListPanel,
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

			render(
				wrapperComponent,
				{
					pinia: createPinia(),
					props: {
						nodeTypes: mockedNodes,
						selectedView: REGULAR_NODE_CREATOR_VIEW,
					},
				},
				(vue) => {
					vue.use(PiniaVuePlugin);
					vue.use(TelemetryPlugin);
				},
			);

			await Vue.nextTick();
			expect(screen.getByText('What happens next?')).toBeInTheDocument();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(6);

			screen.getByText('Action in an app').click();
			await Vue.nextTick();
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
			props: {
				nodeTypes: {
					type: Array as PropType<INodeTypeDescription[]>,
					required: true,
				},
			},
			components: {
				NodesListPanel,
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

		function renderComponent() {
			return render(
				wrapperComponent,
				{
					pinia: createPinia(),
					props: {
						nodeTypes: mockedNodes,
					},
				},
				(vue) => {
					vue.use(PiniaVuePlugin);
					vue.use(TelemetryPlugin);
				},
			);
		}

		it('should be visible in the root view', async () => {
			renderComponent();
			await Vue.nextTick();

			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
		});
		it('should not be visible if subcategory contains less than 9 items', async () => {
			renderComponent();
			await Vue.nextTick();

			screen.getByText('On app event').click();
			await Vue.nextTick();
			expect(screen.queryByTestId('node-creator-search-bar')).not.toBeInTheDocument();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(8);
		});
		it('should be visible if subcategory contains 9 or more items', async () => {
			const { updateProps } = renderComponent();
			await Vue.nextTick();

			mockedNodes.push(
				mockSimplifiedNodeType({
					name: 'Ninth node',
					displayName: 'Ninth node',
					group: ['trigger'],
				}),
			);

			await updateProps({ nodeTypes: [...mockedNodes] });
			await Vue.nextTick();

			screen.getByText('On app event').click();
			await Vue.nextTick();

			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(9);
			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
		});

		it('should correctly handle search', async () => {
			const { container } = renderComponent();
			await Vue.nextTick();

			screen.getByText('On app event').click();
			await Vue.nextTick();

			fireEvent.input(screen.getByTestId('node-creator-search-bar'), {
				target: { value: 'Ninth' },
			});
			await Vue.nextTick();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(1);

			fireEvent.input(screen.getByTestId('node-creator-search-bar'), {
				target: { value: 'Non sense' },
			});
			await Vue.nextTick();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(0);
			expect(screen.queryByText("We didn't make that... yet")).toBeInTheDocument();

			fireEvent.click(container.querySelector('.clear')!);
			await Vue.nextTick();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(9);
		});
	});
});
