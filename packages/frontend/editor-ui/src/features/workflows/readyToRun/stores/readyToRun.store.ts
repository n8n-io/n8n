import { useUsersStore } from '@/features/settings/users/users.store';
import { useI18n } from '@n8n/i18n';
import { STORES } from '@n8n/stores';
import { useLocalStorage } from '@vueuse/core';
import { OPEN_AI_API_CREDENTIAL_TYPE, deepCopy } from 'n8n-workflow';
import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter, type RouteLocationNormalized } from 'vue-router';
import { READY_TO_RUN_AI_WORKFLOW } from '../workflows/aiWorkflow';
import { useEmptyStateDetection } from '../composables/useEmptyStateDetection';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useReadyToRunWorkflowsV2Store } from '@/experiments/readyToRunWorkflowsV2/stores/readyToRunWorkflowsV2.store';

const LOCAL_STORAGE_CREDENTIAL_KEY = 'N8N_READY_TO_RUN_OPENAI_CREDENTIAL_ID';

export const useReadyToRunStore = defineStore(STORES.READY_TO_RUN, () => {
	const READY_TO_RUN_TEMPLATE_IDS = [
		'ready-to-run-ai-workflow',
		'ready-to-run-ai-workflow-v5',
		'ready-to-run-ai-workflow-v6',
	];

	const telemetry = useTelemetry();
	const i18n = useI18n();
	const toast = useToast();
	const router = useRouter();
	const credentialsStore = useCredentialsStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();
	const readyToRunWorkflowsV2Store = useReadyToRunWorkflowsV2Store();

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

	const trackExecuteAiWorkflow = (status: string) => {
		telemetry.track('User executed ready to run AI workflow', {
			status,
		});
	};

	const trackExecuteAiWorkflowSuccess = () => {
		telemetry.track('User executed ready to run AI workflow successfully');
	};

	const claimFreeAiCredits = async (projectId?: string) => {
		claimingCredits.value = true;

		try {
			const credential = await credentialsStore.claimFreeAiCredits(projectId);

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

	const getReadyToRunWorkflowTemplate = () => {
		return readyToRunWorkflowsV2Store.getWorkflowForVariant() ?? READY_TO_RUN_AI_WORKFLOW;
	};

	const createAndOpenAiWorkflow = async (source: 'card' | 'button', parentFolderId?: string) => {
		telemetry.track('User opened ready to run AI workflow', {
			source,
		});

		try {
			let workflowToCreate: WorkflowDataCreate = {
				...getReadyToRunWorkflowTemplate(),
				parentFolderId,
			};

			const credentialId = claimedCredentialIdRef.value;
			if (credentialId && workflowToCreate.nodes) {
				const clonedWorkflow = deepCopy(workflowToCreate);
				const openAiNode = clonedWorkflow.nodes?.find((node) => node.name === 'OpenAI Model');
				if (openAiNode) {
					openAiNode.credentials ??= {};
					openAiNode.credentials[OPEN_AI_API_CREDENTIAL_TYPE] = {
						id: credentialId,
						name: '',
					};
				}
				workflowToCreate = clonedWorkflow;
			}

			const createdWorkflow = await workflowsStore.createNewWorkflow(workflowToCreate);

			await router.push({
				name: VIEWS.WORKFLOW,
				params: { name: createdWorkflow.id },
			});

			return createdWorkflow;
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'));
			throw error;
		}
	};

	const claimCreditsAndOpenWorkflow = async (
		source: 'card' | 'button',
		parentFolderId?: string,
		projectId?: string,
	) => {
		await claimFreeAiCredits(projectId);
		await createAndOpenAiWorkflow(source, parentFolderId);

		if (usersStore?.currentUser?.settings) {
			usersStore.currentUser.settings.userClaimedAiCredits = true;
		}
	};

	const getCardVisibility = (canCreate: boolean | undefined, readOnlyEnv: boolean) => {
		return userCanClaimOpenAiCredits.value && !readOnlyEnv && canCreate;
	};

	const getButtonVisibility = (
		hasWorkflows: boolean,
		canCreate: boolean | undefined,
		readOnlyEnv: boolean,
	) => {
		return userCanClaimOpenAiCredits.value && !readOnlyEnv && canCreate && hasWorkflows;
	};

	const { isTrulyEmpty } = useEmptyStateDetection();

	const getSimplifiedLayoutVisibility = (route: RouteLocationNormalized) => {
		return isTrulyEmpty(route);
	};

	const isReadyToRunTemplateId = (templateId: string | undefined): boolean => {
		return !!templateId && READY_TO_RUN_TEMPLATE_IDS.includes(templateId);
	};

	return {
		claimingCredits,
		userCanClaimOpenAiCredits,
		claimFreeAiCredits,
		createAndOpenAiWorkflow,
		claimCreditsAndOpenWorkflow,
		getCardVisibility,
		getButtonVisibility,
		getSimplifiedLayoutVisibility,
		trackExecuteAiWorkflow,
		trackExecuteAiWorkflowSuccess,
		isReadyToRunTemplateId,
	};
});
