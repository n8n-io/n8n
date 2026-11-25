import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, _x as WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY, bC as useRootStore, hM as N8nLink_default, jM as createEventBus, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/workflows/components/WorkflowActivationConflictingWebhookModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { "data-test-id": "conflicting-webhook-path" };
var WorkflowActivationConflictingWebhookModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowActivationConflictingWebhookModal",
	props: { data: {} },
	setup(__props) {
		const modalBus = createEventBus();
		const uiStore = useUIStore();
		const rootStore = useRootStore();
		const { data } = __props;
		const webhookUrl = computed(() => {
			return rootStore.webhookUrl;
		});
		const webhookTypeUi = computed(() => {
			const suggestionBase = " and activate this one, or ";
			if (data.triggerType === "n8n-nodes-base.formTrigger") return {
				title: "Form",
				callout: "form trigger",
				suggestion: suggestionBase + "adjust the following URL path in either workflow:"
			};
			if (data.triggerType === "@n8n/n8n-nodes-langchain.chatTrigger") return {
				title: "Chat",
				callout: "chat trigger",
				suggestion: suggestionBase + "insert a new Chat Trigger node in either workflow:"
			};
			if (data.triggerType === "n8n-nodes-base.webhook") return {
				title: "Webhook",
				callout: "webhook trigger",
				suggestion: suggestionBase + "adjust the following URL path in either workflow:"
			};
			return {
				title: "Trigger",
				callout: "trigger",
				suggestion: suggestionBase + "insert a new trigger node of the same type in either workflow:"
			};
		});
		const workflowUrl = computed(() => {
			return rootStore.urlBaseEditor + "workflow/" + data.workflowId;
		});
		const onClick = async () => {
			uiStore.closeModal(WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY);
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				width: "540px",
				name: unref(WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY),
				title: `Conflicting ${webhookTypeUi.value.title} Path`,
				"event-bus": unref(modalBus),
				center: true
			}, {
				content: withCtx(() => [
					createVNode(unref(N8nCallout_default), {
						theme: "danger",
						"data-test-id": "conflicting-webhook-callout"
					}, {
						default: withCtx(() => [createTextVNode(" A " + toDisplayString(webhookTypeUi.value.callout) + " '" + toDisplayString(unref(data).node) + "' in the workflow '" + toDisplayString(unref(data).workflowName) + "' uses a conflicting URL path, so this workflow cannot be activated ", 1)]),
						_: 1
					}),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", null, [
						createVNode(unref(N8nText_default), { color: "text-base" }, {
							default: withCtx(() => [..._cache[0] || (_cache[0] = [createTextVNode(" You can deactivate ", -1)])]),
							_: 1
						}),
						createVNode(unref(N8nLink_default), {
							to: workflowUrl.value,
							underline: true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(data).workflowName), 1)]),
							_: 1
						}, 8, ["to"]),
						_cache[1] || (_cache[1] = createTextVNode(" " + toDisplayString(" ") + " ", -1)),
						createVNode(unref(N8nText_default), {
							color: "text-base",
							"data-test-id": "conflicting-webhook-suggestion"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(webhookTypeUi.value.suggestion), 1)]),
							_: 1
						})
					])], 2),
					createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nText_default), { color: "text-light" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(webhookUrl.value) + "/", 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						color: "text-dark",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(data).webhookPath), 1)]),
						_: 1
					})])
				]),
				footer: withCtx(() => [createVNode(unref(N8nButton_default), {
					label: "Done",
					size: "medium",
					float: "right",
					"data-test-id": "close-button",
					onClick
				})]),
				_: 1
			}, 8, [
				"name",
				"title",
				"event-bus"
			]);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_b3z0r_1" } }]]);
//#endregion
export { WorkflowActivationConflictingWebhookModal_default as default };
