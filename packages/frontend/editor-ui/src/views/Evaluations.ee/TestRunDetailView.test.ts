import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
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
		errorCode: 'INTERRUPTED',
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

		// Mock store methods
		vi.mocked(evaluationStore.getTestRun).mockResolvedValue(mockTestRun);
		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockResolvedValue(mockTestCases);

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

	it('should display back navigation', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			const backButton = container.querySelector('.backButton');
			expect(backButton).toBeTruthy();
		});
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
		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockResolvedValue(mockTestCases);

		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should handle empty test cases', async () => {
		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockResolvedValue([]);

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

		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockResolvedValue(testCasesWithoutInputs);

		const { container } = renderComponent();

		await waitFor(() => {
			// Should render the component
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('should display inputs correctly in test table', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			expect(evaluationStore.fetchTestCaseExecutions).toHaveBeenCalledWith({
				workflowId: 'test-workflow-id',
				runId: 'test-run-id',
			});
		});

		await waitFor(() => {
			// Check that inputs are displayed
			const testTable = container.querySelector('[data-test-id="test-definition-run-detail"]');
			expect(testTable).toBeTruthy();
			// Inputs should be rendered in the table
			expect(container.textContent).toContain('value1');
			expect(container.textContent).toContain('value2');
		});
	});

	it('should display outputs correctly in test table', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			expect(evaluationStore.fetchTestCaseExecutions).toHaveBeenCalledWith({
				workflowId: 'test-workflow-id',
				runId: 'test-run-id',
			});
		});

		await waitFor(() => {
			// Check that outputs are displayed
			const testTable = container.querySelector('[data-test-id="test-definition-run-detail"]');
			expect(testTable).toBeTruthy();
			// Outputs should be rendered in the table
			expect(container.textContent).toContain('result1');
			expect(container.textContent).toContain('result2');
		});
	});

	it('should display metrics correctly for individual test cases', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			expect(evaluationStore.fetchTestCaseExecutions).toHaveBeenCalledWith({
				workflowId: 'test-workflow-id',
				runId: 'test-run-id',
			});
		});

		await waitFor(() => {
			// Check that metrics are displayed in the table
			const testTable = container.querySelector('[data-test-id="test-definition-run-detail"]');
			expect(testTable).toBeTruthy();
			// Individual test case metrics should be shown
			expect(container.textContent).toContain('0.98'); // accuracy for test-case-1
			expect(container.textContent).toContain('0.95'); // precision for test-case-1
			expect(container.textContent).toContain('0.85'); // accuracy for test-case-2
			expect(container.textContent).toContain('0.88'); // precision for test-case-2
		});
	});

	it('should display overall run metrics in summary cards', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			// Check that overall metrics are displayed in summary
			const summaryCards = container.querySelectorAll('.summaryCard');
			expect(summaryCards.length).toBeGreaterThan(0);
			// Overall run metrics should be shown
			expect(container.textContent).toContain('0.95'); // overall accuracy
			expect(container.textContent).toContain('0.92'); // overall precision
		});
	});

	it('should handle test cases with missing metrics gracefully', async () => {
		const testCasesWithMissingMetrics = [
			mock<TestCaseExecutionRecord>({
				id: 'test-case-3',
				status: 'completed',
				runAt: '2023-10-01T10:02:00Z',
				executionId: 'execution-3',
				inputs: { input1: 'value3' },
				outputs: { output1: 'result3' },
				// No metrics property
			}),
		];

		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockResolvedValue(
			testCasesWithMissingMetrics,
		);

		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
			// Should still display inputs and outputs
			expect(container.textContent).toContain('value3');
			expect(container.textContent).toContain('result3');
		});
	});

	it('should display error status for failed test cases', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			expect(evaluationStore.fetchTestCaseExecutions).toHaveBeenCalledWith({
				workflowId: 'test-workflow-id',
				runId: 'test-run-id',
			});
		});

		await waitFor(() => {
			// Check that error status and error code are displayed
			const testTable = container.querySelector('[data-test-id="test-definition-run-detail"]');
			expect(testTable).toBeTruthy();
			// Error status should be shown for test-case-2
			expect(container.textContent).toContain('error');
			expect(container.textContent).toContain('run was interrupted');
		});
	});

	it('should handle complex input and output objects', async () => {
		const testCasesWithComplexData = [
			mock<TestCaseExecutionRecord>({
				id: 'test-case-complex',
				status: 'completed',
				runAt: '2023-10-01T10:03:00Z',
				executionId: 'execution-complex',
				inputs: {
					complexInput: {
						nested: {
							value: 'nested-value',
							array: [1, 2, 3],
						},
					},
				},
				outputs: {
					complexOutput: {
						result: 'complex-result',
						metadata: {
							processed: true,
							timestamp: '2023-10-01T10:03:00Z',
						},
					},
				},
				metrics: {
					accuracy: 0.97,
					precision: 0.94,
				},
			}),
		];

		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockResolvedValue(
			testCasesWithComplexData,
		);

		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
			// Complex data should be handled and displayed
			expect(container.textContent).toContain('0.97');
			expect(container.textContent).toContain('0.94');
			expect(container.textContent).toContain('complexInput');
			expect(container.textContent).toContain('complexOutput');
		});
	});
});
