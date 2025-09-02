import {
	createTestNode,
	defaultNodeDescriptions,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import VirtualSchema from '@/components/VirtualSchema.vue';
import * as nodeHelpers from '@/composables/useNodeHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	IF_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
} from '@/constants';
import type { IWorkflowDb } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/dom';
import { userEvent } from '@testing-library/user-event';
import { cleanup, waitFor } from '@testing-library/vue';
import {
	createResultOk,
	NodeConnectionTypes,
	type IBinaryData,
	type INodeExecutionData,
} from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import { defaultSettings } from '../__tests__/defaults';
import { usePostHog } from '../stores/posthog.store';
import { useSchemaPreviewStore } from '../stores/schemaPreview.store';
import { useSettingsStore } from '../stores/settings.store';

const mockNode1 = createTestNode({
	name: 'Manual Trigger',
	type: MANUAL_TRIGGER_NODE_TYPE,
	typeVersion: 1,
	disabled: false,
	credentials: undefined,
});

const mockNode2 = createTestNode({
	name: 'Set2',
	type: SET_NODE_TYPE,
	typeVersion: 1,
	disabled: false,
});

const disabledNode = createTestNode({
	name: 'Disabled Node',
	type: SET_NODE_TYPE,
	typeVersion: 1,
	disabled: true,
});

const ifNode = createTestNode({
	name: 'If',
	type: IF_NODE_TYPE,
	typeVersion: 1,
	disabled: false,
});

const aiTool = createTestNode({
	name: 'AI Tool',
	type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
	typeVersion: 1,
	disabled: false,
});

const nodeWithCredential = createTestNode({
	name: 'Notion',
	type: 'n8n-nodes-base.notion',
	typeVersion: 1,
	credentials: { notionApi: { id: 'testId', name: 'testName' } },
	disabled: false,
});

const unknownNodeType = createTestNode({
	name: 'Unknown Node Type',
	type: 'unknown',
});

const splitInBatchesNode = createTestNode({
	name: 'SplitInBatches',
	type: SPLIT_IN_BATCHES_NODE_TYPE,
	typeVersion: 1,
	disabled: false,
});

const customerDatastoreNode = createTestNode({
	name: 'Customer Datastore',
	type: 'n8n-nodes-base.n8nTrainingCustomerDatastore',
	typeVersion: 1,
	disabled: false,
});

const defaultNodes = [
	{ name: 'Manual Trigger', indicies: [], depth: 1 },
	{ name: 'Set2', indicies: [], depth: 2 },
];

async function setupStore() {
	const workflow = {
		id: '123',
		name: 'Test Workflow',
		connections: {},
		active: true,
		nodes: [
			mockNode1,
			mockNode2,
			disabledNode,
			ifNode,
			aiTool,
			unknownNodeType,
			nodeWithCredential,
			splitInBatchesNode,
			customerDatastoreNode,
		],
	};

	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const ndvStore = useNDVStore();
	settingsStore.setSettings(defaultSettings);

	nodeTypesStore.setNodeTypes([
		...defaultNodeDescriptions,
		mockNodeTypeDescription({
			name: MANUAL_TRIGGER_NODE_TYPE,
			outputs: [NodeConnectionTypes.Main],
		}),
		mockNodeTypeDescription({
			name: IF_NODE_TYPE,
			outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		}),
		mockNodeTypeDescription({
			name: 'n8n-nodes-base.notion',
			outputs: [NodeConnectionTypes.Main],
		}),
		mockNodeTypeDescription({
			name: SPLIT_IN_BATCHES_NODE_TYPE,
			outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		}),
		mockNodeTypeDescription({
			name: 'n8n-nodes-base.n8nTrainingCustomerDatastore',
			outputs: [NodeConnectionTypes.Main],
		}),
	]);
	workflowsStore.workflow = workflow as IWorkflowDb;
	ndvStore.setActiveNodeName('Test Node Name', 'other');

	return pinia;
}

