import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, SN as _plugin_vue_export_helper_default, _N as N8nText_default, cN as Input_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
//#region src/features/agents/components/AgentDescriptionModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentDescriptionModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentDescriptionModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const description = ref(props.data.description);
		const canSave = computed(() => description.value.trim() !== props.data.description);
		function closeModal() {
			uiStore.closeModal(props.modalName);
		}
		function onSave() {
			props.data.onConfirm(description.value.trim());
			closeModal();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: modalOpen.value,
				title: __props.data.agentName || unref(i18n).baseText("generic.description"),
				size: "medium",
				"data-testid": "agent-description-modal",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => !$event && closeModal())
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "solid",
					disabled: !canSave.value,
					"data-testid": "agent-description-save",
					onClick: onSave
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["disabled"])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(Input_default), {
					modelValue: description.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => description.value = $event),
					type: "textarea",
					rows: 6,
					maxlength: unref(512),
					placeholder: unref(i18n).baseText("agents.builder.description.placeholder"),
					"data-testid": "agent-description-input"
				}, null, 8, [
					"modelValue",
					"maxlength",
					"placeholder"
				]), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.description.tip")), 1)]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, ["open", "title"]);
		};
	}
}), [["__cssModules", { "$style": { content: "_content_113zd_1" } }]]);
//#endregion
export { AgentDescriptionModal_default as default };
