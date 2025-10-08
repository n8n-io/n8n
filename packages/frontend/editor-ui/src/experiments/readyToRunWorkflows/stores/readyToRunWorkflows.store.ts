import { useTelemetry } from '@/composables/useTelemetry';
import { BATCH_11AUG_EXPERIMENT } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useFoldersStore } from '@/features/folders/folders.store';
import { usePostHog } from '@/stores/posthog.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useI18n } from '@n8n/i18n';
import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { PLAYGROUND_1 } from '../workflows/1_playground';
import { PLAYGROUND_2 } from '../workflows/2_playground';
import { PLAYGROUND_3 } from '../workflows/3_playground';
import { PLAYGROUND_4 } from '../workflows/4_playground';

const LOCAL_STORAGE_SETTING_KEY = 'N8N_READY_TO_RUN_WORKFLOWS_DISMISSED';

export const useReadyToRunWorkflowsStore = defineStore(
	STORES.EXPERIMENT_READY_TO_RUN_WORKFLOWS,
	() => {
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const foldersStore = useFoldersStore();
		const workflowsStore = useWorkflowsStore();
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();

		const isFeatureEnabled = computed(() => {
			return (
				[
					BATCH_11AUG_EXPERIMENT.variantReadyToRun,
					BATCH_11AUG_EXPERIMENT.variantReadyToRun2,
					BATCH_11AUG_EXPERIMENT.variantReadyToRun3,
				].includes(posthogStore.getVariant(BATCH_11AUG_EXPERIMENT.name)?.toString() ?? '') &&
				cloudPlanStore.userIsTrialing
			);
		});

		const calloutDismissedRef = useLocalStorage(LOCAL_STORAGE_SETTING_KEY, false);
		const isCalloutDismissed = computed(() => calloutDismissedRef.value);

		const dismissCallout = () => {
			calloutDismissedRef.value = true;
		};

		const trackCreateWorkflows = (source: 'card' | 'callout') => {
			telemetry.track('User created ready to run workflows', {
				source,
			});
		};

		const trackDismissCallout = () => {
			telemetry.track('User dismissed ready to run workflows callout');
		};

		const trackOpenWorkflow = (template: string) => {
			telemetry.track('User opened ready to run workflow', {
				template,
			});
		};

		const trackExecuteWorkflow = (template: string, status: string) => {
			telemetry.track('User executed ready to run workflow', {
				template,
				status,
			});
		};

		function getCardText() {
			const variant = posthogStore.getVariant(BATCH_11AUG_EXPERIMENT.name);

			switch (variant) {
				case BATCH_11AUG_EXPERIMENT.variantReadyToRun:
					return i18n.baseText('workflows.readyToRunWorkflows.card');
				case BATCH_11AUG_EXPERIMENT.variantReadyToRun2:
					return i18n.baseText('workflows.readyToRunWorkflows.card2');
				case BATCH_11AUG_EXPERIMENT.variantReadyToRun3:
					return i18n.baseText('workflows.readyToRunWorkflows.card3');
				default:
					return '';
			}
		}

		function getCalloutText() {
			const variant = posthogStore.getVariant(BATCH_11AUG_EXPERIMENT.name);

			switch (variant) {
				case BATCH_11AUG_EXPERIMENT.variantReadyToRun:
					return i18n.baseText('workflows.readyToRunWorkflows.callout');
				case BATCH_11AUG_EXPERIMENT.variantReadyToRun2:
					return i18n.baseText('workflows.readyToRunWorkflows.callout2');
				case BATCH_11AUG_EXPERIMENT.variantReadyToRun3:
					return i18n.baseText('workflows.readyToRunWorkflows.callout3');
				default:
					return '';
			}
		}

		const createWorkflows = async (projectId: string, parentFolderId?: string) => {
			const collectionFolder = await foldersStore.createFolder(
				i18n.baseText('workflows.readyToRunWorkflows.folder.name'),
				projectId,
				parentFolderId,
			);
			const playground1: WorkflowDataCreate = {
				...PLAYGROUND_1,
				parentFolderId: collectionFolder.id,
			};
			const playground2: WorkflowDataCreate = {
				...PLAYGROUND_2,
				parentFolderId: collectionFolder.id,
			};
			const playground3: WorkflowDataCreate = {
				...PLAYGROUND_3,
				parentFolderId: collectionFolder.id,
			};
			const playground4: WorkflowDataCreate = {
				...PLAYGROUND_4,
				parentFolderId: collectionFolder.id,
			};
			await workflowsStore.createNewWorkflow(playground4);
			await workflowsStore.createNewWorkflow(playground3);
			await workflowsStore.createNewWorkflow(playground2);
			await workflowsStore.createNewWorkflow(playground1);
			dismissCallout();

			return collectionFolder;
		};

		return {
			isFeatureEnabled,
			isCalloutDismissed,
			createWorkflows,
			dismissCallout,
			trackCreateWorkflows,
			trackDismissCallout,
			trackOpenWorkflow,
			trackExecuteWorkflow,
			getCardText,
			getCalloutText,
		};
	},
);
