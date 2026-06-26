import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Origin a user navigated into the agent feature from, so the agent views can
 * offer a "Back to workflow" return. Held in memory (not the route) because the
 * builder/new-agent views `router.replace` query params away across their child
 * transitions — a `returnTo` query would be dropped. The origin is session UI
 * state, not a deep link, so losing it on a full reload is intended.
 */
export interface AgentReturnContext {
	workflowId: string;
	/** Partial node id (`workflowsStore.getPartialIdForNode`) so the canvas can re-focus the origin node. */
	nodeId: string;
}

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
