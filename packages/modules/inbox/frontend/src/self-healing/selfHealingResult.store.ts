import type { SelfHealingResultDetail, SelfHealingResultWorkflowMetadata } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	fetchResultWorkflow,
	fetchSelfHealingResult,
	type SelfHealingResultAction,
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
	let detailRequest = 0;
	let workflowRequest = 0;

	function isSelected(target: SelfHealingSelection) {
		return (
			selection.value?.id === target.id &&
			selection.value.projectId === target.projectId &&
			selection.value.workflowId === target.workflowId
		);
	}

	function setError(target: SelfHealingSelection, cause: unknown) {
		if (!isSelected(target)) return;
		detailRequest++;
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
		detailRequest++;
		detail.value = result;
		error.value = null;
		loading.value = false;
	}

	async function refreshDetail() {
		const target = selection.value;
		if (!target) return;
		const request = ++detailRequest;
		loading.value = true;
		error.value = null;
		try {
			const result = await fetchSelfHealingResult(rootStore.restApiContext, target);
			if (request === detailRequest) detail.value = result;
		} catch (cause) {
			if (request === detailRequest) setError(target, cause);
		} finally {
			if (request === detailRequest) loading.value = false;
		}
	}

	async function refreshWorkflow() {
		const target = selection.value;
		if (!target) return;
		const request = ++workflowRequest;
		try {
			const response = await fetchResultWorkflow(rootStore.restApiContext, target.workflowId);
			if (request !== workflowRequest) return;
			workflow.value = response;
			workflowError.value = null;
		} catch (cause) {
			if (request !== workflowRequest) return;
			workflow.value = null;
			workflowError.value = cause;
		}
	}

	async function select(target: SelfHealingSelection) {
		detailRequest++;
		workflowRequest++;
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
