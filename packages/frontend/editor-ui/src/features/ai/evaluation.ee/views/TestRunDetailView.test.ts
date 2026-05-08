import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { useEvaluationStore } from '../evaluation.store';
import TestRunDetailView from './TestRunDetailView.vue';
import type { TestCaseExecutionRecord, TestRunRecord } from '../evaluation.api';
import type { IWorkflowDb } from '@/Interface';
import { mock } from 'vitest-mock-extended';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { computed } from 'vue';

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
	}),
}));

const trackMock = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
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
	createdAt: '2023-10-02T10:00:00Z',
	updatedAt: '2023-10-02T10:00:00Z',
	completedAt: '2023-10-02T10:00:01Z',
	runAt: '2023-10-02T10:00:00Z',
	metrics: {
		accuracy: 0.95,
		precision: 0.92,
	},
	finalResult: 'success',
};

const mockPreviousRun: TestRunRecord = {
	id: 'previous-run-id',
	workflowId: 'test-workflow-id',
	status: 'completed',
	createdAt: '2023-10-01T10:00:00Z',
	updatedAt: '2023-10-01T10:00:00Z',
	completedAt: '2023-10-01T10:00:01Z',
	runAt: '2023-10-01T10:00:00Z',
	metrics: {
		accuracy: 0.85,
		precision: 0.95,
	},
	finalResult: 'success',
};

const mockTestCases = [
	mock<TestCaseExecutionRecord>({
		id: 'test-case-1',
		testRunId: 'test-run-id',
		status: 'success',
		runAt: '2023-10-02T10:00:00Z',
		updatedAt: '2023-10-02T10:00:01Z',
		executionId: 'execution-1',
		metrics: {
			accuracy: 0.98,
			precision: 0.95,
			totalTokens: 1500,
		},
	}),
	mock<TestCaseExecutionRecord>({
		id: 'test-case-2',
		testRunId: 'test-run-id',
		status: 'error',
		runAt: '2023-10-02T10:01:00Z',
		updatedAt: '2023-10-02T10:01:01Z',
		executionId: 'execution-2',
		errorCode: 'INTERRUPTED',
		metrics: {
			accuracy: 0.85,
			precision: 0.88,
			totalTokens: 1200,
		},
	}),
];

const mockWorkflow = mock<IWorkflowDb>({
	id: 'test-workflow-id',
	name: 'Test Workflow',
});

