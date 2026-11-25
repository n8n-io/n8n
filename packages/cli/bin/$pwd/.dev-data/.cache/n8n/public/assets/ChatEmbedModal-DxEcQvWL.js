import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, $n as HtmlEditor_default, Qb as CHAT_EMBED_MODAL_KEY, Qn as JsEditor_default, SN as _plugin_vue_export_helper_default, Wb as WEBHOOK_NODE_TYPE, _N as N8nText_default, _b as CHAT_TRIGGER_NODE_TYPE, bC as useRootStore, hM as N8nLink_default, jM as createEventBus, jN as useI18n, tM as N8nInfoTip_default, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/app/components/ChatEmbedModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = { class: "mb-s" };
var _hoisted_3 = { class: "mb-s" };
var _hoisted_4 = { class: "action-buttons" };
var importCode = "import";
var ChatEmbedModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatEmbedModal",
	props: { modalBus: { default: () => createEventBus() } },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const tabs = ref([
			{
				label: "CDN Embed",
				value: "cdn"
			},
			{
				label: "Vue Embed",
				value: "vue"
			},
			{
				label: "React Embed",
				value: "react"
			},
			{
				label: "Other",
				value: "other"
			}
		]);
		const currentTab = ref("cdn");
		const webhookNode = computed(() => {
			for (const type of [CHAT_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE]) {
				const node = workflowDocumentStore.value.allNodes.find((node) => node.type === type);
				if (node) {
					if (type === "@n8n/n8n-nodes-langchain.chatTrigger" && !node.parameters.public) continue;
					return {
						type,
						node
					};
				}
			}
			return null;
		});
		const webhookUrl = computed(() => {
			const url = `${rootStore.webhookUrl}${webhookNode.value ? `/${webhookNode.value.node.webhookId}` : ""}`;
			return webhookNode.value?.type === "@n8n/n8n-nodes-langchain.chatTrigger" ? `${url}/chat` : url;
		});
		function indentLines(code, indent = "	") {
			return code.split("\n").map((line) => `${indent}${line}`).join("\n");
		}
		const commonCode = computed(() => ({
			import: `${importCode} '@n8n/chat/style.css';
${importCode} { createChat } from '@n8n/chat';`,
			createChat: `createChat({
	webhookUrl: '${webhookUrl.value}'
});`,
			install: "npm install @n8n/chat"
		}));
		const cdnCode = computed(() => `<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
<script type="module">
${importCode} { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

${commonCode.value.createChat}
<\/script>`);
		const vueCode = computed(() => `<script lang="ts" setup>
${importCode} { onMounted } from 'vue';
${commonCode.value.import}

onMounted(() => {
${indentLines(commonCode.value.createChat)}
});
<\/script>`);
		const reactCode = computed(() => `${importCode} { useEffect } from 'react';
${commonCode.value.import}

export const App = () => {
	useEffect(() => {
${indentLines(commonCode.value.createChat, "		")}
	}, []);

	return (<div></div>);
};

<\/script>`);
		const otherCode = computed(() => `${commonCode.value.import}

${commonCode.value.createChat}`);
		function closeDialog() {
			props.modalBus.emit("close");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				"max-width": "960px",
				title: unref(i18n).baseText("chatEmbed.title"),
				"event-bus": __props.modalBus,
				name: unref(CHAT_EMBED_MODAL_KEY),
				center: true
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [
					createVNode(unref(Tabs_default), {
						modelValue: currentTab.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => currentTab.value = $event),
						options: tabs.value
					}, null, 8, ["modelValue", "options"]),
					currentTab.value !== "cdn" ? (openBlock(), createElementBlock("div", _hoisted_1, [createBaseVNode("div", _hoisted_2, [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatEmbed.install")), 1)]),
						_: 1
					})]), createVNode(HtmlEditor_default, {
						"model-value": commonCode.value.install,
						"is-read-only": ""
					}, null, 8, ["model-value"])])) : createCommentVNode("", true),
					createBaseVNode("div", _hoisted_3, [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: `chatEmbed.paste.${currentTab.value}`,
							scope: "global"
						}, {
							code: withCtx(() => [createBaseVNode("code", null, toDisplayString(unref(i18n).baseText(`chatEmbed.paste.${currentTab.value}.file`)), 1)]),
							_: 1
						}, 8, ["keypath"])]),
						_: 1
					})]),
					currentTab.value === "cdn" ? (openBlock(), createBlock(HtmlEditor_default, {
						key: 1,
						"model-value": cdnCode.value,
						"is-read-only": ""
					}, null, 8, ["model-value"])) : createCommentVNode("", true),
					currentTab.value === "vue" ? (openBlock(), createBlock(HtmlEditor_default, {
						key: 2,
						"model-value": vueCode.value,
						"is-read-only": ""
					}, null, 8, ["model-value"])) : createCommentVNode("", true),
					currentTab.value === "react" ? (openBlock(), createBlock(JsEditor_default, {
						key: 3,
						"model-value": reactCode.value,
						"is-read-only": ""
					}, null, 8, ["model-value"])) : createCommentVNode("", true),
					currentTab.value === "other" ? (openBlock(), createBlock(JsEditor_default, {
						key: 4,
						"model-value": otherCode.value,
						"is-read-only": ""
					}, null, 8, ["model-value"])) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatEmbed.packageInfo.description")) + " ", 1), createVNode(unref(N8nLink_default), {
							href: unref(i18n).baseText("chatEmbed.url"),
							"new-window": "",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatEmbed.packageInfo.link")), 1)]),
							_: 1
						}, 8, ["href"])]),
						_: 1
					}),
					createVNode(unref(N8nInfoTip_default), { class: "mt-s" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatEmbed.chatTriggerNode")), 1)]),
						_: 1
					})
				], 2)]),
				footer: withCtx(() => [createBaseVNode("div", _hoisted_4, [createVNode(unref(N8nButton_default), {
					float: "right",
					label: unref(i18n).baseText("chatEmbed.close"),
					onClick: closeDialog
				}, null, 8, ["label"])])]),
				_: 1
			}, 8, [
				"title",
				"event-bus",
				"name"
			]);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_9huyq_1" } }]]);
//#endregion
export { ChatEmbedModal_default as default };
