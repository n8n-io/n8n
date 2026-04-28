import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';
import type { IWorkflowDb } from '@/Interface';

const mockFetchWorkflow = vi.fn();
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => ({
		fetchWorkflow: mockFetchWorkflow,
	})),
}));

const mockFetchExecutionDataById = vi.fn();
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		fetchExecutionDataById: mockFetchExecutionDataById,
	})),
}));

const reloadExecutionMock = vi.fn();

const renderComponent = createComponentRenderer(InstanceAiWorkflowPreview, {
	global: {
		stubs: {
			WorkflowPreview: {
				template:
					'<div data-test-id="workflow-preview" :data-can-execute="canExecute" :data-suppress-notifications="suppressNotifications" :data-allow-error-notifications="allowErrorNotifications" />',
				props: [
					'mode',
					'workflow',
					'executionId',
					'canOpenNdv',
					'canExecute',
					'hideControls',
					'suppressNotifications',
					'allowErrorNotifications',
					'loaderType',
				],
				setup(_props: unknown, { expose }: { expose: (refs: object) => void }) {
					expose({ reloadExecution: reloadExecutionMock });
				},
			},
		},
	},
});

const fakeWorkflow: IWorkflowDb = {
	id: 'wf-123',
	name: 'My Test Workflow',
	nodes: [],
	connections: {},
	active: false,
	createdAt: '',
	updatedAt: '',
	versionId: '',
} as unknown as IWorkflowDb;

describe('InstanceAiWorkflowPreview', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
	});

	it('should render without throwing', () => {
		expect(() =>
			renderComponent({
				props: { workflowId: null, executionId: null },
			}),
		).not.toThrow();
	});

	it('should show error when workflow fetch fails', async () => {
		mockFetchWorkflow.mockRejectedValue(new Error('Not found'));

		const { getByText } = renderComponent({
			props: { workflowId: 'wf-deleted', executionId: null },
		});

		await waitFor(() => {
			expect(getByText('Could not load workflow')).toBeInTheDocument();
		});
	});

	it('should render WorkflowPreview in workflow mode by default', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { getByTestId } = renderComponent({
			props: { workflowId: 'wf-123', executionId: null },
		});

		await waitFor(() => {
			const preview = getByTestId('workflow-preview');
			expect(preview).toBeInTheDocument();
		});
	});

	it('should allow error notifications for executable preview', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { getByTestId } = renderComponent({
			props: { workflowId: 'wf-123', executionId: null },
		});

		await waitFor(() => {
			const preview = getByTestId('workflow-preview');
			expect(preview).toHaveAttribute('data-can-execute', 'true');
			expect(preview).toHaveAttribute('data-suppress-notifications', 'true');
			expect(preview).toHaveAttribute('data-allow-error-notifications', 'true');
		});
	});

	it('should emit iframe-ready on n8nReady postMessage', async () => {
		const { emitted } = renderComponent({
			props: { workflowId: null, executionId: null },
		});

		window.dispatchEvent(
			new MessageEvent('message', {
				data: JSON.stringify({
					command: 'n8nReady',
					pushRef: 'iframe-push-ref-abc',
				}),
			}),
		);

		await waitFor(() => {
			expect(emitted('iframe-ready')).toBeTruthy();
		});
	});

	it('should emit iframe-ready even when n8nReady has no pushRef', async () => {
		const { emitted } = renderComponent({
			props: { workflowId: null, executionId: null },
		});

		window.dispatchEvent(
			new MessageEvent('message', {
				data: JSON.stringify({ command: 'n8nReady' }),
			}),
		);

		await waitFor(() => {
			expect(emitted('iframe-ready')).toBeTruthy();
		});
	});

	describe('execution polling', () => {
		const POLL_INTERVAL_MS = 1_500;

		beforeEach(() => {
			vi.useFakeTimers();
			mockFetchWorkflow.mockResolvedValue(fakeWorkflow);
			reloadExecutionMock.mockClear();
			mockFetchExecutionDataById.mockReset();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should not call reloadExecution when the first poll already sees the execution finished', async () => {
			mockFetchExecutionDataById.mockResolvedValue({ finished: true });

			const { rerender } = renderComponent({
				props: { workflowId: 'wf-123', executionId: null },
			});
			await rerender({ workflowId: 'wf-123', executionId: 'exec-1' });

			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(mockFetchExecutionDataById).toHaveBeenCalledWith('exec-1');
			expect(reloadExecutionMock).not.toHaveBeenCalled();
		});

		it('should call reloadExecution once when execution transitions from running to finished', async () => {
			mockFetchExecutionDataById
				.mockResolvedValueOnce({ finished: false })
				.mockResolvedValueOnce({ finished: true });

			const { rerender } = renderComponent({
				props: { workflowId: 'wf-123', executionId: null },
			});
			await rerender({ workflowId: 'wf-123', executionId: 'exec-1' });

			// First poll: still running — no reload yet
			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
			expect(reloadExecutionMock).not.toHaveBeenCalled();

			// Second poll: now finished — reload fires once
			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
			expect(reloadExecutionMock).toHaveBeenCalledTimes(1);
		});
	});
});
