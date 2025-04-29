import { createTestWorkflowObject, defaultNodeDescriptions } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import RunData from '@/components/RunData.vue';
import { SET_NODE_TYPE, STORES } from '@/constants';
import type { INodeUi, IRunDataDisplayMode, NodePanelType } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { INodeExecutionData, ITaskData, ITaskMetadata } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { useNodeTypesStore } from '../stores/nodeTypes.store';

const MOCK_EXECUTION_URL = 'execution.url/123';

const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl } = vi.hoisted(() => ({
	trackOpeningRelatedExecution: vi.fn(),
	resolveRelatedExecutionUrl: vi.fn(),
}));

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => ({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

vi.mock('@/composables/useExecutionHelpers', () => ({
	useExecutionHelpers: () => ({
		trackOpeningRelatedExecution,
		resolveRelatedExecutionUrl,
	}),
}));

vi.mock('@/composables/useWorkflowHelpers', async (importOriginal) => {
	const actual: object = await importOriginal();
	return { ...actual, resolveParameter: vi.fn(() => 123) };
});

describe('RunData', () => {
	beforeAll(() => {
		resolveRelatedExecutionUrl.mockReturnValue('execution.url/123');
	});

	it("should render pin button in output panel disabled when there's binary data", () => {
		const { getByTestId } = render({
			defaultRunItems: [
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.xyz',
							mimeType: 'application/octet-stream',
							data: '',
						},
					},
				},
			],
			displayMode: 'binary',
		});

		expect(getByTestId('ndv-pin-data')).toBeInTheDocument();
		expect(getByTestId('ndv-pin-data')).toHaveAttribute('disabled');
	});

	it("should not render pin button in input panel when there's binary data", () => {
		const { queryByTestId } = render({
			defaultRunItems: [
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.xyz',
							mimeType: 'application/octet-stream',
							data: '',
						},
					},
				},
			],
			displayMode: 'binary',
			paneType: 'input',
		});

		expect(queryByTestId('ndv-pin-data')).not.toBeInTheDocument();
	});

	it('should render data correctly even when "item.json" has another "json" key', async () => {
		const { getByText, getAllByTestId, getByTestId } = render({
			defaultRunItems: [
				{
					json: {
						id: 1,
						name: 'Test 1',
						json: {
							data: 'Json data 1',
						},
					},
				},
				{
					json: {
						id: 2,
						name: 'Test 2',
						json: {
							data: 'Json data 2',
						},
					},
				},
			],
			displayMode: 'schema',
		});

		await userEvent.click(getByTestId('ndv-pin-data'));
		await waitFor(() => getAllByTestId('run-data-schema-item'), { timeout: 1000 });
		expect(getByText('Test 1')).toBeInTheDocument();
		expect(getByText('Json data 1')).toBeInTheDocument();
	});

	it('should render only download buttons for PDFs', async () => {
		const { getByTestId, queryByTestId } = render({
			defaultRunItems: [
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.pdf',
							fileType: 'pdf',
							mimeType: 'application/pdf',
							data: '',
						},
					},
				},
			],
			displayMode: 'binary',
		});

		await waitFor(() => {
			expect(queryByTestId('ndv-view-binary-data')).not.toBeInTheDocument();
			expect(getByTestId('ndv-download-binary-data')).toBeInTheDocument();
			expect(getByTestId('ndv-binary-data_0')).toBeInTheDocument();
		});
	});

	it('should render view and download buttons for JPEGs', async () => {
		const { getByTestId } = render({
			defaultRunItems: [
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.jpg',
							fileType: 'image',
							mimeType: 'image/jpeg',
							data: '',
						},
					},
				},
			],
			displayMode: 'binary',
		});

		await waitFor(() => {
			expect(getByTestId('ndv-view-binary-data')).toBeInTheDocument();
			expect(getByTestId('ndv-download-binary-data')).toBeInTheDocument();
			expect(getByTestId('ndv-binary-data_0')).toBeInTheDocument();
		});
	});

	it('should not render a view button for unknown content-type', async () => {
		const { getByTestId, queryByTestId } = render({
			defaultRunItems: [
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.xyz',
							mimeType: 'application/octet-stream',
							data: '',
						},
					},
				},
			],
			displayMode: 'binary',
		});

		await waitFor(() => {
			expect(queryByTestId('ndv-view-binary-data')).not.toBeInTheDocument();
			expect(getByTestId('ndv-download-binary-data')).toBeInTheDocument();
			expect(getByTestId('ndv-binary-data_0')).toBeInTheDocument();
		});
	});

	it('should not render pin data button when there is no output data', async () => {
		const { queryByTestId } = render({ defaultRunItems: [], displayMode: 'table' });
		expect(queryByTestId('ndv-pin-data')).not.toBeInTheDocument();
	});

	it('should not disable pin data button when data is pinned [ADO-3143]', async () => {
		const { getByTestId } = render({
			defaultRunItems: [],
			displayMode: 'table',
			pinnedData: [{ json: { name: 'Test' } }],
		});
		const pinDataButton = getByTestId('ndv-pin-data');
		expect(pinDataButton).not.toBeDisabled();
	});

	it('should render callout when data is pinned in output panel', async () => {
		const { getByTestId } = render({
			defaultRunItems: [],
			displayMode: 'table',
			pinnedData: [{ json: { name: 'Test' } }],
			paneType: 'output',
		});
		const pinnedDataCallout = getByTestId('ndv-pinned-data-callout');
		expect(pinnedDataCallout).toBeInTheDocument();
	});

	it('should not render callout when data is pinned in input panel', async () => {
		const { queryByTestId } = render({
			defaultRunItems: [],
			displayMode: 'table',
			pinnedData: [{ json: { name: 'Test' } }],
			paneType: 'input',
		});
		const pinnedDataCallout = queryByTestId('ndv-pinned-data-callout');
		expect(pinnedDataCallout).not.toBeInTheDocument();
	});

	it('should enable pin data button when data is not pinned', async () => {
		const { getByTestId } = render({
			defaultRunItems: [{ json: { name: 'Test' } }],
			displayMode: 'table',
		});
		const pinDataButton = getByTestId('ndv-pin-data');
		expect(pinDataButton).toBeEnabled();
	});

	it('should not render pagination on binary tab', async () => {
		const { queryByTestId } = render({
			defaultRunItems: Array.from({ length: 11 }).map((_, i) => ({
				json: {
					data: {
						id: i,
						name: `Test ${i}`,
					},
				},
				binary: {
					data: {
						a: 'b',
						data: '',
						mimeType: '',
					},
				},
			})),
			displayMode: 'binary',
		});
		expect(queryByTestId('ndv-data-pagination')).not.toBeInTheDocument();
	});

	it('should render pagination with binary data on non-binary tab', async () => {
		const { getByTestId } = render({
			defaultRunItems: Array.from({ length: 11 }).map((_, i) => ({
				json: {
					data: {
						id: i,
						name: `Test ${i}`,
					},
				},
				binary: {
					data: {
						a: 'b',
						data: '',
						mimeType: '',
					},
				},
			})),
			displayMode: 'json',
		});
		expect(getByTestId('ndv-data-pagination')).toBeInTheDocument();
	});

	it('should render sub-execution link in header', async () => {
		const metadata: ITaskMetadata = {
			subExecution: {
				workflowId: 'xyz',
				executionId: '123',
			},
			subExecutionsCount: 1,
		};
		const { getByTestId } = render({
			defaultRunItems: [
				{
					json: {},
				},
			],
			displayMode: 'table',
			paneType: 'output',
			metadata,
		});

		expect(getByTestId('related-execution-link')).toBeInTheDocument();
		expect(getByTestId('related-execution-link')).toHaveTextContent('View sub-execution');
		expect(resolveRelatedExecutionUrl).toHaveBeenCalledWith(metadata);
		expect(getByTestId('related-execution-link')).toHaveAttribute('href', MOCK_EXECUTION_URL);

		expect(getByTestId('ndv-items-count')).toHaveTextContent('1 item, 1 sub-execution');

		getByTestId('related-execution-link').click();
		expect(trackOpeningRelatedExecution).toHaveBeenCalledWith(metadata, 'table');
	});

	it('should render parent-execution link in header', async () => {
		const metadata: ITaskMetadata = {
			parentExecution: {
				workflowId: 'xyz',
				executionId: '123',
			},
		};
		const { getByTestId } = render({
			defaultRunItems: [
				{
					json: {},
				},
			],
			displayMode: 'table',
			paneType: 'output',
			metadata,
		});

		expect(getByTestId('related-execution-link')).toBeInTheDocument();
		expect(getByTestId('related-execution-link')).toHaveTextContent('View parent execution');
		expect(resolveRelatedExecutionUrl).toHaveBeenCalledWith(metadata);
		expect(getByTestId('related-execution-link')).toHaveAttribute('href', MOCK_EXECUTION_URL);

		expect(getByTestId('ndv-items-count')).toHaveTextContent('1 item');

		getByTestId('related-execution-link').click();
		expect(trackOpeningRelatedExecution).toHaveBeenCalledWith(metadata, 'table');
	});

	it('should render sub-execution link in header with multiple items', async () => {
		const metadata: ITaskMetadata = {
			subExecution: {
				workflowId: 'xyz',
				executionId: '123',
			},
			subExecutionsCount: 3,
		};
		const { getByTestId } = render({
			defaultRunItems: [
				{
					json: {},
				},
				{
					json: {},
				},
			],
			displayMode: 'json',
			paneType: 'output',
			metadata,
		});

		expect(getByTestId('related-execution-link')).toBeInTheDocument();
		expect(getByTestId('related-execution-link')).toHaveTextContent('View sub-execution 123');
		expect(resolveRelatedExecutionUrl).toHaveBeenCalledWith(metadata);
		expect(getByTestId('related-execution-link')).toHaveAttribute('href', MOCK_EXECUTION_URL);

		expect(getByTestId('ndv-items-count')).toHaveTextContent('2 items, 3 sub-executions');

		getByTestId('related-execution-link').click();
		expect(trackOpeningRelatedExecution).toHaveBeenCalledWith(metadata, 'json');
	});

	it('should render sub-execution link in header with multiple runs', async () => {
		const metadata: ITaskMetadata = {
			subExecution: {
				workflowId: 'xyz',
				executionId: '123',
			},
			subExecutionsCount: 3,
		};
		const { getByTestId, queryByTestId } = render({
			runs: [
				{
					startTime: Date.now(),
					executionIndex: 0,
					executionTime: 1,
					data: {
						main: [[{ json: {} }]],
					},
					source: [null],
					metadata,
				},
				{
					startTime: Date.now(),
					executionIndex: 1,
					executionTime: 1,
					data: {
						main: [[{ json: {} }]],
					},
					source: [null],
					metadata,
				},
			],
			displayMode: 'json',
			paneType: 'output',
			metadata,
		});

		expect(getByTestId('related-execution-link')).toBeInTheDocument();
		expect(getByTestId('related-execution-link')).toHaveTextContent('View sub-execution 123');

		expect(queryByTestId('ndv-items-count')).not.toBeInTheDocument();
		expect(getByTestId('run-selector')).toBeInTheDocument();

		getByTestId('related-execution-link').click();
		expect(trackOpeningRelatedExecution).toHaveBeenCalledWith(metadata, 'json');
	});

	it('should render sub-execution link in header with sub-node error', async () => {
		const metadata = {
			subExecution: {
				workflowId: 'xyz',
				executionId: '123',
			},
			subExecutionsCount: 1,
		};

		const { getByTestId } = render({
			defaultRunItems: [
				{
					json: {},
				},
			],
			displayMode: 'table',
			paneType: 'output',
			runs: [
				{
					hints: [],
					startTime: 1737643696893,
					executionIndex: 0,
					executionTime: 2,
					source: [
						{
							previousNode: 'When clicking ‘Test workflow’',
						},
					],
					executionStatus: 'error',
					error: {
						level: 'error',
						errorResponse: {
							...metadata.subExecution,
						},
					} as never,
				},
			],
		});

		expect(getByTestId('related-execution-link')).toBeInTheDocument();
		expect(getByTestId('related-execution-link')).toHaveTextContent('View sub-execution');
		expect(resolveRelatedExecutionUrl).toHaveBeenCalledWith(metadata);
		expect(getByTestId('related-execution-link')).toHaveAttribute('href', MOCK_EXECUTION_URL);

		expect(getByTestId('ndv-items-count')).toHaveTextContent(
			'1 item, 1 sub-execution View sub-execution',
		);

		getByTestId('related-execution-link').click();
		expect(trackOpeningRelatedExecution).toHaveBeenCalledWith(metadata, 'table');
	});

	it('should render input selector when input node has error', async () => {
		const testNodes = [
			{
				id: '1',
				name: 'When clicking ‘Test workflow’',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [80, -180],
				disabled: false,
				parameters: { notice: '' },
			},
			{
				id: '2',
				name: 'Edit Fields',
				type: 'n8n-nodes-base.set',
				parameters: {
					mode: 'manual',
					duplicateItem: false,
					assignments: {
						_custom: { type: 'reactive', stateTypeName: 'Reactive', value: {} },
					},
					includeOtherFields: false,
					options: {},
				},
				typeVersion: 3.4,
				position: [500, -180],
			},
			{
				id: '3',
				name: 'Test Node',
				type: 'n8n-nodes-base.code',
				parameters: {
					mode: 'runOnceForAllItems',
					language: 'javaScript',
					jsCode: "throw Error('yo')",
					notice: '',
				},
				typeVersion: 2,
				position: [300, -180],
				issues: {
					_custom: {
						type: 'reactive',
						stateTypeName: 'Reactive',
						value: { execution: true },
					},
				},
			},
		] as INodeUi[];

		const { getByTestId } = render({
			workflowNodes: testNodes,
			runs: [
				{
					hints: [],
					startTime: 1737643696893,
					executionTime: 2,
					source: [
						{
							previousNode: 'When clicking ‘Test workflow’',
						},
					],
					executionStatus: 'error',
					// @ts-expect-error allow missing properties in test
					error: {
						level: 'error',
						tags: {
							packageName: 'nodes-base',
						},
						description: null,
						lineNumber: 1,
						node: {
							type: 'n8n-nodes-base.code',
							typeVersion: 2,
							position: [300, -180],
							id: 'e41f12e0-d178-4294-8748-da5a6a531be6',
							name: 'Test Node',
							parameters: {
								mode: 'runOnceForAllItems',
								language: 'javaScript',
								jsCode: "throw Error('yo')",
								notice: '',
							},
						},
						message: 'yo [line 1]',
						stack: 'Error: yo\n n8n/packages/core/src/execution-engine/workflow-execute.ts:2066:11',
					},
				},
			],
			defaultRunItems: [
				{
					hints: [],
					startTime: 1737641598215,
					executionTime: 3,
					// @ts-expect-error allow missing properties in test
					source: [{ previousNode: 'Execute Workflow Trigger' }],
					// @ts-expect-error allow missing properties in test
					executionStatus: 'error',
					// @ts-expect-error allow missing properties in test
					error: {
						level: 'error',
						tags: { packageName: 'nodes-base' },
						description: null,
						lineNumber: 1,
						node: {
							id: 'e41f12e0-d178-4294-8748-da5a6a531be6',
							name: 'Test Node',
							type: 'n8n-nodes-base.code',
							typeVersion: 2,
							position: [300, -180],
							parameters: {
								mode: 'runOnceForAllItems',
								language: 'javaScript',
								jsCode: "throw Error('yo')",
								notice: '',
							},
						},
						message: 'yo [line 1]',
						stack: 'Error: yo\n n8n/packages/core/src/execution-engine/workflow-execute.ts:2066:11',
					},
				},
			],
		});
		expect(getByTestId('ndv-items-count')).toBeInTheDocument();
	});

	// Default values for the render function
	const nodes = [
		{
			id: '1',
			typeVersion: 3,
			name: 'Test Node',
			position: [0, 0],
			type: SET_NODE_TYPE,
			parameters: {},
		},
	] as INodeUi[];

	const render = ({
		defaultRunItems,
		workflowNodes = nodes,
		displayMode,
		pinnedData,
		paneType = 'output',
		metadata,
		runs,
	}: {
		defaultRunItems?: INodeExecutionData[];
		workflowNodes?: INodeUi[];
		displayMode: IRunDataDisplayMode;
		pinnedData?: INodeExecutionData[];
		paneType?: NodePanelType;
		metadata?: ITaskMetadata;
		runs?: ITaskData[];
	}) => {
		const defaultRun: ITaskData = {
			startTime: Date.now(),
			executionIndex: 0,
			executionTime: 1,
			data: {
				main: [defaultRunItems ?? [{ json: {} }]],
			},
			source: [null],
			metadata,
		};

		const pinia = createTestingPinia({
			stubActions: false,
			initialState: {
				[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
				[STORES.NDV]: {
					outputPanelDisplayMode: displayMode,
					activeNodeName: 'Test Node',
				},
				[STORES.WORKFLOWS]: {
					workflow: {
						workflowNodes,
					},
					workflowExecutionData: {
						id: '1',
						finished: true,
						mode: 'trigger',
						startedAt: new Date(),
						workflowData: {
							id: '1',
							name: 'Test Workflow',
							versionId: '1',
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							active: false,
							nodes: [],
							connections: {},
						},
						data: {
							resultData: {
								runData: {
									'Test Node': runs ?? [defaultRun],
								},
							},
						},
					},
				},
			},
		});

		setActivePinia(pinia);

		const workflowsStore = useWorkflowsStore();
		const nodeTypesStore = useNodeTypesStore();

		nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
		vi.mocked(workflowsStore).getNodeByName.mockReturnValue(workflowNodes[0]);

		if (pinnedData) {
			vi.mocked(workflowsStore).pinDataByNodeName.mockReturnValue(pinnedData);
		}

		return createComponentRenderer(RunData, {
			props: {
				node: {
					name: 'Test Node',
				},
				workflow: createTestWorkflowObject({
					// @ts-expect-error allow missing properties in test
					workflowNodes,
				}),
			},
			global: {
				stubs: {
					RunDataPinButton: { template: '<button data-test-id="ndv-pin-data"></button>' },
				},
			},
		})({
			props: {
				node: {
					id: '1',
					name: 'Test Node',
					type: SET_NODE_TYPE,
					position: [0, 0],
				},
				nodes: [{ name: 'Test Node', indicies: [], depth: 1 }],
				runIndex: 0,
				paneType,
				isExecuting: false,
				mappingEnabled: true,
				distanceFromActive: 0,
			},
			pinia,
		});
	};
});
