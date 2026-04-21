import type { WorkflowAuthoringCheckSeverity, WorkflowCheckConfigDto } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import {
	listWorkflowAuthoringChecks,
	updateWorkflowAuthoringCheckConfig,
} from '@/features/workflows/authoringChecks/authoringChecks.api';

export function useWorkflowAuthoringChecks() {
	const rootStore = useRootStore();

	const checks = ref<WorkflowCheckConfigDto[]>([]);
	const isLoading = ref(false);

	async function fetchChecks() {
		isLoading.value = true;
		try {
			const response = await listWorkflowAuthoringChecks(rootStore.restApiContext);
			checks.value = response.checks;
		} finally {
			isLoading.value = false;
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
		fetchChecks,
		updateCheck,
	};
}
