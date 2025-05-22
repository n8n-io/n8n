import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationRootView from '../EvaluationsRootView.vue';

import { useWorkflowsStore } from '@/stores/workflows.store';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import { waitFor } from '@testing-library/vue';
import { TestRunRecord } from '@/api/evaluation.ee';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';

describe('TestDefinitionRootView', () => {
	const renderComponent = createComponentRenderer(EvaluationRootView);

	const mockWorkflow: IWorkflowDb = {
		id: 'different-id',
		name: 'Test Workflow',
		active: false,
		isArchived: false,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		nodes: [],
		connections: {},
		settings: {
			executionOrder: 'v1',
		},
		tags: [],
		pinData: {},
		versionId: '',
		usedCredentials: [],
	};

	const mockTestRuns: TestRunRecord[] = [mock<TestRunRecord>({ workflowId: mockWorkflow.id })];

	beforeEach(() => {
		createTestingPinia();
	});

	it('should initialize workflow on mount if not already initialized', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		const uninitializedWorkflow = { ...mockWorkflow, id: PLACEHOLDER_EMPTY_WORKFLOW_ID };
		workflowsStore.workflow = uninitializedWorkflow;
		const newWorkflowId = 'workflow123';

		renderComponent({ props: { name: newWorkflowId } });

		// Wait for async operation to complete
		await waitFor(() => expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(newWorkflowId));
	});

	it('should not initialize workflow if already loaded', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflow = mockWorkflow;

		renderComponent({ props: { name: mockWorkflow.id } });

		expect(workflowsStore.fetchWorkflow).not.toHaveBeenCalled();
	});

	it('should load test data', async () => {
		const evaluationStore = mockedStore(useEvaluationStore);
		evaluationStore.fetchTestRuns.mockResolvedValue(mockTestRuns);

		renderComponent({ props: { name: mockWorkflow.id } });

		await waitFor(() =>
			expect(evaluationStore.fetchTestRuns).toHaveBeenCalledWith(mockWorkflow.id),
		);
	});

	it('should not render setup wizard when there are test runs', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchWorkflow.mockResolvedValue(mockWorkflow);
		const evaluationStore = mockedStore(useEvaluationStore);
		evaluationStore.testRunsById = { foo: mock<TestRunRecord>({ workflowId: mockWorkflow.id }) };

		const { container } = renderComponent({ props: { name: mockWorkflow.id } });

		// Check that setupContent is not present
		await waitFor(() => expect(container.querySelector('.setupContent')).toBeFalsy());
	});

	it('should render the setup wizard when there there are no test runs', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchWorkflow.mockResolvedValue(mockWorkflow);

		const { container } = renderComponent({ props: { name: mockWorkflow.id } });

		await waitFor(() => expect(container.querySelector('.setupContent')).toBeTruthy());
	});
});
