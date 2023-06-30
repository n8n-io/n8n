import { defineComponent, watch, nextTick } from 'vue';
import type { PropType } from 'vue';
import { PiniaVuePlugin, createPinia, setActivePinia } from 'pinia';
import { render, screen, fireEvent } from '@testing-library/vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { mockSimplifiedNodeType } from './utils';
import NodesListPanel from '../Panel/NodesListPanel.vue';
import { REGULAR_NODE_CREATOR_VIEW } from '@/constants';
import type { NodeFilterType } from '@/Interface';
import { TelemetryPlugin } from '@/plugins/telemetry';

let pinia: ReturnType<typeof createPinia>;
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

	return render(wrapperComponent, {
		pinia,
		global: {
			plugins: [PiniaVuePlugin, TelemetryPlugin],
		},
	});
}

vitest.useFakeTimers();
describe('NodesListPanel', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		// settingsStore = useSettingsStore();
		// sourceControlStore = useSourceControlStore();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});
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
				console.log('Merged nodes: ', useNodeCreatorStore().mergedNodes);
				return {};
			});

			await nextTick();
			vitest.advanceTimersByTime(400);
			expect(screen.getByText('Select a trigger')).toBeInTheDocument();
			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
			screen.getAllByText('On app event')[0].click();

			await nextTick();
			vitest.advanceTimersByTime(400);
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
			vitest.advanceTimersByTime(400);

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

			render(wrapperComponent, {
				props: {
					nodeTypes: mockedNodes,
					selectedView: REGULAR_NODE_CREATOR_VIEW,
				},
				global: {
					plugins: [PiniaVuePlugin, TelemetryPlugin],
				},
			});

			await nextTick();
			vitest.advanceTimersByTime(400);
			expect(screen.getByText('What happens next?')).toBeInTheDocument();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(6);

			screen.getByText('Action in an app').click();
			await nextTick();
			vitest.advanceTimersByTime(400);
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
			return render(wrapperComponent, {
				props: {
					nodeTypes: mockedNodes,
				},
				global: {
					plugins: [PiniaVuePlugin, TelemetryPlugin],
				},
			});
		}

		it('should be visible in the root view', async () => {
			renderComponent();
			await nextTick();

			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
		});
		it('should not be visible if subcategory contains less than 9 items', async () => {
			renderComponent();
			await nextTick();
			vitest.advanceTimersByTime(400);

			screen.getAllByText('On app event')[0].click();
			await nextTick();
			vitest.advanceTimersByTime(400);
			expect(screen.queryByTestId('node-creator-search-bar')).not.toBeInTheDocument();
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(8);
		});
		it('should be visible if subcategory contains 9 or more items', async () => {
			const { rerender } = renderComponent();
			await nextTick();
			vitest.advanceTimersByTime(400);

			mockedNodes.push(
				mockSimplifiedNodeType({
					name: 'Ninth node',
					displayName: 'Ninth node',
					group: ['trigger'],
				}),
			);

			await rerender({ nodeTypes: [...mockedNodes] });
			await nextTick();
			vitest.advanceTimersByTime(400);

			screen.getAllByText('On app event')[0].click();
			await nextTick();
			vitest.advanceTimersByTime(400);

			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(9);
			expect(screen.queryByTestId('node-creator-search-bar')).toBeInTheDocument();
		});

		it('should correctly handle search', async () => {
			const { container } = renderComponent();
			await nextTick();
			vitest.advanceTimersByTime(400);

			screen.getAllByText('On app event')[0].click();
			await nextTick();
			vitest.advanceTimersByTime(400);

			await fireEvent.input(screen.getByTestId('node-creator-search-bar'), {
				target: { value: 'Ninth' },
			});
			await nextTick();
			vitest.advanceTimersByTime(400);
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(1);

			await fireEvent.input(screen.getByTestId('node-creator-search-bar'), {
				target: { value: 'Non sense' },
			});
			await nextTick();
			vitest.advanceTimersByTime(400);
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(0);
			expect(screen.queryByText("We didn't make that... yet")).toBeInTheDocument();

			await fireEvent.click(container.querySelector('.clear')!);
			await nextTick();
			vitest.advanceTimersByTime(400);
			expect(screen.queryAllByTestId('item-iterator-item')).toHaveLength(9);
		});
	});
});
