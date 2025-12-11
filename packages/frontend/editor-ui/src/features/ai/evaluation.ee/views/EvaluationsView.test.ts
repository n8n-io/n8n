import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsView from './EvaluationsView.vue';

import { mockedStore } from '@/__tests__/utils';
import { useEvaluationStore } from '../evaluation.store';
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

			expect(evaluationStore.startTestRun).toHaveBeenCalledWith('workflow-id');
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
