import { READY_TO_RUN_V2_P3_EXPERIMENT } from '@/app/constants';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { READY_TO_RUN_WORKFLOW_V5 } from '../workflows/ai-workflow-v5';
import { READY_TO_RUN_WORKFLOW_V6 } from '../workflows/ai-workflow-v6';

export const useReadyToRunWorkflowsV2Store = defineStore(
	STORES.EXPERIMENT_READY_TO_RUN_WORKFLOWS_V2,
	() => {
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();

		const currentVariant = computed(() =>
			posthogStore.getVariant(READY_TO_RUN_V2_P3_EXPERIMENT.name),
		);

		const isVariant5 = computed(
			() => currentVariant.value === READY_TO_RUN_V2_P3_EXPERIMENT.variant5,
		);
		const isVariant6 = computed(
			() => currentVariant.value === READY_TO_RUN_V2_P3_EXPERIMENT.variant6,
		);

		const isFeatureEnabled = computed(
			() => cloudPlanStore.userIsTrialing && (isVariant5.value || isVariant6.value),
		);

		const getWorkflowForVariant = (): WorkflowDataCreate | undefined => {
			if (!isFeatureEnabled.value) {
				return;
			}

			if (isVariant5.value) {
				return READY_TO_RUN_WORKFLOW_V5;
			}

			if (isVariant6.value) {
				return READY_TO_RUN_WORKFLOW_V6;
			}

			return;
		};

		return {
			currentVariant,
			getWorkflowForVariant,
			isFeatureEnabled,
		};
	},
);
