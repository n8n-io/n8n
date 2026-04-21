import type { WorkflowAuthoringCheckSeverity, WorkflowCheckConfigDto } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	listWorkflowAuthoringChecks,
	updateWorkflowAuthoringCheckConfig,
} from '@/features/workflows/authoringChecks/authoringChecks.api';

export const useWorkflowAuthoringChecksStore = defineStore(STORES.WORKFLOW_AUTHORING_CHECKS, () => {
	const rootStore = useRootStore();

	const checks = ref<WorkflowCheckConfigDto[]>([]);
	const isLoading = ref(false);
	const hasFetched = ref(false);
	const inflight = ref<Promise<void> | null>(null);

	const hasWorkflowChecksEnabled = computed(() => checks.value.some((c) => c.enabled));

	async function fetchChecks() {
		isLoading.value = true;
		try {
			const response = await listWorkflowAuthoringChecks(rootStore.restApiContext);
			checks.value = response.checks;
			hasFetched.value = true;
		} finally {
			isLoading.value = false;
		}
	}

	async function ensureChecksLoaded() {
		if (hasFetched.value) return;
		if (!inflight.value) {
			inflight.value = fetchChecks().finally(() => {
				inflight.value = null;
			});
		}
		try {
			await inflight.value;
		} catch {
			// Best-effort: let callers proceed with their default path
		}
	}

	async function updateCheck(
		checkId: string,
		patch: {
			enabled?: boolean;
			severityOverride?: WorkflowAuthoringCheckSeverity | null;
		},
	) {
		const updated = await updateWorkflowAuthoringCheckConfig(
			rootStore.restApiContext,
			checkId,
			patch,
		);
		const index = checks.value.findIndex((c) => c.checkId === checkId);
		if (index !== -1) {
			checks.value.splice(index, 1, updated);
		}
		return updated;
	}

	return {
		checks,
		isLoading,
		hasWorkflowChecksEnabled,
		fetchChecks,
		ensureChecksLoaded,
		updateCheck,
	};
});
