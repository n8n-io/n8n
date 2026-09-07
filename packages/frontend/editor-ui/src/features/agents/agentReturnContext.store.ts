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

/** History-state key used to restore the workflow artifact after the return navigation. */
export const AGENT_RETURN_WORKFLOW_ID_STATE = 'agentReturnWorkflowId';

export const useAgentReturnContextStore = defineStore('agentReturnContext', () => {
	const context = ref<AgentReturnContext | null>(null);

	function set(ctx: AgentReturnContext) {
		context.value = ctx;
	}

	function clear() {
		context.value = null;
	}

	return { context, set, clear };
});
