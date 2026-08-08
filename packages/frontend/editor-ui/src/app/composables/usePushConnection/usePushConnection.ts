import { ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { createResumeMessage } from '@n8n/api-types';

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
	resumeComplete,
	workflowActivated,
	workflowDeactivated,
	workflowAutoDeactivated,
	workflowSettingsUpdated,
} from '@/app/composables/usePushConnection/handlers';
import type { PushHandlerOptions } from '@/app/composables/usePushConnection/handlers/types';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useEditorContext } from '@/app/composables/useEditorContext';
import { createEventQueue } from '@n8n/utils/create-event-queue';
import type { useRouter } from 'vue-router';

export function usePushConnection({ router }: { router: ReturnType<typeof useRouter> }) {
	const pushStore = usePushConnectionStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	// Resolved once at setup (inject is only valid here); read per event below.
	// A host can opt this editor out of success and/or error execution result
	// toasts (e.g. the Instance AI preview, which shows results in its own UI).
	const { executionSuccessToasts, executionErrorToasts } = useEditorContext();

	const { enqueue } = createEventQueue<PushMessage>(processEvent);

	const removeEventListener = ref<(() => void) | null>(null);
	const removeConnectedHandler = ref<(() => void) | null>(null);

	function initialize() {
		removeEventListener.value = pushStore.addEventListener((message) => {
			enqueue(message);
		});
		removeConnectedHandler.value = pushStore.addConnectedHandler(sendResumeHandshake);
	}

	function terminate() {
		if (typeof removeEventListener.value === 'function') {
			removeEventListener.value();
		}
		if (typeof removeConnectedHandler.value === 'function') {
			removeConnectedHandler.value();
		}
	}

	/**
	 * On WebSocket (re)connect, tell the server which execution the canvas still
	 * shows as running so it can replay a terminal event we may have missed
	 * while disconnected. Derived from the single tracked execution (0 or 1 id)
	 * — never from the store's disposal ledger of finished ids, which would
	 * over-report and trigger false replays.
	 */
	function sendResumeHandshake() {
		const documentId = workflowDocumentStore.value.documentId;
		const { activeExecutionId } = useWorkflowExecutionStateStore(documentId);
		const awaiting = typeof activeExecutionId === 'string' ? [activeExecutionId] : [];
		pushStore.send(createResumeMessage(awaiting));
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

		switch (event.type) {
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
			case 'resumeComplete':
				return resumeComplete(event);
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
