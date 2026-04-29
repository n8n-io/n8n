import type { Mock, MockInstance } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { jsonParse, type ExecutionSummary } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

const renderComponent = createComponentRenderer(WorkflowPreview);

let pinia: ReturnType<typeof createPinia>;
let executionsStore: ReturnType<typeof useExecutionsStore>;
let projectsStore: ReturnType<typeof useProjectsStore>;
let postMessageSpy: Mock;
let focusSpy: Mock;
let consoleErrorSpy: MockInstance;

const sendPostMessageCommand = (command: string) => {
	window.postMessage(`{"command":"${command}"}`, '*');
};

const expectIframePostMessage = (expectedPayload: Record<string, unknown>) => {
	const payloads = postMessageSpy.mock.calls
		.filter(([payload, targetOrigin]) => typeof payload === 'string' && targetOrigin === '*')
		.map(([payload]) => jsonParse(payload as string));

	expect(payloads).toEqual(expect.arrayContaining([expect.objectContaining(expectedPayload)]));
};

describe('WorkflowPreview', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		executionsStore = useExecutionsStore();
		projectsStore = useProjectsStore();

		// Mock currentProjectId for all tests
		vi.spyOn(projectsStore, 'currentProjectId', 'get').mockReturnValue('test-project-id');

		consoleErrorSpy = vi.spyOn(console, 'error');
		postMessageSpy = vi.fn();
		focusSpy = vi.fn();
		Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
			writable: true,
			value: {
				postMessage: postMessageSpy,
				focus: focusSpy,
			},
		});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
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
			expectIframePostMessage({
				command: 'openWorkflow',
				workflow,
				canOpenNDV: true,
				hideNodeIssues: false,
				suppressNotifications: false,
				allowErrorNotifications: false,
				projectId: 'test-project-id',
			});
			expect(focusSpy).toHaveBeenCalled();
		});
	});

	it('should pass allowErrorNotifications using PostMessage when enabled', async () => {
		const nodes = [{ name: 'Start' }] as INodeUi[];
		const workflow = { nodes } as IWorkflowDb;
		renderComponent({
			pinia,
			props: {
				workflow,
				allowErrorNotifications: true,
			},
		});

		sendPostMessageCommand('n8nReady');

		await waitFor(() => {
			expectIframePostMessage({
				command: 'openWorkflow',
				workflow,
				canOpenNDV: true,
				hideNodeIssues: false,
				suppressNotifications: false,
				allowErrorNotifications: true,
				projectId: 'test-project-id',
			});
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
			expectIframePostMessage({
				command: 'openExecution',
				executionId,
				executionMode: '',
				canOpenNDV: true,
				projectId: 'test-project-id',
			});
		});
	});

	it('should call also iframe postMessage with "setActiveExecution" if active execution is set', async () => {
		vi.spyOn(executionsStore, 'activeExecution', 'get').mockReturnValue({
			id: 'abc',
		} as ExecutionSummary);

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
			expectIframePostMessage({
				command: 'openExecution',
				executionId,
				executionMode: '',
				canOpenNDV: true,
				projectId: 'test-project-id',
			});

			expectIframePostMessage({
				command: 'setActiveExecution',
				executionId: 'abc',
			});
		});
	});

	it('iframe should toggle "openNDV" class with postMessages', async () => {
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
			expectIframePostMessage({
				command: 'openWorkflow',
				workflow,
				canOpenNDV: true,
				hideNodeIssues: false,
				suppressNotifications: false,
				allowErrorNotifications: false,
				projectId: 'test-project-id',
			});
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

	it('should pass the "Disable NDV" & "Hide issues" flags to using PostMessage', async () => {
		const nodes = [{ name: 'Start' }] as INodeUi[];
		const workflow = { nodes } as IWorkflowDb;
		renderComponent({
			pinia,
			props: {
				workflow,
				canOpenNDV: false,
			},
		});
		sendPostMessageCommand('n8nReady');
		await waitFor(() => {
			expectIframePostMessage({
				command: 'openWorkflow',
				workflow,
				canOpenNDV: false,
				hideNodeIssues: false,
				suppressNotifications: false,
				allowErrorNotifications: false,
				projectId: 'test-project-id',
			});
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

	it('should not do anything if no "command" is sent in the message', async () => {
		const { emitted } = renderComponent({
			pinia,
			props: {},
		});

		window.postMessage('commando', '*');

		await waitFor(() => {
			expect(console.error).not.toHaveBeenCalled();
			expect(emitted()).toEqual({});
		});
	});

	it('should not do anything if no "command" is sent in the message and the `includes` method cannot be applied to the data', async () => {
		const { emitted } = renderComponent({
			pinia,
			props: {},
		});

		window.postMessage(null, '*');

		await waitFor(() => {
			expect(console.error).not.toHaveBeenCalled();
			expect(emitted()).toEqual({});
		});
	});

	describe('hideControls prop', () => {
		it('should include hideControls=true in iframe src when hideControls prop is true', () => {
			const { container } = renderComponent({
				pinia,
				props: {
					hideControls: true,
				},
			});

			const iframe = container.querySelector('iframe');
			expect(iframe?.getAttribute('src')).toContain('hideControls=true');
		});

		it('should not include hideControls param when hideControls prop is false', () => {
			const { container } = renderComponent({
				pinia,
				props: {
					hideControls: false,
				},
			});

			const iframe = container.querySelector('iframe');
			expect(iframe?.getAttribute('src')).not.toContain('hideControls');
		});
	});

	describe('canExecute prop', () => {
		it('should include canExecute=true in iframe src when canExecute prop is true', () => {
			const { container } = renderComponent({
				pinia,
				props: {
					canExecute: true,
				},
			});

			const iframe = container.querySelector('iframe');
			expect(iframe?.getAttribute('src')).toContain('canExecute=true');
		});

		it('should not include canExecute param when canExecute prop is false', () => {
			const { container } = renderComponent({
				pinia,
				props: {
					canExecute: false,
				},
			});

			const iframe = container.querySelector('iframe');
			expect(iframe?.getAttribute('src')).not.toContain('canExecute');
		});

		it('should include both hideControls and canExecute when both are true', () => {
			const { container } = renderComponent({
				pinia,
				props: {
					hideControls: true,
					canExecute: true,
				},
			});

			const iframe = container.querySelector('iframe');
			const src = iframe?.getAttribute('src') ?? '';
			expect(src).toContain('hideControls=true');
			expect(src).toContain('canExecute=true');
		});
	});

	describe('ready event', () => {
		it('should emit ready event when iframe sends n8nReady command', async () => {
			const { emitted } = renderComponent({
				pinia,
				props: {},
			});

			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(emitted().ready).toBeDefined();
			});
		});
	});

	describe('postMessage dedup and tab-switch reset', () => {
		const countCommand = (command: string) =>
			postMessageSpy.mock.calls.filter(([payload, target]) => {
				if (typeof payload !== 'string' || target !== '*') return false;
				try {
					return jsonParse<{ command?: string }>(payload).command === command;
				} catch {
					return false;
				}
			}).length;

		it('should send openWorkflow only once when multiple watches converge on the same change', async () => {
			const nodes = [{ name: 'Start' }] as INodeUi[];
			const workflow = { nodes } as IWorkflowDb;

			renderComponent({ pinia, props: { workflow } });
			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(countCommand('openWorkflow')).toBe(1);
			});
		});

		it('should send resetWorkflow then openWorkflow when switching to a different workflow', async () => {
			const workflowA = { nodes: [{ name: 'A' }] } as unknown as IWorkflowDb;
			const workflowB = { nodes: [{ name: 'B' }] } as unknown as IWorkflowDb;

			const { rerender } = renderComponent({ pinia, props: { workflow: workflowA } });
			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(countCommand('openWorkflow')).toBe(1);
			});

			postMessageSpy.mockClear();
			await rerender({ workflow: workflowB });

			await waitFor(() => {
				expect(countCommand('resetWorkflow')).toBe(1);
				expect(countCommand('openWorkflow')).toBe(1);
			});
		});

		it('should not send resetWorkflow on the initial workflow mount', async () => {
			const nodes = [{ name: 'Start' }] as INodeUi[];
			const workflow = { nodes } as IWorkflowDb;

			renderComponent({ pinia, props: { workflow } });
			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(countCommand('openWorkflow')).toBe(1);
			});
			expect(countCommand('resetWorkflow')).toBe(0);
		});

		it('should send openWorkflow when the workflow is set before the iframe is ready', async () => {
			const workflowA = { nodes: [{ name: 'A' }] } as unknown as IWorkflowDb;
			const workflowB = { nodes: [{ name: 'B' }] } as unknown as IWorkflowDb;

			// Workflow arrives BEFORE n8nReady — the message would be silently lost
			// if the dedup cache were updated eagerly.
			const { rerender } = renderComponent({ pinia, props: { workflow: workflowA } });

			// Switching to a different workflow while still not ready must not
			// poison the cache either.
			await rerender({ workflow: workflowB });
			expect(countCommand('openWorkflow')).toBe(0);

			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(countCommand('openWorkflow')).toBe(1);
			});
		});

		it('should resend openWorkflow when toggling back to workflow mode for the same workflow', async () => {
			const workflow = { nodes: [{ name: 'Start' }] } as unknown as IWorkflowDb;
			const executionId = 'exec-1';

			const { rerender } = renderComponent({
				pinia,
				props: { mode: 'workflow' as const, workflow },
			});
			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(countCommand('openWorkflow')).toBe(1);
			});

			// Switch to execution view — iframe now renders execution content.
			postMessageSpy.mockClear();
			await rerender({ mode: 'execution' as const, workflow, executionId });
			await waitFor(() => {
				expect(countCommand('openExecution')).toBe(1);
			});

			// Switch back to workflow with the SAME workflow reference. Without
			// invalidating the dedup cache, the workflow ref-equality check
			// would skip the openWorkflow postMessage and leave the iframe
			// stuck in execution mode.
			postMessageSpy.mockClear();
			await rerender({ mode: 'workflow' as const, workflow, executionId });
			await waitFor(() => {
				expect(countCommand('openWorkflow')).toBe(1);
			});
		});

		it('should resend openExecution when toggling back to execution mode for the same id', async () => {
			const workflow = { nodes: [{ name: 'Start' }] } as unknown as IWorkflowDb;
			const executionId = 'exec-1';

			const { rerender } = renderComponent({
				pinia,
				props: { mode: 'execution' as const, workflow, executionId },
			});
			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(countCommand('openExecution')).toBe(1);
			});

			postMessageSpy.mockClear();
			await rerender({ mode: 'workflow' as const, workflow, executionId });
			await waitFor(() => {
				expect(countCommand('openWorkflow')).toBe(1);
			});

			// Same executionId — must still resend after the mode round-trip.
			postMessageSpy.mockClear();
			await rerender({ mode: 'execution' as const, workflow, executionId });
			await waitFor(() => {
				expect(countCommand('openExecution')).toBe(1);
			});
		});

		it('reloadExecution bypasses the executionId dedup so the same id is re-sent', async () => {
			const wrapper = mount(WorkflowPreview, {
				global: { plugins: [pinia] },
				props: { mode: 'execution' as const, executionId: 'exec-1' },
			});

			sendPostMessageCommand('n8nReady');

			await waitFor(() => {
				expect(countCommand('openExecution')).toBe(1);
			});

			postMessageSpy.mockClear();

			(wrapper.vm as unknown as { reloadExecution: () => void }).reloadExecution();

			await waitFor(() => {
				expect(countCommand('openExecution')).toBe(1);
			});
		});
	});
});
