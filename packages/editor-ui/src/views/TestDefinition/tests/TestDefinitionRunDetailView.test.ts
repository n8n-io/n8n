import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionRunDetailView from '@/views/TestDefinition/TestDefinitionRunDetailView.vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useExecutionsStore } from '@/stores/executions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { nextTick, ref } from 'vue';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { VIEWS } from '@/constants';
import type { TestRunRecord } from '@/api/testDefinition.ee';
import type { IWorkflowDb } from '@/Interface';

vi.mock('vue-router');
vi.mock('@/composables/useToast');

describe('TestDefinitionRunDetailView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionRunDetailView);

	let showErrorMock: Mock;
	let getTestRunMock: Mock;
	let fetchExecutionsMock: Mock;
	let fetchExecutionMock: Mock;

	const mockTestRun: TestRunRecord = {
		id: 'run1',
		status: 'completed',
		runAt: '2023-01-01T00:00:00.000Z',
		metrics: {
			accuracy: 0.95,
			precision: 0.88,
		},
		testDefinitionId: 'test1',
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2023-01-01T00:00:00.000Z',
		completedAt: '2023-01-01T00:00:00.000Z',
	};

	const mockTestDefinition = {
		id: 'test1',
		name: 'Test Definition 1',
		evaluationWorkflowId: 'workflow1',
		workflowId: 'workflow1',
	};

	const mockWorkflow = {
		id: 'workflow1',
		name: 'Evaluation Workflow',
	};

	const mockExecutions = {
		results: [
			{ id: 'exec1', status: 'success' },
			{ id: 'exec2', status: 'error' },
		],
	};

	beforeEach(() => {
		setActivePinia(createPinia());

		// Mock route with testId and runId
		vi.mocked(useRoute).mockReturnValue(
			ref({
				params: { testId: 'test1', runId: 'run1' },
				name: VIEWS.TEST_DEFINITION_RUNS,
			}) as unknown as ReturnType<typeof useRoute>,
		);

		vi.mocked(useRouter).mockReturnValue({
			back: vi.fn(),
			currentRoute: { value: { params: { testId: 'test1', runId: 'run1' } } },
			resolve: vi.fn().mockResolvedValue({ href: 'test-definition-run-detail' }),
		} as unknown as ReturnType<typeof useRouter>);

		showErrorMock = vi.fn();
		getTestRunMock = vi.fn().mockResolvedValue(mockTestRun);
		fetchExecutionsMock = vi.fn().mockResolvedValue(mockExecutions);
		fetchExecutionMock = vi.fn().mockResolvedValue({
			data: {
				resultData: {
					lastNodeExecuted: 'Node1',
					runData: {
						Node1: [{ data: { main: [[{ json: { accuracy: 0.95 } }]] } }],
					},
				},
			},
		});

		vi.mocked(useToast).mockReturnValue({
			showError: showErrorMock,
		} as unknown as ReturnType<typeof useToast>);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should load run details on mount', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.testRunsById = { run1: mockTestRun };
		testDefinitionStore.testDefinitionsById = { test1: mockTestDefinition };
		testDefinitionStore.getTestRun = getTestRunMock;

		const executionsStore = mockedStore(useExecutionsStore);
		executionsStore.fetchExecutions = fetchExecutionsMock;
		executionsStore.fetchExecution = fetchExecutionMock;

		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflowsById = { workflow1: mockWorkflow as IWorkflowDb };

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();

		expect(getTestRunMock).toHaveBeenCalledWith({
			testDefinitionId: 'test1',
			runId: 'run1',
		});
		// expect(fetchExecutionsMock).toHaveBeenCalled();
		expect(getByTestId('test-definition-run-detail')).toBeTruthy();
	});

	it('should display test run metrics', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.testRunsById = { run1: mockTestRun };
		testDefinitionStore.testDefinitionsById = { test1: mockTestDefinition };
		testDefinitionStore.getTestRun = getTestRunMock;

		const { container } = renderComponent({ pinia });
		await nextTick();

		const metricsCards = container.querySelectorAll('.summaryCard');
		expect(metricsCards.length).toBeGreaterThan(0);
		expect(container.textContent).toContain('0.95'); // Check for accuracy metric
	});

	it('should handle errors when loading run details', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.getTestRun = vi.fn().mockRejectedValue(new Error('Failed to load'));

		renderComponent({ pinia });
		await nextTick();

		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), 'Failed to load run details');
	});

	it('should navigate back when back button is clicked', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const router = useRouter();
		const { getByTestId } = renderComponent({ pinia });
		await nextTick();

		const backButton = getByTestId('test-definition-run-detail').querySelector('.backButton');
		backButton?.dispatchEvent(new Event('click'));

		expect(router.back).toHaveBeenCalled();
	});

	// Test loading states
	it('should show loading state while fetching data', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.getTestRun = vi
			.fn()
			.mockImplementation(async () => await new Promise(() => {})); // Never resolves

		const { container } = renderComponent({ pinia });
		await nextTick();

		expect(container.querySelector('.loading')).toBeTruthy();
	});

	// Test metrics display
	it('should correctly format and display all metrics', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testRunWithMultipleMetrics = {
			...mockTestRun,
			metrics: {
				accuracy: 0.956789,
				precision: 0.887654,
				recall: 0.923456,
				f1_score: 0.901234,
			},
		};

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.testRunsById = { run1: testRunWithMultipleMetrics };
		testDefinitionStore.testDefinitionsById = { test1: mockTestDefinition };

		const { container } = renderComponent({ pinia });
		await nextTick();

		// Check if the metrics are displayed correctly with 2 decimal places
		expect(container.textContent).toContain('0.96');
		expect(container.textContent).toContain('0.89');
		expect(container.textContent).toContain('0.92');
		expect(container.textContent).toContain('0.90');
	});

	// Test status display
	it('should display correct status with appropriate styling', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testRunWithStatus: TestRunRecord = {
			...mockTestRun,
			status: 'error',
		};

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.testRunsById = { run1: testRunWithStatus };
		testDefinitionStore.testDefinitionsById = { test1: mockTestDefinition };

		const { container } = renderComponent({ pinia });
		await nextTick();

		const statusElement = container.querySelector('.error');
		expect(statusElement).toBeTruthy();
		expect(statusElement?.textContent?.trim()).toBe('error');
	});

	// Test table data
	it('should correctly populate the test cases table', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		const executionsStore = mockedStore(useExecutionsStore);

		// Mock all required store methods
		testDefinitionStore.testRunsById = { run1: mockTestRun };
		testDefinitionStore.testDefinitionsById = { test1: mockTestDefinition };
		testDefinitionStore.getTestRun = getTestRunMock;
		// Add this mock for fetchTestDefinition
		testDefinitionStore.fetchTestDefinition = vi.fn().mockResolvedValue(mockTestDefinition);

		executionsStore.fetchExecutions = fetchExecutionsMock;
		executionsStore.fetchExecution = fetchExecutionMock;

		const { container } = renderComponent({ pinia });
		await nextTick();

		// Wait for all promises to resolve
		await waitAllPromises();

		const tableRows = container.querySelectorAll('.el-table__row');
		expect(tableRows.length).toBe(mockExecutions.results.length);
	});
});
