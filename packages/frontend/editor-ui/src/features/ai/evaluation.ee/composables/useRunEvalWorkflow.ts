import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
import { nodeViewEventBus } from '@/app/event-bus';

// Shared "Run workflow" trigger for the evaluations gate. Chat-trigger workflows
// can't be executed directly — they need a chat message to start, so we open and
// focus the chat panel instead (NodeView listens for `openChat`).
export function useRunEvalWorkflow() {
	const router = useRouter();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const { runEntireWorkflow } = useRunWorkflow({ router });

	const hasChatTrigger = computed(() =>
		(workflowDocumentStore.value?.allNodes ?? []).some(
			(node) =>
				[CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(node.type) &&
				node.disabled !== true,
		),
	);

	function runWorkflow() {
		if (hasChatTrigger.value) {
			nodeViewEventBus.emit('openChat');
			return;
		}
		void runEntireWorkflow('main');
	}

	return { runWorkflow, hasChatTrigger };
}
