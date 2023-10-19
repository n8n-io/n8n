import { vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import type { IExecutionsSummary } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import WorkflowPreview from '@/components/WorkflowPreview.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';

const renderComponent = createComponentRenderer(WorkflowPreview);

let pinia: ReturnType<typeof createPinia>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let postMessageSpy: vi.SpyInstance;

const sendPostMessageCommand = (command: string) => {
	window.postMessage(`{"command":"${command}"}`, '*');
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

		sendPostMessageCommand('n8nReady');

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

		sendPostMessageCommand('n8nReady');

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

		sendPostMessageCommand('n8nReady');

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

		sendPostMessageCommand('n8nReady');

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

		sendPostMessageCommand('n8nReady');

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

		sendPostMessageCommand('n8nReady');

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

	it('should call also iframe postMessage with "setActiveExecution" if active execution is set', async () => {
		vi.spyOn(workflowsStore, 'activeWorkflowExecution', 'get').mockReturnValue({
			id: 'abc',
		} as IExecutionsSummary);

		const executionId = '123';
		renderComponent({
			pinia,
			props: {
				executionId,
				mode: 'execution',
			},
		});

		sendPostMessageCommand('n8nReady');

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

		sendPostMessageCommand('n8nReady');

		await waitFor(() => {
			expect(postMessageSpy).toHaveBeenCalledWith(
				JSON.stringify({
					command: 'openWorkflow',
					workflow,
				}),
				'*',
			);
		});

		sendPostMessageCommand('openNDV');

		await waitFor(() => {
			expect(iframe?.classList.toString()).toContain('openNDV');
		});

		sendPostMessageCommand('closeNDV');

		await waitFor(() => {
			expect(iframe?.classList.toString()).not.toContain('openNDV');
		});
	});

	it('should emit "close" event if iframe sends "error" command', async () => {
		const { emitted } = renderComponent({
			pinia,
			props: {},
		});

		sendPostMessageCommand('error');

		await waitFor(() => {
			expect(emitted().close).toBeDefined();
		});
	});
});
