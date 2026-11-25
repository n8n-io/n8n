import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Ho as RouterLink, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, cd as refDebounced, ff as openBlock, ip as init_shared_esm_bundler, pf as provide, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $r as firstMessageTitle, Do as getN8nChatAgent, Kr as useAgentPermissions, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bC as useRootStore, bN as N8nSpinner_default, dC as useToast, eC as DEBOUNCE_TIME, ih as AGENT_N8N_CHAT_VIEW, jN as useI18n, kh as AGENT_BUILDER_VIEW, xM as N8nEmptyState_default, xN as N8nIcon_default, yN as N8nButton_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
import { s as useAgentN8nChatThreadsStore, t as agentThreadActions } from "./mergeRecentChats-BLSTj3Bo.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { t as useAgentProjectBreadcrumb } from "./useAgentProjectBreadcrumb-VTuNETiM.js";
import { d as isNotFoundError, t as AgentChatPanel_default } from "./AgentChatPanel-D1FZE16O.js";
import { n as ChatHistoryDropdown_default, t as ChatHistoryDropdownTrigger_default } from "./ChatHistoryDropdownTrigger-DTXXSxT4.js";
import { c as AGENT_SUB_AGENT_NAMES_KEY } from "./ToolApprovalCard-Dt5UQ-1j.js";
import { t as N8nChatPageLayout_default } from "./N8nChatPageLayout-BraQthtK.js";
import { t as usePagedN8nChatThreads } from "./usePagedN8nChatThreads-BdHm-oHe.js";
import { t as consumePendingN8nChatMessage } from "./pendingN8nChatMessage-Cs6wj4ce.js";
//#region src/features/agents/n8nChatPage/components/N8nChatThreadHistory.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var NEW_CHAT_ITEM_ID = "__new-chat__";
var N8nChatThreadHistory_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "N8nChatThreadHistory",
	props: {
		agentId: {},
		title: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const threadsStore = useAgentN8nChatThreadsStore();
		const open = ref(false);
		const currentThreadId = computed(() => typeof route.params.agentThreadId === "string" ? route.params.agentThreadId : void 0);
		const threadActions = agentThreadActions(i18n);
		const search = ref("");
		const debouncedSearch = refDebounced(search, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		const paged = usePagedN8nChatThreads({
			agentId: () => props.agentId,
			search: () => debouncedSearch.value.trim() || void 0,
			pageSize: 30
		});
		async function handleDeleteThread(thread) {
			if (!await threadsStore.deleteThread(thread)) return;
			if (thread.id !== currentThreadId.value) return;
			router.push({
				name: AGENT_N8N_CHAT_VIEW,
				params: { agentId: props.agentId }
			});
		}
		function handleAction(action, itemId) {
			if (action !== "delete") return;
			const thread = paged.items.value.find((t) => t.id === itemId);
			if (thread) handleDeleteThread(thread);
		}
		function handleOpenChange(isOpen) {
			open.value = isOpen;
			if (isOpen) {
				paged.reset();
				paged.loadNext();
			}
		}
		function handleSelect(itemId) {
			if (itemId === NEW_CHAT_ITEM_ID) {
				router.push({
					name: AGENT_N8N_CHAT_VIEW,
					params: { agentId: props.agentId }
				});
				return;
			}
			router.push({
				name: AGENT_N8N_CHAT_VIEW,
				params: {
					agentId: props.agentId,
					agentThreadId: itemId
				}
			});
		}
		function loadMore() {
			paged.loadNext();
		}
		const newChatItem = {
			id: NEW_CHAT_ITEM_ID,
			label: i18n.baseText("instanceAi.thread.new"),
			testId: "agent-n8n-chat-history-new"
		};
		const items = computed(() => paged.items.value.map((thread) => ({
			id: thread.id,
			label: thread.title ?? i18n.baseText("commandBar.instanceAi.newThread"),
			checked: thread.id === currentThreadId.value,
			testId: "agent-n8n-chat-history-item",
			data: {
				updatedAt: thread.updatedAt,
				actions: threadActions
			}
		})));
		function handleSearch(query) {
			search.value = query;
		}
		const showLoadingState = computed(() => paged.isLoading.value && paged.items.value.length === 0);
		const emptyText = computed(() => paged.error.value ? "" : i18n.baseText("instanceAi.sidebar.noThreads"));
		const showRetry = computed(() => paged.error.value);
		const showLoadMore = computed(() => !paged.error.value && paged.hasMore.value && !paged.isLoading.value && paged.items.value.length > 0);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ChatHistoryDropdown_default, {
				"model-value": open.value,
				items: items.value,
				"leading-item": newChatItem,
				loading: showLoadingState.value,
				"empty-text": emptyText.value,
				"search-placeholder": unref(i18n).baseText("generic.search"),
				"content-test-id": "agent-n8n-chat-history-list",
				"action-button-label": unref(i18n).baseText("agentSessions.actions"),
				"onUpdate:modelValue": handleOpenChange,
				onSearch: handleSearch,
				onSelect: handleSelect,
				onAction: handleAction
			}, {
				trigger: withCtx(() => [createVNode(ChatHistoryDropdownTrigger_default, {
					title: props.title,
					"data-test-id": "agent-n8n-chat-history-toggle"
				}, null, 8, ["title"])]),
				footer: withCtx(() => [showRetry.value || showLoadMore.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.footer)
				}, [showRetry.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.loadError")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "xsmall",
					"data-test-id": "agent-n8n-chat-history-retry",
					onClick: loadMore
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				})], 64)) : (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "ghost",
					size: "xsmall",
					"data-test-id": "agent-n8n-chat-history-load-more",
					onClick: loadMore
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentSessions.loadMore")), 1)]),
					_: 1
				}))], 2)) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"model-value",
				"items",
				"loading",
				"empty-text",
				"search-placeholder",
				"action-button-label"
			]);
		};
	}
}), [["__cssModules", { "$style": { footer: "_footer_1ovga_1" } }]]);
//#endregion
//#region src/features/agents/n8nChatPage/AgentN8nChatView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentN8nChatView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentN8nChatView",
	props: {
		agentId: {},
		agentThreadId: {}
	},
	setup(__props) {
		const props = __props;
		const router = useRouter();
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const threadsStore = useAgentN8nChatThreadsStore();
		const agent = ref(null);
		const isLoading = ref(true);
		const notFound = ref(false);
		const loadFailed = ref(false);
		let loadVersion = 0;
		onScopeDispose(() => loadVersion++);
		async function loadAgent(id) {
			const version = ++loadVersion;
			isLoading.value = true;
			notFound.value = false;
			loadFailed.value = false;
			try {
				const result = await getN8nChatAgent(rootStore.restApiContext, id);
				if (version !== loadVersion) return;
				agent.value = result;
			} catch (error) {
				if (version !== loadVersion) return;
				agent.value = null;
				if (isNotFoundError(error)) notFound.value = true;
				else {
					loadFailed.value = true;
					toast.showError(error, i18n.baseText("agents.n8nChatPage.loadError"));
				}
			} finally {
				if (version === loadVersion) isLoading.value = false;
			}
		}
		function retryLoad() {
			loadAgent(props.agentId);
		}
		const mintedSessionId = ref();
		const continueSessionId = computed(() => props.agentThreadId || mintedSessionId.value);
		const isNewSession = computed(() => !props.agentThreadId);
		const panel = useTemplateRef("panel");
		let pendingMessage;
		watch(() => props.agentId, async (id) => {
			if (!id) return;
			pendingMessage = consumePendingN8nChatMessage(id);
			await loadAgent(id);
		}, { immediate: true });
		watch(() => [props.agentId, props.agentThreadId], ([, threadId]) => {
			mintedSessionId.value = threadId ? void 0 : crypto.randomUUID();
		}, { immediate: true });
		watch(panel, (current) => {
			if (!current || !pendingMessage || props.agentThreadId) return;
			current.sendMessageFromOutside(pendingMessage.text, pendingMessage.files);
			pendingMessage = void 0;
		});
		const firstUserMessage = ref();
		const threadTitle = computed(() => {
			if (!props.agentThreadId) return void 0;
			const thread = threadsStore.threadsById.get(props.agentThreadId);
			if (thread?.title) return thread.title;
			if (firstUserMessage.value?.trim()) return firstMessageTitle(firstUserMessage.value);
			return thread ? i18n.baseText("commandBar.instanceAi.newThread") : void 0;
		});
		watch(() => [props.agentId, props.agentThreadId], ([, threadId]) => {
			if (!threadId) return;
			if (threadsStore.threadsById.has(threadId)) return;
			threadsStore.loadThread(threadId);
		}, { immediate: true });
		function onSessionCreated(sessionId) {
			router.replace({
				name: AGENT_N8N_CHAT_VIEW,
				params: {
					agentId: props.agentId,
					agentThreadId: sessionId
				}
			});
		}
		let wasStreaming = false;
		function onStreamingChange(streaming) {
			if (wasStreaming && !streaming) threadsStore.fetchRecent(10);
			wasStreaming = streaming;
		}
		const projectId = computed(() => agent.value?.project.id ?? "");
		const subAgentNameById = computed(() => {
			const map = /* @__PURE__ */ new Map();
			for (const subAgent of agent.value?.subAgents ?? []) map.set(subAgent.id, subAgent.name);
			return map;
		});
		provide(AGENT_SUB_AGENT_NAMES_KEY, subAgentNameById);
		const agentConfig = computed(() => {
			const current = agent.value;
			if (!current) return null;
			return {
				name: current.name,
				model: "",
				instructions: "",
				...current.description !== void 0 ? { description: current.description } : {},
				...current.personalisation ? { personalisation: current.personalisation } : {}
			};
		});
		const { projectName, projectIcon } = useAgentProjectBreadcrumb(projectId);
		const projectLabel = computed(() => projectName.value ?? agent.value?.project.name ?? "");
		const { canRead } = useAgentPermissions(projectId);
		const canOpenAgentPage = computed(() => agent.value !== null && canRead.value);
		const agentPageRoute = computed(() => {
			const current = agent.value;
			if (!current) return void 0;
			return {
				name: AGENT_BUILDER_VIEW,
				params: {
					projectId: current.project.id,
					agentId: current.id
				}
			};
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(N8nChatPageLayout_default, { fill: "" }, createSlots({
				default: withCtx(() => [isLoading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.centered),
					"data-testid": "agent-n8n-chat-loading"
				}, [createVNode(unref(N8nSpinner_default), { size: "xlarge" })], 2)) : notFound.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.centered),
					"data-testid": "agent-n8n-chat-unavailable",
					icon: {
						type: "icon",
						value: "circle-alert"
					},
					heading: unref(i18n).baseText("agents.n8nChatPage.unavailable.title")
				}, null, 8, ["class", "heading"])) : loadFailed.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
					key: 2,
					class: normalizeClass(_ctx.$style.centered),
					"data-testid": "agent-n8n-chat-load-error",
					icon: {
						type: "icon",
						value: "circle-alert"
					},
					heading: unref(i18n).baseText("agents.n8nChatPage.loadFailed.title"),
					"button-text": unref(i18n).baseText("generic.retry"),
					"onClick:button": retryLoad
				}, null, 8, [
					"class",
					"heading",
					"button-text"
				])) : agent.value ? (openBlock(), createBlock(AgentChatPanel_default, {
					key: 3,
					ref_key: "panel",
					ref: panel,
					"project-id": projectId.value,
					"agent-id": __props.agentId,
					mode: "inline",
					"continue-session-id": continueSessionId.value,
					"new-session": isNewSession.value,
					"agent-config": agentConfig.value,
					"attachment-capabilities": agent.value.attachments,
					"agent-status": "production",
					"connected-triggers": [],
					channel: "n8n-chat",
					"background-jobs-active": true,
					"center-empty-state": "",
					onSessionCreated,
					"onUpdate:streaming": onStreamingChange,
					onFirstUserMessage: _cache[0] || (_cache[0] = ($event) => firstUserMessage.value = $event),
					onAgentUnavailable: _cache[1] || (_cache[1] = ($event) => notFound.value = true)
				}, {
					"empty-state": withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.emptyState),
						"data-testid": "agent-n8n-chat-empty-state"
					}, [
						createVNode(AgentPersonalisationIcon_default, {
							personalisation: agent.value.personalisation,
							size: 64
						}, null, 8, ["personalisation"]),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.nameRow) }, [createVNode(unref(N8nText_default), {
							tag: "h2",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(agent.value.name), 1)]),
							_: 1
						}), canOpenAgentPage.value && agentPageRoute.value ? (openBlock(), createBlock(unref(RouterLink), {
							key: 0,
							to: agentPageRoute.value,
							"aria-label": unref(i18n).baseText("agents.n8nChatPage.openAgentPage"),
							class: normalizeClass(_ctx.$style.openAgentPage),
							"data-testid": "agent-n8n-chat-open-page"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "external-link",
								size: "small"
							})]),
							_: 1
						}, 8, [
							"to",
							"aria-label",
							"class"
						])) : createCommentVNode("", true)], 2),
						agent.value.description ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							color: "text-light",
							"data-testid": "agent-n8n-chat-description"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(agent.value.description), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 2)]),
					"input-footer": withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.projectFooter),
						"data-testid": "agent-n8n-chat-project"
					}, [createVNode(ProjectIcon_default, {
						icon: unref(projectIcon),
						"border-less": "",
						size: "mini",
						"aria-hidden": "true"
					}, null, 8, ["icon"]), createTextVNode(" " + toDisplayString(projectLabel.value), 1)], 2)]),
					_: 1
				}, 8, [
					"project-id",
					"agent-id",
					"continue-session-id",
					"new-session",
					"agent-config",
					"attachment-capabilities"
				])) : createCommentVNode("", true)]),
				_: 2
			}, [agent.value ? {
				name: "leading",
				fn: withCtx(() => [createVNode(N8nChatThreadHistory_default, {
					"agent-id": __props.agentId,
					title: threadTitle.value
				}, null, 8, ["agent-id", "title"])]),
				key: "0"
			} : void 0]), 1024);
		};
	}
}), [["__cssModules", { "$style": {
	centered: "_centered_1kqle_1",
	emptyState: "_emptyState_1kqle_9",
	nameRow: "_nameRow_1kqle_19",
	openAgentPage: "_openAgentPage_1kqle_25",
	projectFooter: "_projectFooter_1kqle_33"
} }]]);
//#endregion
export { AgentN8nChatView_default as default };
