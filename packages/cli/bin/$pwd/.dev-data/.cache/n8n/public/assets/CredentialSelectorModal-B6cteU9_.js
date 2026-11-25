import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GA as DialogDescription_default, Hc as CredentialIcon_default, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, hC as useTelemetry, jN as useI18n, qA as DialogTitle_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as CredentialPicker_default } from "./CredentialPicker-QRMIIfvA.js";
//#region src/features/ai/components/CredentialSelectorModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var CredentialSelectorModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "CredentialSelectorModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const uiStore = useUIStore();
		const selectedCredentialId = ref(props.data.initialValue);
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const displayName = computed(() => props.data.displayName);
		const title = computed(() => props.data.title ?? i18n.baseText("chatHub.credentials.selector.title", { interpolate: { provider: displayName.value } }));
		const description = computed(() => props.data.description ?? i18n.baseText("chatHub.credentials.selector.chooseOrCreate", { interpolate: { provider: displayName.value } }));
		function onCredentialSelect(credentialId) {
			selectedCredentialId.value = credentialId;
		}
		function onCredentialDeselect() {
			selectedCredentialId.value = null;
		}
		function onDeleteCredential(credentialId) {
			if (!selectedCredentialId.value || credentialId !== selectedCredentialId.value) return;
			selectedCredentialId.value = null;
			if (credentialId === props.data.initialValue) props.data.onSelect(null);
		}
		function onCredentialModalOpened(credentialId) {
			telemetry.track("User opened Credential modal", {
				credential_type: props.data.credentialType,
				source: props.data.source ?? "chat",
				new_credential: !credentialId,
				workflow_id: null
			});
		}
		async function closeDialog() {
			uiStore.closeModal(props.modalName);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		function onConfirm() {
			if (selectedCredentialId.value) {
				props.data.onSelect(selectedCredentialId.value);
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
				stacked: __props.data.appendToBody === true,
				"data-test-id": `${__props.modalName}-modal`,
				"container-class": _ctx.$style.credentialSelectorModal,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(CredentialIcon_default, {
							"credential-type-name": __props.data.credentialType,
							size: 24,
							class: normalizeClass(_ctx.$style.icon)
						}, null, 8, ["credential-type-name", "class"]), createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(title.value), 1)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(description.value), 1)]),
							_: 1
						}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.credentialContainer) }, [createVNode(CredentialPicker_default, {
							class: normalizeClass(_ctx.$style.credentialPicker),
							"app-name": displayName.value,
							"credential-type": __props.data.credentialType,
							"selected-credential-id": selectedCredentialId.value,
							"show-delete": __props.data.showDelete ?? true,
							"hide-create-new": __props.data.hideCreateNew ?? true,
							"data-testid": __props.data.pickerDataTestId,
							"credential-modal-append-to-body": __props.data.appendToBody,
							onCredentialSelected: onCredentialSelect,
							onCredentialDeselected: onCredentialDeselect,
							onCredentialDeleted: onDeleteCredential,
							onCredentialModalOpened
						}, null, 8, [
							"class",
							"app-name",
							"credential-type",
							"selected-credential-id",
							"show-delete",
							"hide-create-new",
							"data-testid",
							"credential-modal-append-to-body"
						])], 2)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							onClick: onCancel
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.data.cancelLabel ?? unref(i18n).baseText("chatHub.credentials.selector.cancel")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							variant: "solid",
							disabled: !selectedCredentialId.value,
							onClick: onConfirm
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.data.confirmLabel ?? unref(i18n).baseText("chatHub.credentials.selector.confirm")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					})
				]),
				_: 1
			}, 8, [
				"open",
				"stacked",
				"data-test-id",
				"container-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	icon: "_icon_12p9d_1",
	credentialContainer: "_credentialContainer_12p9d_6",
	credentialPicker: "_credentialPicker_12p9d_12"
} }]]);
//#endregion
export { CredentialSelectorModal_default as default };
