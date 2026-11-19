import { createTestingPinia } from '@pinia/testing';
import { ResponseError } from '@n8n/rest-api-client';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowCanvasHostBody from './WorkflowCanvasHostBody.vue';

type LoadFailure = { error: unknown; workflowId: string };

const loadFailure = vi.hoisted(() => ({ value: undefined as LoadFailure | undefined }));

vi.mock('@/app/composables/useWorkflowInitialization', async () => {
	const { ref } = await import('vue');
	return {
		useWorkflowInitialization: (options: {
			onLoadError?: (error: unknown, workflowId: string) => void;
		}) => ({
			isLoading: ref(false),
			initializeData: vi.fn(),
			initializeWorkflow: vi.fn(async () => {
				const failure = loadFailure.value;
				if (failure) options.onLoadError?.(failure.error, failure.workflowId);
			}),
			openWorkflow: vi.fn(),
			cleanup: vi.fn(),
		}),
	};
});
vi.mock('@/app/components/MainHeader/MainHeader.vue', () => ({ default: { render: () => null } }));
vi.mock('@/app/views/NodeView.vue', () => ({ default: { render: () => null } }));
vi.mock('@/features/execution/logs/components/LogsPanel.vue', () => ({
	default: { render: () => null },
}));

const renderComponent = createComponentRenderer(WorkflowCanvasHostBody, {
	props: { workflowId: 'wf-1', refreshKey: 0 },
});

async function renderHost(failure?: LoadFailure) {
	loadFailure.value = failure;
	const result = renderComponent({ pinia: createTestingPinia() });
	await flushPromises();
	return result;
}

describe('WorkflowCanvasHostBody', () => {
	it('shows the access message in place of the canvas when the load is forbidden', async () => {
		const { getByTestId, getByText, emitted } = await renderHost({
			error: new ResponseError('Forbidden', { httpStatusCode: 403 }),
			workflowId: 'wf-1',
		});

		expect(getByTestId('workflow-canvas-host-error')).toBeInTheDocument();
		expect(getByText('You need access')).toBeInTheDocument();
		expect(emitted('workflow-loaded')).toBeUndefined();
	});

	it('shows the not-found message without a link that leaves the page', async () => {
		const { getByText, queryByText } = await renderHost({
			error: new ResponseError('Not Found', { httpStatusCode: 404 }),
			workflowId: 'wf-1',
		});

		expect(getByText('Workflow not found')).toBeInTheDocument();
		expect(queryByText('Go to overview')).not.toBeInTheDocument();
	});

	it('ignores a failed load of a workflow that is no longer open', async () => {
		const { queryByTestId, emitted } = await renderHost({
			error: new ResponseError('Forbidden', { httpStatusCode: 403 }),
			workflowId: 'wf-previous',
		});

		expect(queryByTestId('workflow-canvas-host-error')).not.toBeInTheDocument();
		expect(emitted('workflow-loaded')).toEqual([['wf-1']]);
	});
});
