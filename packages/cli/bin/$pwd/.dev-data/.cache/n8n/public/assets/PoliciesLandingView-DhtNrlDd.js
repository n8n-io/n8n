import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { Bj as SettingsRow_default, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, Lj as SettingsRowConfigure_default, Pj as SettingsSection_default, SN as _plugin_vue_export_helper_default, Uj as SettingsLayout_default, ep as usePolicyAdminAccess, fC as VIEWS, jN as useI18n, qd as useDocumentTitle, wp as INSTANCE_POLICY_VIEW } from "./app-D5flEmb-.js";
//#region ../../modules/type-availability-policies/frontend/src/policies-landing/PoliciesLandingView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PoliciesLandingView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PoliciesLandingView",
	setup(__props) {
		const i18n = useI18n();
		const router = useRouter();
		const documentTitle = useDocumentTitle();
		const { entryRouteName } = usePolicyAdminAccess();
		function onBack() {
			router.push({ name: VIEWS.SECURITY_SETTINGS });
		}
		function openInstancePolicy() {
			router.push({ name: INSTANCE_POLICY_VIEW });
		}
		onMounted(() => {
			if (entryRouteName.value !== "TypeAvailabilityPoliciesView") {
				router.replace({ name: entryRouteName.value });
				return;
			}
			documentTitle.set(i18n.baseText("typeAvailabilityPolicies.landing.title"));
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				"show-back": "",
				"back-label": unref(i18n).baseText("typeAvailabilityPolicies.backToPolicies"),
				class: normalizeClass(_ctx.$style.layout),
				"data-test-id": "policies-landing-view",
				onBack
			}, {
				default: withCtx(() => [createVNode(unref(SettingsPageHeader_default), {
					title: unref(i18n).baseText("typeAvailabilityPolicies.landing.title"),
					description: unref(i18n).baseText("typeAvailabilityPolicies.landing.description"),
					"show-docs-link": false
				}, null, 8, ["title", "description"]), createVNode(unref(SettingsSection_default), {
					title: unref(i18n).baseText("typeAvailabilityPolicies.landing.global"),
					"data-test-id": "policies-landing-global-section"
				}, {
					default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
						default: withCtx(() => [createVNode(unref(SettingsRow_default), {
							clickable: "",
							title: unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.title"),
							description: unref(i18n).baseText("typeAvailabilityPolicies.instancePolicy.description"),
							"data-test-id": "policies-landing-instance-row",
							"data-attr": "policies-landing-instance-row",
							onClick: openInstancePolicy
						}, {
							action: withCtx(() => [createVNode(unref(SettingsRowConfigure_default), { value: unref(i18n).baseText("generic.configure") }, null, 8, ["value"])]),
							_: 1
						}, 8, ["title", "description"])]),
						_: 1
					})]),
					_: 1
				}, 8, ["title"])]),
				_: 1
			}, 8, ["back-label", "class"]);
		};
	}
}), [["__cssModules", { "$style": { layout: "_layout_12pr6_1" } }]]);
//#endregion
export { PoliciesLandingView_default as default };
