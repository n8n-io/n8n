import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Origin a user navigated into the agent feature from, so the agent views can
 * offer a "Back to workflow" return. Held in memory.
 */
export interface AgentReturnContext {
	workflowId: string;
	/** Non-workflow route that contains the workflow, such as an Assistant artifact view. */
	returnPath?: string;
	/**
	 * Node whose NDV reopens on return. Set only when the round-trip started
	 * from the node's NDV; empty for trips that started from the canvas (the
	 * return then lands on the canvas without reopening the NDV).
	 */
	nodeId: string;
	/** Agent navigated to — the banner only shows on this agent's pages. */
	agentId: string;
}

export interface PendingAgentArtifactReturn {
	workflowId: string;
	nodeId?: string;
}

export const useAgentReturnContextStore = defineStore('agentReturnContext', () => {
	const context = ref<AgentReturnContext | null>(null);
	const pendingArtifactReturn = ref<PendingAgentArtifactReturn | null>(null);

	function set(ctx: AgentReturnContext) {
		context.value = ctx;
	}

	function clear() {
		context.value = null;
	}

	function setPendingArtifactReturn(pending: PendingAgentArtifactReturn) {
		pendingArtifactReturn.value = pending;
	}

	function consumePendingArtifactReturn() {
		const pending = pendingArtifactReturn.value;
		pendingArtifactReturn.value = null;
		return pending;
	}

	return {
		context,
		pendingArtifactReturn,
		set,
		clear,
		setPendingArtifactReturn,
		consumePendingArtifactReturn,
	};
});
