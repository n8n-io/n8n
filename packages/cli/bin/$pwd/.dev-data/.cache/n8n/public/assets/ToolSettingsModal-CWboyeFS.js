import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, Kf as RestrictedTypeCallout_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, hu as NodeIcon_default, jN as useI18n, qA as DialogTitle_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { n as useChatToolRestriction } from "./useChatToolRestriction-C4mNTPsX.js";
import { t as NodeToolSettingsContent_default } from "./NodeToolSettingsContent-BQ9He6el.js";
//#region src/features/ai/chatHub/components/ToolSettingsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ToolSettingsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ToolSettingsModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const { isRestricted, restriction, typeName } = useChatToolRestriction(() => props.data.node?.type);
		const contentRef = ref(null);
		const isValid = ref(false);
		const nodeName = ref(props.data.node?.name ?? "");
		async function closeDialog() {
			uiStore.closeModal(props.modalName);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		function handleConfirm() {
			const currentNode = contentRef.value?.node;
			if (!currentNode) return;
			props.data.onConfirm(currentNode);
			closeDialog();
		}
		function handleCancel() {
			closeDialog();
		}
		function handleChangeName(name) {
			contentRef.value?.handleChangeName(name);
		}
		function handleValidUpdate(valid) {
			isValid.value = valid;
		}
		function handleNodeNameUpdate(name) {
			nodeName.value = name;
		}
		return (_ctx, _cache) => {
			return __props.data.node ? (openBlock(), createBlock(unref(Dialog_default), {
				key: 0,
				open: modalOpen.value,
				size: "2xlarge",
				stacked: __props.data.stacked === true,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [contentRef.value?.nodeTypeDescription ? (openBlock(), createBlock(NodeIcon_default, {
							key: 0,
							"node-type": contentRef.value.nodeTypeDescription,
							size: 24,
							circle: true,
							class: normalizeClass(_ctx.$style.icon)
						}, null, 8, ["node-type", "class"])) : createCommentVNode("", true), createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createVNode(unref(N8nInlineTextEdit_default), {
								"model-value": nodeName.value,
								"read-only": unref(isRestricted),
								"max-width": 400,
								class: normalizeClass(_ctx.$style.title),
								"onUpdate:modelValue": handleChangeName
							}, null, 8, [
								"model-value",
								"read-only",
								"class"
							])]),
							_: 1
						})], 2)]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.contentWrapper) }, [unref(isRestricted) ? (openBlock(), createBlock(unref(RestrictedTypeCallout_default), {
							key: 0,
							surface: "chatTool",
							"type-name": unref(typeName),
							restriction: unref(restriction),
							class: normalizeClass(_ctx.$style.callout)
						}, null, 8, [
							"type-name",
							"restriction",
							"class"
						])) : createCommentVNode("", true), createVNode(NodeToolSettingsContent_default, {
							ref_key: "contentRef",
							ref: contentRef,
							"initial-node": __props.data.node,
							"existing-tool-names": __props.data.existingToolNames,
							"read-only": unref(isRestricted),
							"onUpdate:valid": handleValidUpdate,
							"onUpdate:nodeName": handleNodeNameUpdate
						}, null, 8, [
							"initial-node",
							"existing-tool-names",
							"read-only"
						])], 2)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							onClick: handleCancel
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.toolSettings.cancel")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							variant: "solid",
							disabled: !isValid.value || unref(isRestricted),
							"data-test-id": "chat-tool-settings-save",
							onClick: handleConfirm
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.toolSettings.confirm")), 1)]),
							_: 1
						}, 8, ["disabled"])], 2)]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open", "stacked"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1amj5_1",
	icon: "_icon_1amj5_8",
	title: "_title_1amj5_13",
	footer: "_footer_1amj5_18",
	callout: "_callout_1amj5_24",
	contentWrapper: "_contentWrapper_1amj5_30"
} }]]);
//#endregion
export { ToolSettingsModal_default as default };
