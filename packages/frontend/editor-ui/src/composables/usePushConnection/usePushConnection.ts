import { ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';

import { usePushConnectionStore } from '@/stores/pushConnection.store';
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
	executionFinished,
	executionRecovered,
	workflowActivated,
	workflowDeactivated,
} from '@/composables/usePushConnection/handlers';
import { injectWorkflowState, type WorkflowState } from '@/composables/useWorkflowState';
import { createEventQueue } from '@n8n/utils/event-queue';
import type { useRouter } from 'vue-router';

export function usePushConnection({
	router,
	workflowState,
}: {
	router: ReturnType<typeof useRouter>;
	workflowState?: WorkflowState;
}) {
	const pushStore = usePushConnectionStore();
	const options = {
		router,
		workflowState: workflowState ?? injectWorkflowState(),
	};

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
				return await nodeExecuteAfterData(event);
			case 'executionStarted':
				return await executionStarted(event, options);
			case 'sendWorkerStatusMessage':
				return await sendWorkerStatusMessage(event);
			case 'sendConsoleMessage':
				return await sendConsoleMessage(event);
			case 'workflowFailedToActivate':
				return await workflowFailedToActivate(event, options);
			case 'executionFinished':
				return await executionFinished(event, options);
			case 'executionRecovered':
				return await executionRecovered(event, options);
			case 'workflowActivated':
				return await workflowActivated(event);
			case 'workflowDeactivated':
				return await workflowDeactivated(event);
			case 'updateBuilderCredits':
				return await builderCreditsUpdated(event);
		}
	}

	return {
		initialize,
		terminate,
	};
}
