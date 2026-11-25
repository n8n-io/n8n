import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { Hc as CredentialIcon_default, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _N as N8nText_default, jN as useI18n, nu as CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY, pT as PROVIDER_CREDENTIAL_TYPE_MAP, pu as providerDisplayNames, qA as DialogTitle_default, uM as N8nFormInput_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/ai/chatHub/components/ModelByIdSelectorModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ModelByIdSelectorModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ModelByIdSelectorModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const modelId = ref(props.data.initialValue);
		const inputRef = ref(null);
		const i18n = useI18n();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY]?.open === true);
		onMounted(() => {
			setTimeout(() => {
				inputRef.value?.inputRef?.select();
				inputRef.value?.inputRef?.focus();
			});
		});
		async function closeDialog() {
			uiStore.closeModal(CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		function onConfirm() {
			if (modelId.value) {
				props.data.onSelect(props.data.provider, modelId.value);
				closeDialog();
			}
		}
		function onCancel() {
			closeDialog();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "medium",
				stacked: __props.data.stacked,
				"container-class": _ctx.$style.dialog,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(CredentialIcon_default, {
							"credential-type-name": unref(PROVIDER_CREDENTIAL_TYPE_MAP)[__props.data.provider],
							size: 24,
							class: normalizeClass(_ctx.$style.icon)
						}, null, 8, ["credential-type-name", "class"]), createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.models.byIdSelector.title", { interpolate: { provider: unref(providerDisplayNames)[__props.data.provider] } })), 1)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.content) }, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.models.byIdSelector.choose")), 1)]),
							_: 1
						}), createVNode(unref(N8nFormInput_default), {
							ref_key: "inputRef",
							ref: inputRef,
							modelValue: modelId.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => modelId.value = $event),
							name: "model",
							label: "",
							"max-length": "64",
							"focus-initially": "",
							onEnter: onConfirm
						}, null, 8, ["modelValue"])]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							onClick: onCancel
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.models.byIdSelector.cancel")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							variant: "solid",
							disabled: !modelId.value,
							onClick: onConfirm
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.models.byIdSelector.confirm")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					})
				]),
				_: 1
			}, 8, [
				"open",
				"stacked",
				"container-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_19sp2_1",
	icon: "_icon_19sp2_5"
} }]]);
//#endregion
export { ModelByIdSelectorModal_default as default };
