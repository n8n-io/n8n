import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
import { nodeViewEventBus } from '@/app/event-bus';

const CHAT_TRIGGER_TYPES: string[] = [CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE];

export type EvalTriggerNode = { name: string; type: string };

// Shared "Run workflow" trigger for the evaluations gate. Chat-trigger workflows
// can't be executed directly — they need a chat message to start, so we open and
// focus the chat panel instead (NodeView listens for `openChat`).
export function useRunEvalWorkflow() {
	const router = useRouter();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const { runEntireWorkflow } = useRunWorkflow({ router });

	// Enabled trigger nodes, in canvas order — mirrors the canvas Run button's
	// trigger picker.
	const triggerNodes = computed<EvalTriggerNode[]>(() =>
		(workflowDocumentStore.value?.allNodes ?? [])
			.filter((node) => node.disabled !== true && nodeTypesStore.isTriggerNode(node.type))
			.map((node) => ({ name: node.name, type: node.type })),
	);

	const hasChatTrigger = computed(() =>
		triggerNodes.value.some((node) => CHAT_TRIGGER_TYPES.includes(node.type)),
	);

	// Run a specific trigger (chat triggers open the chat panel instead).
	function runTriggerNode(node: EvalTriggerNode) {
		if (CHAT_TRIGGER_TYPES.includes(node.type)) {
			nodeViewEventBus.emit('openChat');
			return;
		}
		void runEntireWorkflow('node', node.name);
	}

	function runWorkflow() {
		if (hasChatTrigger.value) {
			nodeViewEventBus.emit('openChat');
			return;
		}
		void runEntireWorkflow('main');
	}

	return { runWorkflow, runTriggerNode, triggerNodes, hasChatTrigger };
}
