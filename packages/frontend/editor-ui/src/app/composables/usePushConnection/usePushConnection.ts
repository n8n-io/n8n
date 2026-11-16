import { ref, watch } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { isTerminalExecutionStatus } from 'n8n-workflow';
import { pushHandlerRegistry } from '@n8n/frontend-module-sdk';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import {
	builderCreditsUpdated,
	testWebhookDeleted,
	testWebhookReceived,
	reloadNodeType,
	removeNodeType,
	nodeDescriptionUpdated,
	nodeExecuteBefore,
	nodeExecuteAfter,
	nodeExecuteAfterData,
	executionStarted,
	sendWorkerStatusMessage,
	sendConsoleMessage,
	workflowFailedToActivate,
	workflowPartiallyActivated,
	executionFinished,
	executionRecovered,
	workflowActivated,
	workflowDeactivated,
	workflowAutoDeactivated,
	workflowSettingsUpdated,
	agentNodeProgress,
} from '@/app/composables/usePushConnection/handlers';
import type { PushHandlerOptions } from '@/app/composables/usePushConnection/handlers/types';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useEditorContext } from '@/app/composables/useEditorContext';
import { createEventQueue } from '@n8n/utils/create-event-queue';
import type { useRouter } from 'vue-router';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

export function usePushConnection({ router }: { router: ReturnType<typeof useRouter> }) {
	const pushStore = usePushConnectionStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	// Resolved once at setup (inject is only valid here); read per event below.
	// A host can opt this editor out of success and/or error execution result
	// toasts (e.g. the Instance AI preview, which shows results in its own UI).
	const { executionSuccessToasts, executionErrorToasts } = useEditorContext();
	const toast = useToast();
	const i18n = useI18n();

	const { enqueue } = createEventQueue<PushMessage>(processEvent);

	const removeEventListener = ref<(() => void) | null>(null);
	const stopReconnectResync = ref<(() => void) | null>(null);

	function initialize() {
		removeEventListener.value = pushStore.addEventListener((message) => {
			enqueue(message);
		});
		stopReconnectResync.value = watch(
			() => pushStore.isConnected,
			(isConnected) => {
				if (isConnected) void resyncTrackedExecution();
			},
		);
	}

	function terminate() {
		if (typeof removeEventListener.value === 'function') {
			removeEventListener.value();
		}
		if (typeof stopReconnectResync.value === 'function') {
			stopReconnectResync.value();
		}
	}

	// The server drops pushes while the socket is down, so ask it how the tracked run ended.
	async function resyncTrackedExecution(): Promise<void> {
		const executionState = useWorkflowExecutionStateStore(workflowDocumentStore.value.documentId);
		const executionId = executionState.activeExecutionId;
		if (typeof executionId === 'string') {
			let execution: IExecutionResponse | undefined;
			try {
				execution = await useWorkflowsStore().getExecution(executionId);
			} catch {
				return;
			}
			if (executionState.activeExecutionId === executionId) {
				settleTrackedExecution(executionState, execution);
			}
		}
	}

	function settleTrackedExecution(
		executionState: ReturnType<typeof useWorkflowExecutionStateStore>,
		execution: IExecutionResponse | undefined,
	): void {
		if (!execution) {
			executionState.setActiveExecutionId(undefined);
			executionState.executingNode.clearNodeExecutionQueue();
			if (executionErrorToasts.value) {
				toast.showMessage({
					title: i18n.baseText('pushConnection.executionNotSaved'),
					message: i18n.baseText('pushConnection.executionNotSaved.message'),
					type: 'warning',
				});
			}
		} else if (isTerminalExecutionStatus(execution.status)) {
			if (execution.data) {
				useExecutionDataStore(createExecutionDataId(execution.id)).setExecutionRunData(
					execution.data,
				);
			}
			enqueue({
				type: 'executionFinished',
				data: {
					executionId: execution.id,
					workflowId: execution.workflowId ?? execution.workflowData.id,
					status: execution.status,
				},
			});
		}
	}

	/**
	 * Process received push message event by calling the correct handler
	 */
	async function processEvent(event: PushMessage) {
		// Resolve the current workflow document per event so handlers always act on
		// the workflow the user is currently viewing, even as they navigate.
		const options: PushHandlerOptions = {
			router,
			documentId: workflowDocumentStore.value.documentId,
			suppressExecutionSuccessToasts: !executionSuccessToasts.value,
			suppressExecutionErrorToasts: !executionErrorToasts.value,
		};

		// A module owns a push type via its descriptor. `useModulePushDispatcher`
		// runs the handler at app scope, so this only yields the type.
		if (pushHandlerRegistry.has(event.type)) {
			return;
		}

		switch (event.type) {
			case 'agentNodeProgress':
				return await agentNodeProgress(event, options);
			case 'testWebhookDeleted':
				return await testWebhookDeleted(event, options);
			case 'testWebhookReceived':
				return await testWebhookReceived(event, options);
			case 'reloadNodeType':
				return await reloadNodeType(event);
			case 'removeNodeType':
				return await removeNodeType(event);
			case 'nodeDescriptionUpdated':
				return await nodeDescriptionUpdated(event);
			case 'nodeExecuteBefore':
				return await nodeExecuteBefore(event, options);
			case 'nodeExecuteAfter':
				return await nodeExecuteAfter(event, options);
			case 'nodeExecuteAfterData':
				return await nodeExecuteAfterData(event, options);
			case 'executionStarted':
				return await executionStarted(event, options);
			case 'sendWorkerStatusMessage':
				return await sendWorkerStatusMessage(event);
			case 'sendConsoleMessage':
				return await sendConsoleMessage(event);
			case 'workflowFailedToActivate':
				return await workflowFailedToActivate(event, options);
			case 'workflowPartiallyActivated':
				return await workflowPartiallyActivated(event, options);
			case 'executionFinished':
				return await executionFinished(event, options);
			case 'executionRecovered':
				return await executionRecovered(event, options);
			case 'workflowActivated':
				return await workflowActivated(event, options);
			case 'workflowDeactivated':
				return await workflowDeactivated(event, options);
			case 'workflowAutoDeactivated':
				return await workflowAutoDeactivated(event, options);
			case 'workflowSettingsUpdated':
				return await workflowSettingsUpdated(event, options);
			case 'updateBuilderCredits':
				return await builderCreditsUpdated(event);
		}
	}

	return {
		initialize,
		terminate,
	};
}
