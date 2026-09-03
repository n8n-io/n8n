import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Wireframe: cross-surface review state. The preview dock owns the checks and
 * the review queue; the builder tabs and the Sessions list only need to know
 * "how many moments want an eye" and to be able to ask the dock to open review.
 */
export const useAgentReviewStore = defineStore('agentReview', () => {
	const attentionByAgentId = ref<Record<string, number>>({});
	/** Live sessions still waiting for a verdict, per agent (drives the Sessions filter). */
	const needsEyeThreadIdsByAgentId = ref<Record<string, string[]>>({});
	function setNeedsEyeThreadIds(agentId: string, ids: string[]) {
		needsEyeThreadIdsByAgentId.value = { ...needsEyeThreadIdsByAgentId.value, [agentId]: ids };
	}
	const pendingReviewOpen = ref<string | null>(null);

	function setAttention(agentId: string, count: number) {
		attentionByAgentId.value = { ...attentionByAgentId.value, [agentId]: count };
	}

	const attentionFor = computed(() => (agentId: string) => attentionByAgentId.value[agentId] ?? 0);

	function requestReview(agentId: string) {
		pendingReviewOpen.value = agentId;
	}

	function consumeReviewRequest(agentId: string) {
		if (pendingReviewOpen.value !== agentId) return false;
		pendingReviewOpen.value = null;
		return true;
	}

	return {
		attentionByAgentId,
		attentionFor,
		setAttention,
		needsEyeThreadIdsByAgentId,
		setNeedsEyeThreadIds,
		pendingReviewOpen,
		requestReview,
		consumeReviewRequest,
	};
});
