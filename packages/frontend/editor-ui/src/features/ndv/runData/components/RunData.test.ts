import { reactive } from 'vue';
import {
	createTestNode,
	createTestWorkflowObject,
	defaultNodeDescriptions,
} from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import RunData from './RunData.vue';
import { STORES } from '@n8n/stores';
import { SET_NODE_TYPE } from '@/app/constants';
import type { INodeUi, IRunDataDisplayMode } from '@/Interface';
import type { NodePanelType } from '@/features/ndv/shared/ndv.types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { INodeExecutionData, ITaskData, ITaskMetadata } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSchemaPreviewStore } from '@/features/ndv/runData/schemaPreview.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

const MOCK_EXECUTION_URL = 'execution.url/123';

const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl, runWorkflow } = vi.hoisted(
	() => ({
		trackOpeningRelatedExecution: vi.fn(),
		resolveRelatedExecutionUrl: vi.fn(),
		runWorkflow: vi.fn(),
	}),
);

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({
			resolve: vi.fn(() => ({
				href: '',
			})),
		}),
		useRoute: () => reactive({ meta: {} }),
		RouterLink: vi.fn(),
	};
});

vi.mock('@/features/execution/executions/composables/useExecutionHelpers', () => ({
	useExecutionHelpers: () => ({
		trackOpeningRelatedExecution,
		resolveRelatedExecutionUrl,
	}),
}));

vi.mock('@/app/composables/useWorkflowHelpers', async (importOriginal) => {
	const actual: object = await importOriginal();
	return { ...actual, resolveParameter: vi.fn(() => 123) };
});

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({
		runWorkflow,
	}),
}));

