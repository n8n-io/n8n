import type { SelfHealingResultDetail } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	fetchResultWorkflow,
	fetchSelfHealingResult,
	type SelfHealingResultAction,
	type SelfHealingResultWorkflowMetadata,
	type SelfHealingSelection,
} from './selfHealingResults.api';

function resultKey({ projectId, workflowId, id }: SelfHealingSelection) {
	return `${projectId}/${workflowId}/${id}`;
}

export const useSelfHealingResultStore = defineStore('selfHealingResultDetail', () => {
	const rootStore = useRootStore();
	const selection = ref<SelfHealingSelection | null>(null);
	const detail = ref<SelfHealingResultDetail | null>(null);
	const workflows = ref(new Map<string, SelfHealingResultWorkflowMetadata>());
	const loading = ref(false);
	const error = ref<unknown>(null);
	const workflowError = ref<unknown>(null);
	const pendingActions = ref(new Map<string, SelfHealingResultAction>());
	const pendingAction = computed(() =>
		selection.value ? (pendingActions.value.get(resultKey(selection.value)) ?? null) : null,
	);
	let detailRequestSequence = 0;
	let workflowRequestSequence = 0;

	function isSelected(target: SelfHealingSelection) {
		return (
			selection.value?.id === target.id &&
			selection.value.projectId === target.projectId &&
			selection.value.workflowId === target.workflowId
		);
	}

	function setError(target: SelfHealingSelection, cause: unknown) {
		if (!isSelected(target)) return;

		detailRequestSequence++;
		detail.value = null;
		error.value = cause;
		loading.value = false;
	}

	function acceptResult(result: SelfHealingResultDetail) {
		if (
			selection.value?.id !== result.resultId ||
			selection.value.workflowId !== result.workflowId ||
			selection.value.projectId !== result.projectId
		)
			return;

		// A read started before this action must not restore the pending state.
		detailRequestSequence++;
		detail.value = result;
		error.value = null;
		loading.value = false;
	}

	async function refreshDetail(beforeShow?: (result: SelfHealingResultDetail) => Promise<void>) {
		const target = selection.value;
		if (!target) return;

		const requestSequence = ++detailRequestSequence;
		loading.value = true;
		error.value = null;

		try {
			const result = await fetchSelfHealingResult(rootStore.restApiContext, target);
			if (requestSequence === detailRequestSequence) await beforeShow?.(result);

			if (requestSequence === detailRequestSequence) {
				detail.value = result;
				return result;
			}
		} catch (cause) {
			if (requestSequence === detailRequestSequence) {
				detail.value = null;
				error.value = cause;
			}
		} finally {
			if (requestSequence === detailRequestSequence) loading.value = false;
		}

		return undefined;
	}

	const workflowIds = computed(() => {
		if (!selection.value) return [];
		const suggestionIds = detail.value?.suggestions.map(({ workflowId }) => workflowId) ?? [];
		return [...new Set([selection.value.workflowId, ...suggestionIds])];
	});

	async function refreshWorkflows({ onlyMissing = false } = {}) {
		if (!selection.value) return;

		const ids = workflowIds.value.filter((id) => !onlyMissing || !workflows.value.has(id));
		if (ids.length === 0) return;

		const requestSequence = ++workflowRequestSequence;
		const responses = await Promise.allSettled(
			ids.map(async (id) => await fetchResultWorkflow(rootStore.restApiContext, id)),
		);
		if (requestSequence !== workflowRequestSequence) return;

		const next = new Map(onlyMissing ? workflows.value : []);
		let failure: unknown = null;
		responses.forEach((response, index) => {
			if (response.status === 'fulfilled') next.set(ids[index], response.value);
			else failure ??= response.reason;
		});
		workflows.value = next;
		workflowError.value = failure;
	}

	function beginAction(target: SelfHealingSelection, action: SelfHealingResultAction) {
		const key = resultKey(target);
		if (pendingActions.value.has(key)) return false;

		pendingActions.value.set(key, action);
		return true;
	}

	function endAction(target: SelfHealingSelection) {
		pendingActions.value.delete(resultKey(target));
	}

	// The sub-workflows of a fix are known only after the detail loads.
	async function refreshSubWorkflows(target: SelfHealingSelection) {
		if (isSelected(target) && detail.value && !workflowError.value) {
			await refreshWorkflows({ onlyMissing: true });
		}
	}

	async function select(target: SelfHealingSelection) {
		detailRequestSequence++;
		workflowRequestSequence++;

		selection.value = { ...target };
		detail.value = null;
		workflows.value = new Map();
		error.value = null;
		workflowError.value = null;

		await Promise.all([refreshDetail(), refreshWorkflows()]);
		await refreshSubWorkflows(target);
	}

	async function retryDetail(beforeShow?: (result: SelfHealingResultDetail) => Promise<void>) {
		const target = selection.value;
		if (target && (await refreshDetail(beforeShow))) await refreshSubWorkflows(target);
	}

	return {
		detail,
		workflows,
		workflowIds,
		loading,
		error,
		workflowError,
		pendingAction,
		select,
		retryDetail,
		refreshWorkflows,
		acceptResult,
		beginAction,
		endAction,
		setError,
		isSelected,
	};
});
