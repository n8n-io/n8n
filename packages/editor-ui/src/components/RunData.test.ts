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
import type { INodeExecutionData } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { useNodeTypesStore } from '../stores/nodeTypes.store';

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => ({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

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

describe('RunData', () => {
	it("should render pin button in output panel disabled when there's binary data", () => {
		const { getByTestId } = render(
			[
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.xyz',
							mimeType: 'application/octet-stream',
						},
					},
				},
			],
			'binary',
		);

		expect(getByTestId('ndv-pin-data')).toBeInTheDocument();
		expect(getByTestId('ndv-pin-data')).toHaveAttribute('disabled');
	});

	it("should not render pin button in input panel when there's binary data", () => {
		const { queryByTestId } = render(
			[
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.xyz',
							mimeType: 'application/octet-stream',
						},
					},
				},
			],
			'binary',
			undefined,
			'input',
		);

		expect(queryByTestId('ndv-pin-data')).not.toBeInTheDocument();
	});

	it('should render data correctly even when "item.json" has another "json" key', async () => {
		const { getByText, getAllByTestId, getByTestId } = render(
			[
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
			'schema',
		);

		await userEvent.click(getByTestId('ndv-pin-data'));
		await waitFor(() => getAllByTestId('run-data-schema-item'), { timeout: 1000 });
		expect(getByText('Test 1')).toBeInTheDocument();
		expect(getByText('Json data 1')).toBeInTheDocument();
	});

	it('should render view and download buttons for PDFs', async () => {
		const { getByTestId } = render(
			[
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.pdf',
							fileType: 'pdf',
							mimeType: 'application/pdf',
						},
					},
				},
			],
			'binary',
		);

		await waitFor(() => {
			expect(getByTestId('ndv-view-binary-data')).toBeInTheDocument();
			expect(getByTestId('ndv-download-binary-data')).toBeInTheDocument();
			expect(getByTestId('ndv-binary-data_0')).toBeInTheDocument();
		});
	});

	it('should not render a view button for unknown content-type', async () => {
		const { getByTestId, queryByTestId } = render(
			[
				{
					json: {},
					binary: {
						data: {
							fileName: 'test.xyz',
							mimeType: 'application/octet-stream',
						},
					},
				},
			],
			'binary',
		);

		await waitFor(() => {
			expect(queryByTestId('ndv-view-binary-data')).not.toBeInTheDocument();
			expect(getByTestId('ndv-download-binary-data')).toBeInTheDocument();
			expect(getByTestId('ndv-binary-data_0')).toBeInTheDocument();
		});
	});

	it('should not render pin data button when there is no output data', async () => {
		const { queryByTestId } = render([], 'table');
		expect(queryByTestId('ndv-pin-data')).not.toBeInTheDocument();
	});

	it('should disable pin data button when data is pinned', async () => {
		const { getByTestId } = render([], 'table', [{ json: { name: 'Test' } }]);
		const pinDataButton = getByTestId('ndv-pin-data');
		expect(pinDataButton).toBeDisabled();
	});

	it('should enable pin data button when data is not pinned', async () => {
		const { getByTestId } = render([{ json: { name: 'Test' } }], 'table');
		const pinDataButton = getByTestId('ndv-pin-data');
		expect(pinDataButton).toBeEnabled();
	});

	it('should not render pagination on binary tab', async () => {
		const { queryByTestId } = render(
			Array.from({ length: 11 }).map((_, i) => ({
				json: {
					data: {
						id: i,
						name: `Test ${i}`,
					},
				},
				binary: {
					data: {
						a: 'b',
					},
				},
			})),
			'binary',
		);
		expect(queryByTestId('ndv-data-pagination')).not.toBeInTheDocument();
	});

	it('should render pagination with binary data on non-binary tab', async () => {
		const { getByTestId } = render(
			Array.from({ length: 11 }).map((_, i) => ({
				json: {
					data: {
						id: i,
						name: `Test ${i}`,
					},
				},
				binary: {
					data: {
						a: 'b',
					},
				},
			})),
			'json',
		);
		expect(getByTestId('ndv-data-pagination')).toBeInTheDocument();
	});

	const render = (
		outputData: unknown[],
		displayMode: IRunDataDisplayMode,
		pinnedData?: INodeExecutionData[],
		paneType: NodePanelType = 'output',
	) => {
		const pinia = createTestingPinia({
			stubActions: false,
			initialState: {
				[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
				[STORES.NDV]: {
					output: {
						displayMode,
					},
					activeNodeName: 'Test Node',
				},
				[STORES.WORKFLOWS]: {
					workflow: {
						nodes,
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
									'Test Node': [
										{
											startTime: new Date().getTime(),
											executionTime: new Date().getTime(),
											data: {
												main: [outputData],
											},
											source: [null],
										},
									],
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
		vi.mocked(workflowsStore).getNodeByName.mockReturnValue(nodes[0]);

		if (pinnedData) {
			vi.mocked(workflowsStore).pinDataByNodeName.mockReturnValue(pinnedData);
		}

		return createComponentRenderer(RunData, {
			props: {
				node: {
					name: 'Test Node',
				},
				workflow: createTestWorkflowObject({
					nodes,
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
