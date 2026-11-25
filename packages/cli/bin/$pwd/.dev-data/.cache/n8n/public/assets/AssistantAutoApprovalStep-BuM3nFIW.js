import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, jN as useI18n, uj as AiActivityStep_default } from "./app-D5flEmb-.js";
import { n as autoApprovalReason, t as autoApprovalLabel } from "./autoApproval-DF-5zwLk.js";
import { n as parseAssistantAutoApproval } from "./assistantAutoApproval-C0osa_A0.js";
//#region src/features/ai/instanceAi/assistantAgent/AssistantAutoApprovalStep.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AssistantAutoApprovalStep_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AssistantAutoApprovalStep",
	props: {
		event: {},
		message: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const approval = computed(() => parseAssistantAutoApproval(props.event));
		return (_ctx, _cache) => {
			return approval.value ? (openBlock(), createBlock(unref(AiActivityStep_default), {
				key: 0,
				label: unref(autoApprovalLabel)(unref(i18n), approval.value),
				"data-test-id": "assistant-auto-approval"
			}, {
				default: withCtx(() => [createBaseVNode("p", { class: normalizeClass(_ctx.$style.reason) }, toDisplayString(unref(autoApprovalReason)(unref(i18n), approval.value)), 3)]),
				_: 1
			}, 8, ["label"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { reason: "_reason_1uhot_1" } }]]);
//#endregion
export { AssistantAutoApprovalStep_default as default };
