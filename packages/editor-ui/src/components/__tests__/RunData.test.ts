import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import RunData from '@/components/RunData.vue';
import { STORES, VIEWS } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';

describe('RunData', () => {
	it('should render data correctly even when "item.json" has another "json" key', async () => {
		const { getByText, getAllByTestId, getByTestId } = render([
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
		]);

		await userEvent.click(getByTestId('ndv-pin-data'));
		await waitFor(() => getAllByTestId('run-data-schema-item'), { timeout: 1000 });
		expect(getByText('Test 1')).toBeInTheDocument();
		expect(getByText('Json data 1')).toBeInTheDocument();
	});

	it.skip('should render view and download options for PDFs', async () => {
		const { getByTestId } = render([
			{
				json: {},
				binary: {
					data: {
						data: 'filesystem',
						id: 'filesystem:12110d8f95e1c-c64f-4dbe-8ea6-a5282d957737',
						directory: 'somewhere',
						fileExtension: 'pdf',
						fileName: 'test.pdf',
						fileSize: '11.5 kB',
						fileType: 'pdf',
						mimeType: 'application/pdf',
					},
				},
				pairedItem: {
					item: 0,
				},
			},
		]);
		const binaryData = getByTestId('ndv-binary-data_0');
		binaryData.querySelector('a');
	});

	const render = (outputData: unknown[]) =>
		createComponentRenderer(RunData, {
			props: {
				nodeUi: {
					name: 'Test Node',
				},
			},
			data() {
				return {
					canPinData: true,
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
			pinia: createTestingPinia({
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
						workflow: {
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
			}),
		});
});
