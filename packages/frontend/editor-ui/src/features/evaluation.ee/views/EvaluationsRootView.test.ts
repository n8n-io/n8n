import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationRootView from './EvaluationsRootView.vue';

import { useWorkflowsStore } from '@/stores/workflows.store';
import { useEvaluationStore } from '../evaluation.store';
import { useUsageStore } from '@/stores/usage.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import { waitFor } from '@testing-library/vue';
import type { TestRunRecord } from '../evaluation.api';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useTelemetry } from '@/composables/useTelemetry';
import { EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE, NodeHelpers } from 'n8n-workflow';
import { mockNodeTypeDescription } from '@/__tests__/mocks';
import type { SourceControlPreferences } from '@/features/sourceControl.ee/sourceControl.types';

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

const getNodeType = vi.fn();
vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	return {
		...(await importOriginal()),
		useI18n: () => ({
			baseText: vi.fn((key: string) => `mocked-${key}`),
		}),
	};
});

describe('EvaluationsRootView', () => {
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
		vi.clearAllMocks();

		vi.spyOn(NodeHelpers, 'getNodeParameters').mockReturnValue({
			assignments: {
				assignments: [
					{
						id: 'xxxxx',
						name: '=',
						value: '',
						type: 'string',
					},
				],
			},
			options: {},
		});
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

	it('should render read-only callout when in protected environment', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		const sourceControlStore = mockedStore(useSourceControlStore);
		workflowsStore.fetchWorkflow.mockResolvedValue(mockWorkflow);
		sourceControlStore.preferences = mock<SourceControlPreferences>({ branchReadOnly: true });

		const { container } = renderComponent({ props: { name: mockWorkflow.id } });

		await waitFor(() => {
			const callout = container.querySelector('[role="alert"]');
			expect(callout).toBeTruthy();
			expect(callout?.textContent).toContain('mocked-evaluations.readOnlyNotice');
		});
	});

	describe('telemetry', () => {
		it('should send telemetry event on mount with setup view when no test runs exist', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const evaluationStore = mockedStore(useEvaluationStore);
			const usageStore = mockedStore(useUsageStore);

			workflowsStore.workflow = mockWorkflow;
			evaluationStore.testRunsById = {};
			usageStore.workflowsWithEvaluationsLimit = 10;
			usageStore.workflowsWithEvaluationsCount = 0;

			// Mock no evaluation nodes in workflow
			getNodeType.mockReturnValue(null);

			renderComponent({ props: { name: mockWorkflow.id } });

			await waitFor(() => {
				expect(useTelemetry().track).toHaveBeenCalledWith('User viewed tests tab', {
					workflow_id: mockWorkflow.id,
					test_type: 'evaluation',
					view: 'setup',
					trigger_set_up: false,
					output_set_up: false,
					metrics_set_up: false,
					quota_reached: false,
				});
			});
		});

		it('should send telemetry event on mount with overview view when test runs exist', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const evaluationStore = mockedStore(useEvaluationStore);
			const usageStore = mockedStore(useUsageStore);

			workflowsStore.workflow = mockWorkflow;
			evaluationStore.testRunsById = {
				run1: mock<TestRunRecord>({ workflowId: mockWorkflow.id }),
				run2: mock<TestRunRecord>({ workflowId: mockWorkflow.id }),
			};
			usageStore.workflowsWithEvaluationsLimit = 10;
			usageStore.workflowsWithEvaluationsCount = 1;

			renderComponent({ props: { name: mockWorkflow.id } });

			await waitFor(() => {
				expect(useTelemetry().track).toHaveBeenCalledWith('User viewed tests tab', {
					workflow_id: mockWorkflow.id,
					test_type: 'evaluation',
					view: 'overview',
					run_count: 2,
				});
			});
		});

		it('should send telemetry event with trigger_set_up true when dataset trigger node exists', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const evaluationStore = mockedStore(useEvaluationStore);
			const usageStore = mockedStore(useUsageStore);

			const workflowWithTrigger = mock<IWorkflowDb>({
				...mockWorkflow,
				nodes: [
					{
						id: 'trigger1',
						name: 'Dataset Trigger',
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
			});

			workflowsStore.workflow = workflowWithTrigger;
			evaluationStore.testRunsById = {};
			usageStore.workflowsWithEvaluationsLimit = 10;
			usageStore.workflowsWithEvaluationsCount = 0;

			// Mock dataset trigger node type exists
			getNodeType.mockImplementation((nodeType) =>
				nodeType === EVALUATION_TRIGGER_NODE_TYPE
					? mockNodeTypeDescription({ name: EVALUATION_TRIGGER_NODE_TYPE })
					: null,
			);

			renderComponent({ props: { name: mockWorkflow.id } });

			await waitFor(() => {
				expect(useTelemetry().track).toHaveBeenCalledWith('User viewed tests tab', {
					workflow_id: mockWorkflow.id,
					test_type: 'evaluation',
					view: 'setup',
					trigger_set_up: true,
					output_set_up: false,
					metrics_set_up: false,
					quota_reached: false,
				});
			});
		});

		it('should send telemetry event with output_set_up true when evaluation set output node exists', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const evaluationStore = mockedStore(useEvaluationStore);
			const usageStore = mockedStore(useUsageStore);

			const workflowWithOutputNode = mock<IWorkflowDb>({
				...mockWorkflow,
				nodes: [
					{
						id: 'output1',
						name: 'Set Outputs',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setOutputs',
						},
					},
				],
			});

			vi.spyOn(NodeHelpers, 'getNodeParameters').mockReturnValue({
				operation: 'setOutputs',
			});

			workflowsStore.workflow = workflowWithOutputNode;
			evaluationStore.testRunsById = {};
			usageStore.workflowsWithEvaluationsLimit = 10;
			usageStore.workflowsWithEvaluationsCount = 0;

			// Mock evaluation node type exists
			getNodeType.mockImplementation((nodeType) =>
				nodeType === EVALUATION_NODE_TYPE
					? mockNodeTypeDescription({ name: EVALUATION_NODE_TYPE })
					: null,
			);

			renderComponent({ props: { name: mockWorkflow.id } });

			await waitFor(() => {
				expect(useTelemetry().track).toHaveBeenCalledWith('User viewed tests tab', {
					workflow_id: mockWorkflow.id,
					test_type: 'evaluation',
					view: 'setup',
					trigger_set_up: false,
					output_set_up: true,
					metrics_set_up: false,
					quota_reached: false,
				});
			});
		});

		it('should send telemetry event with metrics_set_up true when evaluation metrics node exists', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const evaluationStore = mockedStore(useEvaluationStore);
			const usageStore = mockedStore(useUsageStore);

			const workflowWithMetricsNode = mock<IWorkflowDb>({
				...mockWorkflow,
				nodes: [
					{
						id: 'metrics1',
						name: 'Set Metrics',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setMetrics',
						},
					},
				],
			});

			vi.spyOn(NodeHelpers, 'getNodeParameters').mockReturnValue({
				operation: 'setMetrics',
			});

			workflowsStore.workflow = workflowWithMetricsNode;
			evaluationStore.testRunsById = {};
			usageStore.workflowsWithEvaluationsLimit = 10;
			usageStore.workflowsWithEvaluationsCount = 0;

			// Mock evaluation node type exists
			getNodeType.mockImplementation((nodeType) =>
				nodeType === EVALUATION_NODE_TYPE
					? mockNodeTypeDescription({ name: EVALUATION_NODE_TYPE })
					: null,
			);

			renderComponent({ props: { name: mockWorkflow.id } });

			await waitFor(() => {
				expect(useTelemetry().track).toHaveBeenCalledWith('User viewed tests tab', {
					workflow_id: mockWorkflow.id,
					test_type: 'evaluation',
					view: 'setup',
					trigger_set_up: false,
					output_set_up: false,
					metrics_set_up: true,
					quota_reached: false,
				});
			});
		});

		it('should send telemetry event with quota_reached true when evaluations quota is exceeded', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			const evaluationStore = mockedStore(useEvaluationStore);
			const usageStore = mockedStore(useUsageStore);

			workflowsStore.workflow = mockWorkflow;
			evaluationStore.testRunsById = {};
			usageStore.workflowsWithEvaluationsLimit = 5;
			usageStore.workflowsWithEvaluationsCount = 5; // At limit

			// Mock no evaluation nodes in workflow
			getNodeType.mockReturnValue(null);

			renderComponent({ props: { name: mockWorkflow.id } });

			await waitFor(() => {
				expect(useTelemetry().track).toHaveBeenCalledWith('User viewed tests tab', {
					workflow_id: mockWorkflow.id,
					test_type: 'evaluation',
					view: 'setup',
					trigger_set_up: false,
					output_set_up: false,
					metrics_set_up: false,
					quota_reached: true,
				});
			});
		});
	});
});
