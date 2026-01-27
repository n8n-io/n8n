import { useTelemetry } from '@/app/composables/useTelemetry';
import {
	DEFAULT_NEW_WORKFLOW_NAME,
	EMPTY_STATE_BUILDER_PROMPT_EXPERIMENT,
	VIEWS,
} from '@/app/constants';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { STORES } from '@n8n/stores';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

function isValidWorkflowData(data: unknown): data is WorkflowDataUpdate {
	return (
		typeof data === 'object' &&
		data !== null &&
		'nodes' in data &&
		Array.isArray((data as Record<string, unknown>).nodes)
	);
}

export const useEmptyStateBuilderPromptStore = defineStore(
	STORES.EXPERIMENT_EMPTY_STATE_BUILDER_PROMPT,
	() => {
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();
		const workflowsStore = useWorkflowsStore();
		const credentialsStore = useCredentialsStore();
		const router = useRouter();
		const telemetry = useTelemetry();

		function removeUnknownCredentials(workflow: WorkflowDataUpdate) {
			if (!workflow?.nodes) return;

			for (const node of workflow.nodes) {
				if (!node.credentials) continue;

				for (const [name, credential] of Object.entries(node.credentials)) {
					if (typeof credential === 'string' || credential.id === null) continue;

					if (!credentialsStore.getCredentialById(credential.id)) {
						delete node.credentials[name];
					}
				}
			}
		}

		// Store pending prompt for after navigation
		const pendingPrompt = ref<string | null>(null);

		// Experiment variant detection
		const currentVariant = computed(() =>
			posthogStore.getVariant(EMPTY_STATE_BUILDER_PROMPT_EXPERIMENT.name),
		);

		const isVariant = computed(
			() => currentVariant.value === EMPTY_STATE_BUILDER_PROMPT_EXPERIMENT.variant,
		);

		const isFeatureEnabled = computed(() => cloudPlanStore.userIsTrialing && isVariant.value);

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

		async function createWorkflowFromImport(
			workflowData: unknown,
			projectId?: string,
			parentFolderId?: string,
		) {
			if (!isValidWorkflowData(workflowData)) {
				throw new Error('Invalid workflow data');
			}

			removeUnknownCredentials(workflowData);

			telemetry.track('User imported workflow from empty state', {
				node_count: workflowData.nodes?.length ?? 0,
			});

			const workflow = await workflowsStore.createNewWorkflow({
				name: workflowData.name ?? DEFAULT_NEW_WORKFLOW_NAME,
				nodes: workflowData.nodes ?? [],
				connections: workflowData.connections ?? {},
				settings: workflowData.settings,
				pinData: workflowData.pinData,
				meta: workflowData.meta,
				projectId,
				parentFolderId,
			});

			await router.push({
				name: VIEWS.WORKFLOW,
				params: { name: workflow.id },
			});
		}

		return {
			currentVariant,
			isFeatureEnabled,
			pendingPrompt: computed(() => pendingPrompt.value),
			createWorkflowWithPrompt,
			consumePendingPrompt,
			createWorkflowFromImport,
		};
	},
);
