import { useFoldersStore } from '@/stores/folders.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { AGENT_WITH_MEMORY } from '../workflows/1_agent_with_memory';
import { AGENT_WITH_TOOLS } from '../workflows/2_agent_with_tools';
import { AGENT_WITH_KNOWLEDGE } from '../workflows/3_agent_with_knowledge';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePostHog } from '@/stores/posthog.store';
import { TEMPLATE_ONBOARDING_EXPERIMENT } from '@/constants';
import { useLocalStorage } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/stores/settings.store';

const LOCAL_STORAGE_SETTING_KEY = 'N8N_AI_TEMPLATES_STARTER_COLLECTION_CALL_OUT_DISMISSED';

export const useAITemplatesStarterCollectionStore = defineStore(
	STORES.AI_TEMPLATES_STARTER_COLLECTION,
	() => {
		const telemetry = useTelemetry();
		const i18n = useI18n();

		const foldersStore = useFoldersStore();
		const workflowsStore = useWorkflowsStore();
		const posthogStore = usePostHog();
		const settingsStore = useSettingsStore();

		const calloutDismissedRef = useLocalStorage(LOCAL_STORAGE_SETTING_KEY, false);
		const calloutDismissed = computed(() => calloutDismissedRef.value);

		const isFeatureEnabled = computed(() => {
			return (
				settingsStore.isCloudDeployment &&
				posthogStore.getVariant(TEMPLATE_ONBOARDING_EXPERIMENT.name) ===
					TEMPLATE_ONBOARDING_EXPERIMENT.variantStarterPack
			);
		});

		const dismissCallout = () => {
			calloutDismissedRef.value = true;
		};

		const createStarterWorkflows = async (projectId: string, parentFolderId?: string) => {
			const collectionFolder = await foldersStore.createFolder(
				i18n.baseText('workflows.ai.starter.collection.folder.name'),
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
			dismissCallout();
			return collectionFolder;
		};

		const trackUserCreatedStarterCollection = (source: 'card' | 'callout') => {
			telemetry.track('User created AI templates starter collection', {
				source,
			});
		};

		const trackUserDismissedCallout = () => {
			telemetry.track('User dismissed AI templates starter collection callout');
		};

		const trackUserOpenedWorkflow = (template: string) => {
			telemetry.track('User opened AI template workflow', {
				template,
			});
		};

		const trackUserExecutedWorkflow = (template: string, status: string) => {
			telemetry.track('User executed AI template', {
				template,
				status,
			});
		};
		return {
			isFeatureEnabled,
			calloutDismissed,
			dismissCallout,
			createStarterWorkflows,
			trackUserCreatedStarterCollection,
			trackUserDismissedCallout,
			trackUserOpenedWorkflow,
			trackUserExecutedWorkflow,
		};
	},
);
