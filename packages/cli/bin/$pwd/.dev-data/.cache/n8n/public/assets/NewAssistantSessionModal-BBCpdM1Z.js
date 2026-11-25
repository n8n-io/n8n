import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Gr as useAssistantStore, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, Lp as useWorkflowId, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, Wr as useChatPanelStore, _N as N8nText_default, fx as NEW_ASSISTANT_SESSION_MODAL, jN as useI18n, qA as DialogTitle_default, rN as AskAssistantText_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/ai/assistant/components/Chat/NewAssistantSessionModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var NewAssistantSessionModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "NewAssistantSessionModal",
	props: {
		name: {},
		data: {}
	},
	setup(__props) {
		const i18n = useI18n();
		const uiStore = useUIStore();
		const assistantStore = useAssistantStore();
		const chatPanelStore = useChatPanelStore();
		const workflowId = useWorkflowId();
		const props = __props;
		const modalOpen = computed(() => uiStore.modalsById[NEW_ASSISTANT_SESSION_MODAL]?.open === true);
		const close = () => {
			uiStore.closeModal(NEW_ASSISTANT_SESSION_MODAL);
		};
		async function closeDialog() {
			close();
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		const startNewSession = async () => {
			if ("errorHelp" in props.data.context) {
				await chatPanelStore.openWithErrorHelper(props.data.context.errorHelp);
				assistantStore.trackUserOpenedAssistant({
					source: "error",
					task: "error",
					has_existing_session: true,
					workflowId: workflowId.value
				});
			} else if ("credHelp" in props.data.context) await chatPanelStore.openWithCredHelp(props.data.context.credHelp.credType);
			close();
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "medium",
				stacked: "",
				"data-test-id": "new-assistant-session-modal",
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [
								createTextVNode(toDisplayString(unref(i18n).baseText("aiAssistant.newSessionModal.title.part1")) + " ", 1),
								createBaseVNode("span", { class: normalizeClass(_ctx.$style.assistantIcon) }, [createVNode(unref(N8nIcon_default), {
									icon: "n8n-assistant",
									size: 12
								})], 2),
								createVNode(unref(AskAssistantText_default), {
									size: "xlarge",
									text: unref(i18n).baseText("aiAssistant.assistant")
								}, null, 8, ["text"]),
								createTextVNode(" " + toDisplayString(unref(i18n).baseText("aiAssistant.newSessionModal.title.part2")), 1)
							]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.container) }, {
						default: withCtx(() => [createBaseVNode("p", null, [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("aiAssistant.newSessionModal.message")), 1)]),
							_: 1
						})]), createBaseVNode("p", null, [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("aiAssistant.newSessionModal.question")), 1)]),
							_: 1
						})])]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							label: unref(i18n).baseText("generic.cancel"),
							onClick: close
						}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
							label: unref(i18n).baseText("aiAssistant.newSessionModal.confirm"),
							onClick: startNewSession
						}, null, 8, ["label"])]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_uzsk5_1",
	assistantIcon: "_assistantIcon_uzsk5_8"
} }]]);
//#endregion
export { NewAssistantSessionModal_default as default };
