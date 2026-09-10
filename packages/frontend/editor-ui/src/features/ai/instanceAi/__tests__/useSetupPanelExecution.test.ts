import { effectScope, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { PushMessage, InstanceAiMessage } from '@n8n/api-types';
import type { TerminalExecutionStatus } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { getWorkflow } from '@/app/api/workflows';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useSetupPanelExecution } from '../composables/useSetupPanelExecution';

vi.mock('@/app/api/workflows', () => ({ getWorkflow: vi.fn() }));
const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage: vi.fn() }) }));

const workflow = createTestWorkflow({
	id: 'wf-1',
	nodes: [createTestNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' })],
});
const handlers = new Set<(event: PushMessage) => void>();
const scopes: Array<ReturnType<typeof effectScope>> = [];

function finish(
	status: TerminalExecutionStatus = 'success',
	executionId = 'exec-1',
	workflowId = 'wf-1',
) {
	for (const handler of handlers)
		handler({ type: 'executionFinished', data: { executionId, workflowId, status } });
}

function harness() {
	const scope = effectScope();
	scopes.push(scope);
	const workflowId = ref<string | undefined>('wf-1');
	const thread = {
		id: 'thread-1',
		messages: [] as InstanceAiMessage[],
		sendMessage: vi.fn().mockResolvedValue(true),
		rememberManualExecution: vi.fn(),
	};
	const execution = scope.run(() => useSetupPanelExecution({ workflowId, thread }))!;
	return {
		...execution,
		scope,
		thread,
		workflowId,
		workflows: mockedStore(useWorkflowsStore),
		push: mockedStore(usePushConnectionStore),
	};
}

describe('useSetupPanelExecution', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		handlers.clear();
		track.mockClear();
		vi.mocked(getWorkflow).mockReset().mockResolvedValue(workflow);
		const nodeTypes = mockedStore(useNodeTypesStore);
		nodeTypes.loadNodeTypesIfNotLoaded.mockResolvedValue(undefined);
		nodeTypes.isTriggerNode = vi.fn((type: string) => type === 'n8n-nodes-base.manualTrigger');
		const push = mockedStore(usePushConnectionStore);
		push.isConnected = true;
		push.addEventListener.mockImplementation((handler) => {
			handlers.add(handler);
			return () => {
				handlers.delete(handler);
			};
		});
		const workflows = mockedStore(useWorkflowsStore);
		workflows.runWorkflow.mockResolvedValue({ executionId: 'exec-1' });
		workflows.fetchExecutionDataById.mockResolvedValue(null);
	});
	afterEach(() => {
		for (const scope of scopes.splice(0)) scope.stop();
	});

	it.each(['success', 'error', 'canceled'] as const)(
		'notifies the agent only after the actual execution finishes: %s',
		async (status) => {
			const { executeWorkflow, workflows, thread } = harness();
			const pending = executeWorkflow();
			await flushPromises();
			expect(workflows.runWorkflow).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				triggerToStartFrom: { name: 'Start' },
			});
			expect(thread.sendMessage).not.toHaveBeenCalled();
			finish(status);
			await expect(pending).resolves.toEqual({
				workflowId: 'wf-1',
				executionId: 'exec-1',
				status,
				notified: true,
			});
			expect(thread.sendMessage).toHaveBeenCalledExactlyOnceWith(
				'The workflow execution finished with execution id "exec-1"',
				undefined,
				useRootStore().pushRef,
			);
			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.WORKFLOW.USER_REQUESTED_WORKFLOW_TEST, {
				source: 'instance_ai_setup_panel',
				workflow_id: 'wf-1',
				thread_id: 'thread-1',
			});
			expect(handlers.size).toBe(0);
		},
	);

	it('matches completion by both workflow and execution ID', async () => {
		const { executeWorkflow, thread } = harness();
		const pending = executeWorkflow();
		await flushPromises();
		finish('success', 'other-execution');
		finish('success', 'exec-1', 'other-workflow');
		await flushPromises();
		expect(thread.sendMessage).not.toHaveBeenCalled();
		finish();
		await pending;
		expect(thread.sendMessage).toHaveBeenCalledOnce();
	});

	it('handles a completion event arriving before the start response', async () => {
		const { executeWorkflow, workflows, thread } = harness();
		workflows.runWorkflow.mockImplementationOnce(async () => {
			finish();
			return { executionId: 'exec-1' };
		});
		await expect(executeWorkflow()).resolves.toMatchObject({ status: 'success', notified: true });
		expect(thread.sendMessage).toHaveBeenCalledOnce();
	});

	it('reads the status after reconnecting if the completion event was missed', async () => {
		const { executeWorkflow, workflows, push, thread } = harness();
		const pending = executeWorkflow();
		await flushPromises();
		push.isConnected = false;
		await flushPromises();
		workflows.fetchExecutionDataById.mockResolvedValue({
			id: 'exec-1',
			workflowId: 'wf-1',
			status: 'success',
		} as IExecutionResponse);
		push.isConnected = true;
		await pending;
		expect(thread.sendMessage).toHaveBeenCalledOnce();
	});

	it('waits for a webhook execution to start and finish', async () => {
		const { executeWorkflow, workflows, thread } = harness();
		workflows.runWorkflow.mockResolvedValueOnce({ waitingForWebhook: true });
		const pending = executeWorkflow();
		await flushPromises();
		expect(thread.sendMessage).not.toHaveBeenCalled();
		for (const handler of handlers)
			handler({
				type: 'executionStarted',
				data: {
					executionId: 'exec-1',
					workflowId: 'wf-1',
					mode: 'manual',
					startedAt: new Date(),
					flattedRunData: '',
				},
			});
		expect(thread.sendMessage).not.toHaveBeenCalled();
		finish();
		await pending;
		expect(thread.rememberManualExecution).toHaveBeenCalledWith('wf-1', 'exec-1', undefined);
	});

	it('does not start twice while a run is in progress', async () => {
		const { executeWorkflow, workflows } = harness();
		const pending = executeWorkflow();
		await flushPromises();
		await expect(executeWorkflow()).resolves.toBeUndefined();
		expect(workflows.runWorkflow).toHaveBeenCalledOnce();
		finish();
		await pending;
	});

	it('cleans up when a pending webhook is canceled before an execution exists', async () => {
		const { executeWorkflow, workflows, thread } = harness();
		workflows.runWorkflow.mockResolvedValueOnce({ waitingForWebhook: true });
		const pending = executeWorkflow();
		await flushPromises();
		for (const handler of handlers)
			handler({ type: 'testWebhookDeleted', data: { workflowId: 'wf-1' } });
		await expect(pending).resolves.toBeUndefined();
		expect(thread.sendMessage).not.toHaveBeenCalled();
		expect(handlers.size).toBe(0);
	});

	it('keeps the original workflow target while waiting for its execution', async () => {
		const { executeWorkflow, workflowId, thread } = harness();
		const pending = executeWorkflow();
		await flushPromises();
		workflowId.value = 'wf-2';
		finish();
		await expect(pending).resolves.toMatchObject({ workflowId: 'wf-1' });
		expect(thread.sendMessage).toHaveBeenCalledOnce();
	});

	it('cleans up without sending a completion message when its scope closes', async () => {
		const { executeWorkflow, scope, thread } = harness();
		const pending = executeWorkflow();
		await flushPromises();
		scope.stop();
		await expect(pending).resolves.toBeUndefined();
		expect(handlers.size).toBe(0);
		expect(thread.sendMessage).not.toHaveBeenCalled();
	});

	it('does not announce an execution when starting it fails', async () => {
		const { executeWorkflow, workflows, thread } = harness();
		workflows.runWorkflow.mockRejectedValueOnce(new Error('Start failed'));
		await expect(executeWorkflow()).rejects.toThrow('Start failed');
		expect(handlers.size).toBe(0);
		expect(thread.sendMessage).not.toHaveBeenCalled();
	});

	it('does not rerun automatically when the notification fails', async () => {
		const { executeWorkflow, workflows, thread } = harness();
		thread.sendMessage.mockResolvedValueOnce(false);
		const pending = executeWorkflow();
		await flushPromises();
		finish();
		await expect(pending).resolves.toMatchObject({ status: 'success', notified: false });
		expect(workflows.runWorkflow).toHaveBeenCalledOnce();
	});

	it('uses the selected enabled trigger', async () => {
		const { executeWorkflow, workflows } = harness();
		vi.mocked(getWorkflow).mockResolvedValueOnce({
			...workflow,
			nodes: [
				workflow.nodes[0],
				createTestNode({ name: 'Selected', type: 'n8n-nodes-base.manualTrigger' }),
			],
		});
		useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1')).setSelectedTriggerNodeName(
			'Selected',
		);
		const pending = executeWorkflow();
		await flushPromises();
		expect(workflows.runWorkflow).toHaveBeenCalledWith({
			workflowId: 'wf-1',
			triggerToStartFrom: { name: 'Selected' },
		});
		finish();
		await pending;
	});
});
