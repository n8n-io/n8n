import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import RunData from '@/components/RunData.vue';
import { STORES, VIEWS } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi, IRunDataDisplayMode } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { setActivePinia } from 'pinia';

const nodes = [
	{
		id: '1',
		typeVersion: 1,
		name: 'Test Node',
		position: [0, 0],
		type: 'test',
		parameters: {},
	},
] as INodeUi[];

describe('RunData', () => {
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
		expect(getByTestId('ndv-view-binary-data')).toBeInTheDocument();
		expect(getByTestId('ndv-download-binary-data')).toBeInTheDocument();
		expect(getByTestId('ndv-binary-data_0')).toBeInTheDocument();
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
		expect(queryByTestId('ndv-view-binary-data')).not.toBeInTheDocument();
		expect(getByTestId('ndv-download-binary-data')).toBeInTheDocument();
		expect(getByTestId('ndv-binary-data_0')).toBeInTheDocument();
	});

	const render = (outputData: unknown[], displayMode: IRunDataDisplayMode) => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
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
		vi.mocked(workflowsStore).getNodeByName.mockReturnValue(nodes[0]);

		return createComponentRenderer(RunData, {
			props: {
				node: {
					name: 'Test Node',
				},
			},
			data() {
				return {
					canPinData: true,
					showData: true,
				};
			},
			global: {
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
			},
		})({
			props: {
				node: {
					id: '1',
					name: 'Test Node',
					position: [0, 0],
				},
				runIndex: 0,
				paneType: 'output',
				isExecuting: false,
				mappingEnabled: true,
				distanceFromActive: 0,
			},
			pinia,
		});
	};
});
