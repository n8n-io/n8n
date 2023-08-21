import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import RunData from '@/components/RunData.vue';
import { STORES, VIEWS } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useWorkflowsStore } from '@/stores';
import type { Workflow } from 'n8n-workflow';

const renderComponent = createComponentRenderer(RunData, {
	props: {
		nodeUi: {
			name: 'Test Node',
		},
	},
	global: {
		mocks: {
			$route: {
				name: VIEWS.WORKFLOW,
			},
		},
	},
});

describe('RunData', () => {
	it('should render data correctly even when "item.json" has another "json" key', async () => {
		const workflow = {
			id: '1',
			name: 'Test Workflow',
			connections: {},
			nodes: [
				{
					id: '1',
					typeVersion: 1,
					name: 'Test Node',
					position: [0, 0],
					type: 'test',
					parameters: {},
				},
			],
		};

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
				[STORES.NDV]: {
					output: {
						displayMode: 'schema',
					},
					activeNodeName: 'Test Node',
				},
				[STORES.WORKFLOWS]: {
					workflowId: workflow.id,
					workflowName: workflow.name,
					workflow,
					workflowExecutionData: {
						id: '1',
						finished: true,
						mode: 'trigger',
						startedAt: new Date(),
						workflowData: {
							id: workflow.id,
							name: workflow.name,
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
												main: [
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
												],
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

		const workflowsStore = useWorkflowsStore(pinia);
		vi.spyOn(workflowsStore, 'getCurrentWorkflow').mockReturnValue(workflow as unknown as Workflow);

		const { getByText, getAllByTestId, getByTestId } = renderComponent({
			props: {
				nodeUi: {
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

		await userEvent.click(getByTestId('ndv-pin-data'));
		await waitFor(() => getAllByTestId('run-data-schema-item'), { timeout: 1000 });
		expect(getByText('Test 1')).toBeInTheDocument();
		expect(getByText('Json data 1')).toBeInTheDocument();
	});
});
