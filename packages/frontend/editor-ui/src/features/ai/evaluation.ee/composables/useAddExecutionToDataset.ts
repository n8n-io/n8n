import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue';
import type { EvaluationConfigDto } from '@n8n/api-types';

import { ADD_EXECUTION_TO_DATASET_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useEvaluationStore } from '../evaluation.store';
import { useEvaluationsWizardSidepanelExperiment } from '@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment';

/**
 * Gating + open logic for adding a successful execution to an evaluation
 * dataset. The action is only available when the config-evals experiment is on,
 * and is only enabled once the workflow has at least one data-table-backed
 * evaluation config.
 */
export function useAddExecutionToDataset(workflowId: MaybeRefOrGetter<string>) {
	const evaluationStore = useEvaluationStore();
	const uiStore = useUIStore();
	const { isFeatureEnabled } = useEvaluationsWizardSidepanelExperiment();

	const dataTableConfigs = ref<EvaluationConfigDto[]>([]);

	const hasDataTableConfig = computed(() => dataTableConfigs.value.length > 0);

	async function fetchDataTableConfigs(): Promise<void> {
		if (!isFeatureEnabled.value) return;
		try {
			const configs = await evaluationStore.fetchEvaluationConfigs(toValue(workflowId));
			dataTableConfigs.value = configs.filter((config) => config.datasetSource === 'data_table');
		} catch {
			// A failed lookup just leaves the action disabled — never block the view.
			dataTableConfigs.value = [];
		}
	}

	function openModal(executionId: string): void {
		uiStore.openModalWithData({
			name: ADD_EXECUTION_TO_DATASET_MODAL_KEY,
			data: {
				workflowId: toValue(workflowId),
				executionId,
				configs: dataTableConfigs.value,
			},
		});
	}

	return {
		isFeatureEnabled,
		hasDataTableConfig,
		fetchDataTableConfigs,
		openModal,
	};
}
