import { $d as init_runtime_core_esm_bundler, Jf as toValue, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Mp as useCredentialsStore, _C as useUsersStore, dC as useToast, hC as useTelemetry, jN as useI18n, sA as OPEN_AI_API_CREDENTIAL_TYPE, vm as useProjectsStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/app/composables/useFreeAiCredits.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var showSuccessCallout = ref(false);
function useFreeAiCredits(options = {}) {
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
		if (options.hasOpenAiCredential !== void 0) return toValue(options.hasOpenAiCredential);
		return credentialsStore.allCredentials.some((credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE);
	});
	const userHasClaimedAiCreditsAlready = computed(() => !!usersStore.currentUser?.settings?.userClaimedAiCredits);
	const userCanClaimOpenAiCredits = computed(() => isAiCreditsEnabled.value && !settingsStore.isAiGatewayEnabled && !userHasOpenAiCredentialAlready.value && !userHasClaimedAiCreditsAlready.value);
	async function claimCreditsAndGetCredential(source, projectId = projectsStore.currentProject?.id) {
		if (!userCanClaimOpenAiCredits.value) return null;
		claimingCredits.value = true;
		try {
			const credential = await credentialsStore.claimFreeAiCredits(projectId);
			if (usersStore?.currentUser?.settings) usersStore.currentUser.settings.userClaimedAiCredits = true;
			showSuccessCallout.value = true;
			telemetry.track("User claimed OpenAI credits", { source });
			return credential;
		} catch (e) {
			toast.showError(e, i18n.baseText("freeAi.credits.showError.claim.title"), { message: i18n.baseText("freeAi.credits.showError.claim.message") });
			return null;
		} finally {
			claimingCredits.value = false;
		}
	}
	async function claimCredits(source) {
		return await claimCreditsAndGetCredential(source) !== null;
	}
	return {
		isAiCreditsEnabled,
		aiCreditsQuota,
		userCanClaimOpenAiCredits,
		claimingCredits,
		showSuccessCallout,
		claimCredits,
		claimCreditsAndGetCredential
	};
}
//#endregion
export { useFreeAiCredits as t };
