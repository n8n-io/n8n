import { useTelemetry } from '@/app/composables/useTelemetry';
import {
	DEFAULT_NEW_WORKFLOW_NAME,
	EMPTY_STATE_BUILDER_PROMPT_EXPERIMENT,
	VIEWS,
} from '@/app/constants';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

export const useEmptyStateBuilderPromptStore = defineStore(
	STORES.EXPERIMENT_EMPTY_STATE_BUILDER_PROMPT,
	() => {
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();
		const workflowsStore = useWorkflowsStore();
		const router = useRouter();
		const telemetry = useTelemetry();

		// Store pending prompt for after navigation
		const pendingPrompt = ref<string | null>(null);

		// Experiment variant detection
		const currentVariant = computed(() =>
			posthogStore.getVariant(EMPTY_STATE_BUILDER_PROMPT_EXPERIMENT.name),
		);

		const isVariant = computed(
			() => currentVariant.value === EMPTY_STATE_BUILDER_PROMPT_EXPERIMENT.variant,
		);

		// TODO: restore proper check: cloudPlanStore.userIsTrialing && isVariant.value
		const isFeatureEnabled = computed(
			() => true || (cloudPlanStore.userIsTrialing && isVariant.value),
		);

		// Create workflow and navigate
		async function createWorkflowWithPrompt(
			prompt: string,
			projectId?: string,
			parentFolderId?: string,
		) {
			telemetry.track('User submitted empty state builder prompt', {
				prompt_length: prompt.length,
			});

			pendingPrompt.value = prompt;

			const workflow = await workflowsStore.createNewWorkflow({
				name: DEFAULT_NEW_WORKFLOW_NAME,
				nodes: [],
				connections: {},
				projectId,
				parentFolderId,
			});

			await router.push({
				name: VIEWS.WORKFLOW,
				params: { name: workflow.id },
			});
		}

		function consumePendingPrompt(): string | null {
			const prompt = pendingPrompt.value;
			pendingPrompt.value = null;
			return prompt;
		}

		return {
			currentVariant,
			isFeatureEnabled,
			pendingPrompt: computed(() => pendingPrompt.value),
			createWorkflowWithPrompt,
			consumePendingPrompt,
		};
	},
);
