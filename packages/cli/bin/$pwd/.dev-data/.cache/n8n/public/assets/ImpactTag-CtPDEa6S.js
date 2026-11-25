import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { jN as useI18n, nN as N8nBadge_default } from "./app-D5flEmb-.js";
//#region src/features/settings/migrationReport/constants.ts
/** General breaking-changes docs for the target major version. */
var BREAKING_CHANGES_DOCUMENTATION_URL = "https://docs.n8n.io/changelog/v30-breaking-changes";
/** The target version as users read it, for example `3.0.0`. */
var TARGET_VERSION_DISPLAY = `${"v3".slice(1) ?? "2"}.0.0`;
//#endregion
//#region src/features/settings/migrationReport/components/ImpactTag.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/settings/migrationReport/components/ImpactTag.vue
var ImpactTag_default = /* @__PURE__ */ defineComponent({
	name: "ImpactTag",
	__name: "ImpactTag",
	props: { impact: {} },
	setup(__props) {
		const i18n = useI18n();
		const labels = computed(() => ({
			upgradeBlocked: i18n.baseText("settings.migrationReport.impact.upgradeBlocked"),
			executionsFail: i18n.baseText("settings.migrationReport.impact.executionsFail"),
			executionsMightFail: i18n.baseText("settings.migrationReport.impact.executionsMightFail"),
			behaviorChanges: i18n.baseText("settings.migrationReport.impact.behaviorChanges"),
			capabilityRemoved: i18n.baseText("settings.migrationReport.impact.capabilityRemoved")
		}));
		const badgeVariants = {
			upgradeBlocked: "danger",
			executionsFail: "danger",
			executionsMightFail: "warning",
			behaviorChanges: "warning",
			capabilityRemoved: "outline"
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nBadge_default), {
				variant: badgeVariants[__props.impact],
				"data-test-id": "migration-rule-impact-tag"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(labels.value[__props.impact]), 1)]),
				_: 1
			}, 8, ["variant"]);
		};
	}
});
//#endregion
export { BREAKING_CHANGES_DOCUMENTATION_URL as n, TARGET_VERSION_DISPLAY as r, ImpactTag_default as t };
