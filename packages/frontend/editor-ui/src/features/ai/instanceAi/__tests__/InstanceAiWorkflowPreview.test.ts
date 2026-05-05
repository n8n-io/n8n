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
				template:
					'<div data-test-id="workflow-preview" :data-can-execute="canExecute" :data-suppress-notifications="suppressNotifications" :data-allow-error-notifications="allowErrorNotifications" />',
				props: [
					'mode',
					'workflow',
					'canOpenNdv',
					'canExecute',
					'hideControls',
					'suppressNotifications',
					'allowErrorNotifications',
					'loaderType',
				],
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
				props: { workflowId: null },
			}),
		).not.toThrow();
	});

	it('should show error when workflow fetch fails', async () => {
		mockFetchWorkflow.mockRejectedValue(new Error('Not found'));

		const { getByText } = renderComponent({
			props: { workflowId: 'wf-deleted' },
		});

		await waitFor(() => {
			expect(getByText('Could not load workflow')).toBeInTheDocument();
		});
	});

	it('should render WorkflowPreview', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { getByTestId } = renderComponent({
			props: { workflowId: 'wf-123' },
		});

		await waitFor(() => {
			const preview = getByTestId('workflow-preview');
			expect(preview).toBeInTheDocument();
		});
	});

	it('should allow error notifications for executable preview', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { getByTestId } = renderComponent({
			props: { workflowId: 'wf-123' },
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
			props: { workflowId: null },
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

	it('should emit workflow-loaded after fetch resolves', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { emitted } = renderComponent({
			props: { workflowId: 'wf-123' },
		});

		await waitFor(() => {
			expect(emitted('workflow-loaded')).toBeTruthy();
		});
		expect(emitted('workflow-loaded')).toEqual([['wf-123']]);
	});

	it('should not emit workflow-loaded when fetch fails', async () => {
		mockFetchWorkflow.mockRejectedValue(new Error('boom'));

		const { emitted, getByText } = renderComponent({
			props: { workflowId: 'wf-broken' },
		});

		await waitFor(() => {
			expect(getByText('Could not load workflow')).toBeInTheDocument();
		});
		expect(emitted('workflow-loaded')).toBeUndefined();
	});

	it('should emit iframe-ready even when n8nReady has no pushRef', async () => {
		const { emitted } = renderComponent({
			props: { workflowId: null },
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
