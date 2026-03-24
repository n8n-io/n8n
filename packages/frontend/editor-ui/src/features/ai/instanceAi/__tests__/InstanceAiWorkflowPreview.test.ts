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

	it('should show default title when no workflow is loaded', () => {
		const { getByText } = renderComponent({
			props: { workflowId: null, executionId: null },
		});
		expect(getByText('Workflow preview')).toBeInTheDocument();
	});

	it('should fetch and display workflow when workflowId is set', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { getByText } = renderComponent({
			props: { workflowId: 'wf-123', executionId: null },
		});

		await waitFor(() => {
			expect(mockFetchWorkflow).toHaveBeenCalledWith('wf-123');
			expect(getByText('My Test Workflow')).toBeInTheDocument();
		});
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

	it('should show "Open in editor" link when workflow is loaded', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { getByText } = renderComponent({
			props: { workflowId: 'wf-123', executionId: null },
		});

		await waitFor(() => {
			const link = getByText('Open in editor');
			expect(link).toBeInTheDocument();
			expect(link.closest('a')).toHaveAttribute('href', '/workflow/wf-123');
		});
	});

	it('should emit close when close button is clicked', async () => {
		const { emitted, container } = renderComponent({
			props: { workflowId: null, executionId: null },
		});

		const closeButton = container.querySelector('button');
		if (closeButton instanceof HTMLElement) {
			closeButton.click();
		}

		expect(emitted('close')).toBeTruthy();
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

	it('should emit push-ref-ready on n8nReady postMessage with pushRef', async () => {
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
			expect(emitted('push-ref-ready')).toBeTruthy();
			expect(emitted('push-ref-ready')[0]).toEqual(['iframe-push-ref-abc']);
		});
	});

	it('should not emit push-ref-ready on n8nReady without pushRef', async () => {
		const { emitted } = renderComponent({
			props: { workflowId: null, executionId: null },
		});

		window.dispatchEvent(
			new MessageEvent('message', {
				data: JSON.stringify({ command: 'n8nReady' }),
			}),
		);

		await new Promise((r) => setTimeout(r, 10));
		expect(emitted('push-ref-ready')).toBeFalsy();
	});
});