function mockNodeOutputData(nodeName: string, data: INodeExecutionData[], outputIndex = 0) {
	const originalNodeHelpers = nodeHelpers.useNodeHelpers();
	vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
		return {
			...originalNodeHelpers,
			getLastRunIndexWithData: vi.fn(() => 0),
			hasNodeExecuted: vi.fn(() => true),
			getNodeInputData: vi.fn((node, _, output) => {
				if (node.name === nodeName && output === outputIndex) {
					return data;
				}
				return [];
			}),
		};
	});
}

describe('VirtualSchema.vue', () => {
	let renderComponent: ReturnType<typeof createComponentRenderer>;

	const DynamicScrollerStub = {
		props: {
			items: Array,
		},
		template:
			'<div><template v-for="item in items"><slot v-bind="{ item }"></slot></template></div>',
		methods: {
			scrollToItem: vi.fn(),
		},
	};

	const DynamicScrollerItemStub = {
		template: '<slot></slot>',
	};
	const NoticeStub = {
		template: '<div v-bind="$attrs"><slot></slot></div>',
	};

	beforeEach(async () => {
		cleanup();
		vi.resetAllMocks();
		vi.setSystemTime('2025-01-01');
		const pinia = await setupStore();

		renderComponent = createComponentRenderer(VirtualSchema, {
			global: {
				stubs: {
					DynamicScroller: DynamicScrollerStub,
					DynamicScrollerItem: DynamicScrollerItemStub,
					N8nIcon: true,
					Notice: NoticeStub,
				},
			},
			pinia,
			props: {
				mappingEnabled: true,
				paneType: 'input',
				connectionType: 'main',
				search: '',
				nodes: defaultNodes,
			},
		});
	});

	it('renders schema for empty data for unexecuted nodes', async () => {
		const { getAllByText } = renderComponent();

		await waitFor(() => expect(getAllByText('Execute previous nodes').length).toBe(1));
	});

	it('renders schema for empty data with binary', async () => {
		mockNodeOutputData(mockNode1.name, [{ json: {}, binary: { data: mock<IBinaryData>() } }]);

		const { getByText } = renderComponent({
			props: { nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }] },
		});

		await waitFor(() =>
			expect(
				getByText("Only binary data exists. View it using the 'Binary' tab"),
			).toBeInTheDocument(),
		);
	});

	it('renders schema for data', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [
				{ json: { name: 'John', age: 22, hobbies: ['surfing', 'traveling'] } },
				{ json: { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] } },
			],
		});
		useWorkflowsStore().pinData({
			node: mockNode2,
			data: [
				{ json: { name: 'John', age: 22, hobbies: ['surfing', 'traveling'] } },
				{ json: { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] } },
			],
		});

		const { getAllByTestId } = renderComponent();
		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers.length).toBe(3);
			expect(headers[0]).toHaveTextContent('Manual Trigger');
			expect(headers[0]).toHaveTextContent('2 items');
			expect(headers[1]).toHaveTextContent('Set2');

			const items = getAllByTestId('run-data-schema-item');

			expect(items[0]).toHaveTextContent('nameJohn');
			expect(items[1]).toHaveTextContent('age22');
			expect(items[2]).toHaveTextContent('hobbies');
			expect(items[3]).toHaveTextContent('hobbies[0]surfing');
			expect(items[4]).toHaveTextContent('hobbies[1]traveling');
		});
	});

	it('renders schema in output pane', async () => {
		const { container, getAllByTestId } = renderComponent({
			props: {
				nodes: [],
				paneType: 'output',
				node: mockNode1,
				data: [
					{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] },
					{ name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] },
				],
			},
		});

		await waitFor(() => {
			const items = getAllByTestId('run-data-schema-item');
			expect(items).toHaveLength(5);
		});

		expect(container).toMatchSnapshot();
	});

	it('renders schema with spaces and dots', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [
				{
					json: {
						'hello world': [
							{
								test: {
									'more to think about': 1,
								},
								'test.how': 'ignore',
							},
						],
					},
				},
			],
		});

		const { container, getAllByTestId } = renderComponent();

		await waitFor(() => {
			const items = getAllByTestId('run-data-schema-item');
			expect(items).toHaveLength(5);
		});

		expect(container).toMatchSnapshot();
	});

	it('renders no data to show for data empty objects', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [{ json: {} }, { json: {} }],
		});

		const { getAllByText } = renderComponent();
		await waitFor(() =>
			expect(getAllByText("No fields - item(s) exist, but they're empty").length).toBe(1),
		);
	});

	// this can happen when setting the output to [{}]
	it('renders empty state to show for empty data', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [{} as INodeExecutionData],
		});

		const { getAllByText } = renderComponent({ props: { paneType: 'output' } });
		await waitFor(() =>
			expect(
				getAllByText('No fields - node executed, but no items were sent on this branch').length,
			).toBe(1),
		);
	});

	it('renders disabled nodes correctly', async () => {
		const { getAllByTestId } = renderComponent({
			props: {
				nodes: [{ name: disabledNode.name, indicies: [], depth: 1 }],
			},
		});
		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers[0]).toHaveTextContent(`${disabledNode.name} (Deactivated)`);
		});
	});

	it('renders schema for correct output branch', async () => {
		mockNodeOutputData(
			'If',
			[{ json: { id: 1, name: 'John' } }, { json: { id: 2, name: 'Jane' } }],
			1,
		);
		const { getAllByTestId } = renderComponent({
			props: {
				nodes: [{ name: 'If', indicies: [1], depth: 2 }],
			},
		});

		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers[0]).toHaveTextContent('If');
			expect(headers[0]).toHaveTextContent('2 items');
		});
	});

	it('renders schema for specific output branch when outputIndex is specified', async () => {
		const originalNodeHelpers = nodeHelpers.useNodeHelpers();
		vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
			return {
				...originalNodeHelpers,
				getLastRunIndexWithData: vi.fn(() => 0),
				hasNodeExecuted: vi.fn(() => true),
				getNodeInputData: vi.fn((node, _, outputIndex) => {
					if (node.name === 'If' && outputIndex === 1) {
						return [{ json: { doneItems: 'done branch data' } }];
					}
					if (node.name === 'If' && outputIndex === 0) {
						return [{ json: { loopItems: 'loop branch data' } }];
					}
					return [];
				}),
			};
		});

		const { getAllByTestId } = renderComponent({
			props: {
				nodes: [{ name: 'If', indicies: [0, 1], depth: 2 }],
				outputIndex: 1,
			},
		});

		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers[0]).toHaveTextContent('If');
			expect(headers[0]).toHaveTextContent('1 item');

			const items = getAllByTestId('run-data-schema-item');
			expect(items[0]).toHaveTextContent('doneItemsdone branch data');
		});
	});

	it('renders previous nodes schema for AI tools', async () => {
		mockNodeOutputData(
			'If',
			[{ json: { id: 1, name: 'John' } }, { json: { id: 2, name: 'Jane' } }],
			0,
		);
		const { getAllByTestId } = renderComponent({
			props: {
				nodes: [
					{
						name: 'If',
						indicies: [], // indicies are not set for AI tools
						depth: 2,
					},
				],
				node: aiTool,
			},
		});

		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers[0]).toHaveTextContent('If');
			expect(headers[0]).toHaveTextContent('2 items');
			expect(headers[0]).toMatchSnapshot();
		});
	});

	it('renders its own data for AI tools in debug mode', async () => {
		const { getByTestId } = renderComponent({
			props: {
				nodes: [], // in debug mode nodes are empty
				node: aiTool,
				data: [{ output: 'AI tool output' }],
			},
		});

		await waitFor(() =>
			expect(getByTestId('run-data-schema-item')).toHaveTextContent('AI tool output'),
		);
	});

	test.each([[[{ tx: false }, { tx: false }]], [[{ tx: '' }, { tx: '' }]], [[{ tx: [] }]]])(
		'renders schema instead of showing no data for %o',
		async (data) => {
			useWorkflowsStore().pinData({
				node: mockNode1,
				data: data.map((item) => ({ json: item })),
			});

			const { getAllByTestId } = renderComponent();
			await waitFor(() =>
				expect(getAllByTestId('run-data-schema-item')[0]).toHaveTextContent('tx'),
			);
		},
	);

	it('should filter invalid connections', async () => {
		const { pinData } = useWorkflowsStore();
		pinData({
			node: mockNode1,
			data: [{ json: { tx: 1 } }],
		});
		pinData({
			node: mockNode2,
			data: [{ json: { tx: 2 } }],
		});

		const { getAllByTestId } = renderComponent({
			props: {
				nodes: [
					{ name: mockNode1.name, indicies: [], depth: 1 },
					{ name: 'unknown', indicies: [], depth: 1 },
					{ name: mockNode2.name, indicies: [], depth: 1 },
					{ name: unknownNodeType.name, indicies: [], depth: 1 },
				],
			},
		});

		await waitFor(() => {
			expect(getAllByTestId('run-data-schema-header')).toHaveLength(3);
			expect(getAllByTestId('run-data-schema-item').length).toBe(1);
		});
	});

	it('should show connections', async () => {
		const ndvStore = useNDVStore();
		vi.spyOn(ndvStore, 'ndvNodeInputNumber', 'get').mockReturnValue({
			[defaultNodes[0].name]: [0],
			[defaultNodes[1].name]: [0, 1, 2],
		});

		const { getAllByTestId } = renderComponent();

		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers.length).toBe(3);
			expect(headers[0]).toHaveTextContent('Input 0');
			expect(headers[1]).toHaveTextContent('Inputs 0, 1, 2');
		});
	});

	describe('telemetry', () => {
		function dragDropPill(pill: HTMLElement) {
			const ndvStore = useNDVStore();
			const reset = vi.spyOn(ndvStore, 'resetMappingTelemetry');
			fireEvent(pill, new MouseEvent('mousedown', { bubbles: true, button: 0, buttons: 1 }));
			fireEvent(window, new MouseEvent('mousemove', { bubbles: true, button: 0, buttons: 1 }));
			expect(reset).toHaveBeenCalled();

			vi.useRealTimers();
			vi.useFakeTimers({ toFake: ['setTimeout'] });
			fireEvent(window, new MouseEvent('mouseup', { bubbles: true }));
			vi.advanceTimersByTime(250);
			vi.useRealTimers();
		}

		it('should track data pill drag and drop', async () => {
			useWorkflowsStore().pinData({
				node: mockNode1,
				data: [{ json: { name: 'John', age: 22, hobbies: ['surfing', 'traveling'] } }],
			});
			const telemetry = useTelemetry();
			const trackSpy = vi.spyOn(telemetry, 'track');

			const { getAllByTestId } = renderComponent();

			await waitFor(() => {
				expect(getAllByTestId('run-data-schema-item')).toHaveLength(5);
			});
			const items = getAllByTestId('run-data-schema-item');

			expect(items[0].className).toBe('schema-item draggable');
			expect(items[0]).toHaveTextContent('nameJohn');

			const pill = items[0].querySelector('.pill') as HTMLElement;
			dragDropPill(pill);

			await waitFor(() =>
				expect(trackSpy).toHaveBeenCalledWith(
					'User dragged data for mapping',
					expect.objectContaining({
						src_view: 'schema',
						src_field_name: 'name',
						src_field_nest_level: 0,
						src_node_type: 'n8n-nodes-base.manualTrigger',
						src_nodes_back: '1',
						src_has_credential: false,
					}),
				),
			);
		});

		it('should track data pill drag and drop for schema preview', async () => {
			const telemetry = useTelemetry();
			const trackSpy = vi.spyOn(telemetry, 'track');
			const posthogStore = usePostHog();

			vi.spyOn(posthogStore, 'isVariantEnabled').mockReturnValue(true);
			const schemaPreviewStore = useSchemaPreviewStore();
			vi.spyOn(schemaPreviewStore, 'getSchemaPreview').mockResolvedValue(
				createResultOk({
					type: 'object',
					properties: {
						account: {
							type: 'object',
							properties: {
								id: {
									type: 'string',
								},
							},
						},
					},
				}),
			);

			const { getAllByTestId } = renderComponent({
				props: {
					nodes: [{ name: nodeWithCredential.name, indicies: [], depth: 1 }],
				},
			});

			await waitFor(() => {
				expect(getAllByTestId('run-data-schema-item')).toHaveLength(2);
			});
			const pill = getAllByTestId('run-data-schema-item')[0].querySelector('.pill') as HTMLElement;
			dragDropPill(pill);

			await waitFor(() =>
				expect(trackSpy).toHaveBeenCalledWith(
					'User dragged data for mapping',
					expect.objectContaining({
						src_view: 'schema_preview',
						src_has_credential: true,
					}),
				),
			);
		});
	});

	it('should expand all nodes when searching', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [{ json: { name: 'John' } }],
		});
		useWorkflowsStore().pinData({
			node: mockNode2,
			data: [{ json: { name: 'John' } }],
		});

		const { getAllByTestId, queryAllByTestId, rerender, container } = renderComponent();

		let headers: HTMLElement[] = [];
		await waitFor(async () => {
			headers = getAllByTestId('run-data-schema-header');
			expect(headers.length).toBe(3);
			expect(getAllByTestId('run-data-schema-item').length).toBe(1);
		});

		// Collapse first node (expanded by default)
		await userEvent.click(headers[0]);

		expect(queryAllByTestId('run-data-schema-item').length).toBe(0);

		await rerender({ search: 'John' });

		expect(getAllByTestId('run-data-schema-item').length).toBe(2);
		expect(container).toMatchSnapshot();
	});

	it('renders preview schema when enabled and available', async () => {
		useWorkflowsStore().pinData({
			node: mockNode2,
			data: [],
		});
		const posthogStore = usePostHog();
		vi.spyOn(posthogStore, 'isVariantEnabled').mockReturnValue(true);
		const schemaPreviewStore = useSchemaPreviewStore();
		vi.spyOn(schemaPreviewStore, 'getSchemaPreview').mockResolvedValue(
			createResultOk({
				type: 'object',
				properties: {
					account: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
							},
						},
					},
				},
			}),
		);

		const { getAllByTestId, queryAllByText, container } = renderComponent({
			props: {
				nodes: [{ name: mockNode2.name, indicies: [], depth: 1 }],
			},
		});

		await waitFor(() => {
			expect(getAllByTestId('run-data-schema-header')).toHaveLength(2);
		});

		expect(getAllByTestId('schema-preview-warning')).toHaveLength(1);
		expect(queryAllByText("No fields - item(s) exist, but they're empty")).toHaveLength(0);
		expect(container).toMatchSnapshot();
	});

	it('renders variables and context section', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [],
		});

		const { getAllByTestId, container } = renderComponent({
			props: {
				nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
			},
		});

		let headers: HTMLElement[] = [];

		await waitFor(() => {
			headers = getAllByTestId('run-data-schema-header');
			expect(headers).toHaveLength(2);
			expect(headers[1]).toHaveTextContent('Variables and context');
		});

		await userEvent.click(headers[1]);

		await waitFor(() => {
			const items = getAllByTestId('run-data-schema-item');

			expect(items).toHaveLength(11);
			expect(items[0]).toHaveTextContent('$now');
			expect(items[1]).toHaveTextContent('$today');
			expect(items[2]).toHaveTextContent('$vars');
			expect(items[3]).toHaveTextContent('$execution');
			expect(items[7]).toHaveTextContent('$workflow');
		});

		expect(container).toMatchSnapshot();
	});

	it('renders schema for empty objects and arrays', async () => {
		useWorkflowsStore().pinData({
			node: mockNode1,
			data: [{ json: { empty: {}, emptyArray: [], nested: [{ empty: {}, emptyArray: [] }] } }],
		});

		const { container, getAllByTestId } = renderComponent({
			props: {
				nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
			},
		});

		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers.length).toBe(2);
		});
		expect(container).toMatchSnapshot();
	});

	it('does not filter single-output connected nodes by outputIndex', async () => {
		// This test verifies the fix for the issue where nodes with single output connections
		// were incorrectly being filtered by the current node's outputIndex
		const originalNodeHelpers = nodeHelpers.useNodeHelpers();
		vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
			return {
				...originalNodeHelpers,
				getLastRunIndexWithData: vi.fn(() => 0),
				hasNodeExecuted: vi.fn(() => true),
				getNodeInputData: vi.fn((node, _, outputIndex) => {
					// Switch node has data on output 0
					if (node.name === 'If' && outputIndex === 0) {
						return [{ json: { id: 1, name: 'John' } }, { json: { id: 2, name: 'Jane' } }];
					}
					// No data on output 1
					if (node.name === 'If' && outputIndex === 1) {
						return [];
					}
					return [];
				}),
			};
		});

		const { getAllByTestId } = renderComponent({
			props: {
				// If node is connected only via output 0 to the current node
				nodes: [{ name: 'If', indicies: [0], depth: 2 }],
				// Even though outputIndex is 1, the If node should still show its data
				// because it only has a single connection (output 0)
				outputIndex: 1,
			},
		});

		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers[0]).toHaveTextContent('If');
			// Should show 2 items from output 0, not filtered by outputIndex: 1
			expect(headers[0]).toHaveTextContent('2 items');

			const items = getAllByTestId('run-data-schema-item');
			// Should show the data from output 0
			expect(items[0]).toHaveTextContent('id1');
			expect(items[1]).toHaveTextContent('nameJohn');
		});
	});

	it('renders schema for loop node done-branch with correct filtering', async () => {
		// Mock customer datastore output - 6 customer items
		const customerData = Array.from({ length: 6 }, (_, i) => ({
			json: {
				id: i + 1,
				name: `Customer ${i + 1}`,
				email: `customer${i + 1}@example.com`,
				status: 'active',
			},
		}));

		// Mock SplitInBatches node processing the loop with multiple items on output 0 (loop branch)
		// and final completion signal on output 1 (done branch)
		const originalNodeHelpers = nodeHelpers.useNodeHelpers();
		vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
			return {
				...originalNodeHelpers,
				getLastRunIndexWithData: vi.fn(() => 0),
				hasNodeExecuted: vi.fn(() => true),
				getNodeInputData: vi.fn((node, _, outputIndex) => {
					if (node.name === 'Customer Datastore') {
						return customerData;
					}
					if (node.name === 'SplitInBatches' && outputIndex === 0) {
						// Loop branch: return individual customer items processed one by one
						return customerData; // Multiple items being processed
					}
					if (node.name === 'SplitInBatches' && outputIndex === 1) {
						// Done branch: return completion signal with aggregated results
						return [
							{ json: { processed: 6, completed: true, summary: 'All customers processed' } },
						];
					}
					return [];
				}),
			};
		});

		// Test the done branch (outputIndex: 1) specifically
		const { getAllByTestId } = renderComponent({
			props: {
				nodes: [
					{ name: 'Customer Datastore', indicies: [], depth: 1 },
					{ name: 'SplitInBatches', indicies: [0, 1], depth: 2 },
				],
				outputIndex: 1, // Specifically viewing the done branch
			},
		});

		await waitFor(() => {
			const headers = getAllByTestId('run-data-schema-header');
			expect(headers).toHaveLength(3); // Customer Datastore, SplitInBatches, and Variables

			// Check Customer Datastore (first header)
			expect(headers[0]).toHaveTextContent('Customer Datastore');

			// Check SplitInBatches shows only 1 item from the done branch (not 6 from loop branch)
			expect(headers[1]).toHaveTextContent('SplitInBatches');
			expect(headers[1]).toHaveTextContent('1 item');

			// This is the key assertion: the SplitInBatches node shows "1 item" instead of "6 items"
			// which proves that the outputIndex filtering is working correctly for the done branch
		});
	});
});
