import { useFoldersStore } from '@/stores/folders.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { WorkflowDataCreate } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { AGENT_WITH_MEMORY } from '../workflows/1_agent_with_memory';
import { AGENT_WITH_TOOLS } from '../workflows/2_agent_with_tools';
import { AGENT_WITH_KNOWLEDGE } from '../workflows/3_agent_with_knowledge';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePostHog } from '@/stores/posthog.store';
import { TEMPLATE_ONBOARDING_EXPERIMENT } from '@/constants';

export const useAITemplatesStarterCollectionStore = defineStore(
	STORES.AI_TEMPLATES_STARTER_COLLECTION,
	() => {
		const telemetry = useTelemetry();

		const foldersStore = useFoldersStore();
		const workflowsStore = useWorkflowsStore();
		const posthogStore = usePostHog();

		// TODO: Save this to local storage
		const calloutDismissed = ref(false);

		// TODO: Save this to local storage
		const setCalloutDismissed = (dismissed: boolean) => {
			calloutDismissed.value = dismissed;
		};

		const isFeatureEnabled = computed(() => {
			return (
				posthogStore.getVariant(TEMPLATE_ONBOARDING_EXPERIMENT.name) ===
				TEMPLATE_ONBOARDING_EXPERIMENT.variantStarterPack
			);
		});

		const createStarterWorkflows = async (projectId: string, parentFolderId?: string) => {
			const collectionFolder = await foldersStore.createFolder(
				'🎁 n8n basics: Learn how to build Agents in n8n',
				projectId,
				parentFolderId,
			);
			const agentWitheMemory: WorkflowDataCreate = {
				...AGENT_WITH_MEMORY,
				parentFolderId: collectionFolder.id,
			};
			const agentWithTools: WorkflowDataCreate = {
				...AGENT_WITH_TOOLS,
				parentFolderId: collectionFolder.id,
			};
			const agentWithKnowledge: WorkflowDataCreate = {
				...AGENT_WITH_KNOWLEDGE,
				parentFolderId: collectionFolder.id,
			};
			await workflowsStore.createNewWorkflow(agentWithKnowledge);
			await workflowsStore.createNewWorkflow(agentWithTools);
			await workflowsStore.createNewWorkflow(agentWitheMemory);
			calloutDismissed.value = true;
			return collectionFolder;
		};

		return {
			isFeatureEnabled,
			calloutDismissed,
			setCalloutDismissed,
			createStarterWorkflows,
		};
	},
);
