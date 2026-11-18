import type { SelfHealingAgentResultDetail } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	fetchAgentProposal,
	type AgentProposalAction,
	type AgentProposalSelection,
} from './agentProposal.api';

function proposalKey({ projectId, id }: AgentProposalSelection) {
	return `${projectId}/${id}`;
}

export const useAgentProposalStore = defineStore('agentProposalDetail', () => {
	const rootStore = useRootStore();
	const selection = ref<AgentProposalSelection | null>(null);
	const detail = ref<SelfHealingAgentResultDetail | null>(null);
	const loading = ref(false);
	const error = ref<unknown>(null);
	const pendingActions = ref(new Map<string, AgentProposalAction>());
	const pendingAction = computed(() =>
		selection.value ? (pendingActions.value.get(proposalKey(selection.value)) ?? null) : null,
	);
	let detailRequestSequence = 0;

	function isSelected(target: AgentProposalSelection) {
		return selection.value?.id === target.id && selection.value.projectId === target.projectId;
	}

	function setError(target: AgentProposalSelection, cause: unknown) {
		if (!isSelected(target)) return;

		detailRequestSequence++;
		detail.value = null;
		error.value = cause;
		loading.value = false;
	}

	function acceptResult(result: SelfHealingAgentResultDetail) {
		if (selection.value?.id !== result.resultId || selection.value.projectId !== result.projectId)
			return;

		// A read started before this action must not restore the pending state.
		detailRequestSequence++;
		detail.value = result;
		error.value = null;
		loading.value = false;
	}

	async function refreshDetail(beforeShow?: (result: SelfHealingAgentResultDetail) => void) {
		const target = selection.value;
		if (!target) return;

		const requestSequence = ++detailRequestSequence;
		loading.value = true;
		error.value = null;

		try {
			const result = await fetchAgentProposal(rootStore.restApiContext, target);
			if (requestSequence !== detailRequestSequence) return;

			beforeShow?.(result);
			detail.value = result;
		} catch (cause) {
			if (requestSequence === detailRequestSequence) {
				detail.value = null;
				error.value = cause;
			}
		} finally {
			if (requestSequence === detailRequestSequence) loading.value = false;
		}
	}

	function beginAction(target: AgentProposalSelection, action: AgentProposalAction) {
		const key = proposalKey(target);
		if (pendingActions.value.has(key)) return false;

		pendingActions.value.set(key, action);
		return true;
	}

	function endAction(target: AgentProposalSelection) {
		pendingActions.value.delete(proposalKey(target));
	}

	async function select(target: AgentProposalSelection) {
		selection.value = { ...target };
		detail.value = null;
		await refreshDetail();
	}

	return {
		detail,
		loading,
		error,
		pendingAction,
		select,
		retryDetail: refreshDetail,
		acceptResult,
		beginAction,
		endAction,
		setError,
		isSelected,
	};
});
