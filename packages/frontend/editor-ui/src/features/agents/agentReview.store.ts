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
	const pendingReviewOpen = ref<{ agentId: string; startKey?: string } | null>(null);

	/** Tester checks as the Sessions ledger sees them (kept in sync by the preview dock). */
	type LedgerCheck = {
		rowId: number;
		label: string;
		input: string;
		state: 'idle' | 'running' | 'needsEye' | 'ok' | 'flagged' | 'error';
		at: string | null;
	};
	const ledgerChecksByAgentId = ref<Record<string, LedgerCheck[]>>({});
	function setLedgerChecks(agentId: string, rows: LedgerCheck[]) {
		ledgerChecksByAgentId.value = { ...ledgerChecksByAgentId.value, [agentId]: rows };
	}

	function setAttention(agentId: string, count: number) {
		attentionByAgentId.value = { ...attentionByAgentId.value, [agentId]: count };
	}

	const attentionFor = computed(() => (agentId: string) => attentionByAgentId.value[agentId] ?? 0);

	function requestReview(agentId: string, startKey?: string) {
		pendingReviewOpen.value = { agentId, startKey };
	}

	function consumeReviewRequest(agentId: string): { startKey?: string } | null {
		const pending = pendingReviewOpen.value;
		if (!pending || pending.agentId !== agentId) return null;
		pendingReviewOpen.value = null;
		return { startKey: pending.startKey };
	}

	return {
		attentionByAgentId,
		attentionFor,
		setAttention,
		needsEyeThreadIdsByAgentId,
		setNeedsEyeThreadIds,
		ledgerChecksByAgentId,
		setLedgerChecks,
		pendingReviewOpen,
		requestReview,
		consumeReviewRequest,
	};
});
