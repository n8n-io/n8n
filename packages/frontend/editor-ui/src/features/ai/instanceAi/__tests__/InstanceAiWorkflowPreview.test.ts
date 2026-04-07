import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const renderComponent = createComponentRenderer(InstanceAiWorkflowPreview, {
	global: {
		stubs: {
			WorkflowPreview: {
				template: '<div data-test-id="workflow-preview" />',
				props: ['mode', 'workflow', 'executionId', 'canOpenNdv', 'hideControls', 'loaderType'],
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
});
