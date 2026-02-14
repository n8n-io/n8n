import {
	createTestNode,
	defaultNodeDescriptions,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import VirtualSchema from './VirtualSchema.vue';
import * as nodeHelpers from '@/app/composables/useNodeHelpers';
import { useTelemetry } from '@/app/composables/useTelemetry';
import * as calloutHelpers from '@/app/composables/useCalloutHelpers';
import {
	IF_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
} from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/dom';
import { userEvent } from '@testing-library/user-event';
import { cleanup, waitFor } from '@testing-library/vue';
import { computed } from 'vue';
import {
	createResultOk,
	NodeConnectionTypes,
	type IBinaryData,
	type INodeExecutionData,
} from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import { defaultSettings } from '@/__tests__/defaults';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { useSettingsStore } from '@/app/stores/settings.store';

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

const mergeNode = createTestNode({
	name: 'Merge',
	type: 'n8n-nodes-base.merge',
	typeVersion: 3,
	disabled: false,
});

const defaultNodes = [
	{ name: 'Manual Trigger', indicies: [], depth: 1 },
	{ name: 'Set2', indicies: [], depth: 2 },
];

// Mock i18n keys used in the component
const mockI18nKeys: Record<string, string> = {
	'dataMapping.schemaView.emptyData':
		'No fields - node executed, but no items were sent on this branch',
	'dataMapping.schemaView.emptySchema': "No fields - item(s) exist, but they're empty",
	'dataMapping.schemaView.emptySchemaWithBinary':
		"Only binary data exists. View it using the 'Binary' tab",
	'dataMapping.schemaView.executeSchema': '{link} to view input data',
	'dataMapping.schemaView.variablesContextTitle': 'Variables and context',
	'dataMapping.schemaView.variablesUpgrade':
		'Set global variables and use them across workflows with the Pro or Enterprise plan. <a href="https://docs.n8n.io/code/variables/" target="_blank">Details</a>',
	'dataMapping.schemaView.variablesEmpty':
		'Create variables that can be used across workflows <a href="/variables" target="_blank">here</a>',
	'dataMapping.schemaView.execution.resumeUrl': "The URL for resuming a 'Wait' node",
	'dataMapping.schemaView.preview':
		'Usually outputs the following fields. {execute} to see the actual ones. {link}',
	'dataMapping.schemaView.previewLastExecution':
		'The fields below come from the last successful execution. {execute} to refresh them.',
	'dataMapping.schemaView.previewLastExecution.executePreviousNodes': 'Execute node',
	'dataMapping.schemaView.preview.executeNode': 'Execute the node',
	'dataMapping.schemaView.mergeNotice':
		'This schema shows fields from multiple items. Some fields may be absent in individual items.',
	'node.disabled': 'Deactivated',
	'ndv.input.noOutputData.executePrevious': 'Execute previous nodes',
	'ndv.search.noNodeMatch.title': 'No matching nodes',
	'ndv.search.noMatchSchema.description': 'Try different search terms or {link}',
	'ndv.search.noMatchSchema.description.link': 'clear search',
	'generic.learnMore': 'Learn more',
};

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
			mergeNode,
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
		mockNodeTypeDescription({
			name: 'n8n-nodes-base.merge',
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

	const N8nLinkStub = {
		template:
			'<button v-bind="$attrs" @click="(e) => { e.stopPropagation(); $emit(\'click\', e); }"><slot></slot></button>',
	};

	const N8nCalloutStub = {
		template:
			'<div class="n8n-callout" v-bind="$attrs"><slot></slot><slot name="trailingContent"></slot></div>',
	};

	const NodeIconStub = {
		template: '<node-icon-stub :node-type="nodeType.name" :size="size"></node-icon-stub>',
		props: ['node-type', 'size'],
	};

	beforeEach(async () => {
		cleanup();
		vi.resetAllMocks();
		vi.setSystemTime('2025-01-01');
		const pinia = await setupStore();

		vi.spyOn(calloutHelpers, 'useCalloutHelpers').mockReturnValue({
			isCalloutDismissed: vi.fn(() => false),
			dismissCallout: vi.fn(),
			openSampleWorkflowTemplate: vi.fn(),
			getTutorialTemplatesNodeCreatorItems: vi.fn(() => []),
			isRagStarterCalloutVisible: computed(() => false),
		});

		renderComponent = createComponentRenderer(VirtualSchema, {
			global: {
				stubs: {
					DynamicScroller: DynamicScrollerStub,
					DynamicScrollerItem: DynamicScrollerItemStub,
					N8nIcon: true,
					N8nLink: N8nLinkStub,
					N8nCallout: N8nCalloutStub,
					Notice: NoticeStub,
					NodeIcon: NodeIconStub,
				},
				mocks: {
					$locale: {
						baseText: (key: string) => mockI18nKeys[key] || key,
					},
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

		const { getAllByText } = renderComponent({
			props: { nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }] },
		});

		// When there's empty JSON data with binary data, it should show the binary warning
		await waitFor(() => {
			expect(getAllByText("Only binary data exists. View it using the 'Binary' tab").length).toBe(
				1,
			);
		});
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
			fireEvent(
				pill,
				new MouseEvent('mousedown', {
					bubbles: true,
					button: 0,
					buttons: 1,
					clientX: 100,
					clientY: 100,
				}),
			);
			fireEvent(
				window,
				new MouseEvent('mousemove', {
					bubbles: true,
					button: 0,
					buttons: 1,
					clientX: 120,
					clientY: 120,
				}),
			);
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

	describe('previewExecution prop', () => {
		it('should use preview execution data when node has not executed', async () => {
			// Create a preview execution with proper structure
			const previewExecutionData = {
				id: 'preview-123',
				finished: true,
				mode: 'manual' as const,
				status: 'success' as const,
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: { id: '1', name: 'Test', nodes: [], connections: {}, active: true },
				data: {
					resultData: {
						runData: {
							[mockNode1.name]: [
								{
									startTime: Date.now(),
									executionTime: 100,
									source: [],
									data: {
										main: [[{ json: { previewField: 'preview data from execution' } }]],
									},
								},
							],
						},
					},
				},
			};

			const originalNodeHelpers = nodeHelpers.useNodeHelpers();
			vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
				return {
					...originalNodeHelpers,
					getLastRunIndexWithData: vi.fn((nodeName, _outputIndex, _connectionType, previewData) => {
						// When preview data is passed, return a valid run index
						if (previewData && nodeName === mockNode1.name) {
							return 0;
						}
						return -1;
					}),
					hasNodeExecuted: vi.fn(() => {
						// Node hasn't executed in the main workflow
						return false;
					}),
					getNodeInputData: vi.fn(
						(node, _runIndex, _outputIndex, _paneType, _connectionType, previewData) => {
							// When preview data is provided and we're asking for mockNode1, return preview data
							if (previewData && node.name === mockNode1.name) {
								return [{ json: { previewField: 'preview data from execution' } }];
							}
							return [];
						},
					),
					getNodeTaskData: vi.fn(),
				};
			});

			const { getAllByTestId } = renderComponent({
				props: {
					nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
					previewExecution: previewExecutionData,
				},
			});

			await waitFor(() => {
				const headers = getAllByTestId('run-data-schema-header');
				expect(headers.length).toBeGreaterThan(0);
				expect(headers[0]).toHaveTextContent('Manual Trigger');
				// The header shows either "1 item" or "Preview" depending on the state
				// We just verify the header is rendered
			});

			// Verify that preview data fields are shown
			await waitFor(() => {
				const items = getAllByTestId('run-data-schema-item');
				expect(items.length).toBeGreaterThan(0);
				expect(items[0].textContent).toContain('previewField');
			});
		});

		it('should show regular data when node has executed even with previewExecution prop', async () => {
			const previewExecutionData = {
				id: 'preview-123',
				finished: true,
				mode: 'manual' as const,
				status: 'success' as const,
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: { id: '1', name: 'Test', nodes: [], connections: {}, active: true },
				data: {
					resultData: {
						runData: {
							[mockNode1.name]: [
								{
									startTime: Date.now(),
									executionTime: 100,
									source: [],
									data: {
										main: [[{ json: { previewField: 'preview data' } }]],
									},
								},
							],
						},
					},
				},
			};

			useWorkflowsStore().pinData({
				node: mockNode1,
				data: [{ json: { actualField: 'actual executed data' } }],
			});

			const { getAllByTestId } = renderComponent({
				props: {
					nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
					previewExecution: previewExecutionData,
				},
			});

			await waitFor(() => {
				const items = getAllByTestId('run-data-schema-item');
				expect(items.length).toBeGreaterThan(0);
				expect(items[0]).toHaveTextContent('actualField');
				expect(items[0]).not.toHaveTextContent('previewField');
			});
		});

		it('should handle empty preview execution data gracefully', async () => {
			const previewExecutionData = {
				id: 'preview-123',
				finished: true,
				mode: 'manual' as const,
				status: 'success' as const,
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: { id: '1', name: 'Test', nodes: [], connections: {}, active: true },
				data: {
					resultData: {
						runData: {},
					},
				},
			};

			const { getAllByText } = renderComponent({
				props: {
					nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
					previewExecution: previewExecutionData,
				},
			});

			await waitFor(() => {
				expect(getAllByText('Execute previous nodes').length).toBe(1);
			});
		});
	});

	describe('execute event emission', () => {
		it('should emit execute event when schema preview execute link is clicked', async () => {
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
						name: { type: 'string' },
						age: { type: 'number' },
					},
				}),
			);

			const { emitted, getByText } = renderComponent({
				props: {
					nodes: [{ name: mockNode2.name, indicies: [], depth: 1 }],
				},
			});

			const executeLink = await waitFor(() => getByText('Execute the node'));
			expect(executeLink).toBeInTheDocument();

			fireEvent.click(executeLink);

			await waitFor(() => {
				expect(emitted()).toHaveProperty('execute');
				expect(emitted().execute[0]).toEqual([mockNode2.name]);
			});
		});
	});

	describe('trigger node schema preview', () => {
		it('should not call getSchemaPreview for trigger nodes', async () => {
			const schemaPreviewStore = useSchemaPreviewStore();
			const getSchemaPreviewSpy = vi.spyOn(schemaPreviewStore, 'getSchemaPreview');

			const { getAllByText } = renderComponent({
				props: {
					nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
				},
			});

			await waitFor(() => {
				expect(getAllByText('Execute previous nodes').length).toBe(1);
			});

			expect(getSchemaPreviewSpy).not.toHaveBeenCalled();
		});

		it('should call getSchemaPreview for non-trigger nodes without data', async () => {
			const schemaPreviewStore = useSchemaPreviewStore();
			const getSchemaPreviewSpy = vi
				.spyOn(schemaPreviewStore, 'getSchemaPreview')
				.mockResolvedValue(
					createResultOk({
						type: 'object',
						properties: {
							id: { type: 'string' },
						},
					}),
				);

			const { getAllByTestId } = renderComponent({
				props: {
					nodes: [{ name: mockNode2.name, indicies: [], depth: 1 }],
				},
			});

			await waitFor(() => {
				expect(getAllByTestId('run-data-schema-header')).toHaveLength(2);
			});

			expect(getSchemaPreviewSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeType: SET_NODE_TYPE,
				}),
			);
		});
	});

	describe('empty data detection with preview', () => {
		it('should detect single empty object as empty data', async () => {
			useWorkflowsStore().pinData({
				node: mockNode1,
				data: [{ json: {} }],
			});

			const { getAllByText } = renderComponent({
				props: {
					nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
					paneType: 'output',
				},
			});

			await waitFor(() => {
				expect(
					getAllByText('No fields - node executed, but no items were sent on this branch').length,
				).toBe(1);
			});
		});

		it('should show pinData when available even with preview execution', async () => {
			useWorkflowsStore().pinData({
				node: mockNode1,
				data: [{ json: { pinnedField: 'pinned data' } }],
			});

			const previewExecutionData = {
				id: 'preview-123',
				finished: true,
				mode: 'manual' as const,
				status: 'success' as const,
				startedAt: new Date(),
				createdAt: new Date(),
				workflowData: { id: '1', name: 'Test', nodes: [], connections: {}, active: true },
				data: {
					resultData: {
						runData: {
							[mockNode1.name]: [
								{
									startTime: Date.now(),
									executionTime: 100,
									source: [],
									data: {
										main: [[{ json: { name: 'Preview Data' } }]],
									},
								},
							],
						},
					},
				},
			};

			const { getAllByTestId, queryAllByTestId } = renderComponent({
				props: {
					nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
					previewExecution: previewExecutionData,
					paneType: 'input',
				},
			});

			await waitFor(() => {
				// Should show pinned data, not preview data
				const items = getAllByTestId('run-data-schema-item');
				expect(items.length).toBeGreaterThan(0);
				expect(items[0].textContent).toContain('pinnedField');
			});

			// Verify preview data is NOT shown
			const allItems = queryAllByTestId('run-data-schema-item');
			const hasPreviewData = allItems.some((item) => item.textContent?.includes('Preview Data'));
			expect(hasPreviewData).toBe(false);
		});
	});

	describe('merge node callout', () => {
		it('should show callout when viewing Merge node output with more than 1 item', async () => {
			const testData = [{ field1: 'value1', field2: 'value2' }, { field1: 'value3' }];
			expect(testData.length).toBeGreaterThan(1);

			const { getByText } = renderComponent({
				props: {
					node: mergeNode,
					paneType: 'output',
					data: testData,
				},
			});

			await waitFor(() => {
				expect(
					getByText(
						'This schema shows fields from multiple items. Some fields may be absent in individual items.',
					),
				).toBeInTheDocument();
			});
		});

		it.each([
			{ itemCount: 0, data: [] },
			{ itemCount: 1, data: [{ field1: 'value1' }] },
		])(
			'should not show callout when Merge node output has $itemCount item(s)',
			async ({ data }) => {
				const { queryByText } = renderComponent({
					props: {
						node: mergeNode,
						paneType: 'output',
						data,
					},
				});

				await waitFor(() => {
					expect(
						queryByText(
							'This schema shows fields from multiple items. Some fields may be absent in individual items.',
						),
					).toBe(null);
				});
			},
		);

		it('should not show callout when viewing non-Merge node', async () => {
			mockNodeOutputData(mockNode1.name, [{ json: { field1: 'value1' } }]);

			const { queryByText } = renderComponent({
				props: {
					paneType: 'input',
					nodes: [{ name: mockNode1.name, indicies: [], depth: 1 }],
				},
			});

			await waitFor(() => {
				expect(
					queryByText(
						'This schema shows fields from multiple items. Some fields may be absent in individual items.',
					),
				).toBe(null);
			});
		});

		it('should show dismiss button on callout in output panel', async () => {
			const { getByTestId } = renderComponent({
				props: {
					node: mergeNode,
					paneType: 'output',
					data: [{ field1: 'value1', field2: 'value2' }, { field1: 'value3' }],
				},
			});

			await waitFor(() => {
				expect(getByTestId('callout-dismiss-icon')).toBeInTheDocument();
			});
		});

		it('should hide callout when dismissed', async () => {
			const dismissMock = vi.fn();
			vi.spyOn(calloutHelpers, 'useCalloutHelpers').mockReturnValue({
				isCalloutDismissed: vi.fn((id: string) => id === 'Merge-mergeNotice'),
				dismissCallout: dismissMock,
				openSampleWorkflowTemplate: vi.fn(),
				getTutorialTemplatesNodeCreatorItems: vi.fn(() => []),
				isRagStarterCalloutVisible: computed(() => false),
			});

			const { queryByText } = renderComponent({
				props: {
					node: mergeNode,
					paneType: 'output',
					data: [{ field1: 'value1', field2: 'value2' }, { field1: 'value3' }],
				},
			});

			await waitFor(() => {
				expect(
					queryByText(
						'This schema shows fields from multiple items. Some fields may be absent in individual items.',
					),
				).toBe(null);
			});
		});
	});
});
