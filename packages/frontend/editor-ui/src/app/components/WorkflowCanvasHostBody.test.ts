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
const pushConnection = vi.hoisted(() => ({ initialize: vi.fn(), terminate: vi.fn() }));

vi.mock('@/app/composables/usePushConnection', () => ({
	usePushConnection: () => pushConnection,
}));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({}),
}));
vi.mock('@/app/components/MainHeader/MainHeader.vue', async () => {
	const { h } = await import('vue');
	return { default: { render: () => h('div', { 'data-test-id': 'main-header' }) } };
});
vi.mock('@/app/views/NodeView.vue', () => ({ default: { render: () => null } }));
vi.mock('@/features/execution/logs/components/LogsPanel.vue', async () => {
	const { h } = await import('vue');
	return { default: { render: () => h('div', { 'data-test-id': 'logs-panel' }) } };
});

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

	describe('minimal chrome', () => {
		const renderMinimalChrome = createComponentRenderer(WorkflowCanvasHostBody, {
			props: { workflowId: 'wf-1', refreshKey: 0, minimalChrome: true },
			slots: { header: '<div data-test-id="minimal-chrome" />' },
		});

		it('renders the header slot without the editor header or logs panel', async () => {
			loadFailure.value = undefined;
			const { getByTestId, queryByTestId } = renderMinimalChrome({ pinia: createTestingPinia() });
			await flushPromises();

			expect(getByTestId('minimal-chrome')).toBeInTheDocument();
			expect(queryByTestId('main-header')).not.toBeInTheDocument();
			expect(queryByTestId('logs-panel')).not.toBeInTheDocument();
		});

		it('initializes the push connection once and terminates it on unmount', async () => {
			pushConnection.initialize.mockClear();
			pushConnection.terminate.mockClear();
			loadFailure.value = undefined;
			const { unmount } = renderMinimalChrome({ pinia: createTestingPinia() });
			await flushPromises();

			expect(pushConnection.initialize).toHaveBeenCalledTimes(1);

			unmount();

			expect(pushConnection.terminate).toHaveBeenCalledTimes(1);
		});

		it('leaves push initialization to the editor header without minimal chrome', async () => {
			pushConnection.initialize.mockClear();
			const { getByTestId } = await renderHost();

			expect(getByTestId('main-header')).toBeInTheDocument();
			expect(getByTestId('logs-panel')).toBeInTheDocument();
			expect(pushConnection.initialize).not.toHaveBeenCalled();
		});
	});
});
