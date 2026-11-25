import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, Rc as useAgentTelemetry, SN as _plugin_vue_export_helper_default, _M as Checkbox_default, _N as N8nText_default, _h as LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION, ih as AGENT_N8N_CHAT_VIEW, jN as useI18n, pC as useStorage, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useAgentProjectBreadcrumb } from "./useAgentProjectBreadcrumb-VTuNETiM.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
//#region src/features/agents/components/AgentPublishedModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentPublishedModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentPublishedModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const uiStore = useUIStore();
		const { trackDismissedAgentPublishedModal } = useAgentTelemetry();
		const { projectName } = useAgentProjectBreadcrumb(computed(() => props.data.projectId));
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const checked = ref(false);
		function handleCheckboxChange(checkboxValue) {
			const boolValue = typeof checkboxValue === "boolean" ? checkboxValue : Boolean(checkboxValue);
			checked.value = boolValue;
			useStorage(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION).value = boolValue.toString();
		}
		function close(action) {
			trackDismissedAgentPublishedModal({
				agentId: props.data.agentId,
				dontShowAgain: checked.value,
				action,
				n8nChatLive: props.data.n8nChatLive
			});
			uiStore.closeModal(props.modalName);
		}
		function talkToAgent() {
			close("talk_to_agent");
			router.push({
				name: AGENT_N8N_CHAT_VIEW,
				params: { agentId: props.data.agentId }
			});
		}
		function onOpenChange(open) {
			if (!open) close("closed");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: modalOpen.value,
				title: unref(i18n).baseText("agents.publish.modal.title"),
				"show-cancel": false,
				size: "large",
				"data-testid": "agent-published-modal",
				"onUpdate:open": onOpenChange
			}, {
				footerLeft: withCtx(() => [createVNode(unref(Checkbox_default), {
					"model-value": checked.value,
					"data-testid": "agent-published-modal-dont-show-again",
					"onUpdate:modelValue": handleCheckboxChange
				}, {
					label: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.dontShowAgain")), 1)]),
					_: 1
				}, 8, ["model-value"])]),
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: props.data.n8nChatLive ? "ghost" : "solid",
					"data-testid": "agent-published-modal-got-it",
					onClick: _cache[0] || (_cache[0] = ($event) => close("got_it"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.publish.modal.gotIt")), 1)]),
					_: 1
				}, 8, ["variant"]), props.data.n8nChatLive ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					"data-testid": "agent-published-modal-talk-to-agent",
					onClick: talkToAgent
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.publish.modal.talkToAgent")), 1)]),
					_: 1
				})) : createCommentVNode("", true)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.publish.modal.description.readyToUse")), 1)]),
						_: 1
					}),
					props.data.n8nChatLive && unref(projectName) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						"data-testid": "agent-published-modal-n8n-chat"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.publish.modal.description.liveInN8nChat", { interpolate: { projectName: unref(projectName) } })), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.publish.modal.description.changesNotPublished")), 1)]),
						_: 1
					})
				], 2)]),
				_: 1
			}, 8, ["open", "title"]);
		};
	}
}), [["__cssModules", { "$style": { content: "_content_113zd_1" } }]]);
//#endregion
export { AgentPublishedModal_default as default };
