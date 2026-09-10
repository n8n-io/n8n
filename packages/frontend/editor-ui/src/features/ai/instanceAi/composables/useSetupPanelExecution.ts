import { getCurrentScope, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { isTerminalExecutionStatus, type TerminalExecutionStatus } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { getWorkflow } from '@/app/api/workflows';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { isChatNode } from '@/app/utils/aiUtils';
import type { ThreadRuntime } from '../instanceAi.store';
import { getExecutionResultsByWorkflow } from '../canvasPreview.utils';

export interface SetupPanelExecutionResult {
	workflowId: string;
	executionId: string;
	status: TerminalExecutionStatus;
	notified: boolean;
}

export function useSetupPanelExecution(options: {
	workflowId: MaybeRefOrGetter<string | undefined>;
	thread: Pick<ThreadRuntime, 'id' | 'messages' | 'sendMessage' | 'rememberManualExecution'>;
}) {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const pushStore = usePushConnectionStore();
	const logsStore = useLogsStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const running = ref(false);
	let disposed = false;
	let cancelWait: (() => void) | undefined;
	if (getCurrentScope())
		onScopeDispose(() => {
			disposed = true;
			cancelWait?.();
		});

	async function executeWorkflow(): Promise<SetupPanelExecutionResult | undefined> {
		const workflowId = toValue(options.workflowId);
		if (!workflowId || running.value || disposed) return;
		if (!pushStore.isConnected)
			throw new Error(i18n.baseText('workflowRun.noActiveConnectionToTheServer'));
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		if (executionState.isWorkflowRunning) return;
		running.value = true;
		let cleanup = () => {};
		try {
			const workflow = await getWorkflow(rootStore.restApiContext, workflowId);
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
			if (disposed || toValue(options.workflowId) !== workflowId) return;
			const triggers = workflow.nodes.filter(
				(node) => !node.disabled && nodeTypesStore.isTriggerNode(node.type),
			);
			const trigger =
				triggers.find((node) => node.name === executionState.selectedTriggerNodeName) ??
				triggers[0];
			if (!trigger)
				throw new Error(i18n.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting'));
			logsStore.toggleOpen(true);
			if (isChatNode(trigger)) {
				toast.showMessage({
					title: i18n.baseText('aiAssistant.builder.toast.title'),
					message: i18n.baseText('aiAssistant.builder.toast.description'),
					type: 'info',
				});
				return;
			}

			let agentExecutionId: string | undefined;
			for (const message of options.thread.messages) {
				if (message.agentTree)
					agentExecutionId =
						getExecutionResultsByWorkflow(message.agentTree).get(workflowId)?.executionId ??
						agentExecutionId;
			}
			const completed = createDeferredPromise<
				Omit<SetupPanelExecutionResult, 'notified'> | undefined
			>();
			const finished = new Map<string, TerminalExecutionStatus>();
			let executionId: string | undefined;
			let startedId: string | undefined;
			let waitingForWebhook = false;
			let settled = false;
			const finish = (id: string, status: TerminalExecutionStatus) => {
				if (settled) return;
				settled = true;
				completed.resolve({ workflowId, executionId: id, status });
			};
			const observeId = (id: string) => {
				executionId = id;
				options.thread.rememberManualExecution(workflowId, id, agentExecutionId);
				const status = finished.get(id);
				if (status) finish(id, status);
			};
			const readStatus = async () => {
				if (!executionId || settled || disposed) return;
				try {
					const execution = await workflowsStore.fetchExecutionDataById(executionId);
					if (disposed || execution?.workflowId !== workflowId || execution.id !== executionId)
						return;
					if (execution && isTerminalExecutionStatus(execution.status))
						finish(execution.id, execution.status);
				} catch {
					/* Completion can still arrive on the push connection. */
				}
			};
			// Subscribe before starting: short executions can finish before the POST returns.
			const removeListener = pushStore.addEventListener((event) => {
				if (
					event.type === 'testWebhookDeleted' &&
					event.data.workflowId === workflowId &&
					!event.data.executionId &&
					waitingForWebhook &&
					!executionId
				) {
					completed.resolve(undefined);
					return;
				}
				if (event.type === 'testWebhookReceived' && event.data.workflowId === workflowId) {
					startedId = event.data.executionId;
					if (waitingForWebhook && !executionId) observeId(startedId);
				}
				if (
					event.type === 'executionStarted' &&
					event.data.workflowId === workflowId &&
					event.data.source !== 'instance_ai'
				) {
					startedId = event.data.executionId;
					if (waitingForWebhook && !executionId) observeId(startedId);
				}
				if (
					event.type !== 'executionFinished' ||
					event.data.workflowId !== workflowId ||
					!isTerminalExecutionStatus(event.data.status)
				)
					return;
				finished.set(event.data.executionId, event.data.status);
				if (event.data.executionId === executionId) finish(executionId, event.data.status);
			});
			const stopReconnectWatch = watch(
				() => pushStore.isConnected,
				(connected) => {
					if (connected) void readStatus();
				},
			);
			cleanup = () => {
				removeListener();
				stopReconnectWatch();
			};
			cancelWait = () => {
				cleanup();
				completed.resolve(undefined);
			};
			telemetry.track(TELEMETRY_EVENT.WORKFLOW.USER_REQUESTED_WORKFLOW_TEST, {
				source: 'instance_ai_setup_panel',
				workflow_id: workflowId,
				thread_id: options.thread.id,
			});
			const response = await workflowsStore.runWorkflow({
				workflowId,
				triggerToStartFrom: { name: trigger.name },
			});
			if (disposed) return;
			waitingForWebhook = response.waitingForWebhook === true;
			executionState.setExecutionWaitingForWebhook(waitingForWebhook);
			if (response.executionId) observeId(response.executionId);
			else if (waitingForWebhook && startedId) observeId(startedId);
			else if (!waitingForWebhook)
				throw new Error(i18n.baseText('instanceAi.setupPanel.executeError'));
			void readStatus();
			const result = await completed.promise;
			cleanup();
			if (disposed) return;
			executionState.setExecutionWaitingForWebhook(false);
			if (!result) return;
			const notified = await options.thread.sendMessage(
				i18n.baseText('instanceAi.setupPanel.executedMessage', {
					interpolate: { executionId: result.executionId },
				}),
				undefined,
				rootStore.pushRef,
			);
			return { ...result, notified };
		} finally {
			cleanup();
			cancelWait = undefined;
			running.value = false;
		}
	}

	return { executeWorkflow };
}
