import { computed, ref } from 'vue';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

export function useFreeAiCredits() {
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

	const userHasOpenAiCredentialAlready = computed(() =>
		credentialsStore.allCredentials.some(
			(credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE,
		),
	);

	const userHasClaimedAiCreditsAlready = computed(
		() => !!usersStore.currentUser?.settings?.userClaimedAiCredits,
	);

	const userCanClaimOpenAiCredits = computed(
		() =>
			isAiCreditsEnabled.value &&
			!userHasOpenAiCredentialAlready.value &&
			!userHasClaimedAiCreditsAlready.value,
	);

	async function claimCredits(
		source: 'chatHubAutoClaim' | 'freeAiCreditsCallout',
	): Promise<boolean> {
		if (!userCanClaimOpenAiCredits.value) {
			return false;
		}

		claimingCredits.value = true;

		try {
			await credentialsStore.claimFreeAiCredits(projectsStore.currentProject?.id);

			if (usersStore?.currentUser?.settings) {
				usersStore.currentUser.settings.userClaimedAiCredits = true;
			}

			telemetry.track('User claimed OpenAI credits', { source });

			return true;
		} catch (e) {
			toast.showError(
				e,
				i18n.baseText('freeAi.credits.showError.claim.title'),
				i18n.baseText('freeAi.credits.showError.claim.message'),
			);
			return false;
		} finally {
			claimingCredits.value = false;
		}
	}

	return {
		isAiCreditsEnabled,
		aiCreditsQuota,
		userCanClaimOpenAiCredits,
		claimingCredits,
		claimCredits,
	};
}
