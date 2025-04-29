import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsView from '@/views/Evaluations/EvaluationsView.vue';

import { cleanupAppModals, createAppModals, mockedStore } from '@/__tests__/utils';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import userEvent from '@testing-library/user-event';
import type { TestRunRecord } from '@/api/evaluation.ee';
import { waitFor } from '@testing-library/vue';
// import { useWorkflowsStore } from '@/stores/workflows.store';

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
	props: { name: 'workflow-id' },
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
		createAppModals();
	});

	afterEach(() => {
		vi.clearAllMocks();
		cleanupAppModals();
	});

	describe('Test Runs functionality', () => {
		it('should load test data', async () => {
			const evaluationStore = mockedStore(useEvaluationStore);
			evaluationStore.fetchTestRuns.mockResolvedValue(mockTestRuns);

			renderComponent();
			expect(evaluationStore.fetchTestRuns).toHaveBeenCalledWith('workflow-id');
		});

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

		it('should not display test runs table when no runs exist', async () => {
			const { queryByTestId } = renderComponent();
			expect(queryByTestId('past-runs-table')).not.toBeInTheDocument();
		});

		it('should display setup wizard when no runs exist', async () => {
			const { queryByTestId } = renderComponent();
			await waitFor(() => expect(queryByTestId('evaluation-setup-wizard')).toBeInTheDocument());
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

			expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id');
			expect(evaluationStore.fetchTestRuns).toHaveBeenCalledWith('workflow-id');
		});
	});
});