describe('RunData', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
	let schemaPreviewStore: MockedStore<typeof useSchemaPreviewStore>;
	let ndvStore: MockedStore<typeof useNDVStore>;

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
			defaultRunItems: Array.from({ length: 26 }).map((_, i) => ({
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
							previousNode: 'When clicking ‘Execute workflow’',
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
				name: 'When clicking ‘Execute workflow’',
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
							previousNode: 'When clicking ‘Execute workflow’',
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

	describe('enterEditMode with previous execution data', () => {
		beforeEach(() => {
			// Reset mocks before each test
			vi.clearAllMocks();
		});

		it('should use previous execution data when no input data exists', async () => {
			const lastSuccessfulExecution = {
				id: '456',
				finished: true,
				mode: 'manual' as const,
				startedAt: new Date(),
				data: {
					resultData: {
						runData: {
							'Test Node': [
								{
									startTime: Date.now(),
									executionIndex: 0,
									executionTime: 1,
									data: {
										main: [[{ json: { previousData: 'test value' } }]],
									},
									source: [null],
								},
							],
						},
					},
				},
			};

			const { getByTitle } = render({
				defaultRunItems: [],
				displayMode: 'table',
				lastSuccessfulExecution,
				paneType: 'output',
			});

			// Find the edit button by its title
			const editButton = getByTitle('Edit Output');
			expect(editButton).toBeInTheDocument();

			// Click the edit button to trigger enterEditMode
			await userEvent.click(editButton);

			await waitFor(() => {
				// Verify that the ndvStore was called with edit mode enabled
				expect(ndvStore.setOutputPanelEditModeEnabled).toHaveBeenCalledWith(true);
				expect(ndvStore.setOutputPanelEditModeValue).toHaveBeenCalled();

				// Get the actual data that was set
				const mockCalls = (ndvStore.setOutputPanelEditModeValue as ReturnType<typeof vi.fn>).mock
					.calls;
				expect(mockCalls.length).toBeGreaterThan(0);
				const setValueCall = mockCalls[0][0];
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, n8n-local-rules/no-uncaught-json-parse
				const parsedData = JSON.parse(setValueCall);

				// Verify it contains the previous execution data
				expect(parsedData).toEqual([{ previousData: 'test value' }]);
			});
		});

		it('should not use previous execution data when input data exists', async () => {
			const lastSuccessfulExecution = {
				id: '456',
				finished: true,
				mode: 'manual' as const,
				startedAt: new Date(),
				data: {
					resultData: {
						runData: {
							'Test Node': [
								{
									startTime: Date.now(),
									executionIndex: 0,
									executionTime: 1,
									data: {
										main: [[{ json: { previousData: 'should not be used' } }]],
									},
									source: [null],
								},
							],
						},
					},
				},
			};

			const { getByTitle } = render({
				defaultRunItems: [{ json: { currentData: 'should be used' } }],
				displayMode: 'table',
				lastSuccessfulExecution,
				paneType: 'output',
			});

			// Find the edit button by its title
			const editButton = getByTitle('Edit Output');

			// Click the edit button
			await userEvent.click(editButton);

			await waitFor(() => {
				// Verify that the current data is used, not the previous execution data
				const mockCalls = (ndvStore.setOutputPanelEditModeValue as ReturnType<typeof vi.fn>).mock
					.calls;
				expect(mockCalls.length).toBeGreaterThan(0);
				const setValueCall = mockCalls[0][0];
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, n8n-local-rules/no-uncaught-json-parse
				const parsedData = JSON.parse(setValueCall);

				// Should use current data, not previous
				expect(parsedData).toEqual([{ currentData: 'should be used' }]);
				expect(parsedData).not.toEqual([{ previousData: 'should not be used' }]);
			});
		});

		it('should use DUMMY_PIN_DATA when no input data and no previous execution', async () => {
			const { getByTitle } = render({
				defaultRunItems: [],
				displayMode: 'table',
				paneType: 'output',
			});

			// Find the edit button by its title
			const editButton = getByTitle('Edit Output');

			// Click the edit button
			await userEvent.click(editButton);

			await waitFor(() => {
				// Verify that DUMMY_PIN_DATA is used
				expect(ndvStore.setOutputPanelEditModeEnabled).toHaveBeenCalledWith(true);
				expect(ndvStore.setOutputPanelEditModeValue).toHaveBeenCalled();

				const mockCalls = (ndvStore.setOutputPanelEditModeValue as ReturnType<typeof vi.fn>).mock
					.calls;
				expect(mockCalls.length).toBeGreaterThan(0);
				const setValueCall = mockCalls[0][0];
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, n8n-local-rules/no-uncaught-json-parse
				const parsedData = JSON.parse(setValueCall);

				// Should contain DUMMY_PIN_DATA structure (array with sample object)
				expect(Array.isArray(parsedData)).toBe(true);
				expect(parsedData.length).toBeGreaterThan(0);
			});
		});
	});

	describe('schema view with lastSuccessfulExecution', () => {
		beforeEach(() => {
			// Reset mocks before each test
			vi.clearAllMocks();
		});

		it('should pass preview-execution prop with lastSuccessfulExecution to schema component', async () => {
			const lastSuccessfulExecution = {
				id: '456',
				finished: true,
				mode: 'manual' as const,
				startedAt: new Date(),
				data: {
					resultData: {
						runData: {
							'Test Node': [
								{
									startTime: Date.now(),
									executionIndex: 0,
									executionTime: 1,
									data: {
										main: [[{ json: { schemaData: 'from previous execution' } }]],
									},
									source: [null],
								},
							],
						},
					},
				},
			};

			const { getByTestId } = render({
				displayMode: 'schema',
				runs: [],
				lastSuccessfulExecution,
				paneType: 'input',
			});

			// Wait for the schema component to be rendered
			await waitFor(() => {
				// Find the schema component by its data-test-id
				const schemaComponent = getByTestId('run-data-schema-node');
				expect(schemaComponent).toBeInTheDocument();

				// The stub component receives the preview-execution prop and binds it as an attribute
				// Verify it's present (the value would be '[object Object]' in the DOM)
				expect(schemaComponent.getAttribute('preview-execution')).toBeTruthy();
			});
		});

		it('should pass preview-execution prop when both current data and lastSuccessfulExecution exist', async () => {
			const lastSuccessfulExecution = {
				id: '456',
				finished: true,
				mode: 'manual' as const,
				startedAt: new Date(),
				data: {
					resultData: {
						runData: {
							'Test Node': [
								{
									startTime: Date.now(),
									executionIndex: 0,
									executionTime: 1,
									data: {
										main: [[{ json: { previewData: 'value from last execution' } }]],
									},
									source: [null],
								},
							],
						},
					},
				},
			};

			const { getByTestId } = render({
				defaultRunItems: [{ json: { currentData: 'current execution data' } }],
				displayMode: 'schema',
				lastSuccessfulExecution,
				paneType: 'input',
			});

			// Wait for the schema component to be rendered
			await waitFor(() => {
				const schemaComponent = getByTestId('run-data-schema-node');
				expect(schemaComponent).toBeInTheDocument();

				// Verify the preview-execution prop is passed even when current data exists
				expect(schemaComponent.getAttribute('preview-execution')).toBeTruthy();
			});
		});

		it('should not pass preview-execution prop when lastSuccessfulExecution is not provided', async () => {
			const { getByTestId } = render({
				defaultRunItems: [{ json: { currentData: 'data from current run' } }],
				displayMode: 'schema',
				paneType: 'input',
			});

			// Wait for the schema component to be rendered
			await waitFor(() => {
				const schemaComponent = getByTestId('run-data-schema-node');
				expect(schemaComponent).toBeInTheDocument();

				// When there's no lastSuccessfulExecution, the prop should not be set or be null/undefined
				// The attribute will either not exist or be an empty/null value
				const previewExecution = schemaComponent.getAttribute('preview-execution');
				expect(
					previewExecution === null || previewExecution === '' || previewExecution === 'null',
				).toBe(true);
			});
		});
	});

	describe('computed properties for branch handling', () => {
		it('no run selector when no run data exists', () => {
			const { container } = render({
				displayMode: 'json',
				runs: [],
			});

			// Component instance checks would need to be done differently in Vue 3
			// For now, we verify the behavior through the UI
			expect(container.querySelector('.run-selector')).not.toBeInTheDocument();
		});

		it('Show run selector when branch switch is shown (with all runs)', async () => {
			// Create multiple runs with data in different outputs
			const multipleRuns = [
				{
					startTime: Date.now(),
					executionIndex: 0,
					executionTime: 1,
					data: {
						main: [
							[{ json: { value: 1 } }], // output 0
							[{ json: { value: 2 } }], // output 1
						],
					},
					source: [null],
				},
				{
					startTime: Date.now(),
					executionIndex: 1,
					executionTime: 1,
					data: {
						main: [
							[{ json: { value: 3 } }], // output 0
							[], // output 1 empty
						],
					},
					source: [null],
				},
				{
					startTime: Date.now(),
					executionIndex: 2,
					executionTime: 1,
					data: {
						main: [
							[], // output 0 empty
							[{ json: { value: 4 } }], // output 1
						],
					},
					source: [null],
				},
			];

			const { getByTestId, findAllByTestId } = render({
				displayMode: 'json',
				runs: multipleRuns,
			});

			// When there are multiple branches and outputs, the run selector should be visible
			const runSelector = getByTestId('run-selector');
			expect(runSelector).toBeInTheDocument();

			const runSelectorOptionsCount = await findAllByTestId('run-selection-option');
			expect(runSelectorOptionsCount.length).toBe(3);
		});

		it('Show run selector when there is no branch selector (only runs for branch with data)', async () => {
			// Create multiple runs with data in different outputs
			const multipleRuns = [
				{
					startTime: Date.now(),
					executionIndex: 0,
					executionTime: 1,
					data: {
						main: [
							[{ json: { value: 1 } }], // output 0
							[{ json: { value: 2 } }], // output 1
						],
					},
					source: [null],
				},
				{
					startTime: Date.now(),
					executionIndex: 1,
					executionTime: 1,
					data: {
						main: [
							[{ json: { value: 3 } }], // output 0
							[], // output 1 empty
						],
					},
					source: [null],
				},
				{
					startTime: Date.now(),
					executionIndex: 2,
					executionTime: 1,
					data: {
						main: [
							[], // output 0 empty
							[{ json: { value: 4 } }], // output 1
						],
					},
					source: [null],
				},
			];

			const { getByTestId, findAllByTestId } = render({
				displayMode: 'json',
				runs: multipleRuns,
				overrideOutputs: [1],
			});

			// Should show run selector since there are multiple runs
			const runSelector = getByTestId('run-selector');
			expect(runSelector).toBeInTheDocument();

			const runSelectorOptionsCount = await findAllByTestId('run-selection-option');
			expect(runSelectorOptionsCount.length).toBe(2);
		});
	});

	describe('schema view with mixed execution states', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should show schema view when some upstream nodes are executed', async () => {
			// Setup: Create a scenario where one upstream node has executed, another hasn't
			const lastSuccessfulExecution = {
				id: '456',
				finished: true,
				mode: 'manual' as const,
				startedAt: new Date(),
				data: {
					resultData: {
						runData: {
							'Executed Node': [
								{
									startTime: Date.now(),
									executionIndex: 0,
									executionTime: 1,
									data: {
										main: [[{ json: { test: 'executed data' } }]],
									},
									source: [null],
									executionStatus: 'success' as const,
								},
							],
						},
					},
				},
			};

			const { getByTestId } = render({
				displayMode: 'schema',
				runs: [], // Current node hasn't run
				lastSuccessfulExecution,
				paneType: 'input',
			});

			await waitFor(() => {
				const schemaComponent = getByTestId('run-data-schema-node');
				expect(schemaComponent).toBeInTheDocument();
			});
		});

		it('should show empty state when all upstream nodes are unexecuted', async () => {
			const { container } = render({
				displayMode: 'schema',
				runs: [],
				paneType: 'input',
			});

			expect(
				container.querySelector('[data-test-id="run-data-schema-node"]'),
			).not.toBeInTheDocument();
		});

		it('should show schema view with lastSuccessfulExecution when current node not executed but upstream has data', async () => {
			const lastSuccessfulExecution = {
				id: '123',
				finished: true,
				mode: 'manual' as const,
				startedAt: new Date(),
				data: {
					resultData: {
						runData: {
							'Upstream Node': [
								{
									startTime: Date.now(),
									executionIndex: 0,
									executionTime: 1,
									data: {
										main: [[{ json: { value: 'from previous run' } }]],
									},
									source: [null],
									executionStatus: 'success' as const,
								},
							],
						},
					},
				},
			};

			const { getByTestId } = render({
				displayMode: 'schema',
				runs: [],
				lastSuccessfulExecution,
				paneType: 'input',
			});

			await waitFor(() => {
				const schemaComponent = getByTestId('run-data-schema-node');
				expect(schemaComponent).toBeInTheDocument();
				expect(schemaComponent.getAttribute('preview-execution')).toBeTruthy();
			});
		});
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
		workflowId,
		workflowNodes = nodes,
		displayMode = 'html',
		pinnedData,
		paneType = 'output',
		metadata,
		runs,
		overrideOutputs,
		lastSuccessfulExecution,
	}: {
		defaultRunItems?: INodeExecutionData[];
		workflowId?: string;
		workflowNodes?: INodeUi[];
		displayMode: IRunDataDisplayMode;
		pinnedData?: INodeExecutionData[];
		paneType?: NodePanelType;
		metadata?: ITaskMetadata;
		runs?: ITaskData[];
		overrideOutputs?: number[];
		lastSuccessfulExecution?: {
			id: string;
			finished: boolean;
			mode: 'manual' | 'trigger';
			startedAt: Date;
			data: {
				resultData: {
					runData: Record<string, ITaskData[]>;
				};
			};
		};
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
					lastSuccessfulExecution: lastSuccessfulExecution ?? null,
				},
			},
		});

		setActivePinia(pinia);

		nodeTypesStore = mockedStore(useNodeTypesStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		schemaPreviewStore = mockedStore(useSchemaPreviewStore);
		ndvStore = mockedStore(useNDVStore);

		nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
		workflowsStore.getNodeByName.mockReturnValue(workflowNodes[0]);

		// Mock ndvStore methods
		ndvStore.setOutputPanelEditModeEnabled = vi.fn();
		ndvStore.setOutputPanelEditModeValue = vi.fn();

		if (pinnedData) {
			workflowsStore.pinDataByNodeName.mockReturnValue(pinnedData);
		}

		schemaPreviewStore.getSchemaPreview = vi.fn().mockResolvedValue({});

		return createComponentRenderer(RunData, {
			props: {
				node: createTestNode({
					name: 'Test Node',
				}),
				workflowObject: createTestWorkflowObject({
					id: workflowId,
					nodes: workflowNodes,
				}),
				displayMode,
			},
			global: {
				stubs: {
					RunDataPinButton: { template: '<button data-test-id="ndv-pin-data"></button>' },
					VirtualSchema: {
						template: `
							<div data-test-id="run-data-schema-node" :preview-execution="previewExecution">
								<div v-for="(item, index) in mockItems" :key="index" data-test-id="run-data-schema-item">
									{{ item }}
								</div>
							</div>
						`,
						props: [
							'previewExecution',
							'nodes',
							'mappingEnabled',
							'node',
							'search',
							'distanceFromActive',
							'runIndex',
							'totalRuns',
							'compact',
							'truncateLimit',
						],
						data() {
							return {
								mockItems: ['Test 1', 'Json data 1'],
							};
						},
					},
				},
			},
		})({
			props: {
				node: createTestNode({
					id: '1',
					name: 'Test Node',
					type: SET_NODE_TYPE,
					position: [0, 0],
					parameters: {},
				}),
				nodes: [{ name: 'Test Node', indicies: [], depth: 1 }],
				runIndex: 0,
				paneType,
				isExecuting: false,
				mappingEnabled: true,
				distanceFromActive: 0,
				tooMuchDataTitle: '',
				executingMessage: '',
				noDataInBranchMessage: '',
				overrideOutputs,
			},
			pinia,
		});
	};
});
