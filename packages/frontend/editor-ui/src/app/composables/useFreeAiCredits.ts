import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

const showSuccessCallout = ref(false);

type UseFreeAiCreditsOptions = {
	hasOpenAiCredential?: MaybeRefOrGetter<boolean>;
};

export type FreeAiCreditsClaimSource =
	| 'chatHubAutoClaim'
	| 'freeAiCreditsCallout'
	| 'instanceAiWorkflowSetup'
	| 'agentBuilderModelSelector';

export function useFreeAiCredits(options: UseFreeAiCreditsOptions = {}) {
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();

	const claimingCredits = ref(false);

	const isAiCreditsEnabled = computed(() => settingsStore.isAiCreditsEnabled);

	const aiCreditsQuota = computed(() => settingsStore.aiCreditsQuota);

	const userHasOpenAiCredentialAlready = computed(() => {
		if (options.hasOpenAiCredential !== undefined) {
			return toValue(options.hasOpenAiCredential);
		}

		return credentialsStore.allCredentials.some(
			(credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE,
		);
	});

	const userHasClaimedAiCreditsAlready = computed(
		() => !!usersStore.currentUser?.settings?.userClaimedAiCredits,
	);

	const userCanClaimOpenAiCredits = computed(
		() =>
			isAiCreditsEnabled.value &&
			!settingsStore.isAiGatewayEnabled &&
			!userHasOpenAiCredentialAlready.value &&
			!userHasClaimedAiCreditsAlready.value,
	);

	async function claimCreditsAndGetCredential(
		source: FreeAiCreditsClaimSource,
		projectId = projectsStore.currentProject?.id,
	): Promise<ICredentialsResponse | null> {
		if (!userCanClaimOpenAiCredits.value) {
			return null;
		}

		claimingCredits.value = true;

		try {
			const credential = await credentialsStore.claimFreeAiCredits(projectId);

			if (usersStore?.currentUser?.settings) {
				usersStore.currentUser.settings.userClaimedAiCredits = true;
			}

			showSuccessCallout.value = true;
			telemetry.track('User claimed OpenAI credits', { source });

			return credential;
		} catch (e) {
			toast.showError(e, i18n.baseText('freeAi.credits.showError.claim.title'), {
				message: i18n.baseText('freeAi.credits.showError.claim.message'),
			});
			return null;
		} finally {
			claimingCredits.value = false;
		}
	}

	async function claimCredits(source: FreeAiCreditsClaimSource): Promise<boolean> {
		return (await claimCreditsAndGetCredential(source)) !== null;
	}

	return {
		isAiCreditsEnabled,
		aiCreditsQuota,
		userCanClaimOpenAiCredits,
		claimingCredits,
		showSuccessCallout,
		claimCredits,
		claimCreditsAndGetCredential,
	};
}
