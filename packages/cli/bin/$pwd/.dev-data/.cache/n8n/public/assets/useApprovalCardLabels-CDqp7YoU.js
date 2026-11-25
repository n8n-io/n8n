import { $d as init_runtime_core_esm_bundler, Rd as computed } from "./vendor-Hx42-oQF.js";
import { jN as useI18n } from "./app-D5flEmb-.js";
//#region src/app/composables/useApprovalCardLabels.ts
init_runtime_core_esm_bundler();
function useApprovalCardLabels() {
	const i18n = useI18n();
	return computed(() => ({
		alwaysAllow: i18n.baseText("instanceAi.confirmation.alwaysAllow"),
		alwaysAllowSuffix: i18n.baseText("instanceAi.confirmation.alwaysAllowSuffix"),
		allowOnce: i18n.baseText("instanceAi.confirmation.approve"),
		deny: i18n.baseText("instanceAi.confirmation.deny"),
		allowed: i18n.baseText("instanceAi.confirmation.approved"),
		denied: i18n.baseText("instanceAi.confirmation.denied"),
		args: i18n.baseText("instanceAi.toolCall.input")
	}));
}
//#endregion
export { useApprovalCardLabels as t };