describe('TestRunDetailView', () => {
	let evaluationStore: ReturnType<typeof useEvaluationStore>;

	const renderComponent = createComponentRenderer(TestRunDetailView, {
		pinia: createTestingPinia({
			initialState: {
				evaluation: {
					testRunsById: {
						'test-run-id': mockTestRun,
						'previous-run-id': mockPreviousRun,
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
		global: {
			provide: {
				[WorkflowIdKey]: computed(() => 'test-workflow-id'),
			},
		},
	});

	beforeEach(() => {
		evaluationStore = useEvaluationStore();

		vi.mocked(evaluationStore.getTestRun).mockResolvedValue(mockTestRun);
		vi.spyOn(evaluationStore, 'fetchTestRuns').mockResolvedValue([mockTestRun, mockPreviousRun]);
		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockImplementation(async () => {
			// Seed the store directly so `testCases` (now a computed) reads from it.
			evaluationStore.testCaseExecutionsById = mockTestCases.reduce(
				(acc, testCase) => {
					acc[testCase.id] = testCase as TestCaseExecutionRecord;
					return acc;
				},
				{} as Record<string, TestCaseExecutionRecord>,
			);
			return mockTestCases as TestCaseExecutionRecord[];
		});

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the run detail container', async () => {
		const { container } = renderComponent();
		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('fetches test run + cases on mount', async () => {
		renderComponent();
		await waitFor(() => {
			expect(evaluationStore.getTestRun).toHaveBeenCalledWith({
				workflowId: 'test-workflow-id',
				runId: 'test-run-id',
			});
			expect(evaluationStore.fetchTestCaseExecutions).toHaveBeenCalledWith({
				workflowId: 'test-workflow-id',
				runId: 'test-run-id',
			});
		});
	});

	it('renders the metric summary strip with one card per user-defined metric', async () => {
		const { container } = renderComponent();
		await waitFor(() => {
			expect(container.querySelector('[data-test-id="metric-summary-strip"]')).toBeTruthy();
			const cards = container.querySelectorAll('[data-test-id="metric-summary-card"]');
			expect(cards.length).toBe(2);
		});
	});

	it('does not render the AI summary section (hidden per Figma rebuild)', async () => {
		const { container } = renderComponent();
		await waitFor(() => {
			expect(container.querySelector('[data-test-id="metric-summary-strip"]')).toBeTruthy();
		});
		expect(container.querySelector('[data-test-id="ai-summary-section"]')).toBeNull();
	});

	it('renders one TestCaseCard per case', async () => {
		const { container } = renderComponent();
		await waitFor(() => {
			const cards = container.querySelectorAll('[data-test-id="test-case-card"]');
			expect(cards.length).toBe(mockTestCases.length);
		});
	});

	it('does not render a partial-failure callout (the redesign drops it)', async () => {
		const { container, queryByText } = renderComponent();
		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
		expect(queryByText('Finished with errors')).toBeNull();
	});

	it('renders the back button', async () => {
		const { container } = renderComponent();
		await waitFor(() => {
			const backButton = container.querySelector('button');
			expect(backButton).toBeTruthy();
		});
	});

	it('renders gracefully when there are no test cases', async () => {
		vi.spyOn(evaluationStore, 'fetchTestCaseExecutions').mockResolvedValue([]);
		const { container } = renderComponent();
		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
			expect(container.querySelectorAll('[data-test-id="test-case-card"]').length).toBe(0);
		});
	});

	it('renders without crashing when the run status is error', async () => {
		vi.mocked(evaluationStore.getTestRun).mockResolvedValue({
			...mockTestRun,
			status: 'error',
			errorCode: 'INTERRUPTED',
		});
		const { container } = renderComponent();
		await waitFor(() => {
			expect(container.querySelector('[data-test-id="test-definition-run-detail"]')).toBeTruthy();
		});
	});

	it('shows the trend delta badge when a previous run is available', async () => {
		const { container } = renderComponent();
		await waitFor(() => {
			const badges = container.querySelectorAll('[data-test-id="trend-delta-badge"]');
			// accuracy improved (positive), precision declined (negative); both should show a badge
			expect(badges.length).toBe(2);
		});
	});

	it('skips non-completed runs when picking the previous run for delta comparison', async () => {
		// Three runs ordered by runAt: completed → cancelled (in between) →
		// current (completed). The cancelled run sits at index-1 but has no
		// usable metrics. The delta should still compare against the earlier
		// completed run instead of falling back to "no previous run" or the
		// cancelled one. The test asserts both badges still render — they
		// would disappear if `previousRun` resolved to null or to the
		// cancelled record.
		const cancelledRunBetween: TestRunRecord = {
			id: 'cancelled-between',
			workflowId: 'test-workflow-id',
			status: 'cancelled',
			createdAt: '2023-10-01T11:00:00Z',
			updatedAt: '2023-10-01T11:00:00Z',
			completedAt: '2023-10-01T11:00:01Z',
			runAt: '2023-10-01T11:00:00Z',
			metrics: null,
			finalResult: 'error',
		};

		const { container } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					evaluation: {
						testRunsById: {
							'previous-run-id': mockPreviousRun,
							'cancelled-between': cancelledRunBetween,
							'test-run-id': {
								...mockTestRun,
								// Bump the current run's runAt past the cancelled one so
								// the chronological order is: previous → cancelled → current.
								runAt: '2023-10-01T12:00:00Z',
							},
						},
					},
					workflows: {
						workflowsById: { 'test-workflow-id': mockWorkflow },
					},
				},
				stubActions: false,
			}),
			global: {
				provide: { [WorkflowIdKey]: computed(() => 'test-workflow-id') },
			},
		});

		await waitFor(() => {
			const badges = container.querySelectorAll('[data-test-id="trend-delta-badge"]');
			// Same two badges as the happy-path test — proves the cancelled
			// run between us and the previous completed run did not displace
			// the comparison.
			expect(badges.length).toBe(2);
		});
	});

	it('fires "User viewed run detail" telemetry on mount', async () => {
		renderComponent();
		await waitFor(() => {
			expect(trackMock).toHaveBeenCalledWith('User viewed run detail', {
				run_id: 'test-run-id',
				workflow_id: 'test-workflow-id',
				has_previous_run: true,
				// `accuracy` and `precision` only — `getUserDefinedMetricNames`
				// excludes predefined keys like `totalTokens`/`executionTime`.
				metric_count: 2,
				test_case_count: mockTestCases.length,
				failed_test_case_count: 1,
			});
		});
	});
});
