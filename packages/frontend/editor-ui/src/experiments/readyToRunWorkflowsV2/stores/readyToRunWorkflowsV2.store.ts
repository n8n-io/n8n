import { READY_TO_RUN_V2_PART2_EXPERIMENT } from '@/app/constants';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { READY_TO_RUN_WORKFLOW_V3 } from '../workflows/ai-workflow-v3';
import { READY_TO_RUN_WORKFLOW_V4 } from '../workflows/ai-workflow-v4';

export const useReadyToRunWorkflowsV2Store = defineStore(
	STORES.EXPERIMENT_READY_TO_RUN_WORKFLOWS_V2,
	() => {
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();

		const currentVariant = computed(() =>
			posthogStore.getVariant(READY_TO_RUN_V2_PART2_EXPERIMENT.name),
		);

		const isVariant3 = computed(
			() => currentVariant.value === READY_TO_RUN_V2_PART2_EXPERIMENT.variant3,
		);
		const isVariant4 = computed(
			() => currentVariant.value === READY_TO_RUN_V2_PART2_EXPERIMENT.variant4,
		);

		const isFeatureEnabled = computed(
			() => cloudPlanStore.userIsTrialing && (isVariant3.value || isVariant4.value),
		);

		const getWorkflowForVariant = (): WorkflowDataCreate | undefined => {
			if (!isFeatureEnabled.value) {
				return;
			}

			if (isVariant3.value) {
				return READY_TO_RUN_WORKFLOW_V3;
			}

			if (isVariant4.value) {
				return READY_TO_RUN_WORKFLOW_V4;
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
