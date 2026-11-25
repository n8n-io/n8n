import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Ho as RouterLink, Jd as defineComponent, Jf as toValue, Kd as createVNode, Mf as getCurrentScope, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, vf as resolveDynamicComponent, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $E as N8N_CHAT_INTEGRATION_TYPE, Go as listN8nChatAgents, LM as N8nCallout_default, Rc as useAgentTelemetry, SN as _plugin_vue_export_helper_default, Xo as publishAgent, Za as connectIntegration, _N as N8nText_default, bC as useRootStore, dC as useToast, ih as AGENT_N8N_CHAT_VIEW, jN as useI18n, jc as INSTANCE_AI_VIEW, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { r as upsertProjectAgentsListCache } from "./useProjectAgentsList-yCWZeTO1.js";
import { t as useAgentProjectBreadcrumb } from "./useAgentProjectBreadcrumb-VTuNETiM.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
import { t as SkeletonAgentCard_default } from "./SkeletonAgentCard-BEB4B4Z4.js";
import { t as useN8nAssistantIdentity } from "./useN8nAssistantIdentity-DseCiekY.js";
//#region src/features/agents/n8nChatPage/composables/useN8nChatAgents.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/**
* Loads one page of the n8n Chat agent library, ranked by the user's own usage.
* Refetches whenever `query`, `page` or `pageSize` change, and drops a stale response via a
* request counter (no AbortController hook on `makeRestApiRequest`).
*/
function useN8nChatAgents(options) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();
	const agents = ref([]);
	const count = ref(0);
	const isLoading = ref(false);
	const loadFailed = ref(false);
	let requestVersion = 0;
	if (getCurrentScope()) onScopeDispose(() => requestVersion++);
	async function fetchAgents() {
		const version = ++requestVersion;
		isLoading.value = true;
		loadFailed.value = false;
		const query = toValue(options.query).slice(0, 128);
		const page = toValue(options.page);
		const pageSize = toValue(options.pageSize);
		try {
			const result = await listN8nChatAgents(rootStore.restApiContext, {
				query,
				offset: (page - 1) * pageSize,
				limit: pageSize,
				sortBy: "usage:desc"
			});
			if (version !== requestVersion) return;
			agents.value = result.data;
			count.value = result.count;
		} catch (error) {
			if (version !== requestVersion) return;
			agents.value = [];
			count.value = 0;
			loadFailed.value = true;
			toast.showError(error, i18n.baseText("agents.n8nChatPage.library.loadError"));
		} finally {
			if (version === requestVersion) isLoading.value = false;
		}
	}
	function retry() {
		fetchAgents();
	}
	watch([
		() => toValue(options.query),
		() => toValue(options.page),
		() => toValue(options.pageSize)
	], () => {
		fetchAgents();
	}, { immediate: true });
	return {
		agents,
		count,
		isLoading,
		loadFailed,
		retry
	};
}
//#endregion
//#region src/features/agents/n8nChatPage/components/N8nChatAgentCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var N8nChatAgentCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "N8nChatAgentCard",
	props: {
		agent: {},
		source: {}
	},
	emits: ["make-available"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const assistant = useN8nAssistantIdentity();
		const agentTelemetry = useAgentTelemetry();
		const to = computed(() => props.agent ? {
			name: AGENT_N8N_CHAT_VIEW,
			params: { agentId: props.agent.id }
		} : { name: INSTANCE_AI_VIEW });
		const isUnavailable = computed(() => props.agent !== null && !props.agent.availableInChat);
		const name = computed(() => props.agent?.name ?? assistant.name.value);
		const description = computed(() => props.agent ? props.agent.description : assistant.description.value);
		function onClick() {
			if (!props.agent || isUnavailable.value) return;
			agentTelemetry.trackSelectedN8nChatAgent({
				agentId: props.agent.id,
				source: props.source
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(isUnavailable.value ? "div" : unref(RouterLink)), {
				to: isUnavailable.value ? void 0 : to.value,
				class: normalizeClass([_ctx.$style.card, { [_ctx.$style.unavailable]: isUnavailable.value }]),
				"data-test-id": "n8n-chat-agent-card",
				onClick
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.main) }, [__props.agent ? (openBlock(), createBlock(AgentPersonalisationIcon_default, {
					key: 0,
					personalisation: __props.agent.personalisation,
					size: 40,
					class: normalizeClass(_ctx.$style.muted)
				}, null, 8, ["personalisation", "class"])) : (openBlock(), createElementBlock("span", {
					key: 1,
					class: normalizeClass(_ctx.$style.assistantIcon)
				}, [createVNode(unref(N8nIcon_default), {
					icon: "n8n-assistant",
					size: 24
				})], 2)), createBaseVNode("div", { class: normalizeClass([_ctx.$style.content, _ctx.$style.muted]) }, [createVNode(unref(N8nText_default), {
					bold: "",
					class: normalizeClass(_ctx.$style.title),
					"data-test-id": "n8n-chat-agent-card-name"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(name.value), 1)]),
					_: 1
				}, 8, ["class"]), description.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.description),
					"data-test-id": "n8n-chat-agent-card-description"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(description.value), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)], 2)], 2), isUnavailable.value && __props.agent ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "ghost",
					size: "small",
					class: normalizeClass(_ctx.$style.makeAvailable),
					"data-test-id": "n8n-chat-agent-card-make-available",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("make-available", __props.agent))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.n8nChatPage.makeAvailable.action")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["to", "class"]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_1dukp_3",
	main: "_main_1dukp_23",
	assistantIcon: "_assistantIcon_1dukp_30",
	unavailable: "_unavailable_1dukp_39",
	muted: "_muted_1dukp_46",
	makeAvailable: "_makeAvailable_1dukp_50",
	content: "_content_1dukp_54",
	title: "_title_1dukp_62",
	description: "_description_1dukp_68"
} }]]);
//#endregion
//#region src/features/agents/n8nChatPage/components/N8nChatMakeAvailableModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var N8nChatMakeAvailableModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "N8nChatMakeAvailableModal",
	props: { agent: {} },
	emits: ["close", "available"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const { projectName } = useAgentProjectBreadcrumb(computed(() => props.agent.project.id));
		const submitting = ref(false);
		async function onConfirm() {
			if (submitting.value) return;
			const agent = props.agent;
			submitting.value = true;
			try {
				const { project, id } = agent;
				await connectIntegration(rootStore.restApiContext, project.id, id, N8N_CHAT_INTEGRATION_TYPE, "");
				const published = await publishAgent(rootStore.restApiContext, project.id, id);
				upsertProjectAgentsListCache(project.id, published);
				emit("available", {
					...agent,
					availableInChat: true
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.n8nChatPage.makeAvailable.error"));
			} finally {
				submitting.value = false;
			}
		}
		function onOpenChange(open) {
			if (!open) emit("close");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: true,
				title: unref(i18n).baseText("agents.n8nChatPage.makeAvailable.title", { interpolate: { name: __props.agent.name } }),
				busy: submitting.value,
				"show-cancel": false,
				size: "medium",
				"data-test-id": "n8n-chat-make-available-modal",
				"onUpdate:open": onOpenChange
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					disabled: submitting.value,
					onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
					_: 1
				}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
					loading: submitting.value,
					"data-test-id": "n8n-chat-make-available-confirm",
					onClick: onConfirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.n8nChatPage.makeAvailable.confirm")), 1)]),
					_: 1
				}, 8, ["loading"])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.n8nChatPage.makeAvailable.description", { interpolate: { projectName: unref(projectName) ?? __props.agent.project.name } })), 1)]),
					_: 1
				}), createVNode(unref(N8nCallout_default), { theme: "info" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.n8nChatPage.makeAvailable.publishNotice")), 1)]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, ["title", "busy"]);
		};
	}
}), [["__cssModules", { "$style": { content: "_content_1oyzm_1" } }]]);
//#endregion
//#region src/features/agents/n8nChatPage/components/N8nChatAgentGrid.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var SKELETON_CARD_COUNT = 6;
var N8nChatAgentGrid_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "N8nChatAgentGrid",
	props: {
		agents: {},
		loading: {
			type: Boolean,
			default: false
		},
		source: {},
		includeAssistant: {
			type: Boolean,
			default: false
		}
	},
	emits: ["agent-made-available"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const agentToMakeAvailable = ref(null);
		function onAvailable() {
			agentToMakeAvailable.value = null;
			emit("agent-made-available");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.grid),
				"data-test-id": "n8n-chat-agent-grid"
			}, [__props.loading ? (openBlock(), createElementBlock(Fragment, { key: 0 }, renderList(SKELETON_CARD_COUNT, (i) => {
				return createVNode(SkeletonAgentCard_default, {
					key: i,
					"show-action-button": false,
					class: normalizeClass(_ctx.$style.skeletonCard)
				}, null, 8, ["class"]);
			}), 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [__props.includeAssistant ? (openBlock(), createBlock(N8nChatAgentCard_default, {
				key: 0,
				agent: null,
				source: __props.source
			}, null, 8, ["source"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(__props.agents, (agent) => {
				return openBlock(), createBlock(N8nChatAgentCard_default, {
					key: agent.id,
					agent,
					source: __props.source,
					onMakeAvailable: _cache[0] || (_cache[0] = ($event) => agentToMakeAvailable.value = $event)
				}, null, 8, ["agent", "source"]);
			}), 128))], 64)), agentToMakeAvailable.value ? (openBlock(), createBlock(N8nChatMakeAvailableModal_default, {
				key: 2,
				agent: agentToMakeAvailable.value,
				onClose: _cache[1] || (_cache[1] = ($event) => agentToMakeAvailable.value = null),
				onAvailable
			}, null, 8, ["agent"])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	grid: "_grid_hp5sa_113",
	skeletonCard: "_skeletonCard_hp5sa_124"
} }]]);
//#endregion
export { N8nChatMakeAvailableModal_default as n, useN8nChatAgents as r, N8nChatAgentGrid_default as t };
