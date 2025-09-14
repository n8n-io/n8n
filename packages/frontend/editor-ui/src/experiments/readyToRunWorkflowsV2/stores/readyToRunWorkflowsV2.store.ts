import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { READY_TO_RUN_V2_EXPERIMENT, VIEWS } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { usePostHog } from '@/stores/posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useI18n } from '@n8n/i18n';
import { STORES } from '@n8n/stores';
import { useLocalStorage } from '@vueuse/core';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter, type RouteLocationNormalized } from 'vue-router';
import { READY_TO_RUN_WORKFLOW_V1 } from '../workflows/ai-workflow';
import { READY_TO_RUN_WORKFLOW_V2 } from '../workflows/ai-workflow-v2';
import { useEmptyStateDetection } from '../composables/useEmptyStateDetection';

const LOCAL_STORAGE_CREDENTIAL_KEY = 'N8N_READY_TO_RUN_V2_OPENAI_CREDENTIAL_ID';

export const useReadyToRunWorkflowsV2Store = defineStore(
	STORES.EXPERIMENT_READY_TO_RUN_WORKFLOWS_V2,
	() => {
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const toast = useToast();
		const router = useRouter();
		const credentialsStore = useCredentialsStore();
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();

		const isFeatureEnabled = computed(() => {
			const variant = posthogStore.getVariant(READY_TO_RUN_V2_EXPERIMENT.name);
			return (
				(variant === READY_TO_RUN_V2_EXPERIMENT.variant1 ||
					variant === READY_TO_RUN_V2_EXPERIMENT.variant2) &&
				cloudPlanStore.userIsTrialing
			);
		});

		const claimedCredentialIdRef = useLocalStorage(LOCAL_STORAGE_CREDENTIAL_KEY, '');

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

		const getCurrentVariant = () => {
			return posthogStore.getVariant(READY_TO_RUN_V2_EXPERIMENT.name);
		};

		const trackExecuteAiWorkflow = (status: string) => {
			const variant = getCurrentVariant();
			telemetry.track('User executed ready to run AI workflow', {
				status,
				variant,
			});
		};

		const trackExecuteAiWorkflowSuccess = () => {
			const variant = getCurrentVariant();
			telemetry.track('User executed ready to run AI workflow successfully', {
				variant,
			});
		};

		const claimFreeAiCredits = async (projectId?: string) => {
			claimingCredits.value = true;

			try {
				const credential = await credentialsStore.claimFreeAiCredits(projectId);

				if (usersStore?.currentUser?.settings) {
					usersStore.currentUser.settings.userClaimedAiCredits = true;
				}

				claimedCredentialIdRef.value = credential.id;

				telemetry.track('User claimed OpenAI credits');
				return credential;
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

		const openAiWorkflow = async (source: 'card' | 'button', parentFolderId?: string) => {
			const variant = getCurrentVariant();
			telemetry.track('User opened ready to run AI workflow', {
				source,
				variant,
			});

			const workflow =
				variant === READY_TO_RUN_V2_EXPERIMENT.variant2
					? READY_TO_RUN_WORKFLOW_V2
					: READY_TO_RUN_WORKFLOW_V1;

			await router.push({
				name: VIEWS.TEMPLATE_IMPORT,
				params: { id: workflow.meta?.templateId },
				query: { fromJson: 'true', parentFolderId },
			});
		};

		const claimCreditsAndOpenWorkflow = async (
			source: 'card' | 'button',
			parentFolderId?: string,
			projectId?: string,
		) => {
			await claimFreeAiCredits(projectId);
			await openAiWorkflow(source, parentFolderId);
		};

		const getCardVisibility = (
			canCreate: boolean | undefined,
			readOnlyEnv: boolean,
			loading: boolean,
		) => {
			return (
				!loading &&
				isFeatureEnabled.value &&
				userCanClaimOpenAiCredits.value &&
				!readOnlyEnv &&
				canCreate
			);
		};

		const getButtonVisibility = (
			hasWorkflows: boolean,
			canCreate: boolean | undefined,
			readOnlyEnv: boolean,
		) => {
			return (
				isFeatureEnabled.value &&
				userCanClaimOpenAiCredits.value &&
				!readOnlyEnv &&
				canCreate &&
				hasWorkflows
			);
		};

		const { shouldShowSimplifiedLayout } = useEmptyStateDetection();

		const getSimplifiedLayoutVisibility = (route: RouteLocationNormalized, loading: boolean) => {
			return shouldShowSimplifiedLayout(route, isFeatureEnabled.value, loading);
		};

		return {
			isFeatureEnabled,
			claimingCredits,
			userCanClaimOpenAiCredits,
			claimFreeAiCredits,
			openAiWorkflow,
			claimCreditsAndOpenWorkflow,
			getCardVisibility,
			getButtonVisibility,
			getSimplifiedLayoutVisibility,
			trackExecuteAiWorkflow,
			trackExecuteAiWorkflowSuccess,
		};
	},
);
