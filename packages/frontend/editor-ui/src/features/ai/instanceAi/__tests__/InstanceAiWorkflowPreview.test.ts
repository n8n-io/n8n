import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent } from 'vue';
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

let mockIframeWindow: Window;
const mockIframeElement = { contentWindow: null as Window | null };

function dispatchIframeMessage(data: unknown, source: Window | null = mockIframeWindow) {
	window.dispatchEvent(
		new MessageEvent('message', {
			data: typeof data === 'string' ? data : JSON.stringify(data),
			origin: window.location.origin,
			source,
		}),
	);
}

const renderComponent = createComponentRenderer(InstanceAiWorkflowPreview, {
	global: {
		stubs: {
			WorkflowPreview: defineComponent({
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
				setup(_, { expose }) {
					expose({ iframeRef: mockIframeElement });
				},
			}),
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
		mockIframeWindow = { postMessage: vi.fn() } as unknown as Window;
		mockIframeElement.contentWindow = mockIframeWindow;
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

	it('should suppress all notifications including errors for executable preview', async () => {
		mockFetchWorkflow.mockResolvedValue(fakeWorkflow);

		const { getByTestId } = renderComponent({
			props: { workflowId: 'wf-123' },
		});

		await waitFor(() => {
			const preview = getByTestId('workflow-preview');
			expect(preview).toHaveAttribute('data-can-execute', 'true');
			expect(preview).toHaveAttribute('data-suppress-notifications', 'true');
			expect(preview).toHaveAttribute('data-allow-error-notifications', 'false');
		});
	});

	it('should emit iframe-ready on n8nReady postMessage', async () => {
		const { emitted } = renderComponent({
			props: { workflowId: null },
		});

		dispatchIframeMessage({
			command: 'n8nReady',
			pushRef: 'iframe-push-ref-abc',
		});

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

		dispatchIframeMessage({ command: 'n8nReady' });

		await waitFor(() => {
			expect(emitted('iframe-ready')).toBeTruthy();
		});
	});

	it('should emit workflow-failures on reportWorkflowFailures postMessage', async () => {
		const { emitted } = renderComponent({ props: { workflowId: null } });

		dispatchIframeMessage({
			command: 'reportWorkflowFailures',
			workflowId: 'wf-1',
			executionId: 'exec-1',
			errors: [{ nodeName: 'Extract Emails', errorMessage: 'Intentional break' }],
		});

		await waitFor(() => {
			expect(emitted('workflow-failures')).toBeTruthy();
		});
		expect(emitted('workflow-failures')).toEqual([
			[
				{
					workflowId: 'wf-1',
					executionId: 'exec-1',
					errors: [{ nodeName: 'Extract Emails', errorMessage: 'Intentional break' }],
				},
			],
		]);
	});

	it('should ignore reportWorkflowFailures when payload is invalid', async () => {
		const { emitted } = renderComponent({ props: { workflowId: null } });

		dispatchIframeMessage({ command: 'reportWorkflowFailures', errors: [] });
		dispatchIframeMessage({
			command: 'reportWorkflowFailures',
			workflowId: 'wf-1',
			errors: [{ nodeName: 'HTTP Request', errorMessage: 'Connection refused' }],
		});

		await waitFor(() => {
			expect(emitted('workflow-failures')).toBeUndefined();
		});
	});

	it('should ignore postMessages from unexpected origins or sources', async () => {
		const { emitted } = renderComponent({ props: { workflowId: null } });

		window.dispatchEvent(
			new MessageEvent('message', {
				data: JSON.stringify({
					command: 'reportWorkflowFailures',
					workflowId: 'wf-1',
					executionId: 'exec-1',
					errors: [{ nodeName: 'HTTP Request', errorMessage: 'Connection refused' }],
				}),
				origin: 'https://evil.example',
				source: mockIframeWindow,
			}),
		);

		await waitFor(() => {
			expect(emitted('workflow-failures')).toBeUndefined();
			expect(emitted('iframe-ready')).toBeUndefined();
		});
	});
});
