import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Hu as nodeViewEventBus, Jg as useUIStore, SN as _plugin_vue_export_helper_default, Yy as VALID_WORKFLOW_IMPORT_URL_REGEX, cN as Input_default, jN as useI18n, sx as IMPORT_WORKFLOW_URL_MODAL_KEY, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/workflows/components/ImportWorkflowUrlModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var ImportWorkflowUrlModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ImportWorkflowUrlModal",
	setup(__props) {
		const i18n = useI18n();
		const uiStore = useUIStore();
		const url = ref("");
		const inputRef = ref(null);
		const isValid = computed(() => {
			return url.value ? VALID_WORKFLOW_IMPORT_URL_REGEX.test(url.value) : true;
		});
		const closeModal = () => {
			uiStore.closeModal(IMPORT_WORKFLOW_URL_MODAL_KEY);
		};
		const confirm = () => {
			nodeViewEventBus.emit("importWorkflowUrl", { url: url.value });
			closeModal();
		};
		const focusInput = async () => {
			if (inputRef.value) inputRef.value.focus();
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: unref(IMPORT_WORKFLOW_URL_MODAL_KEY),
				title: unref(i18n).baseText("mainSidebar.prompt.importWorkflowFromUrl"),
				"show-close": true,
				center: true,
				width: "420px",
				onOpened: focusInput
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.noScrollbar) }, [createVNode(unref(Input_default), {
					ref_key: "inputRef",
					ref: inputRef,
					modelValue: url.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => url.value = $event),
					placeholder: unref(i18n).baseText("mainSidebar.prompt.workflowUrl"),
					state: isValid.value ? "default" : "error",
					"data-test-id": "workflow-url-import-input",
					onKeyup: withKeys(confirm, ["enter"])
				}, null, 8, [
					"modelValue",
					"placeholder",
					"state"
				]), createBaseVNode("p", {
					class: normalizeClass(_ctx.$style["error-text"]),
					style: normalizeStyle({ visibility: isValid.value ? "hidden" : "visible" })
				}, toDisplayString(unref(i18n).baseText("mainSidebar.prompt.invalidUrl")), 7)], 2)]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "solid",
					float: "right",
					disabled: !url.value || !isValid.value,
					"data-test-id": "confirm-workflow-import-url-button",
					onClick: confirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("mainSidebar.prompt.import")), 1)]),
					_: 1
				}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
					variant: "outline",
					float: "right",
					"data-test-id": "cancel-workflow-import-url-button",
					onClick: closeModal
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("mainSidebar.prompt.cancel")), 1)]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, ["name", "title"]);
		};
	}
}), [["__cssModules", { "$style": {
	"error-text": "_error-text_95yr7_1",
	footer: "_footer_95yr7_9",
	noScrollbar: "_noScrollbar_95yr7_15"
} }]]);
//#endregion
export { ImportWorkflowUrlModal_default as default };
