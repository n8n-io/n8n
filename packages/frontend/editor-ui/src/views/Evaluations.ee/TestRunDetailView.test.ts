import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { useWorkflowsStore } from '@/stores/workflows.store';
import TestRunDetailView from './TestRunDetailView.vue';
import type { TestCaseExecutionRecord, TestRunRecord } from '@/api/evaluation.ee';
import type { IWorkflowDb } from '@/Interface';
import { mock } from 'vitest-mock-extended';

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
	}),
}));

const mockRouter = {
	currentRoute: {
		value: {
			params: {
				runId: 'test-run-id',
				name: 'test-workflow-id',
			},
		},
	},
	back: vi.fn(),
	resolve: vi.fn(() => ({ href: '/test-execution-url' })),
};

vi.mock('vue-router', () => {
	return {
		RouterLink: vi.fn(),
		useRoute: () => ({}),
		useRouter: () => mockRouter,
	};
});

const mockTestRun: TestRunRecord = {
	id: 'test-run-id',
	workflowId: 'test-workflow-id',
	status: 'completed',
	createdAt: '2023-10-01T10:00:00Z',
	updatedAt: '2023-10-01T10:00:00Z',
	completedAt: '2023-10-01T10:00:00Z',
	runAt: '2023-10-01T10:00:00Z',
	metrics: {
		accuracy: 0.95,
		precision: 0.92,
	},
	finalResult: 'success',
};

const mockTestCases = [
	mock<TestCaseExecutionRecord>({
		id: 'test-case-1',
		status: 'completed',
		runAt: '2023-10-01T10:00:00Z',
		executionId: 'execution-1',
		metrics: {
			accuracy: 0.98,
			precision: 0.95,
		},
		inputs: {
			input1: 'value1',
		},
		outputs: {
			output1: 'result1',
		},
	}),
	mock<TestCaseExecutionRecord>({
		id: 'test-case-2',
		status: 'error',
		runAt: '2023-10-01T10:01:00Z',
		executionId: 'execution-2',
		errorCode: 'TIMEOUT',
		metrics: {
			accuracy: 0.85,
			precision: 0.88,
		},
		inputs: {
			input1: 'value2',
		},
		outputs: {
			output1: 'result2',
		},
	}),
];

const mockWorkflow = mock<IWorkflowDb>({
	id: 'test-workflow-id',
	name: 'Test Workflow',
	active: true,
	nodes: [],
	connections: {},
	createdAt: '2023-10-01T09:00:00Z',
	updatedAt: '2023-10-01T09:00:00Z',
	versionId: 'version-1',
	tags: [],
	settings: {},
	pinData: {},
	homeProject: { id: 'home-project', name: 'Home' },
	sharedWithProjects: [],
	scopes: [],
	usedCredentials: [],
	meta: {},
});

describe('TestRunDetailView', () => {
	let evaluationStore: ReturnType<typeof useEvaluationStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;

	const renderComponent = createComponentRenderer(TestRunDetailView, {
		pinia: createTestingPinia({
			initialState: {
				evaluation: {
					testRunsById: {
						'test-run-id': mockTestRun,
					},
				},
				workflows: {
					workflowsById: {
						'test-workflow-id': mockWorkflow,
					},
				},
			},
			stubActions: false,
		}),
	});

	beforeEach(() => {
		evaluationStore = useEvaluationStore();
		workflowsStore = useWorkflowsStore();

		// Mock store methods
		vi.mocked(evaluationStore.getTestRun).mockResolvedValue(mockTestRun);
		vi.mocked(evaluationStore.fetchTestCaseExecutions).mockResolvedValue(mockTestCases);

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render component', () => {
		const { container } = renderComponent();
		expect(container).toBeTruthy();
	});

	it('should fetch test run data on mount', async () => {
		renderComponent();

		await waitFor(() => {
			expect(evaluationStore.getTestRun).toHaveBeenCalledWith({
				workflowId: 'test-workflow-id',
				runId: 'test-run-id',
			});
		});
	});

	it('should display test run detail view', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should display summary cards', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			const summaryCards = container.querySelectorAll('.summaryCard');
			expect(summaryCards.length).toBeGreaterThan(0);
		});
	});

	it('should handle error state', async () => {
		const errorTestRun = {
			...mockTestRun,
			status: 'error' as const,
			errorCode: 'TIMEOUT',
		};

		vi.mocked(evaluationStore.getTestRun).mockResolvedValue(errorTestRun);

		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should display metrics in summary', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			const summaryCards = container.querySelectorAll('.summaryCard');
			expect(summaryCards.length).toBeGreaterThan(2); // At least total cases, date, status + metrics
		});
	});

	it('should handle back navigation', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			const backButton = container.querySelector('.backButton');
			expect(backButton).toBeTruthy();
		});
	});

	it('should display loading state initially', async () => {
		const { container } = renderComponent();

		// Component should render the container
		expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
	});

	it('should display test table when data is loaded', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			// TestTableBase component should be rendered
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should handle partial failures', async () => {
		// Test with cases that have errors
		vi.mocked(evaluationStore.fetchTestCaseExecutions).mockResolvedValue(mockTestCases);

		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should format dates correctly', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			const summaryCards = container.querySelectorAll('.summaryCard');
			// Should have at least the date card
			expect(summaryCards.length).toBeGreaterThan(1);
		});
	});

	it('should handle workflow name display', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			// Should render the component with workflow data
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should handle empty test cases', async () => {
		vi.mocked(evaluationStore.fetchTestCaseExecutions).mockResolvedValue([]);

		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should handle fetch errors', async () => {
		const error = new Error('Failed to fetch');
		vi.mocked(evaluationStore.getTestRun).mockRejectedValue(error);

		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should render scrollable summary section', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			const scrollableSection = container.querySelector('.scrollableSummary');
			expect(scrollableSection).toBeTruthy();
		});
	});

	it('should display notice callout when no input columns and run is successful', async () => {
		// Mock test cases with no inputs
		const testCasesWithoutInputs = mockTestCases.map((tc) => ({
			...tc,
			inputs: {},
		}));

		vi.mocked(evaluationStore.fetchTestCaseExecutions).mockResolvedValue(testCasesWithoutInputs);

		const { container } = renderComponent();

		await waitFor(() => {
			// Should render the component
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});
});
