import { vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';

const renderComponent = createComponentRenderer(WorkflowPreview);

let pinia: ReturnType<typeof createPinia>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let postMessageSpy: vi.SpyInstance;

const sendFakeIframeReadyMessage = () => {
	window.postMessage('{"command":"n8nReady"}', '*');
};

describe('WorkflowPreview', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		workflowsStore = useWorkflowsStore();

		postMessageSpy = vi.fn();
		Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
			writable: true,
			value: {
				postMessage: postMessageSpy,
			},
		});
	});

	it('should not call iframe postMessage when it is ready and no workflow or executionId props', async () => {
		renderComponent({
			pinia,
			props: {},
		});

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call iframe postMessage when it is ready and there are no nodes in the workflow', async () => {
		const workflow = {} as IWorkflowDb;
		renderComponent({
			pinia,
			props: {
				workflow,
			},
		});

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).not.toHaveBeenCalled();
		});
	});

	it('should not call iframe postMessage when it is ready and nodes is not an array', async () => {
		const workflow = { nodes: {} } as IWorkflowDb;
		renderComponent({
			pinia,
			props: {
				workflow,
			},
		});

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).not.toHaveBeenCalled();
		});
	});

	it('should call iframe postMessage with "openWorkflow" when it is ready and the workflow has nodes', async () => {
		const nodes = [{ name: 'Start' }] as INodeUi[];
		const workflow = { nodes } as IWorkflowDb;
		renderComponent({
			pinia,
			props: {
				workflow,
			},
		});

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).toHaveBeenCalledWith(
				JSON.stringify({
					command: 'openWorkflow',
					workflow,
				}),
				'*',
			);
		});
	});

	it('should not call iframe postMessage with "openExecution" when executionId is passed but mode not set to "execution"', async () => {
		const executionId = '123';
		renderComponent({
			pinia,
			props: {
				executionId,
			},
		});

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).not.toHaveBeenCalled();
		});
	});

	it('should call iframe postMessage with "openExecution" when executionId is passed and mode is set', async () => {
		const executionId = '123';
		renderComponent({
			pinia,
			props: {
				executionId,
				mode: 'execution',
			},
		});

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).toHaveBeenCalledWith(
				JSON.stringify({
					command: 'openExecution',
					executionId,
					executionMode: '',
				}),
				'*',
			);
		});
	});

	it('should call also iframe postMessage with "setActiveExecution" is active execution is', async () => {
		vi.spyOn(workflowsStore, 'activeWorkflowExecution', 'get').mockReturnValue({ id: 'abc' });

		const executionId = '123';
		renderComponent({
			pinia,
			props: {
				executionId,
				mode: 'execution',
			},
		});

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).toHaveBeenCalledWith(
				JSON.stringify({
					command: 'openExecution',
					executionId,
					executionMode: '',
				}),
				'*',
			);

			expect(postMessageSpy).toHaveBeenCalledWith(
				JSON.stringify({
					command: 'setActiveExecution',
					execution: { id: 'abc' },
				}),
				'*',
			);
		});
	});

	it('iframe should toggle "openNDV" class with postmessages', async () => {
		const nodes = [{ name: 'Start' }] as INodeUi[];
		const workflow = { nodes } as IWorkflowDb;
		const { container } = renderComponent({
			pinia,
			props: {
				workflow,
			},
		});

		const iframe = container.querySelector('iframe');

		expect(iframe?.classList.toString()).not.toContain('openNDV');

		sendFakeIframeReadyMessage();

		await waitFor(() => {
			expect(postMessageSpy).toHaveBeenCalledWith(
				JSON.stringify({
					command: 'openWorkflow',
					workflow,
				}),
				'*',
			);
		});

		window.postMessage('{"command":"openNDV"}', '*');

		await waitFor(() => {
			expect(iframe?.classList.toString()).toContain('openNDV');
		});

		window.postMessage('{"command":"closeNDV"}', '*');

		await waitFor(() => {
			expect(iframe?.classList.toString()).not.toContain('openNDV');
		});
	});
});
