import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Transient canvas intent: which AI Agent node (by id) should auto-open its
 * embedded agent picker. Set when the node is added interactively so the card
 * opens the picker on drop; consumed once by the card. Keyed by id (not name)
 * so a rename can't strand the signal.
 */
export const useAgentCanvasCardStore = defineStore('agentCanvasCard', () => {
	const nodeIdToOpenPicker = ref<string | undefined>();

	function setNodeIdToOpenPicker(nodeId: string) {
		nodeIdToOpenPicker.value = nodeId;
	}

	function clearNodeIdToOpenPicker() {
		nodeIdToOpenPicker.value = undefined;
	}

	return {
		nodeIdToOpenPicker,
		setNodeIdToOpenPicker,
		clearNodeIdToOpenPicker,
	};
});
