import type { SelfHealingResultDetail } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	fetchResultWorkflow,
	fetchSelfHealingResult,
	type SelfHealingResultAction,
	type SelfHealingResultWorkflowMetadata,
	type SelfHealingSelection,
} from './selfHealingResults.api';

export const useSelfHealingResultStore = defineStore('selfHealingResultDetail', () => {
	const rootStore = useRootStore();
	const selection = ref<SelfHealingSelection | null>(null);
	const detail = ref<SelfHealingResultDetail | null>(null);
	const workflow = ref<SelfHealingResultWorkflowMetadata | null>(null);
	const loading = ref(false);
	const error = ref<unknown>(null);
	const workflowError = ref<unknown>(null);
	const pendingAction = ref<SelfHealingResultAction | null>(null);
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

	async function refreshDetail() {
		const target = selection.value;
		if (!target) return;

		const requestSequence = ++detailRequestSequence;
		loading.value = true;
		error.value = null;

		try {
			const result = await fetchSelfHealingResult(rootStore.restApiContext, target);

			if (requestSequence === detailRequestSequence) {
				detail.value = result;
				return result;
			}
		} catch (cause) {
			if (requestSequence === detailRequestSequence) setError(target, cause);
		} finally {
			if (requestSequence === detailRequestSequence) loading.value = false;
		}

		return undefined;
	}

	async function refreshWorkflow() {
		const target = selection.value;
		if (!target) return;

		const requestSequence = ++workflowRequestSequence;

		try {
			const response = await fetchResultWorkflow(rootStore.restApiContext, target.workflowId);
			if (requestSequence !== workflowRequestSequence) return;

			workflow.value = response;
			workflowError.value = null;
		} catch (cause) {
			if (requestSequence !== workflowRequestSequence) return;

			workflow.value = null;
			workflowError.value = cause;
		}
	}

	async function select(target: SelfHealingSelection) {
		detailRequestSequence++;
		workflowRequestSequence++;

		selection.value = { ...target };
		detail.value = null;
		workflow.value = null;
		error.value = null;
		workflowError.value = null;

		await Promise.all([refreshDetail(), refreshWorkflow()]);
	}

	return {
		detail,
		workflow,
		loading,
		error,
		workflowError,
		pendingAction,
		select,
		refreshDetail,
		refreshWorkflow,
		acceptResult,
		setError,
		isSelected,
	};
});
