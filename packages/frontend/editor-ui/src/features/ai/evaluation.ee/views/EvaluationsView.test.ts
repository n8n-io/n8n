import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsView from './EvaluationsView.vue';

import { mockedStore } from '@/__tests__/utils';
import { useEvaluationStore } from '../evaluation.store';
import { useParallelEvalStore } from '../parallelEval.store';
import userEvent from '@testing-library/user-event';
import type { TestRunRecord } from '../evaluation.api';
import { waitFor } from '@testing-library/vue';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const replace = vi.fn();
	const query = {};
	return {
		useRouter: () => ({
			push,
			replace,
		}),
		useRoute: () => ({
			query,
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(EvaluationsView, {
	props: { workflowId: 'workflow-id' },
});

describe('EvaluationsView', () => {
	const mockTestRuns: TestRunRecord[] = [
		{
			id: 'run1',
			workflowId: 'workflow-id',
			status: 'completed',
			runAt: '2023-01-01',
			createdAt: '2023-01-01',
			updatedAt: '2023-01-01',
			completedAt: '2023-01-01',
			metrics: {
				some: 1,
			},
		},
	];

	beforeEach(() => {
		createTestingPinia();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Test Runs functionality', () => {
		it('should display test runs table when runs exist', async () => {
			const evaluationStore = mockedStore(useEvaluationStore);
			evaluationStore.testRunsById = {
				[mockTestRuns[0].id]: mockTestRuns[0],
			};

			evaluationStore.fetchTestRuns.mockResolvedValue(mockTestRuns);

			const { getByTestId } = renderComponent();
			await waitFor(() => expect(getByTestId('past-runs-table')).toBeInTheDocument());
			// expect(getByTestId('past-runs-table')).toBeInTheDocument();
		});

		it('should start a test run when run test button is clicked', async () => {
			const evaluationStore = mockedStore(useEvaluationStore);
			evaluationStore.testRunsById = {
				run1: {
					id: 'run1',
					workflowId: 'workflow-id',
					status: 'completed',
					runAt: '2023-01-01',
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					completedAt: '2023-01-01',
					metrics: {
						some: 1,
					},
				},
			};

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

			await userEvent.click(getByTestId('run-test-button'));

			// Assert only the workflow id (first arg). The second arg is the
			// parallel-execution options payload — `undefined` when the
			// rollout flag is off, an object when it's on — and isn't
			// what this test is checking.
			expect(evaluationStore.startTestRun).toHaveBeenCalled();
			const [firstCallWorkflowId] = (
				evaluationStore.startTestRun as unknown as ReturnType<typeof vi.fn>
			).mock.calls[0];
			expect(firstCallWorkflowId).toBe('workflow-id');
			expect(evaluationStore.fetchTestRuns).toHaveBeenCalledWith('workflow-id');
		});

		it('should display stop button when a test is running', async () => {
			const evaluationStore = mockedStore(useEvaluationStore);
			evaluationStore.testRunsById = {
				run1: {
					id: 'run1',
					workflowId: 'workflow-id',
					status: 'running',
					runAt: '2023-01-01',
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					completedAt: null,
					metrics: {},
				},
			};

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('stop-test-button')).toBeInTheDocument());
		});

		describe('parallel-execution UI', () => {
			it('does not render the parallel controls when the rollout flag is off', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = false;

				const { queryByTestId, getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				expect(queryByTestId('parallel-eval-controls')).toBeNull();
				expect(queryByTestId('run-in-parallel-concurrency')).toBeNull();
				expect(queryByTestId('run-in-parallel-mode-label')).toBeNull();
			});

			it('renders the slider + tooltip + label when the flag is on', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = true;
				parallelEvalStore.concurrencyValue.mockReturnValue(3);

				const { getByTestId } = renderComponent();

				await waitFor(() => expect(getByTestId('parallel-eval-controls')).toBeInTheDocument());
				expect(getByTestId('run-in-parallel-mode-label')).toBeInTheDocument();
				expect(getByTestId('run-in-parallel-tooltip-icon')).toBeInTheDocument();
				expect(getByTestId('run-in-parallel-concurrency')).toBeInTheDocument();
			});

			it('shows "Sequential" label when slider is at 1', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = true;
				parallelEvalStore.concurrencyValue.mockReturnValue(1);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-in-parallel-mode-label')).toBeInTheDocument());

				expect(getByTestId('run-in-parallel-mode-label').textContent?.trim()).toBe('Sequential');
			});

			it('shows "Concurrent · N" label when slider is above 1', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = true;
				parallelEvalStore.concurrencyValue.mockReturnValue(7);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-in-parallel-mode-label')).toBeInTheDocument());

				expect(getByTestId('run-in-parallel-mode-label').textContent?.trim()).toBe(
					'Concurrent · 7',
				);
			});

			it('omits concurrency from the request when the flag is off', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = false;

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', undefined);
			});

			it('sends the slider value as concurrency when the flag is on', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = true;
				parallelEvalStore.concurrencyValue.mockReturnValue(3);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					concurrency: 3,
				});
			});

			it('sends concurrency=1 when the user has dragged the slider to the minimum', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = true;
				parallelEvalStore.concurrencyValue.mockReturnValue(1);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					concurrency: 1,
				});
			});

			it('forwards the slider value when the user picked a non-default concurrency', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isFeatureEnabled = true;
				parallelEvalStore.concurrencyValue.mockReturnValue(7);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					concurrency: 7,
				});
			});
		});

		it('should call cancelTestRun when stop button is clicked', async () => {
			const evaluationStore = mockedStore(useEvaluationStore);
			evaluationStore.cancelTestRun.mockResolvedValue({ success: true });

			evaluationStore.testRunsById = {
				run1: {
					id: 'run1',
					workflowId: 'workflow-id',
					status: 'running',
					runAt: '2023-01-01',
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					completedAt: null,
					metrics: {},
				},
			};

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('stop-test-button')).toBeInTheDocument());

			await userEvent.click(getByTestId('stop-test-button'));
			expect(getByTestId('stop-test-button')).toBeDisabled();
			expect(evaluationStore.cancelTestRun).toHaveBeenCalledWith('workflow-id', 'run1');

			expect(getByTestId('stop-test-button')).toBeDisabled();
		});
	});
});
