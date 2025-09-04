import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { READY_TO_RUN_V2_EXPERIMENT, VIEWS } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useFoldersStore } from '@/stores/folders.store';
import { usePostHog } from '@/stores/posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useI18n } from '@n8n/i18n';
import { STORES } from '@n8n/stores';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { READY_TO_RUN_WORKFLOW } from '../workflows/ai-workflow';

const LOCAL_STORAGE_SETTING_KEY = 'N8N_READY_TO_RUN_WORKFLOWS_DISMISSED';

export const useReadyToRunWorkflowsV2Store = defineStore(
	STORES.EXPERIMENT_READY_TO_RUN_WORKFLOWS_V2,
	() => {
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const toast = useToast();
		const router = useRouter();
		const foldersStore = useFoldersStore();
		const credentialsStore = useCredentialsStore();
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();

		const isFeatureEnabled = computed(() => {
			return (
				posthogStore.getVariant(READY_TO_RUN_V2_EXPERIMENT.name) ===
					READY_TO_RUN_V2_EXPERIMENT.variant && cloudPlanStore.userIsTrialing
			);
		});

		const calloutDismissedRef = useLocalStorage(LOCAL_STORAGE_SETTING_KEY, false);
		const shouldShowCallout = computed(() => !calloutDismissedRef.value);

		const claimingCredits = ref(false);

		const userHasOpenAiCredentialAlready = computed(
			() =>
				!!credentialsStore.allCredentials.filter(
					(credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE,
				).length,
		);

		const userHasClaimedAiCreditsAlready = computed(
			() => !!usersStore.currentUser?.settings?.userClaimedAiCredits,
		);

		const userCanClaimOpenAiCredits = computed(() => {
			return (
				settingsStore.isAiCreditsEnabled &&
				!userHasOpenAiCredentialAlready.value &&
				!userHasClaimedAiCreditsAlready.value
			);
		});

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

		const createWorkflows = async (projectId: string, parentFolderId?: string) => {
			const collectionFolder = await foldersStore.createFolder(
				i18n.baseText('workflows.readyToRunWorkflows.folder.name'),
				projectId,
				parentFolderId,
			);
			dismissCallout();

			return collectionFolder;
		};

		const claimFreeAiCredits = async (projectId?: string) => {
			claimingCredits.value = true;

			try {
				await credentialsStore.claimFreeAiCredits(projectId);

				if (usersStore?.currentUser?.settings) {
					usersStore.currentUser.settings.userClaimedAiCredits = true;
				}

				telemetry.track('User claimed OpenAI credits');
			} catch (e) {
				toast.showError(
					e,
					i18n.baseText('freeAi.credits.showError.claim.title'),
					i18n.baseText('freeAi.credits.showError.claim.message'),
				);
				throw e;
			} finally {
				claimingCredits.value = false;
			}
		};

		const openAiWorkflow = async (source: string, parentFolderId?: string) => {
			telemetry.track('User clicked ready to run AI workflow', {
				source,
			});

			await router.push({
				name: VIEWS.TEMPLATE_IMPORT,
				params: { id: READY_TO_RUN_WORKFLOW.meta?.templateId },
				query: { fromJson: 'true', parentFolderId },
			});
		};

		const claimCreditsAndOpenWorkflow = async (
			source: string,
			parentFolderId?: string,
			projectId?: string,
		) => {
			try {
				// await claimFreeAiCredits(projectId);
				await openAiWorkflow(source, parentFolderId);
			} catch (error) {
				// Error is already handled in claimFreeAiCredits, but we don't want to proceed with opening the workflow
				// if credit claiming failed
			}
		};

		return {
			isFeatureEnabled,
			shouldShowCallout,
			claimingCredits,
			userCanClaimOpenAiCredits,
			createWorkflows,
			dismissCallout,
			claimFreeAiCredits,
			openAiWorkflow,
			claimCreditsAndOpenWorkflow,
			trackCreateWorkflows,
			trackDismissCallout,
			trackOpenWorkflow,
			trackExecuteWorkflow,
		};
	},
);
