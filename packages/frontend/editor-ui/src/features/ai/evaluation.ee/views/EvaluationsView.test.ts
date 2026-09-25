import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsView from './EvaluationsView.vue';

import { mockedStore } from '@/__tests__/utils';
import { useEvaluationStore } from '../evaluation.store';
import { useParallelEvalStore } from '../parallelEval.store';
import userEvent from '@testing-library/user-event';
import type { TestRunRecord } from '../evaluation.api';
import type { EvaluationConfigDto } from '@n8n/api-types';
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
			evaluationStore.evaluationConfigsByWorkflowId = {};
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
			it('hides the parallel-eval toggle when concurrency is unavailable on the instance', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = false;

				const { queryByTestId, getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				expect(queryByTestId('parallel-eval-toggle')).toBeNull();
			});

			it('renders the parallel-eval toggle next to Run Test when concurrency is available', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = true;
				parallelEvalStore.maxConcurrency = 5;
				parallelEvalStore.concurrencyValue.mockReturnValue(3);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('parallel-eval-toggle')).toBeInTheDocument());
				expect(getByTestId('run-test-button')).toBeInTheDocument();
			});

			it('omits concurrency from the request when concurrency is unavailable on the instance', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = false;

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', undefined);
			});

			it('sends the slider value as concurrency when concurrency is available', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = true;
				parallelEvalStore.maxConcurrency = 5;
				parallelEvalStore.concurrencyValue.mockReturnValue(3);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					concurrency: 3,
				});
			});

			it('forwards the slider value when the user picked a non-default concurrency', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = true;
				parallelEvalStore.maxConcurrency = 10;
				parallelEvalStore.concurrencyValue.mockReturnValue(7);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					concurrency: 7,
				});
			});
		});

		describe('evaluation config run', () => {
			const mockConfig = { id: 'config-1' } as EvaluationConfigDto;

			it('passes config args when a config exists and the primary button is clicked', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				evaluationStore.evaluationConfigsByWorkflowId = { 'workflow-id': [mockConfig] };
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = false;

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					evaluationConfigId: 'config-1',
					compileFromConfig: true,
				});
			});

			it('shows the caret toggle when a config exists (even without concurrency)', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				evaluationStore.evaluationConfigsByWorkflowId = { 'workflow-id': [mockConfig] };
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = false;

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('parallel-eval-toggle')).toBeInTheDocument());
			});

			it('shows the "Run workflow" direct-run button inside the popover when a config exists', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				evaluationStore.evaluationConfigsByWorkflowId = { 'workflow-id': [mockConfig] };
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = false;

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('parallel-eval-toggle')).toBeInTheDocument());

				await userEvent.click(getByTestId('parallel-eval-toggle'));

				await waitFor(() => expect(getByTestId('run-workflow-direct-button')).toBeInTheDocument());
			});

			it('performs a direct run (no config args) when "Run workflow" button is clicked', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				evaluationStore.evaluationConfigsByWorkflowId = { 'workflow-id': [mockConfig] };
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = false;

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('parallel-eval-toggle')).toBeInTheDocument());

				await userEvent.click(getByTestId('parallel-eval-toggle'));
				await waitFor(() => expect(getByTestId('run-workflow-direct-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-workflow-direct-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', undefined);
			});

			it('includes concurrency with config args when both config and concurrency are available', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				evaluationStore.evaluationConfigsByWorkflowId = { 'workflow-id': [mockConfig] };
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = true;
				parallelEvalStore.maxConcurrency = 5;
				parallelEvalStore.concurrencyValue.mockReturnValue(3);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				await userEvent.click(getByTestId('run-test-button'));

				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					concurrency: 3,
					evaluationConfigId: 'config-1',
					compileFromConfig: true,
				});
			});

			it('keeps the primary button disabled until configs resolve, then runs with the config', async () => {
				const evaluationStore = mockedStore(useEvaluationStore);
				evaluationStore.testRunsById = {};
				evaluationStore.evaluationConfigsByWorkflowId = { 'workflow-id': [mockConfig] };
				const parallelEvalStore = mockedStore(useParallelEvalStore);
				parallelEvalStore.isConcurrencyAvailable = false;

				// Keep the configs fetch pending so the button stays in its loading state.
				let resolveFetch!: () => void;
				evaluationStore.fetchEvaluationConfigs.mockReturnValue(
					new Promise<EvaluationConfigDto[]>((resolve) => {
						resolveFetch = () => resolve([mockConfig]);
					}),
				);

				const { getByTestId } = renderComponent();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeInTheDocument());

				// Clicking before configs load must not kick off an (unintended) direct run.
				await userEvent.click(getByTestId('run-test-button'));
				expect(evaluationStore.startTestRun).not.toHaveBeenCalled();

				resolveFetch();
				await waitFor(() => expect(getByTestId('run-test-button')).toBeEnabled());

				await userEvent.click(getByTestId('run-test-button'));
				expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id', {
					evaluationConfigId: 'config-1',
					compileFromConfig: true,
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
