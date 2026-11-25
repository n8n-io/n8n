import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, WA as DialogBody_default, jN as useI18n, qA as DialogTitle_default } from "./app-D5flEmb-.js";
import { t as BrowserUseSetupContent_default } from "./BrowserUseSetupContent-CDRuyoQ7.js";
//#region src/features/ai/instanceAi/components/modals/BrowserUseSetupModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/modals/BrowserUseSetupModal.vue
var BrowserUseSetupModal_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "BrowserUseSetupModal",
	props: { modalName: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		async function closeDialog() {
			uiStore.closeModal(props.modalName);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "large",
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
					default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.browserUse.modal.title")), 1)]),
						_: 1
					})]),
					_: 1
				}), createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(BrowserUseSetupContent_default, {
						"auto-connect": "",
						onClose: closeDialog
					})]),
					_: 1
				})]),
				_: 1
			}, 8, ["open"]);
		};
	}
});
//#endregion
export { BrowserUseSetupModal_default as default };
