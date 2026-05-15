import { ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import {
	builderCreditsUpdated,
	useTestWebhookDeleted,
	useTestWebhookReceived,
	reloadNodeType,
	removeNodeType,
	nodeDescriptionUpdated,
	useNodeExecuteBefore,
	useNodeExecuteAfter,
	nodeExecuteAfterData,
	executionStarted,
	sendWorkerStatusMessage,
	sendConsoleMessage,
	useWorkflowFailedToActivate,
	useExecutionFinished,
	useExecutionRecovered,
	useWorkflowActivated,
	useWorkflowDeactivated,
	useWorkflowAutoDeactivated,
	workflowSettingsUpdated,
} from '@/app/composables/usePushConnection/handlers';
import { createEventQueue } from '@n8n/utils/event-queue';

export function usePushConnection() {
	const pushStore = usePushConnectionStore();

	const { testWebhookDeleted } = useTestWebhookDeleted();
	const { testWebhookReceived } = useTestWebhookReceived();
	const { nodeExecuteBefore } = useNodeExecuteBefore();
	const { nodeExecuteAfter } = useNodeExecuteAfter();
	const { workflowActivated } = useWorkflowActivated();
	const { workflowDeactivated } = useWorkflowDeactivated();
	const { workflowAutoDeactivated } = useWorkflowAutoDeactivated();
	const { workflowFailedToActivate } = useWorkflowFailedToActivate();
	const { executionFinished } = useExecutionFinished();
	const { executionRecovered } = useExecutionRecovered();

	const { enqueue } = createEventQueue<PushMessage>(processEvent);

	const removeEventListener = ref<(() => void) | null>(null);

	function initialize() {
		removeEventListener.value = pushStore.addEventListener((message) => {
			enqueue(message);
		});
	}

	function terminate() {
		if (typeof removeEventListener.value === 'function') {
			removeEventListener.value();
		}
	}

	/**
	 * Process received push message event by calling the correct handler
	 */
	async function processEvent(event: PushMessage) {
		switch (event.type) {
			case 'testWebhookDeleted':
				return await testWebhookDeleted(event);
			case 'testWebhookReceived':
				return await testWebhookReceived(event);
			case 'reloadNodeType':
				return await reloadNodeType(event);
			case 'removeNodeType':
				return await removeNodeType(event);
			case 'nodeDescriptionUpdated':
				return await nodeDescriptionUpdated(event);
			case 'nodeExecuteBefore':
				return await nodeExecuteBefore(event);
			case 'nodeExecuteAfter':
				return await nodeExecuteAfter(event);
			case 'nodeExecuteAfterData':
				return await nodeExecuteAfterData(event);
			case 'executionStarted':
				return await executionStarted(event);
			case 'sendWorkerStatusMessage':
				return await sendWorkerStatusMessage(event);
			case 'sendConsoleMessage':
				return await sendConsoleMessage(event);
			case 'workflowFailedToActivate':
				return await workflowFailedToActivate(event);
			case 'executionFinished':
				return await executionFinished(event);
			case 'executionRecovered':
				return await executionRecovered(event);
			case 'workflowActivated':
				return await workflowActivated(event);
			case 'workflowDeactivated':
				return await workflowDeactivated(event);
			case 'workflowAutoDeactivated':
				return await workflowAutoDeactivated(event);
			case 'workflowSettingsUpdated':
				return await workflowSettingsUpdated(event);
			case 'updateBuilderCredits':
				return await builderCreditsUpdated(event);
		}
	}

	return {
		initialize,
		terminate,
	};
}
