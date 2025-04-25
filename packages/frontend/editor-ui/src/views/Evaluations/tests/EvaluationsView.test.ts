import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsView from '@/views/Evaluations/EvaluationsView.vue';
import type { useTestDefinitionForm } from '@/components/Evaluations/composables/useTestDefinitionForm';

import { ref } from 'vue';
import { cleanupAppModals, createAppModals, mockedStore } from '@/__tests__/utils';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import userEvent from '@testing-library/user-event';

const form: Partial<ReturnType<typeof useTestDefinitionForm>> = {
	state: ref({
		name: { value: '', isEditing: false, tempValue: '' },
		description: { value: '', isEditing: false, tempValue: '' },
		tags: { value: [], tempValue: [], isEditing: false },
		evaluationWorkflow: { mode: 'list', value: '', __rl: true },
		mockedNodes: [],
	}),
	loadTestData: vi.fn(),
	cancelEditing: vi.fn(),
	updateTest: vi.fn(),
	startEditing: vi.fn(),
	saveChanges: vi.fn(),
	createTest: vi.fn(),
};
vi.mock('@/components/Evaluations/composables/useTestDefinitionForm', () => ({
	useTestDefinitionForm: () => form,
}));

const renderComponent = createComponentRenderer(EvaluationsView, {
	props: { testId: '1', name: 'workflow-name' },
});

describe('EvaluationsView', () => {
	beforeEach(() => {
		createTestingPinia();
		createAppModals();
	});

	afterEach(() => {
		vi.clearAllMocks();
		cleanupAppModals();
	});

	it('should load test data', async () => {
		renderComponent();
		expect(form.loadTestData).toHaveBeenCalledWith('1', 'workflow-name');
	});

	it('should display disabled "run test" button when editing test without tags', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);

		testDefinitionStore.getFieldIssues.mockReturnValueOnce([
			{ field: 'tags', message: 'Tag is required' },
		]);

		const { getByTestId } = renderComponent();

		const updateButton = getByTestId('run-test-button');
		expect(updateButton.textContent?.toLowerCase()).toContain('run test');
		expect(updateButton).toHaveClass('disabled');
	});

	it('should apply "has-issues" class to inputs with issues', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);

		testDefinitionStore.getFieldIssues.mockReturnValueOnce([
			{ field: 'evaluationWorkflow', message: 'No evaluation workflow set' },
		]);

		const { container } = renderComponent();
		const issueElements = container.querySelectorAll('.has-issues');
		expect(issueElements.length).toBeGreaterThan(0);
	});

	describe('Test Runs functionality', () => {
		it('should display test runs table when runs exist', async () => {
			const testDefinitionStore = mockedStore(useTestDefinitionStore);
			testDefinitionStore.testRunsById = {
				run1: {
					id: 'run1',
					testDefinitionId: '1',
					status: 'completed',
					runAt: '2023-01-01',
					createdAt: '2023-01-01',
					updatedAt: '2023-01-01',
					completedAt: '2023-01-01',
				},
			};

			const { getByTestId } = renderComponent();
			expect(getByTestId('past-runs-table')).toBeInTheDocument();
		});

		it('should not display test runs table when no runs exist', async () => {
			const { queryByTestId } = renderComponent();
			expect(queryByTestId('past-runs-table')).not.toBeInTheDocument();
		});

		it('should start a test run when run test button is clicked', async () => {
			const testDefinitionStore = mockedStore(useTestDefinitionStore);
			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('run-test-button'));

			expect(testDefinitionStore.startTestRun).toHaveBeenCalledWith('1');
			expect(testDefinitionStore.fetchTestRuns).toHaveBeenCalledWith('1');
		});
	});
});
