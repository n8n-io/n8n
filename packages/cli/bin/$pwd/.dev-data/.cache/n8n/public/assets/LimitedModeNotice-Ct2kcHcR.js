import { $d as init_runtime_core_esm_bundler, Ad as vModelText, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Hf as shallowReactive, Ho as RouterLink, If as isRef, Iu as useEventListener, Jd as defineComponent, Jf as toValue, Kd as createVNode, Ld as Teleport, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Pu as useElementSize, Rd as computed, Rf as onScopeDispose, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Wf as shallowRef, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, bf as useId, ef as inject, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, pd as useDebounceFn, rf as mergeProps, uf as onUnmounted, vf as resolveDynamicComponent, xu as onClickOutside, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Ac as INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY, Ai as useInstanceAiSettingsStore, Ec as INSTANCE_AI_SETTINGS_VIEW, Fc as isNodeChipRemovalKey, Hb as STICKY_NODE_TYPE, Hx as LOCAL_STORAGE_INSTANCE_AI_LIMITED_MODE_DISMISSED, Jg as useUIStore, Jr as useInstanceAiStore, LM as N8nCallout_default, ME as base64EncodedSize, Nj as N8nPopover_default, Oc as INSTANCE_AI_THREADS_VIEW, Oi as EMPTY_ASSISTANT_MENTION_COUNTS, Qr as mergeNodeSets, Rt as resolveAuthorship, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, Sy as redactTelemetryText, Wp as useWorkflowsListStore, Xd as createWorkflowDocumentId, Yr as useThread, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, bN as N8nSpinner_default, bm as useSourceControlStore, bs as isContextSkillsEnabled, bt as clearPendingThreadHandoff, ci as instanceAiResponseNow, dC as useToast, dN as Attachment_default, eC as DEBOUNCE_TIME, fC as VIEWS, fN as N8nTooltip_default, gS as WorkflowIdKey, gs as canWriteInstanceSkillScope, hC as useTelemetry, ha as convertFileToBinaryData, hu as NodeIcon_default, jN as useI18n, jc as INSTANCE_AI_VIEW, kc as INSTANCE_AI_THREAD_VIEW, nf as useWorkflowDocumentStore, o as useAssistantAgentThreadsStore, on as CreditsSettingsDropdown_default, oy as getWorkflow, ps as useRecentWorkflowsStore, qj as N8nNodeIcon_default, sr as useCalloutHelpers, tf as useExistingWorkflowDocumentStore, uN as AttachmentGroup_default, uf as useNodeTypesStore, vN as N8nIconButton_default, vm as useProjectsStore, vs as canWriteProjectSkillScope, wy as TELEMETRY_EVENT, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yy as getDebounceTime, zc as useAgentsN8nChatFlag } from "./app-D5flEmb-.js";
import { n as chatItemRoute, o as mergeRecentChats, r as chatItemTitle, s as useAgentN8nChatThreadsStore, t as agentThreadActions } from "./mergeRecentChats-BLSTj3Bo.js";
import { t as RecentChatIcon_default } from "./RecentChatIcon-BbCwK2R8.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { t as iconForMcpRegistryServer } from "./mcpRegistryIcon-BDkbIdlc.js";
import { a as AssistantMentionBreadcrumbs_default, i as InstanceAiResourceChip_default, n as ChatHistoryDropdown_default, o as useAttachmentPreviews, r as EXTENDED_PROMPT_MAX_LENGTH, s as ChatInputBase_default, t as ChatHistoryDropdownTrigger_default } from "./ChatHistoryDropdownTrigger-DTXXSxT4.js";
import { t as useAssistantCreditsStore } from "./assistantCredits.store-C3Z2lAHs.js";
import { t as useMergedChatHistory } from "./useMergedChatHistory-DvubheEu.js";
import { t as useInstanceAiMcpStore } from "./instanceAiMcp.store-DclLlpUY.js";
import { n as useInstanceAiMcpTelemetry, t as useMcpServerConnect } from "./useMcpServerConnect-D4-BWFpf.js";
import { t as useAssistantSkillsExperiment } from "./useAssistantSkillsExperiment-BQ2ngIhp.js";
import { v as getSkills } from "./skills.api-DItBsz5w.js";
import { t as useBrowserUseConnection } from "./useBrowserUseConnection-DnUBZV8R.js";
//#region src/features/ai/instanceAi/components/InstanceAiThreadList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$4 = ["role"];
var _hoisted_2$3 = ["aria-label", "onBlur"];
var AGENT_ITEM_ID_PREFIX = "agent:";
var ASSISTANT_AGENT_ITEM_ID_PREFIX = "assistant-agent:";
var InstanceAiThreadList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiThreadList",
	props: {
		maxHeight: { default: void 0 },
		filter: {
			type: Function,
			default: void 0
		},
		navigate: {
			type: Boolean,
			default: true
		},
		activeThreadId: { default: void 0 },
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"close",
		"select",
		"deleted"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const store = useInstanceAiStore();
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const toast = useToast();
		const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
		const isScoped = computed(() => Boolean(props.filter) || !props.navigate);
		const agentThreadsStore = useAgentN8nChatThreadsStore();
		const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
		const instanceAiSettingsStore = useInstanceAiSettingsStore();
		const showChatIcons = computed(() => isAgentsN8nChatFlag.value && !isScoped.value);
		const activeThreadId = computed(() => props.activeThreadId ?? (typeof route.params.threadId === "string" ? route.params.threadId : void 0));
		const isRecentOnly = computed(() => showChatIcons.value && !store.threadHistory.search);
		const searchesAgentThreads = computed(() => showChatIcons.value && !isRecentOnly.value && activeThreadId.value === void 0);
		const includesAssistantAgentThreads = computed(() => instanceAiSettingsStore.isAssistantAgentEnabled && !isScoped.value);
		const pagesAssistantAgentThreads = computed(() => includesAssistantAgentThreads.value && !isRecentOnly.value);
		const usesMergedHistory = computed(() => searchesAgentThreads.value || pagesAssistantAgentThreads.value);
		const { history, search, sentinelRef, items: mergedItems, hasMore: mergedHasMore, isLoading: mergedIsLoading, error: mergedError, loadMore } = useMergedChatHistory({
			enabled: () => searchesAgentThreads.value,
			assistantAgentEnabled: () => pagesAssistantAgentThreads.value
		});
		const menuOpen = ref(false);
		const menuContentId = useId();
		const historyDropdownRef = ref(null);
		const editingThreadId = ref(null);
		const editingTitle = ref("");
		const renameInput = ref(null);
		const threadActions = [{
			id: "rename",
			label: i18n.baseText("instanceAi.sidebar.renameThread"),
			icon: "pencil"
		}, {
			id: "delete",
			label: i18n.baseText("instanceAi.sidebar.deleteThread"),
			icon: "trash-2"
		}];
		const agentActions = agentThreadActions(i18n);
		function itemRowId(item) {
			if (item.kind === "assistant") return item.thread.id;
			return `${item.kind === "agent" ? AGENT_ITEM_ID_PREFIX : ASSISTANT_AGENT_ITEM_ID_PREFIX}${item.thread.id}`;
		}
		function isPrefixedRowId(itemId) {
			return itemId.startsWith(AGENT_ITEM_ID_PREFIX) || itemId.startsWith(ASSISTANT_AGENT_ITEM_ID_PREFIX);
		}
		const scopedItems = computed(() => {
			if (isRecentOnly.value) return mergeRecentChats(history.value.threads, agentThreadsStore.knownThreads, {
				limit: 5,
				openThreadId: activeThreadId.value,
				assistantAgentThreads: includesAssistantAgentThreads.value ? assistantAgentThreadsStore.knownThreads : []
			});
			if (usesMergedHistory.value) return mergedItems.value;
			const filter = props.filter;
			if (!filter) return history.value.threads.map((thread) => ({
				kind: "assistant",
				thread
			}));
			const searchTerm = history.value.search.trim().toLowerCase();
			const agentThreads = instanceAiSettingsStore.isAssistantAgentEnabled ? assistantAgentThreadsStore.knownThreads.filter((thread) => filter(thread) && (thread.title ?? "").toLowerCase().includes(searchTerm)) : [];
			return [...history.value.threads.filter(filter).map((thread) => ({
				kind: "assistant",
				thread
			})), ...agentThreads.map((thread) => ({
				kind: "assistant-agent",
				thread
			}))].sort((a, b) => Date.parse(b.thread.updatedAt) - Date.parse(a.thread.updatedAt));
		});
		const hasMore = computed(() => {
			if (isRecentOnly.value) return false;
			if (usesMergedHistory.value) return mergedHasMore.value;
			return history.value.hasMore;
		});
		const isLoading = computed(() => usesMergedHistory.value ? mergedIsLoading.value : history.value.loading);
		const error = computed(() => usesMergedHistory.value ? mergedError.value : history.value.error);
		const menuItems = computed(() => scopedItems.value.map((item) => {
			if (item.kind === "assistant") return {
				id: item.thread.id,
				label: item.thread.title,
				disabled: props.disabled,
				testId: "instance-ai-thread-item",
				data: {
					updatedAt: item.thread.updatedAt ?? item.thread.createdAt,
					actions: threadActions
				}
			};
			return {
				id: itemRowId(item),
				label: chatItemTitle(item, i18n),
				disabled: props.disabled,
				testId: item.kind === "agent" ? "instance-ai-agent-thread-item" : "instance-ai-assistant-agent-thread-item",
				data: {
					updatedAt: item.thread.updatedAt,
					actions: item.kind === "agent" ? agentActions : threadActions
				}
			};
		}));
		const itemsById = computed(() => new Map(scopedItems.value.map((item) => [itemRowId(item), item])));
		const lastVisibleItemId = computed(() => {
			const last = scopedItems.value.at(-1);
			return last ? itemRowId(last) : void 0;
		});
		let restoreTriggerFocus = false;
		watch([() => scopedItems.value.length, () => history.value.search], ([threadCount, searchTerm], [previousThreadCount]) => {
			if (!searchTerm || previousThreadCount !== 0 || threadCount === 0) return;
			nextTick(() => historyDropdownRef.value?.highlightFirstItem());
		});
		function handleMenuOpenChange(open) {
			menuOpen.value = open;
			if (open) {
				restoreTriggerFocus = false;
				if (showChatIcons.value) agentThreadsStore.fetchRecent(10);
				if (includesAssistantAgentThreads.value) assistantAgentThreadsStore.fetchRecent();
				return;
			}
			if (!restoreTriggerFocus) return;
			restoreTriggerFocus = false;
			nextTick(() => historyDropdownRef.value?.focusTrigger());
		}
		function closeMenu() {
			restoreTriggerFocus = true;
			handleMenuOpenChange(false);
		}
		useEventListener(document, "keydown", (event) => {
			if (!menuOpen.value || !(event.target instanceof HTMLElement)) return;
			const menu = event.target.closest("[data-menu-content]");
			if (menu?.id !== menuContentId) return;
			if (event.target === renameInput.value && (event.key === "Enter" || event.key === "Escape")) {
				event.preventDefault();
				event.stopPropagation();
				const threadId = editingThreadId.value;
				if (event.key === "Enter" && threadId) confirmRename(threadId);
				else cancelRename();
				nextTick(() => menu.querySelector("input[type=\"text\"]")?.focus());
				return;
			}
			if (event.key === "Escape") restoreTriggerFocus = true;
		}, { capture: true });
		async function handleDeleteThread(threadId) {
			const wasActive = threadId === activeThreadId.value;
			if (!await store.deleteThread(threadId)) return;
			clearPendingThreadHandoff(threadId);
			if (!wasActive) return;
			if (!props.navigate) {
				emit("deleted", true);
				return;
			}
			if (store.threads.length > 0) router.push({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: store.threads[0].id }
			});
			else router.push({ name: INSTANCE_AI_VIEW });
		}
		function openAllThreads() {
			closeMenu();
			emit("close");
			router.push({ name: INSTANCE_AI_THREADS_VIEW });
		}
		function setRenameInput(element) {
			renameInput.value = element instanceof HTMLInputElement ? element : null;
		}
		/**
		* The current title of a row the user can rename, and how to rename it. n8n Chat agent
		* threads have no rename.
		*/
		function renameTarget(itemId) {
			if (!isPrefixedRowId(itemId)) {
				const thread = history.value.threads.find((t) => t.id === itemId);
				if (!thread) return void 0;
				return {
					title: thread.title,
					rename: async (title) => await store.renameThread(itemId, title)
				};
			}
			const item = itemsById.value.get(itemId);
			if (item?.kind !== "assistant-agent") return void 0;
			return {
				title: item.thread.title ?? "",
				rename: async (title) => await assistantAgentThreadsStore.renameThread(item.thread.id, title)
			};
		}
		function startRename(itemId) {
			if (props.disabled) return;
			const target = renameTarget(itemId);
			if (!target) return;
			editingThreadId.value = itemId;
			editingTitle.value = target.title;
			nextTick(() => {
				renameInput.value?.focus();
				renameInput.value?.select();
			});
		}
		async function confirmRename(itemId) {
			if (editingThreadId.value !== itemId) return;
			editingThreadId.value = null;
			const title = editingTitle.value.trim();
			const target = renameTarget(itemId);
			if (!title || !target || title === target.title) return;
			try {
				await target.rename(title);
				toast.showMessage({
					type: "success",
					title: i18n.baseText("instanceAi.threads.renameSuccess")
				});
			} catch (renameError) {
				toast.showError(renameError, i18n.baseText("instanceAi.threads.renameError"));
			}
		}
		function cancelRename() {
			editingThreadId.value = null;
		}
		function handleThreadSelect(threadId) {
			if (props.disabled) return;
			restoreTriggerFocus = true;
			emit("select", threadId);
			if (props.navigate) router.push({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId }
			});
		}
		function handleMenuSelect(itemId) {
			if (props.disabled) return;
			if (!isPrefixedRowId(itemId)) {
				handleThreadSelect(itemId);
				return;
			}
			const item = itemsById.value.get(itemId);
			if (!item || item.kind === "assistant") return;
			restoreTriggerFocus = true;
			if (item.kind === "assistant-agent" && !props.navigate) {
				emit("select", item.thread.id);
				return;
			}
			router.push(chatItemRoute(item));
		}
		async function handleDeleteAssistantAgentThread(thread) {
			if (!await assistantAgentThreadsStore.deleteThread(thread) || thread.id !== activeThreadId.value) return;
			if (props.navigate) router.push({ name: INSTANCE_AI_VIEW });
			else emit("deleted", true);
		}
		function handleThreadAction(action, itemId) {
			if (props.disabled) return;
			if (action === "rename") {
				requestAnimationFrame(() => startRename(itemId));
				return;
			}
			if (action !== "delete") return;
			if (isPrefixedRowId(itemId)) {
				const item = itemsById.value.get(itemId);
				if (item?.kind === "agent") agentThreadsStore.deleteThread(item.thread);
				if (item?.kind === "assistant-agent") handleDeleteAssistantAgentThread(item.thread);
				return;
			}
			handleDeleteThread(itemId);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ChatHistoryDropdown_default, {
				ref_key: "historyDropdownRef",
				ref: historyDropdownRef,
				"model-value": menuOpen.value,
				items: menuItems.value,
				loading: isLoading.value && scopedItems.value.length === 0,
				"max-height": props.maxHeight,
				"search-placeholder": unref(i18n).baseText("instanceAi.threads.searchPlaceholder"),
				"action-button-label": unref(i18n).baseText("instanceAi.threads.actions"),
				"editing-item-id": editingThreadId.value ?? void 0,
				"actions-disabled": __props.disabled,
				"item-double-click-enabled": "",
				"content-id": unref(menuContentId),
				"content-test-id": "instance-ai-thread-list",
				onSearch: _cache[1] || (_cache[1] = ($event) => search.value = $event),
				onSelect: handleMenuSelect,
				onAction: handleThreadAction,
				onItemDblclick: startRename,
				"onUpdate:modelValue": handleMenuOpenChange
			}, createSlots({
				loading: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.status),
					role: "status"
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.loading")), 1)]),
					_: 1
				})], 2)]),
				empty: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.empty),
					role: error.value ? "alert" : "status",
					"data-test-id": "instance-ai-thread-list-empty"
				}, [error.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.loadError")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "xsmall",
					onClick: unref(loadMore)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				}, 8, ["onClick"])], 64)) : hasMore.value && !isLoading.value && !error.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					ref_key: "sentinelRef",
					ref: sentinelRef,
					class: normalizeClass(_ctx.$style.sentinel),
					"data-test-id": "instance-ai-thread-sentinel"
				}, null, 2)) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(unref(history).search ? "instanceAi.threads.noSearchResults" : "instanceAi.sidebar.noThreads")), 1)]),
					_: 1
				}))], 10, _hoisted_1$4)]),
				"item-edit": withCtx(({ item, ui }) => [createBaseVNode("div", { class: normalizeClass([_ctx.$style.renameContainer, ui.class]) }, [withDirectives(createBaseVNode("input", {
					ref: setRenameInput,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => editingTitle.value = $event),
					class: normalizeClass(_ctx.$style.renameInput),
					type: "text",
					maxlength: "255",
					"aria-label": unref(i18n).baseText("instanceAi.threads.rename"),
					onBlur: ($event) => confirmRename(item.id)
				}, null, 42, _hoisted_2$3), [[vModelText, editingTitle.value]])], 2)]),
				"item-trailing": withCtx(({ item }) => [item.id === lastVisibleItemId.value && hasMore.value && !isLoading.value && !error.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					ref_key: "sentinelRef",
					ref: sentinelRef,
					class: normalizeClass(_ctx.$style.sentinel),
					"data-test-id": "instance-ai-thread-sentinel"
				}, null, 2)) : createCommentVNode("", true)]),
				footer: withCtx(() => [scopedItems.value.length > 0 && (isLoading.value || error.value || __props.navigate) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.footer)
				}, [scopedItems.value.length > 0 && isLoading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.status),
					role: "status"
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.loading")), 1)]),
					_: 1
				})], 2)) : scopedItems.value.length > 0 && error.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.status),
					role: "alert"
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.loadError")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "xsmall",
					onClick: unref(loadMore)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				}, 8, ["onClick"])], 2)) : createCommentVNode("", true), __props.navigate ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					variant: "ghost",
					icon: "list",
					"data-test-id": "instance-ai-view-all-threads",
					class: normalizeClass(_ctx.$style.viewAll),
					onClick: openAllThreads
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.viewAll")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]),
				_: 2
			}, [_ctx.$slots.trigger ? {
				name: "trigger",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "trigger")]),
				key: "0"
			} : void 0, showChatIcons.value ? {
				name: "item-leading",
				fn: withCtx(({ item, ui }) => [createVNode(RecentChatIcon_default, {
					class: normalizeClass(ui.class),
					item: itemsById.value.get(item.id)
				}, null, 8, ["class", "item"])]),
				key: "1"
			} : void 0]), 1032, [
				"model-value",
				"items",
				"loading",
				"max-height",
				"search-placeholder",
				"action-button-label",
				"editing-item-id",
				"actions-disabled",
				"content-id"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	renameContainer: "_renameContainer_mgzdu_1",
	renameInput: "_renameInput_mgzdu_5",
	status: "_status_mgzdu_19",
	empty: "_empty_mgzdu_20",
	sentinel: "_sentinel_mgzdu_33",
	footer: "_footer_mgzdu_37",
	viewAll: "_viewAll_mgzdu_49"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiViewHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var InstanceAiViewHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiViewHeader",
	props: {
		title: { default: void 0 },
		threadId: { default: void 0 },
		threadCreditsUsed: { default: void 0 },
		threadList: { default: void 0 }
	},
	emits: ["select", "deleted"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const creditsStore = useAssistantCreditsStore();
		const sourceControlStore = useSourceControlStore();
		const i18n = useI18n();
		const { goToUpgrade } = usePageRedirectionHelper();
		const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);
		function handleThreadSelect(threadId) {
			emit("select", threadId);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.threadHistory) }, [createVNode(InstanceAiThreadList_default, {
					"max-height": "calc(var(--spacing--5xl) + var(--spacing--4xl) + var(--spacing--3xl))",
					filter: __props.threadList?.filter,
					navigate: __props.threadList?.navigate,
					disabled: __props.threadList?.disabled,
					"active-thread-id": __props.threadId,
					onSelect: handleThreadSelect,
					onDeleted: _cache[0] || (_cache[0] = ($event) => emit("deleted", $event))
				}, {
					trigger: withCtx(() => [createVNode(ChatHistoryDropdownTrigger_default, {
						title: props.title,
						"data-test-id": "instance-ai-sidebar-toggle"
					}, null, 8, ["title"])]),
					_: 1
				}, 8, [
					"filter",
					"navigate",
					"disabled",
					"active-thread-id"
				])], 2),
				renderSlot(_ctx.$slots, "status"),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerActions) }, [unref(creditsStore).creditsRemaining !== void 0 ? (openBlock(), createBlock(CreditsSettingsDropdown_default, {
					key: 0,
					"credits-remaining": unref(creditsStore).creditsRemaining,
					"credits-quota": unref(creditsStore).creditsQuota,
					"credits-used": props.threadCreditsUsed,
					"is-low-credits": unref(creditsStore).isLowCredits,
					"button-size": "small",
					"icon-size": "large",
					onUpgradeClick: _cache[1] || (_cache[1] = ($event) => unref(goToUpgrade)("instance-ai", "upgrade-instance-ai"))
				}, null, 8, [
					"credits-remaining",
					"credits-quota",
					"credits-used",
					"is-low-credits"
				])) : createCommentVNode("", true), renderSlot(_ctx.$slots, "actions")], 2)
			], 2), isReadOnlyEnvironment.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "warning",
				icon: "lock",
				class: normalizeClass(_ctx.$style.readOnlyBanner)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("readOnlyEnv.instanceAi.notice")), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true)], 64);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_c34fs_1",
	headerActions: "_headerActions_c34fs_10",
	threadHistory: "_threadHistory_c34fs_18",
	readOnlyBanner: "_readOnlyBanner_c34fs_22"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/cloudBrowserAgents.ts
/** True when the agent node is a cloud browser sub-agent. The chat does not show its steps. */
function isCloudBrowserAgent(node) {
	return node.kind === "cloud-browser";
}
/** A resource decision raised by the cloud browser agent. It gets its own floating card. */
function isCloudBrowserResourceDecision(item) {
	return item.toolCall.confirmation.inputType === "resource-decision" && isCloudBrowserAgent(item.agentNode);
}
//#endregion
//#region src/features/ai/instanceAi/composables/useCreditWarningBanner.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Shared credit-warning banner state used by every Instance AI view leaf.
* The banner becomes dismissible the moment credits drop below the warning
* threshold; subsequent push updates within the low-credits zone don't
* re-show a banner the user already dismissed.
*/
function useCreditWarningBanner(isLowCredits) {
	const dismissed = ref(false);
	watch(() => toValue(isLowCredits), (isLow, wasLow) => {
		if (isLow && !wasLow) dismissed.value = false;
	});
	const visible = computed(() => toValue(isLowCredits) && !dismissed.value);
	function dismiss() {
		dismissed.value = true;
	}
	return {
		visible,
		dismiss
	};
}
//#endregion
//#region src/features/ai/instanceAi/utils/elementAttachment.ts
var ELEMENT_LABEL_TEXT_LIMIT = 24;
function elementAttachmentLabel(element) {
	const text = element.text?.replace(/\s+/g, " ").trim();
	if (!text) return element.tagName;
	const shortText = text.length > ELEMENT_LABEL_TEXT_LIMIT ? `${text.slice(0, ELEMENT_LABEL_TEXT_LIMIT)}...` : text;
	return `${element.tagName}: "${shortText}"`;
}
//#endregion
//#region src/features/ai/instanceAi/components/NodeChip.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var NodeChip_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeChip",
	props: {
		label: {},
		breadcrumbs: {},
		nodeType: {},
		testid: {},
		icon: {},
		removable: { type: Boolean },
		expanded: { type: [Boolean, null] }
	},
	emits: [
		"remove",
		"toggle-expand",
		"enter-panel"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootRef = useTemplateRef("root");
		__expose({ focus: () => rootRef.value?.focus() });
		function handleKeydown(event) {
			const isExpandable = props.expanded !== null && props.expanded !== void 0;
			if (event.key === "Enter" && isExpandable) {
				event.preventDefault();
				event.stopPropagation();
				emit("toggle-expand");
				return;
			}
			if (event.key === "Escape" && props.expanded === true) {
				event.preventDefault();
				event.stopPropagation();
				emit("toggle-expand");
				return;
			}
			if (event.key === "ArrowDown" && isExpandable) {
				event.preventDefault();
				event.stopPropagation();
				emit("enter-panel");
				return;
			}
			if (isNodeChipRemovalKey(event.key) && props.removable) {
				event.preventDefault();
				event.stopPropagation();
				emit("remove");
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(InstanceAiResourceChip_default, {
				ref: "root",
				class: normalizeClass({ [_ctx.$style.expandable]: __props.expanded != null }),
				label: __props.label,
				breadcrumbs: __props.breadcrumbs,
				removable: __props.removable,
				"remove-label": unref(i18n).baseText("generic.delete"),
				"test-id": __props.testid,
				"remove-test-id": "nodes-chip-remove",
				tabindex: "0",
				role: "group",
				"aria-label": __props.label,
				onKeydown: handleKeydown,
				onClick: _cache[0] || (_cache[0] = ($event) => __props.expanded != null && emit("toggle-expand")),
				onRemove: _cache[1] || (_cache[1] = ($event) => emit("remove"))
			}, {
				icon: withCtx(() => [__props.icon ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					icon: __props.icon,
					size: "small"
				}, null, 8, ["icon"])) : __props.nodeType ? (openBlock(), createBlock(NodeIcon_default, {
					key: 1,
					"node-type": __props.nodeType,
					size: 12
				}, null, 8, ["node-type"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 2,
					icon: "crosshair",
					size: "small"
				}))]),
				_: 1
			}, 8, [
				"class",
				"label",
				"breadcrumbs",
				"removable",
				"remove-label",
				"test-id",
				"aria-label"
			]);
		};
	}
}), [["__cssModules", { "$style": { expandable: "_expandable_19t4f_1" } }]]);
//#endregion
//#region src/features/ai/instanceAi/components/NodesAttachmentChips.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$3 = ["onFocusout"];
var _hoisted_2$2 = ["onFocusout"];
var _hoisted_3$1 = ["aria-label", "onKeydown"];
var _hoisted_4 = ["aria-label", "onClick"];
var NODE_BUNDLE_THRESHOLD = 2;
var COLLAPSE_CHIP_THRESHOLD = 6;
var NodesAttachmentChips_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodesAttachmentChips",
	props: {
		attachment: {},
		isRemovable: { type: Boolean }
	},
	emits: ["update:attachment", "remove-all"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const injectedWorkflowId = inject(WorkflowIdKey, computed(() => ""));
		const workflowDocumentStore = computed(() => useWorkflowDocumentStore(createWorkflowDocumentId(props.attachment.workflowId || injectedWorkflowId.value || "unknown")));
		function resolveAttachedNode(node) {
			const store = workflowDocumentStore.value;
			const workflowNode = store.getNodeById(node.id) ?? (node.name ? store.getNodeByName(node.name) : void 0) ?? null;
			const nodeType = workflowNode ? nodeTypesStore.getNodeType(workflowNode.type, workflowNode.typeVersion) : null;
			return {
				id: node.id,
				name: node.name ?? workflowNode?.name ?? "",
				nodeType,
				workflowNode
			};
		}
		const workflowName = computed(() => props.attachment.workflowName || workflowDocumentStore.value.name || void 0);
		function toBreadcrumbs(label) {
			return workflowName.value ? [workflowName.value, label] : [label];
		}
		function bundleLabel(count) {
			return i18n.baseText("instanceAi.nodeContext.nodesBundle", { interpolate: { count } });
		}
		const chips = computed(() => {
			return props.attachment.sets.map((set, setIndex) => {
				if (set.canvasGroupId) {
					const label = set.canvasGroupName || bundleLabel(set.nodes.length);
					return {
						key: `set-${setIndex}`,
						testid: "nodes-chip-group",
						label,
						breadcrumbs: toBreadcrumbs(label),
						icon: "group",
						setIndex
					};
				}
				if (set.nodes.length >= NODE_BUNDLE_THRESHOLD) {
					const label = bundleLabel(set.nodes.length);
					return {
						key: `set-${setIndex}`,
						testid: "nodes-chip-bundle",
						label,
						breadcrumbs: toBreadcrumbs(label),
						icon: "layers",
						setIndex,
						panel: set.nodes.map((node) => resolveAttachedNode(node))
					};
				}
				const resolved = resolveAttachedNode(set.nodes[0]);
				return {
					key: `set-${setIndex}`,
					testid: "nodes-chip-node",
					label: resolved.name,
					breadcrumbs: toBreadcrumbs(resolved.name),
					nodeType: resolved.nodeType,
					setIndex
				};
			});
		});
		function removeSet(index) {
			const sets = props.attachment.sets.filter((_, i) => i !== index);
			if (expandedSetIndex.value !== null) {
				if (expandedSetIndex.value === index) expandedSetIndex.value = null;
				else if (expandedSetIndex.value > index) expandedSetIndex.value -= 1;
			}
			if (!sets.length) {
				emit("remove-all");
				return;
			}
			emit("update:attachment", {
				...props.attachment,
				sets
			});
		}
		function removeNode(setIndex, nodeIndex) {
			const nodes = props.attachment.sets[setIndex].nodes.filter((_, i) => i !== nodeIndex);
			if (!nodes.length) {
				removeSet(setIndex);
				return;
			}
			const sets = props.attachment.sets.map((s, i) => i === setIndex ? {
				...s,
				nodes,
				inputNode: void 0,
				outputNode: void 0
			} : s);
			emit("update:attachment", {
				...props.attachment,
				sets
			});
		}
		function removeChip(chip) {
			if (chip.nodeIndex !== void 0) removeNode(chip.setIndex, chip.nodeIndex);
			else removeSet(chip.setIndex);
		}
		function handlePanelRowKeydown(setIndex, nodeIndex, event) {
			if (isNodeChipRemovalKey(event.key)) {
				event.preventDefault();
				event.stopPropagation();
				removeNode(setIndex, nodeIndex);
				focusPanelRowAfterRemoval(nodeIndex);
				return;
			}
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				event.stopPropagation();
				const direction = event.key === "ArrowDown" ? 1 : -1;
				focusAdjacentPanelRow(event.currentTarget, direction);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closePanel();
			}
		}
		function focusAdjacentPanelRow(currentRow, direction) {
			const rows = Array.from(currentRow.parentElement?.children ?? []);
			rows[rows.indexOf(currentRow) + direction]?.focus();
		}
		async function focusPanelRowAfterRemoval(removedIndex) {
			await nextTick();
			const rows = Array.from(panelRef.value?.querySelectorAll("[role=\"option\"]") ?? []);
			if (!rows.length) return;
			rows[Math.min(removedIndex, rows.length - 1)]?.focus();
		}
		function closePanel() {
			expandedSetIndex.value = null;
			openChipRef.value?.focus();
		}
		function handlePanelFocusOut(setIndex) {
			if (expandedSetIndex.value !== setIndex) return;
			setTimeout(() => {
				if (expandedSetIndex.value !== setIndex) return;
				const active = document.activeElement;
				if (openChipAnchor.value?.contains(active) || panelRef.value?.contains(active)) return;
				expandedSetIndex.value = null;
			}, 0);
		}
		const expandedSetIndex = ref(null);
		const panelRef = ref(null);
		const chipAnchors = /* @__PURE__ */ new Map();
		const openChipAnchor = ref(null);
		const chipRefs = /* @__PURE__ */ new Map();
		const openChipRef = ref(null);
		const panelStyle = ref({});
		function setChipAnchor(setIndex, el) {
			if (el) chipAnchors.set(setIndex, el);
			else chipAnchors.delete(setIndex);
		}
		function setChipRef(setIndex, instance) {
			if (instance) chipRefs.set(setIndex, instance);
			else chipRefs.delete(setIndex);
		}
		function positionPanel(setIndex) {
			const anchor = chipAnchors.get(setIndex) ?? null;
			openChipAnchor.value = anchor;
			openChipRef.value = chipRefs.get(setIndex) ?? null;
			if (!anchor) return;
			const rect = anchor.getBoundingClientRect();
			const maxHeight = Math.max(0, window.innerHeight - rect.bottom - 12);
			panelStyle.value = {
				top: `${rect.bottom + 4}px`,
				left: `${rect.left}px`,
				maxHeight: `${maxHeight}px`
			};
		}
		function toggleExpanded(index) {
			if (expandedSetIndex.value === index) {
				expandedSetIndex.value = null;
				return;
			}
			positionPanel(index);
			expandedSetIndex.value = index;
		}
		async function enterPanel(setIndex) {
			positionPanel(setIndex);
			expandedSetIndex.value = setIndex;
			await nextTick();
			panelRef.value?.querySelector("[role=\"option\"]")?.focus();
		}
		const isCollapsed = ref(false);
		const showCollapseToggle = computed(() => chips.value.length > COLLAPSE_CHIP_THRESHOLD);
		const totalNodeCount = computed(() => props.attachment.sets.reduce((sum, set) => sum + set.nodes.length, 0));
		const collapsedLabel = computed(() => bundleLabel(totalNodeCount.value));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [isCollapsed.value ? (openBlock(), createBlock(NodeChip_default, {
				key: 0,
				testid: "nodes-chips-collapsed-summary",
				label: collapsedLabel.value,
				breadcrumbs: toBreadcrumbs(collapsedLabel.value),
				icon: "layers",
				removable: __props.isRemovable,
				expanded: null,
				onRemove: _cache[0] || (_cache[0] = ($event) => emit("remove-all"))
			}, null, 8, [
				"label",
				"breadcrumbs",
				"removable"
			])) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(chips.value, (chip) => {
				return openBlock(), createElementBlock("span", {
					key: chip.key,
					ref_for: true,
					ref: (el) => setChipAnchor(chip.setIndex, el),
					class: normalizeClass(_ctx.$style.chipAnchor),
					onFocusout: ($event) => handlePanelFocusOut(chip.setIndex)
				}, [createVNode(NodeChip_default, {
					ref_for: true,
					ref: (el) => setChipRef(chip.setIndex, el),
					label: chip.label,
					breadcrumbs: chip.breadcrumbs,
					testid: chip.testid,
					icon: chip.icon,
					"node-type": chip.nodeType,
					removable: __props.isRemovable,
					expanded: chip.panel ? expandedSetIndex.value === chip.setIndex : null,
					onRemove: ($event) => removeChip(chip),
					onToggleExpand: ($event) => toggleExpanded(chip.setIndex),
					onEnterPanel: ($event) => enterPanel(chip.setIndex)
				}, null, 8, [
					"label",
					"breadcrumbs",
					"testid",
					"icon",
					"node-type",
					"removable",
					"expanded",
					"onRemove",
					"onToggleExpand",
					"onEnterPanel"
				]), (openBlock(), createBlock(Teleport, { to: "body" }, [chip.panel && expandedSetIndex.value === chip.setIndex ? (openBlock(), createElementBlock("div", {
					key: 0,
					ref_for: true,
					ref: (el) => panelRef.value = el,
					class: normalizeClass(_ctx.$style.panel),
					style: normalizeStyle(panelStyle.value),
					"data-test-id": "nodes-chip-panel",
					onFocusout: ($event) => handlePanelFocusOut(chip.setIndex)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(chip.panel, (node, nodeIndex) => {
					return openBlock(), createElementBlock("div", {
						key: node.id,
						class: normalizeClass(_ctx.$style.panelRow),
						"data-test-id": "nodes-chip-panel-row",
						tabindex: "-1",
						role: "option",
						"aria-label": node.name,
						onKeydown: ($event) => handlePanelRowKeydown(chip.setIndex, nodeIndex, $event)
					}, [__props.isRemovable ? (openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: normalizeClass(_ctx.$style.panelRemove),
						"data-test-id": "nodes-chip-panel-remove",
						tabindex: "-1",
						"aria-label": unref(i18n).baseText("generic.delete"),
						onClick: withModifiers(($event) => removeNode(chip.setIndex, nodeIndex), ["stop"])
					}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.panelRemoveX) }, [createVNode(unref(N8nIcon_default), {
						icon: "x",
						size: "large"
					})], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.panelRowLeadingIcon) }, [node.nodeType ? (openBlock(), createBlock(NodeIcon_default, {
						key: 0,
						"node-type": node.nodeType,
						node: node.workflowNode ?? void 0,
						size: 16
					}, null, 8, ["node-type", "node"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: "crosshair",
						size: "large"
					}))], 2)], 10, _hoisted_4)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [node.nodeType ? (openBlock(), createBlock(NodeIcon_default, {
						key: 0,
						"node-type": node.nodeType,
						node: node.workflowNode ?? void 0,
						size: 16,
						class: normalizeClass(_ctx.$style.panelRowIcon)
					}, null, 8, [
						"node-type",
						"node",
						"class"
					])) : (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: "crosshair",
						size: "xsmall"
					}))], 64)), createBaseVNode("span", { class: normalizeClass(_ctx.$style.panelRowName) }, toDisplayString(node.name), 3)], 42, _hoisted_3$1);
				}), 128))], 46, _hoisted_2$2)) : createCommentVNode("", true)]))], 42, _hoisted_1$3);
			}), 128)), showCollapseToggle.value ? (openBlock(), createElementBlock("button", {
				key: 2,
				type: "button",
				class: normalizeClass(_ctx.$style.collapseToggle),
				"data-test-id": "nodes-chips-collapse",
				onClick: _cache[1] || (_cache[1] = withModifiers(($event) => isCollapsed.value = !isCollapsed.value, ["stop"]))
			}, toDisplayString(isCollapsed.value ? unref(i18n).baseText("instanceAi.nodeContext.expand") : unref(i18n).baseText("instanceAi.nodeContext.collapse")), 3)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_txypu_1",
	chipAnchor: "_chipAnchor_txypu_8",
	panel: "_panel_txypu_13",
	panelRow: "_panelRow_txypu_25",
	panelRowIcon: "_panelRowIcon_txypu_38",
	panelRowName: "_panelRowName_txypu_42",
	panelRemove: "_panelRemove_txypu_51",
	panelRemoveX: "_panelRemoveX_txypu_66",
	panelRowLeadingIcon: "_panelRowLeadingIcon_txypu_67",
	collapseToggle: "_collapseToggle_txypu_88"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/AttachmentPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/AttachmentPreview.vue
var AttachmentPreview_default = /* @__PURE__ */ defineComponent({
	__name: "AttachmentPreview",
	props: {
		file: {},
		attachment: {},
		isRemovable: { type: Boolean }
	},
	emits: [
		"remove",
		"remove-start",
		"remove-end",
		"remove-resource",
		"update:attachment"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const i18n = useI18n();
		const emit = __emit;
		const { previewUrl } = useAttachmentPreviews(() => props.file ? [props.file] : []);
		const nodesAttachment = computed(() => props.attachment?.type === "nodes" ? props.attachment : void 0);
		/** Resource references use chips instead of file previews. */
		const workflowAttachment = computed(() => props.attachment?.type === "workflow" ? props.attachment : void 0);
		const agentAttachment = computed(() => props.attachment?.type === "agent" ? props.attachment : void 0);
		const elementAttachment = computed(() => props.attachment?.type === "element" ? props.attachment : void 0);
		const elementLabel = computed(() => elementAttachment.value ? elementAttachmentLabel(elementAttachment.value) : "");
		const fileAttachment = computed(() => props.attachment?.type === "file" ? props.attachment : void 0);
		const thumbnailSrc = computed(() => {
			const attachment = fileAttachment.value;
			return attachment?.mimeType.startsWith("image/") ? `data:${attachment.mimeType};base64,${attachment.data}` : void 0;
		});
		return (_ctx, _cache) => {
			return nodesAttachment.value ? (openBlock(), createBlock(NodesAttachmentChips_default, {
				key: 0,
				attachment: nodesAttachment.value,
				"is-removable": __props.isRemovable ?? false,
				"onUpdate:attachment": _cache[0] || (_cache[0] = ($event) => emit("update:attachment", $event)),
				onRemoveAll: _cache[1] || (_cache[1] = ($event) => emit("remove-resource"))
			}, null, 8, ["attachment", "is-removable"])) : workflowAttachment.value ? (openBlock(), createBlock(InstanceAiResourceChip_default, {
				key: 1,
				label: workflowAttachment.value.name ?? "Workflow",
				icon: "workflow",
				"trailing-icon": workflowAttachment.value.executionId ? "play" : void 0,
				removable: __props.isRemovable,
				"remove-label": unref(i18n).baseText("instanceAi.mentions.removeWorkflow"),
				"test-id": "attachment-preview-resource",
				"remove-test-id": "attachment-preview-remove-resource",
				onRemove: _cache[2] || (_cache[2] = ($event) => emit("remove-resource"))
			}, null, 8, [
				"label",
				"trailing-icon",
				"removable",
				"remove-label"
			])) : elementAttachment.value ? (openBlock(), createBlock(InstanceAiResourceChip_default, {
				key: 2,
				label: elementLabel.value,
				icon: "mouse-pointer",
				removable: __props.isRemovable,
				"remove-label": unref(i18n).baseText("instanceAi.elementSelection.remove"),
				"test-id": "attachment-preview-element",
				"remove-test-id": "attachment-preview-remove-element",
				onRemove: _cache[3] || (_cache[3] = ($event) => emit("remove-resource"))
			}, null, 8, [
				"label",
				"removable",
				"remove-label"
			])) : agentAttachment.value ? (openBlock(), createBlock(InstanceAiResourceChip_default, {
				key: 3,
				label: agentAttachment.value.name ?? "Agent",
				icon: "robot",
				"test-id": "attachment-preview-resource"
			}, null, 8, ["label"])) : props.file ? (openBlock(), createBlock(unref(Attachment_default), {
				key: 4,
				"file-name": props.file.name,
				"mime-type": props.file.type,
				"size-bytes": props.file.size,
				src: unref(previewUrl)(props.file),
				"is-removable": __props.isRemovable ?? false,
				onRemoveStart: _cache[4] || (_cache[4] = ($event) => emit("remove-start")),
				onRemove: _cache[5] || (_cache[5] = ($event) => emit("remove", props.file)),
				onRemoveEnd: _cache[6] || (_cache[6] = ($event) => emit("remove-end"))
			}, null, 8, [
				"file-name",
				"mime-type",
				"size-bytes",
				"src",
				"is-removable"
			])) : fileAttachment.value ? (openBlock(), createBlock(unref(Attachment_default), {
				key: 5,
				"file-name": fileAttachment.value.fileName,
				"mime-type": fileAttachment.value.mimeType,
				src: thumbnailSrc.value,
				"is-removable": __props.isRemovable ?? false,
				onRemoveStart: _cache[7] || (_cache[7] = ($event) => emit("remove-start")),
				onRemoveEnd: _cache[8] || (_cache[8] = ($event) => emit("remove-end"))
			}, null, 8, [
				"file-name",
				"mime-type",
				"src",
				"is-removable"
			])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/emptyStateSuggestions.ts
var isPromptSuggestion = (suggestion) => suggestion.type === "prompt";
var isMenuSuggestion = (suggestion) => suggestion.type === "menu";
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiPromptSuggestions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = [
	"data-test-id",
	"aria-expanded",
	"aria-haspopup",
	"disabled",
	"onClick",
	"onMouseenter",
	"onMouseleave",
	"onFocus",
	"onBlur"
];
var _hoisted_2$1 = ["aria-label", "disabled"];
var _hoisted_3 = [
	"data-test-id",
	"disabled",
	"onClick",
	"onMouseenter",
	"onFocus"
];
var InstanceAiPromptSuggestions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiPromptSuggestions",
	props: {
		suggestions: {},
		disabled: { type: Boolean }
	},
	emits: [
		"preview-change",
		"quick-examples-opened",
		"insert-suggestion"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const quickExamplesSuggestion = computed(() => props.suggestions.find(isMenuSuggestion) ?? null);
		const activePreviewPromptKey = ref(null);
		const isQuickExamplesOpen = ref(false);
		const rootRef = ref(null);
		let hoverTimer = null;
		function clearHoverTimer() {
			if (!hoverTimer) return;
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		function setPreview(promptKey) {
			activePreviewPromptKey.value = promptKey;
			emit("preview-change", promptKey);
		}
		function closeQuickExamples() {
			clearHoverTimer();
			isQuickExamplesOpen.value = false;
			setPreview(null);
		}
		function getTopLevelPosition(suggestionId) {
			const index = props.suggestions.findIndex((suggestion) => suggestion.id === suggestionId);
			return index >= 0 ? index + 1 : 0;
		}
		function getQuickExamplePosition(exampleId) {
			const quickExamples = quickExamplesSuggestion.value;
			if (!quickExamples) return 0;
			const index = quickExamples.examples.findIndex((example) => example.id === exampleId);
			return index >= 0 ? index + 1 : 0;
		}
		function insertSuggestion(payload) {
			if (props.disabled) return;
			closeQuickExamples();
			emit("insert-suggestion", payload);
		}
		function handleDocumentKeydown(event) {
			if (event.key === "Escape") closeQuickExamples();
		}
		onMounted(() => {
			document.addEventListener("keydown", handleDocumentKeydown);
		});
		onUnmounted(() => {
			document.removeEventListener("keydown", handleDocumentKeydown);
			clearHoverTimer();
		});
		onClickOutside(rootRef, closeQuickExamples);
		function handleSuggestionEnter(suggestion) {
			if (props.disabled || !isPromptSuggestion(suggestion)) return;
			clearHoverTimer();
			hoverTimer = setTimeout(() => {
				hoverTimer = null;
				setPreview(suggestion.promptKey);
			}, 300);
		}
		function handleSuggestionLeave(suggestion) {
			clearHoverTimer();
			if (props.disabled || !isPromptSuggestion(suggestion)) return;
			setPreview(null);
		}
		function handleSuggestionFocus(suggestion) {
			clearHoverTimer();
			if (props.disabled || !isPromptSuggestion(suggestion)) return;
			setPreview(suggestion.promptKey);
		}
		function handleSuggestionBlur(suggestion) {
			clearHoverTimer();
			if (props.disabled || !isPromptSuggestion(suggestion)) return;
			setPreview(null);
		}
		function handleSuggestionClick(suggestion) {
			clearHoverTimer();
			if (isPromptSuggestion(suggestion)) {
				insertSuggestion({
					promptKey: suggestion.promptKey,
					suggestionId: suggestion.id,
					suggestionKind: "prompt",
					position: getTopLevelPosition(suggestion.id),
					prefillType: "v1_opener"
				});
				return;
			}
			if (props.disabled) return;
			if (isQuickExamplesOpen.value) {
				closeQuickExamples();
				return;
			}
			setPreview(null);
			isQuickExamplesOpen.value = true;
			emit("quick-examples-opened", {
				suggestionId: suggestion.id,
				position: getTopLevelPosition(suggestion.id)
			});
		}
		function handleQuickExampleEnter(promptKey) {
			if (props.disabled) return;
			setPreview(promptKey);
		}
		function handleQuickExampleLeave() {
			if (props.disabled) return;
			setPreview(null);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "rootRef",
				ref: rootRef,
				class: normalizeClass(_ctx.$style.suggestions)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.suggestionRow) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.suggestions, (suggestion, index) => {
				return openBlock(), createElementBlock("button", {
					key: suggestion.id,
					type: "button",
					class: normalizeClass([
						_ctx.$style.suggestionButton,
						unref(isMenuSuggestion)(suggestion) && _ctx.$style.menuSuggestionButton,
						unref(isMenuSuggestion)(suggestion) && isQuickExamplesOpen.value && _ctx.$style.menuSuggestionButtonActive
					]),
					style: normalizeStyle({ animationDelay: `${index * 50}ms` }),
					"data-test-id": `instance-ai-suggestion-${suggestion.id}`,
					"aria-expanded": unref(isMenuSuggestion)(suggestion) ? isQuickExamplesOpen.value : void 0,
					"aria-haspopup": unref(isMenuSuggestion)(suggestion) ? "dialog" : void 0,
					disabled: props.disabled,
					onClick: ($event) => handleSuggestionClick(suggestion),
					onMouseenter: ($event) => handleSuggestionEnter(suggestion),
					onMouseleave: ($event) => handleSuggestionLeave(suggestion),
					onFocus: ($event) => handleSuggestionFocus(suggestion),
					onBlur: ($event) => handleSuggestionBlur(suggestion)
				}, [
					createVNode(unref(N8nIcon_default), {
						icon: suggestion.icon,
						size: 12,
						class: normalizeClass(_ctx.$style.suggestionIcon)
					}, null, 8, ["icon", "class"]),
					createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(suggestion.labelKey)), 1),
					unref(isMenuSuggestion)(suggestion) ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						icon: isQuickExamplesOpen.value ? "chevron-up" : "chevron-down",
						size: 12,
						class: normalizeClass(_ctx.$style.suggestionChevron)
					}, null, 8, ["icon", "class"])) : createCommentVNode("", true)
				], 46, _hoisted_1$2);
			}), 128))], 2), createVNode(Transition, { name: "quick-examples-fade" }, {
				default: withCtx(() => [isQuickExamplesOpen.value && quickExamplesSuggestion.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.quickExamplesPanel),
					"data-test-id": "instance-ai-quick-examples-panel"
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.quickExamplesHeader) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.quickExamplesTitle) }, [createVNode(unref(N8nIcon_default), {
					icon: quickExamplesSuggestion.value.icon,
					size: 14
				}, null, 8, ["icon"]), createTextVNode(" " + toDisplayString(unref(i18n).baseText(quickExamplesSuggestion.value.labelKey)), 1)], 2), createBaseVNode("button", {
					type: "button",
					class: normalizeClass(_ctx.$style.quickExamplesClose),
					"aria-label": unref(i18n).baseText("instanceAi.emptyState.quickExamples.close"),
					disabled: props.disabled,
					onClick: closeQuickExamples
				}, [createVNode(unref(N8nIcon_default), {
					icon: "x",
					size: 14
				})], 10, _hoisted_2$1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.quickExamplesList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(quickExamplesSuggestion.value.examples, (example) => {
					return openBlock(), createElementBlock("button", {
						key: example.id,
						type: "button",
						class: normalizeClass([_ctx.$style.quickExampleButton, activePreviewPromptKey.value === example.promptKey && _ctx.$style.quickExampleButtonActive]),
						"data-test-id": `instance-ai-quick-example-${example.id}`,
						disabled: props.disabled,
						onClick: ($event) => insertSuggestion({
							promptKey: example.promptKey,
							suggestionId: example.id,
							suggestionKind: "quick_example",
							position: getQuickExamplePosition(example.id),
							prefillType: "v1_opener"
						}),
						onMouseenter: ($event) => handleQuickExampleEnter(example.promptKey),
						onMouseleave: handleQuickExampleLeave,
						onFocus: ($event) => handleQuickExampleEnter(example.promptKey),
						onBlur: handleQuickExampleLeave
					}, toDisplayString(unref(i18n).baseText(example.labelKey)), 43, _hoisted_3);
				}), 128))], 2)], 2)) : createCommentVNode("", true)]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	suggestions: "_suggestions_1o57f_11",
	suggestionRow: "_suggestionRow_1o57f_16",
	suggestionButton: "_suggestionButton_1o57f_24",
	suggestionSlideIn: "_suggestionSlideIn_1o57f_1",
	menuSuggestionButton: "_menuSuggestionButton_1o57f_54",
	menuSuggestionButtonActive: "_menuSuggestionButtonActive_1o57f_58",
	suggestionIcon: "_suggestionIcon_1o57f_65",
	suggestionChevron: "_suggestionChevron_1o57f_74",
	quickExamplesPanel: "_quickExamplesPanel_1o57f_79",
	quickExamplesHeader: "_quickExamplesHeader_1o57f_90",
	quickExamplesTitle: "_quickExamplesTitle_1o57f_99",
	quickExamplesClose: "_quickExamplesClose_1o57f_108",
	quickExamplesList: "_quickExamplesList_1o57f_127",
	quickExampleButton: "_quickExampleButton_1o57f_133",
	quickExampleButtonActive: "_quickExampleButtonActive_1o57f_150"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/composables/useInstanceAiInputMenuItems.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useInstanceAiInputMenuItems(attachFiles, projectId) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const projectsStore = useProjectsStore();
	const router = useRouter();
	const settingsStore = useInstanceAiSettingsStore();
	const mcpStore = useInstanceAiMcpStore();
	const { ignorePendingConnectResult } = useMcpServerConnect();
	const mcpTelemetry = useInstanceAiMcpTelemetry();
	const { ensureConnected: ensureBrowserConnected } = useBrowserUseConnection();
	const { isEnabled: assistantSkillsEnabled } = useAssistantSkillsExperiment();
	const shouldShowSkills = computed(() => assistantSkillsEnabled.value && isContextSkillsEnabled());
	const canCreateSkill = computed(() => canWriteInstanceSkillScope() || canWriteProjectSkillScope(projectsStore.personalProject?.id) || projectsStore.myProjects.some((project) => project.type === "team" && canWriteProjectSkillScope(project.id)));
	const skills = ref([]);
	const skillsLoadState = ref("loading");
	const { next: nextSkillsLoad } = useLatestFetch();
	async function refreshSkills() {
		const isLatest = nextSkillsLoad();
		if (!shouldShowSkills.value) return;
		skills.value = [];
		skillsLoadState.value = "loading";
		try {
			const result = await getSkills(rootStore.restApiContext);
			if (!isLatest()) return;
			skills.value = result.data;
			skillsLoadState.value = "loaded";
		} catch {
			if (isLatest()) skillsLoadState.value = "error";
		}
	}
	settingsStore.fetch();
	watch(() => settingsStore.isMcpAvailable, (isAvailable) => {
		if (isAvailable) mcpStore.fetchConnectionsLazy();
	}, { immediate: true });
	const isBrowserUseAvailable = computed(() => settingsStore.isBrowserUseAvailable);
	function openToolsModal() {
		mcpTelemetry.trackToolsListOpened("input_menu");
		uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
	}
	function openPreferenceSettings() {
		window.open(router.resolve({ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES }).href, "_blank");
	}
	function openSkillSettings(query = {}) {
		window.open(router.resolve({
			name: VIEWS.SETTINGS_CONTEXT_SKILLS,
			query
		}).href, "_blank", "noopener");
	}
	const skillMenuItems = computed(() => {
		const children = [];
		const availableSkills = skills.value.filter((skill) => skill.availableToAssistant && skill.name.trim() && skill.description.trim() && (skill.scope === "instance" || skill.scope === "project" && skill.projectId === toValue(projectId))).sort((left, right) => left.name.localeCompare(right.name));
		if (skillsLoadState.value !== "loaded" || availableSkills.length === 0) children.push({
			id: "skills-status",
			label: i18n.baseText(skillsLoadState.value === "loading" ? "instanceAi.inputMenu.skills.loading" : skillsLoadState.value === "error" ? "instanceAi.inputMenu.skills.loadError" : "instanceAi.inputMenu.skills.empty"),
			disabled: true
		});
		else for (const scope of ["project", "instance"]) {
			const group = availableSkills.filter((skill) => skill.scope === scope);
			if (group.length === 0) continue;
			children.push({
				id: `skills-${scope}`,
				label: i18n.baseText(`settings.context.skills.scope.${scope}`),
				header: true,
				divided: children.length > 0
			}, ...group.map((skill) => ({
				id: `skill-${skill.id}`,
				label: skill.name,
				data: { action: () => openSkillSettings({ skillId: skill.id }) }
			})));
		}
		children.push({
			id: "manage-skills",
			label: i18n.baseText("instanceAi.inputMenu.skills.manage"),
			divided: true,
			data: { action: () => openSkillSettings() }
		});
		if (canCreateSkill.value) children.push({
			id: "create-skill",
			label: i18n.baseText("instanceAi.inputMenu.skills.create"),
			icon: {
				type: "icon",
				value: "plus"
			},
			data: { action: () => openSkillSettings({ create: "true" }) }
		});
		return children;
	});
	function createConnectionItem({ id, status, icon, connectLabel, connectedLabel, connectedTitle, connect, disconnect }) {
		if (status === "none" || status === "connecting") return {
			id,
			label: connectLabel,
			icon: {
				type: "icon",
				value: icon
			},
			data: {
				status,
				action: connect
			}
		};
		if (status === "disconnected") return {
			id,
			label: connectedLabel,
			icon: {
				type: "icon",
				value: icon
			},
			data: { status },
			children: [...connectedTitle ? [{
				id: `${id}-status`,
				label: connectedTitle,
				header: true
			}] : [], {
				id: `${id}-reconnect`,
				label: i18n.baseText("tools.connection.action.reconnect"),
				data: { action: connect }
			}]
		};
		return {
			id,
			label: connectedLabel,
			icon: {
				type: "icon",
				value: icon
			},
			data: { status },
			children: [{
				id: `${id}-status`,
				label: connectedTitle ?? i18n.baseText("instanceAi.inputMenu.status.connected"),
				header: true
			}, {
				id: `${id}-disconnect`,
				label: i18n.baseText("instanceAi.inputMenu.actions.disconnect"),
				data: { action: disconnect }
			}]
		};
	}
	const disconnectedConnectionCount = computed(() => {
		let count = 0;
		if (settingsStore.isMcpAvailable) count += mcpStore.connections.filter(({ status }) => status === "disconnected").length;
		if (isBrowserUseAvailable.value && settingsStore.browserUseConnectionStatus === "disconnected") count++;
		return count;
	});
	return {
		menuItems: computed(() => {
			const items = [{
				id: "attach-files",
				label: i18n.baseText("chatInputBase.button.attach"),
				icon: {
					type: "icon",
					value: "paperclip"
				},
				data: { action: attachFiles }
			}];
			if (settingsStore.isMcpAvailable) {
				const tools = mcpStore.connections.map((connection) => ({
					id: `mcp-${connection.id}`,
					label: connection.serverTitle,
					data: {
						status: connection.status,
						toolIcon: iconForMcpRegistryServer(connection.serverIcons, uiStore.appliedTheme)
					},
					children: [
						{
							id: `mcp-${connection.id}-credential`,
							label: connection.credentialName,
							header: true
						},
						{
							id: `mcp-${connection.id}-setup`,
							label: i18n.baseText("instanceAi.inputMenu.actions.settings"),
							data: { action: () => {
								mcpTelemetry.trackSettingsOpened(connection.serverSlug, "input_menu");
								uiStore.openModalWithData({
									name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
									data: { connectionId: connection.id }
								});
							} }
						},
						{
							id: `mcp-${connection.id}-disconnect`,
							label: i18n.baseText(connection.status === "disconnected" ? "instanceAi.inputMenu.actions.remove" : "instanceAi.inputMenu.actions.disconnect"),
							divided: true,
							data: { action: async () => {
								ignorePendingConnectResult(connection.serverSlug);
								await mcpStore.disconnect(connection.id);
							} }
						}
					]
				}));
				const toolsStatus = tools.some(({ data }) => data?.status === "connecting") ? "connecting" : tools.some(({ data }) => data?.status === "disconnected") ? "disconnected" : tools.length > 0 ? "connected" : "none";
				const toolsChildren = tools.length > 0 ? [...tools, {
					id: "add-tool",
					label: i18n.baseText("instanceAi.inputMenu.tools.add"),
					icon: {
						type: "icon",
						value: "plus"
					},
					divided: true,
					data: { action: openToolsModal }
				}] : void 0;
				items.push({
					id: "tools",
					label: i18n.baseText(tools.length > 0 ? "instanceAi.inputMenu.tools.connected" : "instanceAi.inputMenu.tools.connect"),
					icon: {
						type: "icon",
						value: "plug"
					},
					data: tools.length > 0 ? { status: toolsStatus } : { action: openToolsModal },
					children: toolsChildren
				});
			}
			if (isBrowserUseAvailable.value) items.push(createConnectionItem({
				id: "browser",
				status: settingsStore.browserUseConnectionStatus,
				icon: "globe",
				connectLabel: i18n.baseText("instanceAi.inputMenu.browser.connect"),
				connectedLabel: i18n.baseText("instanceAi.inputMenu.browser.connected"),
				connectedTitle: settingsStore.browserUseConnectionStatus !== "none" ? i18n.baseText("instanceAi.inputMenu.browser.connectedTitle") : void 0,
				connect: async () => {
					await ensureBrowserConnected("input_menu");
				},
				disconnect: settingsStore.disconnectBrowserUse
			}));
			if (shouldShowSkills.value) items.push({
				id: "skills",
				label: i18n.baseText("instanceAi.inputMenu.skills.label"),
				icon: {
					type: "icon",
					value: "book-open"
				},
				children: skillMenuItems.value
			});
			items.push({
				id: "preferences",
				label: i18n.baseText("instanceAi.inputMenu.preferences.label"),
				icon: {
					type: "icon",
					value: "brain"
				},
				divided: true,
				data: { action: openPreferenceSettings }
			});
			return items;
		}),
		disconnectedConnectionCount,
		refreshSkills
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useCloudBrowserTasks.ts
init_runtime_core_esm_bundler();
/** Opens a new browser session, which has a new live view link. */
var START_SESSION_TOOL = "browser_start_session";
/** The agent's request for the user. It runs until the user returns control. */
var REQUEST_USER_ACTION_TOOL = "browser_request_user_action";
var CloudBrowserTasksKey = Symbol("CloudBrowserTasks");
function sessionKeyOf(node) {
	const sessionId = node.toolCalls.filter((toolCall) => toolCall.toolName === START_SESSION_TOOL && !toolCall.isLoading).at(-1)?.toolCallId;
	if (!sessionId) return "";
	return `${sessionId}:${node.cloudBrowserWindowChanges ?? 0}`;
}
function userActionOf(node) {
	const reason = node.toolCalls.find((toolCall) => toolCall.toolName === REQUEST_USER_ACTION_TOOL && toolCall.isLoading)?.args.reason;
	return typeof reason === "string" ? { reason } : void 0;
}
function taskStateOf(node) {
	if (node.status === "active") return "running";
	if (node.resultDelivered) return void 0;
	if (node.status === "completed") return "done";
	if (node.status === "error") return "failed";
}
/**
* The thread's cloud browser tasks that still matter to the user, oldest first, from the agent
* tree: running ones, and finished ones whose result is still waiting to reach the orchestrator.
* A task the user stopped is left out.
*/
function useCloudBrowserTasks(runtime) {
	const thread = runtime ?? useThread();
	return computed(() => {
		const nodes = [];
		for (const message of thread.messages) nodes.push(...message.agentTree?.children.filter(isCloudBrowserAgent) ?? []);
		const tasks = [];
		for (const node of nodes) {
			if (!node.taskId) continue;
			const state = taskStateOf(node);
			if (!state) continue;
			tasks.push({
				agentId: node.agentId,
				taskId: node.taskId,
				title: node.title ?? node.subtitle ?? node.goal ?? "",
				state,
				sessionKey: sessionKeyOf(node),
				userAction: state === "running" ? userActionOf(node) : void 0
			});
		}
		return tasks;
	});
}
//#endregion
//#region src/features/ai/instanceAi/composables/useLocalBrowserCoachmark.ts
init_runtime_core_esm_bundler();
var LOCAL_BROWSER_COACHMARK_KEY = "instance-ai-local-browser-coachmark";
/**
* Tells the user that a browser task runs in a virtual browser, and that they can connect their
* local browser from the + menu instead. Shows once for each user.
*/
function useLocalBrowserCoachmark() {
	const cloudBrowserTasks = inject(CloudBrowserTasksKey, void 0);
	const settingsStore = useInstanceAiSettingsStore();
	const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();
	const hasOpenBrowser = computed(() => Boolean(cloudBrowserTasks?.value.some((task) => task.state === "running" && task.sessionKey !== "")));
	const shouldShowCoachmark = computed(() => hasOpenBrowser.value && settingsStore.isBrowserUseAvailable && settingsStore.browserStatusLoaded && settingsStore.browserUseConnectionStatus === "none" && !isCalloutDismissed("instance-ai-local-browser-coachmark"));
	async function onDismissCoachmark() {
		await dismissCallout(LOCAL_BROWSER_COACHMARK_KEY);
	}
	return {
		shouldShowCoachmark,
		onDismissCoachmark
	};
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiInputMenu.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "instance-ai-local-browser-coachmark" };
var _hoisted_2 = ["aria-label"];
var InstanceAiInputMenu_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiInputMenu",
	props: {
		disabled: {
			type: Boolean,
			default: false
		},
		isStreaming: {
			type: Boolean,
			default: false
		},
		projectId: {}
	},
	emits: ["attachFiles"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { menuItems, disconnectedConnectionCount, refreshSkills } = useInstanceAiInputMenuItems(() => emit("attachFiles"), () => props.projectId);
		const tooltip = computed(() => {
			if (props.disabled && props.isStreaming) return i18n.baseText("instanceAi.inputMenu.stopResponse");
			const count = disconnectedConnectionCount.value;
			if (count === 0) return i18n.baseText("instanceAi.inputMenu.open");
			if (count === 1) return i18n.baseText("instanceAi.inputMenu.connectionNeedsAttention");
			return i18n.baseText("instanceAi.inputMenu.connectionsNeedAttention", { interpolate: { count: String(count) } });
		});
		const STATUS_LABEL_KEYS = {
			connected: "instanceAi.inputMenu.status.connected",
			connecting: "instanceAi.inputMenu.status.connecting",
			disconnected: "instanceAi.inputMenu.status.disconnected"
		};
		function findMenuItem(items, id) {
			for (const item of items) {
				if (item.id === id) return item;
				const child = item.children ? findMenuItem(item.children, id) : void 0;
				if (child) return child;
			}
		}
		async function handleSelect(id) {
			await findMenuItem(menuItems.value, id)?.data?.action?.();
		}
		function trackInputPlusButtonClick() {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_AI_ASSISTANT_INPUT_PLUS_BUTTON, {});
		}
		const isOpen = ref(false);
		watch(() => props.disabled, (disabled) => {
			if (disabled) isOpen.value = false;
		});
		function handleUpdateDropdownModelValue(open) {
			isOpen.value = open;
			if (open) {
				refreshSkills();
				trackInputPlusButtonClick();
			}
		}
		const localBrowserCoachmark = useLocalBrowserCoachmark();
		const menuAnchor = useTemplateRef("menuAnchor");
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				ref_key: "menuAnchor",
				ref: menuAnchor,
				class: normalizeClass(_ctx.$style.menuAnchor)
			}, [createVNode(unref(N8nPopover_default), {
				open: unref(localBrowserCoachmark).shouldShowCoachmark.value,
				reference: menuAnchor.value ?? void 0,
				side: "right",
				align: "center",
				"side-offset": 8,
				"show-arrow": "",
				"enable-scrolling": false,
				"suppress-auto-focus": "",
				"z-index": 2200,
				"content-class": _ctx.$style.coachmark
			}, {
				content: withCtx(() => [createBaseVNode("div", _hoisted_1$1, [
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.coachmarkTitle) }, toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.localBrowserCoachmark.title")), 3),
					createBaseVNode("p", { class: normalizeClass(_ctx.$style.coachmarkBody) }, toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.localBrowserCoachmark.body")), 3),
					createVNode(unref(N8nButton_default), {
						size: "small",
						label: unref(i18n).baseText("instanceAi.cloudBrowser.localBrowserCoachmark.gotIt"),
						class: normalizeClass(_ctx.$style.coachmarkButton),
						"data-test-id": "instance-ai-local-browser-coachmark-got-it",
						onClick: _cache[0] || (_cache[0] = ($event) => unref(localBrowserCoachmark).onDismissCoachmark())
					}, null, 8, ["label", "class"])
				])]),
				_: 1
			}, 8, [
				"open",
				"reference",
				"content-class"
			]), createVNode(unref(N8nTooltip_default), {
				content: tooltip.value,
				"content-class": _ctx.$style.triggerTooltip,
				placement: "top"
			}, {
				default: withCtx(() => [createVNode(unref(DropdownMenu_default), {
					"model-value": isOpen.value,
					items: unref(menuItems),
					placement: "top-start",
					disabled: props.disabled,
					"data-test-id": "instance-ai-input-menu",
					onSelect: handleSelect,
					"onUpdate:modelValue": handleUpdateDropdownModelValue
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "plus",
						variant: "ghost",
						size: "medium",
						"icon-size": "large",
						disabled: props.disabled,
						"aria-label": tooltip.value,
						class: normalizeClass([_ctx.$style.trigger, { [_ctx.$style.triggerWithStatus]: unref(disconnectedConnectionCount) > 0 }])
					}, null, 8, [
						"disabled",
						"aria-label",
						"class"
					])]),
					"item-leading": withCtx(({ item, ui }) => [item.data?.toolIcon ? (openBlock(), createBlock(unref(N8nNodeIcon_default), {
						key: 0,
						type: item.data.toolIcon.type,
						src: item.data.toolIcon.type === "file" ? item.data.toolIcon.src : void 0,
						name: item.data.toolIcon.type === "icon" ? item.data.toolIcon.name : void 0,
						size: 16,
						class: normalizeClass(ui.class)
					}, null, 8, [
						"type",
						"src",
						"name",
						"class"
					])) : item.icon?.type === "icon" ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: item.icon.value,
						size: "large",
						class: normalizeClass(ui.class)
					}, null, 8, ["icon", "class"])) : createCommentVNode("", true)]),
					"item-label": withCtx(({ item, ui }) => [createVNode(unref(N8nText_default), {
						size: "medium",
						color: item.disabled ? "text-xlight" : "text-dark",
						class: normalizeClass([
							ui.class,
							_ctx.$style.itemLabel,
							!item.children?.length && _ctx.$style.itemLabelLeaf
						])
					}, {
						default: withCtx(() => [createBaseVNode("span", null, toDisplayString(item.label), 1), item.data?.status && item.data.status !== "none" && !(item.id === "tools" && item.data.status === "connected") ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.statusIndicator),
							"aria-label": unref(i18n).baseText(STATUS_LABEL_KEYS[item.data.status])
						}, [item.data.status === "connecting" ? (openBlock(), createBlock(unref(N8nSpinner_default), {
							key: 0,
							size: "small"
						})) : item.data.status === "connected" ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 1,
							icon: "check",
							size: "small",
							class: normalizeClass([_ctx.$style.statusIcon, _ctx.$style.connected])
						}, null, 8, ["class"])) : item.id === "tools" ? (openBlock(), createElementBlock("span", {
							key: 2,
							class: normalizeClass([_ctx.$style.statusDot, _ctx.$style.disconnectedDot])
						}, null, 2)) : (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 3,
							icon: "circle-x",
							size: "small",
							class: normalizeClass([_ctx.$style.statusIcon, _ctx.$style.disconnected])
						}, null, 8, ["class"]))], 10, _hoisted_2)) : createCommentVNode("", true)]),
						_: 2
					}, 1032, ["color", "class"])]),
					_: 1
				}, 8, [
					"model-value",
					"items",
					"disabled"
				])]),
				_: 1
			}, 8, ["content", "content-class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	menuAnchor: "_menuAnchor_1qte8_1",
	coachmark: "_coachmark_1qte8_5",
	coachmarkTitle: "_coachmarkTitle_1qte8_16",
	coachmarkBody: "_coachmarkBody_1qte8_24",
	coachmarkButton: "_coachmarkButton_1qte8_30",
	triggerTooltip: "_triggerTooltip_1qte8_38",
	trigger: "_trigger_1qte8_38",
	triggerWithStatus: "_triggerWithStatus_1qte8_48",
	itemLabel: "_itemLabel_1qte8_62",
	itemLabelLeaf: "_itemLabelLeaf_1qte8_69",
	statusDot: "_statusDot_1qte8_73",
	statusIcon: "_statusIcon_1qte8_80",
	statusIndicator: "_statusIndicator_1qte8_84",
	connected: "_connected_1qte8_94",
	disconnected: "_disconnected_1qte8_98",
	disconnectedDot: "_disconnectedDot_1qte8_102"
} }]]);
//#endregion
//#region src/features/ai/assistant-at-mentions/composables/useArtifactMentionIndex.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var MAX_CONCURRENT_WORKFLOW_LOADS = 2;
function projectWorkflowArtifact(workflow) {
	const nodes = workflow.nodes.filter((node) => node.type !== STICKY_NODE_TYPE).map(({ id, name, type, typeVersion }) => ({
		id,
		name,
		type,
		typeVersion
	}));
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const groups = (workflow.nodeGroups ?? []).map(({ id, name, nodeIds }) => ({
		id,
		name,
		nodeIds: [...new Set(nodeIds.filter((nodeId) => nodesById.has(nodeId)))]
	})).filter((group) => group.nodeIds.length > 0);
	const groupsById = new Map(groups.map((group) => [group.id, group]));
	const nodeIdToGroupId = /* @__PURE__ */ new Map();
	for (const group of groups) for (const nodeId of group.nodeIds) if (!nodeIdToGroupId.has(nodeId)) nodeIdToGroupId.set(nodeId, group.id);
	return {
		workflowId: workflow.id,
		workflowName: workflow.name,
		versionId: workflow.versionId,
		nodes,
		groups,
		nodesById,
		groupsById,
		nodeIdToGroupId
	};
}
function useArtifactMentionIndex(options) {
	const entries = shallowReactive(/* @__PURE__ */ new Map());
	const revision = ref(0);
	const artifactById = computed(() => new Map(toValue(options.artifacts).map((artifact) => [artifact.id, artifact])));
	const requestGenerations = /* @__PURE__ */ new Map();
	const pendingLoads = /* @__PURE__ */ new Map();
	const loadQueue = [];
	let activeLoadCount = 0;
	let disposed = false;
	const fetchWorkflow = options.fetchWorkflow ?? (async (workflowId) => await getWorkflow(useRootStore().restApiContext, workflowId));
	const getActiveWorkflow = options.getActiveWorkflow ?? ((workflowId) => {
		const store = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		if (!store?.hydrated) return void 0;
		return {
			id: workflowId,
			name: store.name,
			versionId: store.versionId,
			nodes: store.allNodes,
			nodeGroups: store.allGroups
		};
	});
	function setEntry(workflowId, entry) {
		entries.set(workflowId, entry);
		revision.value++;
	}
	function removeEntry(workflowId) {
		if (entries.delete(workflowId)) revision.value++;
	}
	function nextGeneration(workflowId) {
		const generation = (requestGenerations.get(workflowId) ?? 0) + 1;
		requestGenerations.set(workflowId, generation);
		return generation;
	}
	function isCurrent(workflowId, generation) {
		return !disposed && artifactById.value.has(workflowId) && requestGenerations.get(workflowId) === generation;
	}
	function getActiveProjection(workflowId) {
		if (toValue(options.activeWorkflowId) !== workflowId) return void 0;
		const workflow = getActiveWorkflow(workflowId);
		return workflow ? projectWorkflowArtifact(workflow) : void 0;
	}
	async function executeLoad(task) {
		if (!isCurrent(task.workflowId, task.generation)) return void 0;
		try {
			const workflow = await fetchWorkflow(task.workflowId);
			if (!isCurrent(task.workflowId, task.generation)) return void 0;
			const activeProjection = getActiveProjection(task.workflowId);
			if (activeProjection) {
				setEntry(task.workflowId, {
					status: "ready",
					source: "active",
					index: activeProjection
				});
				return activeProjection;
			}
			const artifact = artifactById.value.get(task.workflowId);
			const index = projectWorkflowArtifact(artifact ? {
				...workflow,
				name: artifact.name
			} : workflow);
			setEntry(task.workflowId, {
				status: "ready",
				source: "fetched",
				index
			});
			return index;
		} catch (error) {
			if (isCurrent(task.workflowId, task.generation)) {
				const previous = entries.get(task.workflowId);
				setEntry(task.workflowId, {
					status: "error",
					error,
					...previous?.index ? {
						source: previous.source,
						index: previous.index
					} : {}
				});
			}
			return;
		}
	}
	function drainQueue() {
		while (!disposed && activeLoadCount < MAX_CONCURRENT_WORKFLOW_LOADS && loadQueue.length > 0) {
			const task = loadQueue.shift();
			if (!task) return;
			if (!isCurrent(task.workflowId, task.generation)) {
				task.resolve(void 0);
				continue;
			}
			activeLoadCount++;
			executeLoad(task).then((index) => {
				activeLoadCount--;
				task.resolve(index);
				drainQueue();
			});
		}
	}
	function invalidate(workflowId) {
		nextGeneration(workflowId);
		pendingLoads.delete(workflowId);
		if (artifactById.value.has(workflowId)) setEntry(workflowId, { status: "idle" });
		else removeEntry(workflowId);
	}
	async function load(workflowId, options = {}) {
		if (disposed || !artifactById.value.has(workflowId)) return void 0;
		const current = entries.get(workflowId);
		if (current?.status === "ready" && current.source === "active") return current.index;
		const activeProjection = getActiveProjection(workflowId);
		if (activeProjection) {
			nextGeneration(workflowId);
			setEntry(workflowId, {
				status: "ready",
				source: "active",
				index: activeProjection
			});
			return activeProjection;
		}
		if (!options.force) {
			const pending = pendingLoads.get(workflowId);
			if (pending) return await pending;
			if (current?.status === "ready") return current.index;
			if (current?.status === "error") return current.index;
		} else {
			nextGeneration(workflowId);
			pendingLoads.delete(workflowId);
		}
		const generation = nextGeneration(workflowId);
		setEntry(workflowId, {
			status: "loading",
			...current?.index ? {
				source: current.source,
				index: current.index
			} : {}
		});
		const promise = new Promise((resolve) => {
			loadQueue.push({
				workflowId,
				generation,
				resolve
			});
			drainQueue();
		});
		pendingLoads.set(workflowId, promise);
		promise.then(() => {
			if (pendingLoads.get(workflowId) === promise) pendingLoads.delete(workflowId);
		});
		return await promise;
	}
	async function loadAll() {
		const activeWorkflowId = toValue(options.activeWorkflowId);
		const workflowIds = [...artifactById.value.keys()].sort((left, right) => {
			if (left === activeWorkflowId) return -1;
			if (right === activeWorkflowId) return 1;
			return 0;
		});
		await Promise.all(workflowIds.map(async (workflowId) => await load(workflowId)));
	}
	function getEntry(workflowId) {
		return entries.get(workflowId);
	}
	function getIndex(workflowId) {
		return entries.get(workflowId)?.index;
	}
	async function retry(workflowId) {
		return await load(workflowId, { force: true });
	}
	function dispose() {
		if (disposed) return;
		disposed = true;
		for (const workflowId of artifactById.value.keys()) nextGeneration(workflowId);
		for (const task of loadQueue.splice(0)) task.resolve(void 0);
		pendingLoads.clear();
		entries.clear();
		revision.value++;
	}
	watch(() => toValue(options.artifacts).map(({ id, name }) => [id, name]), (artifacts, previousArtifacts = []) => {
		const artifactsChanged = artifacts.length !== previousArtifacts.length || artifacts.some(([workflowId, name], index) => workflowId !== previousArtifacts[index]?.[0] || name !== previousArtifacts[index]?.[1]);
		const revisionBeforeChange = revision.value;
		const nextIds = new Set(artifacts.map(([workflowId]) => workflowId));
		for (const [workflowId, name] of artifacts) {
			const entry = entries.get(workflowId);
			if (!entry?.index || entry.source === "active" || entry.index.workflowName === name) continue;
			setEntry(workflowId, {
				...entry,
				index: {
					...entry.index,
					workflowName: name
				}
			});
		}
		for (const [workflowId] of previousArtifacts) {
			if (nextIds.has(workflowId)) continue;
			nextGeneration(workflowId);
			pendingLoads.delete(workflowId);
			removeEntry(workflowId);
		}
		if (artifactsChanged && revision.value === revisionBeforeChange) revision.value++;
	}, { immediate: true });
	const activeProjection = computed(() => {
		const workflowId = toValue(options.activeWorkflowId);
		if (!workflowId || !artifactById.value.has(workflowId)) return void 0;
		return getActiveProjection(workflowId);
	});
	watch([() => toValue(options.activeWorkflowId), activeProjection], ([workflowId, index], previousValues) => {
		const previousWorkflowId = previousValues?.[0];
		if (previousWorkflowId !== void 0 && previousWorkflowId !== workflowId && entries.get(previousWorkflowId)?.source === "active") {
			invalidate(previousWorkflowId);
			load(previousWorkflowId);
		}
		if (!workflowId || !artifactById.value.has(workflowId)) return;
		if (index) {
			nextGeneration(workflowId);
			setEntry(workflowId, {
				status: "ready",
				source: "active",
				index
			});
		} else if (entries.get(workflowId)?.source === "active") {
			invalidate(workflowId);
			load(workflowId);
		} else if (!entries.has(workflowId)) load(workflowId);
	}, { immediate: true });
	onScopeDispose(dispose);
	return {
		entries,
		revision,
		getEntry,
		getIndex,
		load,
		loadAll,
		invalidate,
		retry,
		dispose
	};
}
function buildMentionKey(kind, workflowId, entityId) {
	return `${kind}:${workflowId}:${entityId}`;
}
function buildWorkflowMentionItem(workflow, source) {
	return {
		key: buildMentionKey("workflow", workflow.id, workflow.id),
		kind: "workflow",
		source,
		label: workflow.name,
		breadcrumbs: [workflow.name],
		workflowId: workflow.id,
		entityId: workflow.id,
		workflowName: workflow.name,
		...workflow.description ? { description: workflow.description } : {}
	};
}
function buildNodeMentionItem(index, nodeId, groupId) {
	const node = index.nodesById.get(nodeId);
	if (!node) return void 0;
	const group = groupId ? index.groupsById.get(groupId) : void 0;
	return {
		key: buildMentionKey("node", index.workflowId, node.id),
		kind: "node",
		source: "artifacts",
		label: node.name,
		breadcrumbs: [
			index.workflowName,
			...group ? [group.name] : [],
			node.name
		],
		workflowId: index.workflowId,
		entityId: node.id,
		workflowName: index.workflowName,
		...group ? {
			groupId: group.id,
			groupName: group.name
		} : {},
		nodeTypeName: node.type,
		nodeTypeVersion: node.typeVersion
	};
}
function buildGroupMentionItem(index, groupId, includeChildren, excludedKeys) {
	const group = index.groupsById.get(groupId);
	if (!group) return void 0;
	const children = includeChildren ? group.nodeIds.map((nodeId) => buildNodeMentionItem(index, nodeId, group.id)).filter((item) => item !== void 0 && !excludedKeys?.has(item.key)) : void 0;
	return {
		key: buildMentionKey("group", index.workflowId, group.id),
		kind: "group",
		source: "artifacts",
		label: group.name,
		breadcrumbs: [index.workflowName, group.name],
		workflowId: index.workflowId,
		entityId: group.id,
		workflowName: index.workflowName,
		groupId: group.id,
		groupName: group.name,
		nodeCount: group.nodeIds.length,
		...includeChildren ? {
			hasChildren: Boolean(children?.length),
			...children ? { children } : {}
		} : {}
	};
}
function buildArtifactWorkflowItem(artifact, index, includeChildren = true, excludedKeys) {
	const workflowName = index?.workflowName ?? artifact.name;
	const children = includeChildren && index ? [...index.groups.map((group) => buildGroupMentionItem(index, group.id, true, excludedKeys)), ...index.nodes.filter((node) => !index.nodeIdToGroupId.has(node.id)).map((node) => buildNodeMentionItem(index, node.id))].filter((item) => item !== void 0 && (!excludedKeys?.has(item.key) || Boolean(item.hasChildren && item.children?.length))) : void 0;
	return {
		key: buildMentionKey("workflow", artifact.id, artifact.id),
		kind: "workflow",
		source: "artifacts",
		label: workflowName,
		breadcrumbs: [workflowName],
		workflowId: artifact.id,
		entityId: artifact.id,
		workflowName,
		...index ? { nodeCount: index.nodes.length } : {},
		...includeChildren ? {
			hasChildren: index ? Boolean(children?.length) : true,
			...children ? { children } : {}
		} : {}
	};
}
function buildArtifactBrowseItems(artifacts, getIndex, excludedKeys) {
	const items = [];
	for (const artifact of artifacts) {
		const item = buildArtifactWorkflowItem(artifact, getIndex(artifact.id), true, excludedKeys);
		if (excludedKeys?.has(item.key) && !item.hasChildren) continue;
		items.push(item);
		if (items.length === 10) break;
	}
	return items;
}
function buildArtifactSearchItems(artifacts, getIndex, excludedKeys) {
	const items = [];
	for (const artifact of artifacts) {
		const index = getIndex(artifact.id);
		const workflowItem = buildArtifactWorkflowItem(artifact, index, false);
		if (!excludedKeys?.has(workflowItem.key)) items.push(workflowItem);
		if (!index) continue;
		for (const group of index.groups) {
			const item = buildGroupMentionItem(index, group.id, false);
			if (item && !excludedKeys?.has(item.key)) items.push(item);
		}
		for (const node of index.nodes) {
			const item = buildNodeMentionItem(index, node.id, index.nodeIdToGroupId.get(node.id));
			if (item && !excludedKeys?.has(item.key)) items.push(item);
		}
	}
	return items;
}
//#endregion
//#region src/features/ai/assistant-at-mentions/utils/searchMentionItems.ts
var MATCH_RANK = {
	exact: 0,
	prefix: 1,
	tokenPrefix: 2,
	substring: 3,
	description: 4
};
var TOKEN_SEPARATOR = /[^\p{L}\p{N}]+/u;
function getMatchRank(item, normalizedQuery) {
	const normalizedName = item.label.trim().toLocaleLowerCase();
	if (normalizedName === normalizedQuery) return MATCH_RANK.exact;
	if (normalizedName.startsWith(normalizedQuery)) return MATCH_RANK.prefix;
	if (normalizedName.split(TOKEN_SEPARATOR).filter(Boolean).some((token) => token.startsWith(normalizedQuery))) return MATCH_RANK.tokenPrefix;
	if (normalizedName.includes(normalizedQuery)) return MATCH_RANK.substring;
	if (item.description?.toLocaleLowerCase().includes(normalizedQuery)) return MATCH_RANK.description;
}
function searchMentionItems(items, query, limit) {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (normalizedQuery === "" || limit <= 0) return [];
	const ranked = items.flatMap((item) => {
		const rank = getMatchRank(item, normalizedQuery);
		return rank === void 0 ? [] : [{
			item,
			rank
		}];
	}).sort((left, right) => left.rank - right.rank);
	const bestItemByKey = /* @__PURE__ */ new Map();
	for (const { item } of ranked) if (!bestItemByKey.has(item.key)) bestItemByKey.set(item.key, item);
	return [...bestItemByKey.values()].slice(0, limit);
}
//#endregion
//#region src/features/ai/assistant-at-mentions/composables/useAssistantMentionSources.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var MAX_WORKFLOW_BROWSE_CANDIDATES = 50;
function createArtifactMentionSourceProvider(options) {
	return {
		id: "artifacts",
		revision: options.artifactIndex.revision,
		async browse() {
			return buildArtifactBrowseItems(toValue(options.artifacts), options.artifactIndex.getIndex, options.excludedKeys ? toValue(options.excludedKeys) : void 0);
		},
		async search(query) {
			await options.artifactIndex.loadAll();
			return searchMentionItems(buildArtifactSearchItems(toValue(options.artifacts), options.artifactIndex.getIndex, options.excludedKeys ? toValue(options.excludedKeys) : void 0), query, 10);
		}
	};
}
function createWorkflowMentionSourceProvider(options) {
	const recentWorkflowsStore = useRecentWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	function toMentionItems(workflows) {
		return workflows.slice(0, 10).map((workflow) => buildWorkflowMentionItem(workflow, "workflows"));
	}
	/**
	* Recently opened workflows of the project, without the excluded ones. A failed
	* lookup yields no workflows instead of an error, so the project backfill can
	* still fill the section.
	*/
	async function resolveRecentWorkflows(projectId, excludedWorkflowIds) {
		try {
			return await recentWorkflowsStore.resolveRecentWorkflows(projectId, excludedWorkflowIds);
		} catch {
			return [];
		}
	}
	/** The most recently updated workflows of the project that are not excluded. */
	async function backfillProjectWorkflows(projectId, excludedIds) {
		return (await workflowsListStore.searchWorkflows({
			projectId,
			isArchived: false,
			select: [
				"id",
				"name",
				"updatedAt"
			],
			options: {
				take: Math.min(10 + excludedIds.size, MAX_WORKFLOW_BROWSE_CANDIDATES),
				skip: 0,
				sortBy: "updatedAt:desc",
				includeScopes: false
			}
		})).filter(({ id }) => !excludedIds.has(id));
	}
	return {
		id: "workflows",
		async browse() {
			const projectId = toValue(options.projectId)?.trim();
			if (!projectId) return [];
			const artifactWorkflowIds = toValue(options.artifactWorkflowIds);
			const excludedWorkflowIds = options.excludedWorkflowIds ? toValue(options.excludedWorkflowIds) : [];
			const recentWorkflows = await resolveRecentWorkflows(projectId, [...artifactWorkflowIds, ...excludedWorkflowIds]);
			if (recentWorkflows.length >= 10) return toMentionItems(recentWorkflows);
			const excludedIds = /* @__PURE__ */ new Set([
				...artifactWorkflowIds,
				...excludedWorkflowIds,
				...recentWorkflows.map(({ id }) => id)
			]);
			try {
				const backfillWorkflows = await backfillProjectWorkflows(projectId, excludedIds);
				return toMentionItems([...recentWorkflows, ...backfillWorkflows]);
			} catch (error) {
				if (recentWorkflows.length === 0) throw error;
				return toMentionItems(recentWorkflows);
			}
		},
		async search(query) {
			const projectId = toValue(options.projectId)?.trim();
			const normalizedQuery = query.trim();
			if (!projectId || !normalizedQuery) return [];
			const excludedWorkflowIds = new Set(options.excludedWorkflowIds ? toValue(options.excludedWorkflowIds) : []);
			return toMentionItems((await workflowsListStore.searchWorkflows({
				projectId,
				query: normalizedQuery,
				isArchived: false,
				select: [
					"id",
					"name",
					"description",
					"updatedAt"
				],
				options: {
					take: Math.min(10 + excludedWorkflowIds.size, MAX_WORKFLOW_BROWSE_CANDIDATES),
					skip: 0,
					sortBy: "updatedAt:desc",
					includeScopes: false
				}
			})).filter(({ id }) => !excludedWorkflowIds.has(id)));
		}
	};
}
function useAssistantMentionSources(providers, options = {}) {
	const browseSections = shallowRef([]);
	const searchResults = shallowRef([]);
	const providerErrors = shallowRef(/* @__PURE__ */ new Map());
	const isBrowsing = ref(false);
	const isSearching = ref(false);
	const browseItemsByProvider = /* @__PURE__ */ new Map();
	const searchItemsByProvider = /* @__PURE__ */ new Map();
	const providerRequestGenerations = /* @__PURE__ */ new Map();
	let latestRequestGeneration = 0;
	let currentQuery = "";
	let currentMode;
	let disposed = false;
	function updateBrowseSections() {
		const excludedKeys = options.excludedKeys ? toValue(options.excludedKeys) : void 0;
		browseSections.value = providers.map((provider) => ({
			id: provider.id,
			items: (browseItemsByProvider.get(provider.id) ?? []).filter((item) => !excludedKeys?.has(item.key) || item.hasChildren).slice(0, 10)
		}));
	}
	function updateSearchResults(query) {
		const excludedKeys = options.excludedKeys ? toValue(options.excludedKeys) : void 0;
		searchResults.value = searchMentionItems(providers.flatMap((provider) => searchItemsByProvider.get(provider.id) ?? []).filter((item) => !excludedKeys?.has(item.key)), query, 10);
	}
	function clearSearchResults() {
		latestRequestGeneration++;
		currentQuery = "";
		currentMode = void 0;
		isBrowsing.value = false;
		isSearching.value = false;
		searchItemsByProvider.clear();
		searchResults.value = [];
	}
	function clearProviderError(providerId) {
		if (!providerErrors.value.has(providerId)) return;
		const nextErrors = new Map(providerErrors.value);
		nextErrors.delete(providerId);
		providerErrors.value = nextErrors;
	}
	function setProviderError(providerId, error) {
		providerErrors.value = new Map(providerErrors.value).set(providerId, error);
	}
	function nextProviderRequestGeneration(providerId) {
		const generation = (providerRequestGenerations.get(providerId) ?? 0) + 1;
		providerRequestGenerations.set(providerId, generation);
		return generation;
	}
	async function loadBrowseProvider(provider, generation) {
		const providerGeneration = nextProviderRequestGeneration(provider.id);
		try {
			const items = await provider.browse();
			if (disposed || generation !== latestRequestGeneration || providerGeneration !== providerRequestGenerations.get(provider.id)) return;
			browseItemsByProvider.set(provider.id, items);
			clearProviderError(provider.id);
			updateBrowseSections();
		} catch (error) {
			if (disposed || generation !== latestRequestGeneration || providerGeneration !== providerRequestGenerations.get(provider.id)) return;
			browseItemsByProvider.set(provider.id, []);
			setProviderError(provider.id, error);
			updateBrowseSections();
		}
	}
	async function browse() {
		const generation = ++latestRequestGeneration;
		currentQuery = "";
		currentMode = "browse";
		isSearching.value = false;
		isBrowsing.value = true;
		searchResults.value = [];
		providerErrors.value = /* @__PURE__ */ new Map();
		browseItemsByProvider.clear();
		updateBrowseSections();
		await Promise.allSettled(providers.map(async (provider) => await loadBrowseProvider(provider, generation)));
		if (!disposed && generation === latestRequestGeneration) isBrowsing.value = false;
	}
	async function loadSearchProvider(provider, query, generation) {
		const providerGeneration = nextProviderRequestGeneration(provider.id);
		try {
			const items = await provider.search(query);
			if (disposed || generation !== latestRequestGeneration || query !== currentQuery || providerGeneration !== providerRequestGenerations.get(provider.id)) return;
			searchItemsByProvider.set(provider.id, items);
			clearProviderError(provider.id);
			updateSearchResults(query);
		} catch (error) {
			if (disposed || generation !== latestRequestGeneration || query !== currentQuery || providerGeneration !== providerRequestGenerations.get(provider.id)) return;
			searchItemsByProvider.set(provider.id, []);
			setProviderError(provider.id, error);
			updateSearchResults(query);
		}
	}
	async function search(query) {
		const generation = ++latestRequestGeneration;
		const normalizedQuery = query.trim();
		currentQuery = normalizedQuery;
		currentMode = normalizedQuery ? "search" : void 0;
		isBrowsing.value = false;
		providerErrors.value = /* @__PURE__ */ new Map();
		searchItemsByProvider.clear();
		searchResults.value = [];
		if (!normalizedQuery) {
			isSearching.value = false;
			return;
		}
		isSearching.value = true;
		await Promise.allSettled(providers.map(async (provider) => await loadSearchProvider(provider, normalizedQuery, generation)));
		if (!disposed && generation === latestRequestGeneration) isSearching.value = false;
	}
	for (const provider of providers) {
		if (!provider.revision) continue;
		watch(provider.revision, () => {
			if (disposed) return;
			if (currentMode === "search" && currentQuery) loadSearchProvider(provider, currentQuery, latestRequestGeneration);
			else if (currentMode === "browse") loadBrowseProvider(provider, latestRequestGeneration);
		});
	}
	function dispose() {
		disposed = true;
		latestRequestGeneration++;
	}
	onScopeDispose(dispose);
	return {
		browseSections,
		searchResults,
		providerErrors,
		isBrowsing,
		isSearching,
		browse,
		search,
		clearSearchResults,
		dispose
	};
}
//#endregion
//#region src/features/ai/assistant-at-mentions/utils/buildMentionAttachment.ts
function buildMentionAttachment(item, index) {
	if (item.kind === "workflow") return {
		item,
		attachment: {
			type: "workflow",
			id: item.workflowId,
			name: item.workflowName
		},
		truncated: false
	};
	if (item.kind === "node") return {
		item,
		attachment: {
			type: "nodes",
			workflowId: item.workflowId,
			workflowName: item.workflowName,
			sets: [{ nodes: [{
				id: item.entityId,
				name: item.label
			}] }]
		},
		truncated: false
	};
	const group = index?.groupsById.get(item.entityId);
	if (!group || !index) return void 0;
	const groupNodes = group.nodeIds.map((nodeId) => index.nodesById.get(nodeId)).filter((node) => node !== void 0);
	const nodes = groupNodes.slice(0, 50).map(({ id, name }) => ({
		id,
		name
	}));
	if (nodes.length === 0) return void 0;
	return {
		item,
		attachment: {
			type: "nodes",
			workflowId: item.workflowId,
			workflowName: item.workflowName,
			sets: [{
				nodes,
				canvasGroupId: group.id,
				canvasGroupName: group.name
			}]
		},
		truncated: groupNodes.length > 50
	};
}
//#endregion
//#region src/features/ai/assistant-at-mentions/AssistantAtMentionPicker.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RETRY_ITEM_PREFIX = "retry:";
var RETRY_SOURCES_ITEM_ID = "retry-sources";
var ERROR_ITEM_PREFIX = "error:";
var LOADING_ITEM_PREFIX = "loading:";
var AssistantAtMentionPicker_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AssistantAtMentionPicker",
	props: {
		modelValue: { type: Boolean },
		query: {},
		projectId: { default: void 0 },
		artifacts: { default: () => [] },
		activeWorkflowId: { default: void 0 },
		excludedKeys: { default: () => [] },
		excludedWorkflowIds: { default: () => [] },
		inputElement: { default: null },
		reference: { default: null },
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"update:modelValue",
		"select",
		"empty-search"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const dropdownRef = ref();
		const referenceElement = computed(() => props.reference);
		const { width: referenceWidth } = useElementSize(referenceElement);
		const menuWidth = computed(() => referenceWidth.value > 0 ? `${referenceWidth.value}px` : void 0);
		const excludedKeys = computed(() => new Set(props.excludedKeys));
		const artifactIndex = useArtifactMentionIndex({
			artifacts: () => props.artifacts,
			activeWorkflowId: () => props.activeWorkflowId
		});
		const sources = useAssistantMentionSources([createArtifactMentionSourceProvider({
			artifacts: () => props.artifacts,
			artifactIndex,
			excludedKeys
		}), createWorkflowMentionSourceProvider({
			projectId: () => props.projectId,
			artifactWorkflowIds: () => props.artifacts.map(({ id }) => id),
			excludedWorkflowIds: () => props.excludedWorkflowIds
		})], { excludedKeys });
		const searchPending = ref(false);
		let highlightedForCurrentOpen = false;
		let submenuOpenCount = 0;
		function isMenuItem(item) {
			return item !== void 0;
		}
		function toMenuItem(item, searchMode) {
			const indexEntry = artifactIndex.getEntry(item.workflowId);
			const isExcluded = excludedKeys.value.has(item.key);
			let children = item.children?.map((child) => toMenuItem(child, false)).filter(isMenuItem);
			if (isExcluded && children?.length === 0) return void 0;
			if (isExcluded && !item.hasChildren) return void 0;
			if (item.hasChildren && !children) children = indexEntry?.status === "error" ? [{
				id: `${ERROR_ITEM_PREFIX}${item.workflowId}`,
				label: i18n.baseText("instanceAi.mentions.loadError"),
				disabled: true
			}, {
				id: `${RETRY_ITEM_PREFIX}${item.workflowId}`,
				label: i18n.baseText("generic.retry"),
				keepOpen: true
			}] : [{
				id: `${LOADING_ITEM_PREFIX}${item.workflowId}`,
				label: i18n.baseText("instanceAi.mentions.loadingWorkflowContents"),
				disabled: true
			}];
			return {
				id: item.key,
				label: searchMode ? item.breadcrumbs.join(" > ") : item.label,
				data: {
					item,
					...item.kind === "node" && item.nodeTypeName ? { nodeType: nodeTypesStore.getNodeType(item.nodeTypeName, item.nodeTypeVersion) } : {}
				},
				selectable: item.hasChildren && !isExcluded ? true : void 0,
				children
			};
		}
		const menuItems = computed(() => {
			if (props.query.trim()) return sources.searchResults.value.map((item) => toMenuItem(item, true)).filter(isMenuItem);
			const sections = sources.browseSections.value.map((section) => ({
				...section,
				hadItems: section.items.length > 0,
				items: section.items.map((item) => toMenuItem(item, false)).filter(isMenuItem)
			}));
			if (!sections.some((section) => section.items.length > 0) && sources.providerErrors.value.size > 0) return [];
			return sections.flatMap((section) => {
				if (section.items.length === 0) {
					if (!(section.id === "workflows" && !section.hadItems && !sources.isBrowsing.value && sources.providerErrors.value.has("workflows"))) return [];
					return [{
						id: "state:workflows-error",
						label: i18n.baseText("instanceAi.mentions.loadError"),
						disabled: true
					}, {
						id: RETRY_SOURCES_ITEM_ID,
						label: i18n.baseText("generic.retry"),
						keepOpen: true
					}];
				}
				return section.items;
			});
		});
		const isLoading = computed(() => (props.query.trim() ? sources.searchResults.value.length === 0 : !sources.browseSections.value.some((section) => section.items.length > 0)) && (searchPending.value || sources.isBrowsing.value || sources.isSearching.value));
		const emptyText = computed(() => i18n.baseText(props.query.trim() ? "instanceAi.mentions.noResults" : "instanceAi.mentions.noRecentWorkflows"));
		function getResultPosition(itemId) {
			function find(items) {
				let position = 0;
				for (const item of items) {
					if (item.data) position++;
					if (item.id === itemId && item.data) return position;
					const childPosition = item.children ? find(item.children) : void 0;
					if (childPosition !== void 0) return childPosition;
				}
			}
			return find(menuItems.value);
		}
		const itemsById = computed(() => {
			const items = /* @__PURE__ */ new Map();
			const visit = (menuItemsToVisit) => {
				for (const menuItem of menuItemsToVisit) {
					if (menuItem.data) items.set(menuItem.id, menuItem.data.item);
					if (menuItem.children) visit(menuItem.children);
				}
			};
			visit(menuItems.value);
			return items;
		});
		const runSearch = useDebounceFn(async (query) => {
			if (!props.modelValue || query !== props.query.trim()) return;
			try {
				await sources.search(query);
			} finally {
				if (query === props.query.trim()) searchPending.value = false;
			}
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		watch(() => props.modelValue, (open) => {
			if (open) Promise.resolve(nodeTypesStore.loadNodeTypesIfNotLoaded()).catch(() => void 0);
		}, { immediate: true });
		watch([() => props.modelValue, () => props.query], ([open, query]) => {
			if (!open) {
				searchPending.value = false;
				return;
			}
			highlightedForCurrentOpen = false;
			const normalizedQuery = query.trim();
			if (normalizedQuery) {
				searchPending.value = true;
				sources.clearSearchResults();
				runSearch(normalizedQuery);
			} else {
				searchPending.value = false;
				sources.browse();
				artifactIndex.loadAll();
			}
		}, { immediate: true });
		watch(() => props.modelValue, (open) => {
			highlightedForCurrentOpen = false;
			if (open) submenuOpenCount = 0;
			if (open && menuItems.value.length > 0) {
				highlightedForCurrentOpen = true;
				nextTick(() => dropdownRef.value?.highlightFirstItem());
			}
		});
		const isEmptySearchShown = computed(() => props.modelValue && props.query.trim().length > 0 && !isLoading.value && menuItems.value.length === 0 && sources.providerErrors.value.size === 0);
		const reportedEmptyQueries = /* @__PURE__ */ new Set();
		let pendingEmptyQuery;
		let emptySearchTimer;
		function reportEmptySearch(query) {
			if (reportedEmptyQueries.has(query)) return;
			reportedEmptyQueries.add(query);
			emit("empty-search", query);
		}
		function clearPendingEmptySearch() {
			if (emptySearchTimer !== void 0) clearTimeout(emptySearchTimer);
			emptySearchTimer = void 0;
			pendingEmptyQuery = void 0;
		}
		/** Report an empty state the user is leaving before it settled: they still saw it. */
		function flushEmptySearch() {
			if (pendingEmptyQuery !== void 0) reportEmptySearch(pendingEmptyQuery);
			clearPendingEmptySearch();
		}
		watch([
			() => props.modelValue,
			isEmptySearchShown,
			() => props.query.trim()
		], ([open, shown, query]) => {
			if (!open) {
				flushEmptySearch();
				reportedEmptyQueries.clear();
				return;
			}
			clearPendingEmptySearch();
			if (!shown) return;
			pendingEmptyQuery = query;
			emptySearchTimer = setTimeout(() => {
				emptySearchTimer = void 0;
				pendingEmptyQuery = void 0;
				reportEmptySearch(query);
			}, getDebounceTime(DEBOUNCE_TIME.TELEMETRY.TRACK));
		});
		onBeforeUnmount(flushEmptySearch);
		watch(menuItems, (items) => {
			if (!props.modelValue || highlightedForCurrentOpen || items.length === 0) return;
			highlightedForCurrentOpen = true;
			nextTick(() => dropdownRef.value?.highlightFirstItem());
		});
		function handleSelect(itemId) {
			if (itemId === RETRY_SOURCES_ITEM_ID) {
				retrySources();
				return;
			}
			if (itemId.startsWith(RETRY_ITEM_PREFIX)) {
				artifactIndex.retry(itemId.slice(6));
				return;
			}
			const item = itemsById.value.get(itemId);
			if (!item) return;
			const selection = buildMentionAttachment(item, artifactIndex.getIndex(item.workflowId));
			if (selection) {
				const resultPosition = getResultPosition(itemId);
				emit("select", {
					...selection,
					...resultPosition !== void 0 ? { telemetry: {
						mode: props.query.trim() ? "search" : "browse",
						resultPosition,
						queryLength: props.query.trim().length
					} } : {}
				});
			}
		}
		function retrySources() {
			if (props.query.trim()) sources.search(props.query);
			else sources.browse();
		}
		function handleSubmenuToggle(itemId, open) {
			if (!open) return;
			submenuOpenCount++;
			const item = itemsById.value.get(itemId);
			if (!item || item.kind !== "workflow") return;
			if (artifactIndex.getEntry(item.workflowId)?.status === "error") artifactIndex.retry(item.workflowId);
			else artifactIndex.load(item.workflowId);
		}
		function handleExternalKeydown(event) {
			return dropdownRef.value?.handleExternalKeydown(event) ?? false;
		}
		/**
		* Snapshot of the list for the dismissal telemetry. Read synchronously while the
		* host closes the menu, so it still sees the query and rows the user looked at.
		* Rows sharing a visible label are what the user could not tell apart.
		*/
		function getOpenMetrics() {
			const rows = menuItems.value.filter((item) => item.data !== void 0);
			const labelCounts = /* @__PURE__ */ new Map();
			for (const row of rows) labelCounts.set(row.label, (labelCounts.get(row.label) ?? 0) + 1);
			const query = props.query.trim();
			return {
				mode: query ? "search" : "browse",
				queryLength: query.length,
				resultCount: rows.length,
				ambiguousResultCount: rows.filter((row) => (labelCounts.get(row.label) ?? 0) > 1).length,
				submenuOpenCount
			};
		}
		__expose({
			handleExternalKeydown,
			getOpenMetrics,
			flushEmptySearch
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				ref_key: "dropdownRef",
				ref: dropdownRef,
				"model-value": __props.modelValue,
				items: menuItems.value,
				"external-focus-target": __props.inputElement,
				reference: __props.reference ?? void 0,
				width: menuWidth.value,
				"extra-popper-class": _ctx.$style.menuContent,
				disabled: __props.disabled,
				loading: isLoading.value,
				"empty-text": emptyText.value,
				"search-placeholder": unref(i18n).baseText("instanceAi.mentions.searchPlaceholder"),
				placement: "top-start",
				searchable: "",
				"search-mode": "external",
				"data-test-id": "instance-ai-mention-menu",
				"content-test-id": "instance-ai-mention-menu-content",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event)),
				onSelect: handleSelect,
				"onSubmenu:toggle": handleSubmenuToggle
			}, createSlots({
				loading: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.loadingState) }, [createVNode(unref(N8nSpinner_default), { size: "small" })], 2)]),
				trigger: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					"as-child": "",
					content: unref(i18n).baseText("instanceAi.mentions.buttonLabel"),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "at-sign",
						variant: "ghost",
						size: "medium",
						disabled: __props.disabled,
						title: unref(i18n).baseText("instanceAi.mentions.buttonLabel"),
						"aria-label": unref(i18n).baseText("instanceAi.mentions.buttonLabel"),
						"data-test-id": "instance-ai-mention-button"
					}, null, 8, [
						"disabled",
						"title",
						"aria-label"
					])]),
					_: 1
				}, 8, ["content"])]),
				"item-leading": withCtx(({ item, ui }) => [item.data?.item.kind === "workflow" ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					icon: "workflow",
					size: "large",
					class: normalizeClass(ui.class)
				}, null, 8, ["class"])) : item.data?.item.kind === "group" ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "group",
					size: "large",
					class: normalizeClass(ui.class)
				}, null, 8, ["class"])) : item.data?.item.kind === "node" ? (openBlock(), createBlock(NodeIcon_default, {
					key: 2,
					"node-type": item.data.nodeType,
					size: 16,
					class: normalizeClass(ui.class)
				}, null, 8, ["node-type", "class"])) : createCommentVNode("", true)]),
				"item-label": withCtx(({ item, ui }) => [createVNode(unref(N8nText_default), {
					class: normalizeClass(ui.class),
					title: item.label,
					size: "medium",
					color: item.disabled ? "text-xlight" : "text-dark"
				}, {
					default: withCtx(() => [__props.query.trim() && item.data?.item ? (openBlock(), createBlock(AssistantMentionBreadcrumbs_default, {
						key: 0,
						segments: item.data.item.breadcrumbs
					}, null, 8, ["segments"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(item.label), 1)], 64))]),
					_: 2
				}, 1032, [
					"class",
					"title",
					"color"
				])]),
				"item-trailing": withCtx(({ item, ui }) => [item.data?.item.hasChildren && item.data.item.nodeCount !== void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					class: normalizeClass(ui.class),
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.data.item.nodeCount), 1)]),
					_: 2
				}, 1032, ["class"])) : createCommentVNode("", true)]),
				_: 2
			}, [unref(sources).providerErrors.value.size > 0 ? {
				name: "empty",
				fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.errorState) }, [createVNode(unref(N8nText_default), { size: "small" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.mentions.loadError")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					size: "small",
					variant: "outline",
					onClick: retrySources
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				})], 2)]),
				key: "0"
			} : void 0, __props.query.trim() && menuItems.value.length > 0 && unref(sources).providerErrors.value.size > 0 ? {
				name: "footer",
				fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.errorState) }, [createVNode(unref(N8nText_default), { size: "small" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.mentions.loadError")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					size: "small",
					variant: "outline",
					onClick: retrySources
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				})], 2)]),
				key: "1"
			} : void 0]), 1032, [
				"model-value",
				"items",
				"external-focus-target",
				"reference",
				"width",
				"extra-popper-class",
				"disabled",
				"loading",
				"empty-text",
				"search-placeholder"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	menuContent: "_menuContent_j3fn7_1",
	loadingState: "_loadingState_j3fn7_5",
	errorState: "_errorState_j3fn7_11"
} }]]);
//#endregion
//#region src/features/ai/assistant-at-mentions/composables/useAssistantAtMentions.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Characters that open the mention picker when typed. Japanese IMEs, and CJK
* IMEs in full-width mode, emit the fullwidth `＠` (U+FF20) for the `@` key.
*/
var MENTION_TRIGGER_CHARACTERS = /* @__PURE__ */ new Set(["@", "＠"]);
function isMentionTrigger(character) {
	return character !== void 0 && MENTION_TRIGGER_CHARACTERS.has(character);
}
function findLastMentionTriggerIndex(text) {
	for (let index = text.length - 1; index >= 0; index--) if (isMentionTrigger(text[index])) return index;
	return -1;
}
/** True at the start of the text or after whitespace. */
function isMentionBoundary(text, triggerIndex) {
	return triggerIndex === 0 || /\s/.test(text[triggerIndex - 1] ?? "");
}
/**
* Remove a typed trigger and its query. Also remove one following space when
* the trigger starts the text or follows whitespace. That space would stay
* in the draft.
*/
function textWithoutTypedRange(text, range) {
	const end = isMentionBoundary(text, range.start) && text[range.end] === " " ? range.end + 1 : range.end;
	return text.slice(0, range.start) + text.slice(end);
}
function useAssistantAtMentions(options) {
	const menuOpen = ref(false);
	const query = ref("");
	const activeRange = ref();
	const savedSelection = ref({
		start: 0,
		end: 0
	});
	const dismissedTypedTriggerIndex = ref();
	let updatingTextInternally = false;
	let openSource;
	function updateText(value) {
		updatingTextInternally = true;
		options.text.value = value;
		updatingTextInternally = false;
	}
	function markOpened(source) {
		if (openSource !== void 0) return;
		openSource = source;
		menuOpen.value = true;
		options.onOpened?.(source);
	}
	function close(rememberTypedTrigger = false, reason = "closed_menu") {
		const range = activeRange.value;
		if (rememberTypedTrigger && range?.origin === "typed") dismissedTypedTriggerIndex.value = range.start;
		if (range) options.onClosed?.({
			source: openSource ?? range.origin,
			reason
		});
		openSource = void 0;
		menuOpen.value = false;
		query.value = "";
		activeRange.value = void 0;
	}
	function saveSelection() {
		const input = options.getInputElement();
		if (!input) return;
		savedSelection.value = {
			start: input.selectionStart,
			end: input.selectionEnd
		};
	}
	function openTypedRange(triggerIndex, caret, initialQuery = "") {
		activeRange.value = {
			origin: "typed",
			start: triggerIndex,
			queryStart: triggerIndex + 1,
			end: caret
		};
		dismissedTypedTriggerIndex.value = void 0;
		query.value = initialQuery;
		markOpened("typed");
	}
	function openFromButton() {
		if (!toValue(options.enabled)) return;
		saveSelection();
		activeRange.value = {
			origin: "button",
			start: savedSelection.value.start,
			queryStart: savedSelection.value.start,
			end: savedSelection.value.end
		};
		query.value = "";
		markOpened("button");
	}
	async function handleTextChange(value, caretOverride) {
		updateText(value);
		if (dismissedTypedTriggerIndex.value !== void 0 && !isMentionTrigger(value[dismissedTypedTriggerIndex.value])) dismissedTypedTriggerIndex.value = void 0;
		if (!toValue(options.enabled)) {
			close(false, "unavailable");
			return;
		}
		await nextTick();
		const input = options.getInputElement();
		const caret = caretOverride ?? input?.selectionEnd ?? value.length;
		savedSelection.value = {
			start: caret,
			end: caret
		};
		const valueBeforeCaret = value.slice(0, caret);
		const possibleTriggerIndex = findLastMentionTriggerIndex(valueBeforeCaret);
		const triggerIndex = isMentionBoundary(valueBeforeCaret, possibleTriggerIndex) ? possibleTriggerIndex : -1;
		const range = activeRange.value;
		if (triggerIndex >= 0 && (!range || range.origin !== "typed" || range.start !== triggerIndex)) {
			if (dismissedTypedTriggerIndex.value === triggerIndex && !range) return;
			openTypedRange(triggerIndex, caret, value.slice(triggerIndex + 1, caret));
			return;
		}
		if (range) {
			const triggerExists = range.origin === "button" || isMentionTrigger(value[range.start]);
			const beforeRange = range.origin === "typed" ? caret <= range.start : caret < range.start;
			if (!triggerExists) {
				close(false, "deleted_trigger");
				return;
			}
			if (beforeRange) {
				close(false, "moved_caret");
				return;
			}
			range.end = caret;
			query.value = value.slice(range.queryStart, caret);
			return;
		}
	}
	async function handleCaretMove() {
		await nextTick();
		saveSelection();
		const range = activeRange.value;
		if (!range) return;
		const selection = savedSelection.value;
		if ((range.origin === "typed" ? selection.start <= range.start : selection.start < range.start) || selection.start > range.end || selection.end > range.end) close(false, "moved_caret");
	}
	/**
	* A typed pick removes the `@` query. A button pick leaves the draft unchanged.
	*/
	async function clearActiveRange() {
		const range = activeRange.value;
		const typed = range?.origin === "typed";
		if (typed && range) updateText(textWithoutTypedRange(options.text.value, range));
		close(false, "selected");
		await nextTick();
		const input = options.getInputElement();
		input?.focus({ preventScroll: true });
		if (typed && range) {
			input?.setSelectionRange(range.start, range.start);
			savedSelection.value = {
				start: range.start,
				end: range.start
			};
			return;
		}
		const start = range?.start ?? savedSelection.value.start;
		const end = range?.end ?? savedSelection.value.end;
		input?.setSelectionRange(start, end);
		savedSelection.value = {
			start,
			end
		};
	}
	/**
	* Dismissing the menu right after typing `@` would leave a stray trigger in the
	* draft. Remove it, along with any whitespace typed after it, and put the caret
	* back where it was. Returns false when there is nothing to remove: a button
	* range, a query after the trigger, or a trigger the text no longer holds.
	*/
	function removeEmptyTypedTrigger() {
		const range = activeRange.value;
		const text = options.text.value;
		if (!range || range.origin !== "typed" || !isMentionTrigger(text[range.start]) || text.slice(range.queryStart, range.end).trim() !== "") return false;
		updateText(textWithoutTypedRange(text, range));
		close();
		nextTick(() => {
			const input = options.getInputElement();
			if (input && document.activeElement === input) input.setSelectionRange(range.start, range.start);
			savedSelection.value = {
				start: range.start,
				end: range.start
			};
		});
		return true;
	}
	function handleMenuOpenChange(open) {
		if (!open) {
			if (!removeEmptyTypedTrigger()) close(true);
			return;
		}
		if (!activeRange.value) openFromButton();
	}
	watch(() => toValue(options.enabled), (enabled) => {
		if (!enabled) close(false, "unavailable");
	});
	watch(options.text, () => {
		if (!updatingTextInternally) dismissedTypedTriggerIndex.value = void 0;
	}, { flush: "sync" });
	return {
		menuOpen,
		query,
		saveSelection,
		openFromButton,
		handleTextChange,
		handleCaretMove,
		handleMenuOpenChange,
		clearActiveRange,
		close
	};
}
//#endregion
//#region src/features/ai/assistant-at-mentions/composables/useAssistantMentionAttachments.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/**
* Stages the mentions the user picks as resource attachments of the composer.
* A mention stays a composer draft until the message is sent.
*/
function useAssistantMentionAttachments(options) {
	let recordSequence = 0;
	/** The staged mentions, keyed by mention key. */
	const selectedRecords = /* @__PURE__ */ new Map();
	/** The same records by id, so a submission snapshot resolves to the records it captured. */
	const recordsById = /* @__PURE__ */ new Map();
	function addRecord(item) {
		const record = {
			item,
			recordId: `${item.key}:${++recordSequence}`
		};
		selectedRecords.set(item.key, record);
		recordsById.set(record.recordId, record);
	}
	function dropRecord(record) {
		if (selectedRecords.get(record.item.key) === record) selectedRecords.delete(record.item.key);
		recordsById.delete(record.recordId);
	}
	function setMatchesMention(set, item) {
		if (item.kind === "node") return set.nodes.length === 1 && set.nodes[0]?.id === item.entityId;
		return item.kind === "group" && set.canvasGroupId === item.entityId;
	}
	function attachmentContainsMention(item) {
		if (item.kind === "workflow") return options.resources.value.some((attachment) => attachment.type === "workflow" && attachment.id === item.workflowId);
		return options.resources.value.some((attachment) => attachment.type === "nodes" && attachment.workflowId === item.workflowId && attachment.sets.some((set) => setMatchesMention(set, item)));
	}
	function reconcileSelectedRecords() {
		for (const record of [...selectedRecords.values()]) {
			if (attachmentContainsMention(record.item)) continue;
			dropRecord(record);
			options.onMentionRemoved?.(record.item.kind);
		}
	}
	function attachmentAddsResource(attachment) {
		if (attachment.type === "workflow") return !options.resources.value.some((current) => current.type === "workflow" && current.id === attachment.id);
		if (attachment.type === "nodes") return !options.resources.value.some((current) => current.type === "nodes" && current.workflowId === attachment.workflowId);
		return true;
	}
	function addAttachment(attachment) {
		if (attachment.type === "workflow") {
			if (options.resources.value.some((current) => current.type === "workflow" && current.id === attachment.id)) return;
			options.resources.value = [...options.resources.value, attachment];
			return;
		}
		if (attachment.type === "nodes") {
			const index = options.resources.value.findIndex((current) => current.type === "nodes" && current.workflowId === attachment.workflowId);
			if (index !== -1) {
				const current = options.resources.value[index];
				if (current.type !== "nodes") return;
				options.resources.value[index] = {
					...current,
					workflowName: attachment.workflowName ?? current.workflowName,
					sets: mergeNodeSets(current.sets, attachment.sets)
				};
				return;
			}
		}
		options.resources.value = [...options.resources.value, attachment];
	}
	function select(selection) {
		if (selectedRecords.has(selection.item.key)) return {
			status: "duplicate",
			truncated: false
		};
		if (attachmentAddsResource(selection.attachment) && options.files.value.length + options.resources.value.length + toValue(options.reservedAttachmentCount) >= 10) return {
			status: "limit",
			truncated: false
		};
		addAttachment(selection.attachment);
		if (!attachmentContainsMention(selection.item)) return {
			status: "limit",
			truncated: false
		};
		addRecord(selection.item);
		return {
			status: "added",
			truncated: selection.truncated
		};
	}
	function updateResource(index, attachment) {
		options.resources.value[index] = attachment;
		reconcileSelectedRecords();
	}
	function removeResource(index) {
		options.resources.value = options.resources.value.filter((_, itemIndex) => itemIndex !== index);
		reconcileSelectedRecords();
	}
	function clearForProjectChange() {
		const records = [...selectedRecords.values()];
		if (records.length === 0) return;
		const nextResources = [];
		for (const attachment of options.resources.value) {
			if (attachment.type === "workflow") {
				if (!records.some(({ item }) => item.kind === "workflow" && item.workflowId === attachment.id)) nextResources.push(attachment);
				continue;
			}
			if (attachment.type !== "nodes") {
				nextResources.push(attachment);
				continue;
			}
			const matchingRecords = records.filter(({ item }) => item.workflowId === attachment.workflowId && item.kind !== "workflow");
			const sets = attachment.sets.filter((set) => !matchingRecords.some(({ item }) => setMatchesMention(set, item)));
			if (sets.length > 0) nextResources.push({
				...attachment,
				sets
			});
		}
		options.resources.value = nextResources;
		for (const record of records) dropRecord(record);
		options.onCleared?.();
	}
	function snapshotSubmission() {
		return [...selectedRecords.values()].map(({ recordId }) => recordId);
	}
	function snapshotCounts() {
		const counts = { ...EMPTY_ASSISTANT_MENTION_COUNTS };
		for (const { item } of selectedRecords.values()) {
			counts[item.kind]++;
			counts.total++;
		}
		return counts;
	}
	function snapshotMentionedWorkflowIds() {
		return [...new Set([...selectedRecords.values()].map(({ item }) => item.workflowId))];
	}
	/**
	* Take the mentions of a submission out of the draft, so the same mention
	* can be picked again once the message is sent.
	* @return A function that
	* puts them back after a refused send, once the attachments are restored.
	*/
	function detachSubmission(recordIds = snapshotSubmission()) {
		const records = recordIds.map((recordId) => recordsById.get(recordId)).filter((record) => record !== void 0);
		for (const record of records) dropRecord(record);
		let restored = false;
		return () => {
			if (restored) return;
			restored = true;
			for (const record of records) {
				if (selectedRecords.has(record.item.key)) continue;
				if (!attachmentContainsMention(record.item)) continue;
				selectedRecords.set(record.item.key, record);
				recordsById.set(record.recordId, record);
			}
		};
	}
	watch(() => toValue(options.projectId), (projectId, previousProjectId) => {
		if (previousProjectId !== void 0 && projectId !== previousProjectId) clearForProjectChange();
	});
	return {
		select,
		updateResource,
		removeResource,
		clearForProjectChange,
		snapshotSubmission,
		snapshotCounts,
		snapshotMentionedWorkflowIds,
		detachSubmission
	};
}
//#endregion
//#region src/features/ai/assistant-at-mentions/composables/useAssistantMentionAvailability.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useAssistantMentionAvailability(options) {
	const workflowsListStore = useWorkflowsListStore();
	const hasSavedWorkflow = ref(false);
	const isLoading = ref(false);
	let requestGeneration = 0;
	const hasArtifacts = computed(() => toValue(options.artifacts).length > 0);
	const isAvailable = computed(() => toValue(options.enabled) && (hasArtifacts.value || hasSavedWorkflow.value));
	async function refresh({ reset = false } = {}) {
		const generation = ++requestGeneration;
		const enabled = toValue(options.enabled);
		const projectId = toValue(options.projectId)?.trim();
		if (!enabled || !projectId) {
			hasSavedWorkflow.value = false;
			isLoading.value = false;
			return;
		}
		if (hasArtifacts.value) {
			hasSavedWorkflow.value = false;
			isLoading.value = false;
			return;
		}
		if (reset) hasSavedWorkflow.value = false;
		isLoading.value = true;
		try {
			const workflows = await workflowsListStore.searchWorkflows({
				projectId,
				isArchived: false,
				select: ["id", "updatedAt"],
				options: {
					take: 1,
					skip: 0,
					sortBy: "updatedAt:asc",
					includeScopes: false
				}
			});
			if (generation === requestGeneration) hasSavedWorkflow.value = workflows.length > 0;
		} catch {
			if (reset && generation === requestGeneration) hasSavedWorkflow.value = false;
		} finally {
			if (generation === requestGeneration) isLoading.value = false;
		}
	}
	watch([
		() => toValue(options.enabled),
		() => toValue(options.projectId),
		hasArtifacts
	], async () => await refresh({ reset: true }), { immediate: true });
	useEventListener(window, "focus", async () => await refresh());
	return {
		isAvailable,
		isLoading,
		refresh
	};
}
//#endregion
//#region src/features/ai/assistant-at-mentions/assistantAtMentions.telemetry.ts
init_reactivity_esm_bundler();
function useAssistantAtMentionsTelemetry(options) {
	const telemetry = useTelemetry();
	const nodeTypesStore = useNodeTypesStore();
	const threadId = () => toValue(options.threadId) ?? null;
	let openSource;
	function trackPickerOpened(source) {
		openSource = source;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_OPENED_AI_ASSISTANT_MENTION_PICKER, {
			thread_id: threadId(),
			source
		});
	}
	function trackPickerDismissed(info, metrics) {
		if (info.reason === "selected") return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_DISMISSED_AI_ASSISTANT_MENTION_PICKER, {
			thread_id: threadId(),
			source: info.source,
			reason: info.reason,
			mode: metrics.mode,
			query_length: metrics.queryLength,
			result_count: metrics.resultCount,
			ambiguous_result_count: metrics.ambiguousResultCount,
			submenu_open_count: metrics.submenuOpenCount
		});
	}
	/**
	* The node type a query names outright, e.g. "slack". Search only matches
	* nodes by their instance names, so a hit here reads as the user reaching
	* for a service rather than a node they had named.
	*/
	function findNamedNodeType(query) {
		const wanted = query.toLowerCase();
		return nodeTypesStore.visibleNodeTypes.find((nodeType) => nodeType.displayName.toLowerCase() === wanted)?.name ?? null;
	}
	function trackEmptySearch(query, context) {
		if (!openSource) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SEARCHED_AI_ASSISTANT_MENTIONS_WITHOUT_RESULTS, {
			thread_id: threadId(),
			source: openSource,
			query: redactTelemetryText(query, { maxLength: 100 }),
			query_length: query.length,
			matched_node_type: findNamedNodeType(query),
			artifact_count: context.artifactCount
		});
	}
	function trackMentionSelected(selection, existingArtifact) {
		if (!selection.telemetry) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SELECTED_AI_ASSISTANT_MENTION, {
			thread_id: threadId(),
			kind: selection.item.kind,
			mode: selection.telemetry.mode,
			source: selection.item.source,
			result_position: selection.telemetry.resultPosition,
			query_length: selection.telemetry.queryLength,
			already_artifact: existingArtifact !== void 0,
			artifact_origin: existingArtifact?.origin ?? null
		});
	}
	function trackMentionRemoved(kind) {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_REMOVED_AI_ASSISTANT_MENTION, {
			thread_id: threadId(),
			kind
		});
	}
	return {
		trackPickerOpened,
		trackPickerDismissed,
		trackEmptySearch,
		trackMentionSelected,
		trackMentionRemoved
	};
}
//#endregion
//#region src/features/ai/instanceAi/instanceAiPromptSuggestions.telemetry.ts
var shownImpressionKeys = /* @__PURE__ */ new Set();
var resolveSuggestionCatalogVersion = (context) => context.suggestionCatalogVersion ?? "v1";
var createBasePayload = (context) => {
	const payload = {
		...context.telemetryPayload,
		suggestion_catalog_version: resolveSuggestionCatalogVersion(context)
	};
	if (context.threadId) payload.thread_id = context.threadId;
	return payload;
};
function createInstanceAiPromptSuggestionsTelemetry(telemetry, shownKeys = shownImpressionKeys) {
	return {
		trackSuggestionsShown(context) {
			const impressionKey = (context.threadId || "empty-state") + ":" + resolveSuggestionCatalogVersion(context);
			if (shownKeys.has(impressionKey)) return;
			shownKeys.add(impressionKey);
			telemetry.track("Instance AI prompt suggestions shown", createBasePayload(context));
		},
		trackQuickExamplesOpened(context) {
			telemetry.track("Instance AI quick examples opened", {
				...createBasePayload(context),
				suggestion_id: context.suggestionId,
				position: context.position
			});
		},
		trackSuggestionsCycled(context) {
			telemetry.track("Instance AI prompt suggestions cycled", {
				...context.telemetryPayload,
				suggestion_catalog_version: resolveSuggestionCatalogVersion(context),
				visible_suggestion_ids: context.visibleSuggestionIds,
				cycle_count: context.cycleCount
			});
		},
		trackSuggestionSelected(context) {
			telemetry.track("Instance AI prompt suggestion selected", {
				...createBasePayload(context),
				suggestion_id: context.suggestionId,
				suggestion_kind: context.suggestionKind,
				position: context.position,
				...context.suggestionTitle ? { suggestion_title: context.suggestionTitle } : {}
			});
		},
		trackSuggestionSubmitted(context) {
			telemetry.track("Instance AI prompt suggestion submitted", {
				...createBasePayload(context),
				suggestion_id: context.suggestionId,
				suggestion_kind: context.suggestionKind,
				position: context.position,
				prompt_modified: context.promptModified
			});
		}
	};
}
function useInstanceAiPromptSuggestionsTelemetry() {
	return createInstanceAiPromptSuggestionsTelemetry(useTelemetry());
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiInput.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var DEFAULT_AUTOSIZE_ROWS = 3;
var DEFAULT_MAX_AUTOSIZE_ROWS = 6;
/** The keyCode browsers send while an IME composes text, such as Japanese, Chinese or Korean. */
var IME_COMPOSITION_KEYCODE = 229;
var TYPEWRITER_SPEED_MS = 9;
var InstanceAiInput_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiInput",
	props: {
		isStreaming: {
			type: Boolean,
			default: false
		},
		isSubmitting: {
			type: Boolean,
			default: false
		},
		isAwaitingConfirmation: {
			type: Boolean,
			default: false
		},
		currentThreadId: { default: "" },
		amendContext: { default: null },
		contextualSuggestion: { default: null },
		suggestions: {},
		isWorkflowBuilderAvailable: {
			type: Boolean,
			default: true
		},
		suggestionsComponent: {},
		suggestionsComponentProps: {},
		suggestionCatalogVersion: {},
		suggestionTelemetryPayload: {},
		placeholderKey: {},
		placeholder: {},
		placeholderPreview: {},
		composerHeight: {},
		previewPromptKey: { default: null },
		contextChip: { default: null },
		mentionsEnabled: {
			type: Boolean,
			default: false
		},
		mentionProjectId: { default: void 0 },
		mentionArtifacts: { default: () => [] },
		mentionActiveWorkflowId: { default: void 0 },
		reservedAttachmentCount: { default: 0 },
		isOutOfCredits: {
			type: Boolean,
			default: false
		},
		attachOnlyMimeTypes: {},
		acceptedMimeTypes: {}
	},
	emits: [
		"submit",
		"stop",
		"dismiss-context-chip",
		"workflow-preview",
		"content-change"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const SUGGESTIONS_TRANSITION_DURATION = {
			enter: 450,
			leave: 320
		};
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const promptSuggestionsTelemetry = useInstanceAiPromptSuggestionsTelemetry();
		const mentionTelemetry = useAssistantAtMentionsTelemetry({ threadId: () => props.currentThreadId || void 0 });
		const instanceAiStore = useInstanceAiStore();
		const inputText = ref("");
		const attachedFiles = ref([]);
		const removingFiles = ref(/* @__PURE__ */ new Set());
		/** Clear stale removal state only after the draft file list changes. */
		watch(() => [...attachedFiles.value], (files) => {
			for (const file of removingFiles.value) if (!files.includes(file)) removingFiles.value.delete(file);
		});
		const { previewUrl } = useAttachmentPreviews(() => attachedFiles.value);
		const fileIds = /* @__PURE__ */ new WeakMap();
		let nextFileId = 0;
		function getFileId(file) {
			let id = fileIds.get(file);
			if (id === void 0) {
				id = nextFileId++;
				fileIds.set(file, id);
			}
			return id;
		}
		const attachedResources = ref([]);
		const isPreparingSubmission = ref(false);
		const chatInputRef = ref(null);
		const attachmentGroupRef = ref(null);
		const mentionPickerRef = ref(null);
		const composerRef = ref(null);
		const previewPrompt = ref(null);
		const selectedSuggestionDraft = ref(null);
		/**
		* What pre-filled the composer, so the submit can report who wrote the text.
		* Separate from `selectedSuggestionDraft`, which is scoped to the suggestion
		* experiment; this also covers template examples and hand-off drafts.
		*/
		const activePrefill = ref(null);
		const typedPreview = ref("");
		let typewriterTimer = null;
		function stopTypewriter() {
			if (typewriterTimer) {
				clearInterval(typewriterTimer);
				typewriterTimer = null;
			}
		}
		watch(() => props.previewPromptKey, (key) => {
			stopTypewriter();
			if (!key) {
				typedPreview.value = "";
				return;
			}
			const full = i18n.baseText(key);
			typedPreview.value = "";
			let i = 0;
			typewriterTimer = setInterval(() => {
				i += 1;
				typedPreview.value = full.slice(0, i);
				if (i >= full.length) stopTypewriter();
			}, TYPEWRITER_SPEED_MS);
		}, { immediate: true });
		onBeforeUnmount(stopTypewriter);
		function focus() {
			chatInputRef.value?.focus();
		}
		function appendText(text) {
			inputText.value += text;
			mentions.handleTextChange(inputText.value, inputText.value.length);
		}
		function setText(text) {
			mentions.close();
			inputText.value = text;
		}
		function setTextIfEmpty(text) {
			if (!inputText.value.trim()) inputText.value = text;
		}
		/**
		* Put n8n-authored text in the composer. Pre-fills must come through here
		* rather than `setText` so the submit can attribute them; `setText` and
		* friends stay for restoring a draft the user wrote.
		*/
		function setPrefill(prefill) {
			inputText.value = prefill.text;
			activePrefill.value = { ...prefill };
		}
		function clearTextIfMatches(text) {
			if (inputText.value === text) inputText.value = "";
		}
		function isDirty() {
			return inputText.value.trim().length > 0 || hasAttachments.value;
		}
		__expose({
			focus,
			appendText,
			setText,
			setPrefill,
			setTextIfEmpty,
			clearTextIfMatches,
			isDirty,
			insertSuggestion: handleSuggestionInsert,
			submitSuggestion,
			isPreparingSubmission,
			getSendStopButtonElement: () => chatInputRef.value?.getSendStopButtonElement()
		});
		const isBusy = computed(() => props.isStreaming || props.isSubmitting || isPreparingSubmission.value);
		const hasNonWhitespaceDraftText = computed(() => inputText.value.trim().length > 0);
		const isInputVisuallyEmpty = computed(() => inputText.value.length === 0);
		const hasAttachments = computed(() => attachedFiles.value.length > 0 || attachedResources.value.length > 0);
		const excludedMentionContext = computed(() => {
			const keys = /* @__PURE__ */ new Set();
			const workflowIds = /* @__PURE__ */ new Set();
			if (props.contextChip?.type === "workflow-artifact") {
				keys.add(buildMentionKey("workflow", props.contextChip.workflowId, props.contextChip.workflowId));
				workflowIds.add(props.contextChip.workflowId);
			}
			for (const attachment of attachedResources.value) {
				if (attachment.type === "workflow") {
					keys.add(buildMentionKey("workflow", attachment.id, attachment.id));
					workflowIds.add(attachment.id);
					continue;
				}
				if (attachment.type !== "nodes") continue;
				for (const set of attachment.sets) {
					if (set.canvasGroupId) {
						keys.add(buildMentionKey("group", attachment.workflowId, set.canvasGroupId));
						continue;
					}
					for (const node of set.nodes) keys.add(buildMentionKey("node", attachment.workflowId, node.id));
				}
			}
			return {
				keys: [...keys],
				workflowIds: [...workflowIds]
			};
		});
		const attachedEncodedBytes = computed(() => attachedFiles.value.reduce((sum, file) => sum + base64EncodedSize(file.size), 0));
		const isComposerDirty = computed(() => hasNonWhitespaceDraftText.value || hasAttachments.value);
		watch(isComposerDirty, (hasContent) => emit("content-change", hasContent), { immediate: true });
		const isGatedBySetup = computed(() => props.isAwaitingConfirmation || !props.isWorkflowBuilderAvailable);
		const showAttach = computed(() => props.attachOnlyMimeTypes === void 0 || props.attachOnlyMimeTypes.length > 0);
		const shouldShowMentions = computed(() => props.mentionsEnabled && Boolean(props.mentionProjectId));
		const mentionAvailability = useAssistantMentionAvailability({
			enabled: shouldShowMentions,
			projectId: () => props.mentionProjectId,
			artifacts: () => props.mentionArtifacts
		});
		const isSubmissionInFlight = computed(() => props.isSubmitting || isPreparingSubmission.value);
		const canUseMentions = computed(() => shouldShowMentions.value && mentionAvailability.isAvailable.value && !isSubmissionInFlight.value && !isGatedBySetup.value);
		const inputElement = computed(() => chatInputRef.value?.getInputElement() ?? null);
		const mentions = useAssistantAtMentions({
			text: inputText,
			enabled: canUseMentions,
			getInputElement: () => inputElement.value ?? void 0,
			onOpened: mentionTelemetry.trackPickerOpened,
			onClosed: (info) => {
				mentionPickerRef.value?.flushEmptySearch();
				const metrics = mentionPickerRef.value?.getOpenMetrics();
				if (metrics) mentionTelemetry.trackPickerDismissed(info, metrics);
			}
		});
		function handleMentionEmptySearch(query) {
			mentionTelemetry.trackEmptySearch(query, { artifactCount: props.mentionArtifacts.length });
		}
		const mentionMenuOpen = mentions.menuOpen;
		const mentionQuery = mentions.query;
		watch(canUseMentions, (enabled, wasEnabled) => {
			if (enabled && !wasEnabled) mentions.handleTextChange(inputText.value);
		});
		const mentionAttachments = useAssistantMentionAttachments({
			files: attachedFiles,
			resources: attachedResources,
			projectId: () => props.mentionProjectId,
			reservedAttachmentCount: () => props.reservedAttachmentCount,
			onMentionRemoved: mentionTelemetry.trackMentionRemoved,
			onCleared: () => mentions.close(false, "unavailable")
		});
		/**
		* A pick only stages the mention as a draft attachment. The mentioned workflow
		* gets its tab with the message it rides on, once that message is sent, so
		* picking it does not move the thread's tabs or preview around.
		*/
		async function handleMentionSelection(selection) {
			const existingArtifact = props.mentionArtifacts.find((artifact) => artifact.id === selection.item.workflowId);
			const result = mentionAttachments.select(selection);
			if (result.status === "limit") {
				toast.showError(new Error(i18n.baseText("instanceAi.mentions.attachmentLimitMessage")), i18n.baseText("instanceAi.mentions.attachmentLimitTitle"));
				return;
			}
			mentionTelemetry.trackMentionSelected(selection, existingArtifact);
			if (result.truncated) toast.showError(new Error(i18n.baseText("instanceAi.nodeContext.truncated.message")), i18n.baseText("instanceAi.nodeContext.truncated.title"));
			await mentions.clearActiveRange();
		}
		const canSubmit = computed(() => canSubmitMessage(inputText.value.trim(), attachedFiles.value.length + attachedResources.value.length));
		const canShowSuggestions = computed(() => Boolean(props.suggestions?.length) && !isComposerDirty.value && !isBusy.value && !isGatedBySetup.value);
		const resolvedSuggestionsComponent = computed(() => props.suggestionsComponent ?? InstanceAiPromptSuggestions_default);
		const resolvedSuggestionCatalogVersion = computed(() => props.suggestionCatalogVersion ?? "v1");
		const shouldTrackVisibleSuggestions = computed(() => canShowSuggestions.value);
		const placeholder = computed(() => {
			if (!props.isWorkflowBuilderAvailable) return i18n.baseText("instanceAi.input.workflowBuilderUnavailablePlaceholder");
			if (isGatedBySetup.value) return i18n.baseText("instanceAi.input.suspendedPlaceholder");
			if (props.previewPromptKey && isInputVisuallyEmpty.value) return typedPreview.value;
			if (previewPrompt.value && isInputVisuallyEmpty.value) return previewPrompt.value;
			if (props.amendContext) return i18n.baseText("instanceAi.input.amendPlaceholder", { interpolate: { role: props.amendContext.role } });
			if (props.contextualSuggestion) return props.contextualSuggestion;
			return props.placeholder ?? i18n.baseText(props.placeholderKey ?? "instanceAi.input.placeholder");
		});
		const canPreviewPlaceholder = computed(() => !isGatedBySetup.value && !props.previewPromptKey && !previewPrompt.value && !props.amendContext && !props.contextualSuggestion);
		watch([
			shouldTrackVisibleSuggestions,
			resolvedSuggestionCatalogVersion,
			() => props.currentThreadId
		], ([shouldTrackSuggestions, suggestionCatalogVersion, threadId]) => {
			if (shouldTrackSuggestions) {
				promptSuggestionsTelemetry.trackSuggestionsShown({
					threadId: threadId || void 0,
					suggestionCatalogVersion,
					telemetryPayload: props.suggestionTelemetryPayload
				});
				return;
			}
			previewPrompt.value = null;
			emit("workflow-preview", null);
		}, { immediate: true });
		watch(inputText, (text) => {
			if (text.length === 0) {
				selectedSuggestionDraft.value = null;
				activePrefill.value = null;
			}
		});
		function emitSubmittedMessage(message, attachments, restoreDraft, authorship, responseStartedAtEpochMs, mentionCounts, mentionedWorkflowIds = []) {
			previewPrompt.value = null;
			emit("submit", message, attachments, restoreDraft, authorship, responseStartedAtEpochMs, mentionCounts, mentionedWorkflowIds);
		}
		function resetDraftComposer() {
			inputText.value = "";
			attachedFiles.value = [];
			attachedResources.value = [];
		}
		/** The single submission gate — `canSubmit` is this predicate over the draft. */
		function canSubmitMessage(message, attachmentCount = 0) {
			if (props.isOutOfCredits || removingFiles.value.size > 0) return false;
			if (isBusy.value || isGatedBySetup.value) return false;
			return message.length > 0 || attachmentCount > 0;
		}
		/**
		* Puts a submitted draft back after a refused send. Returns false when the user
		* has already typed something newer, so the caller knows the draft is gone.
		*
		* The pre-fill snapshot is restored with the text -- always after it, since an
		* empty assignment clears the pre-fill -- so retrying stays attributed to the
		* surface that wrote the draft rather than reporting as user-typed.
		*/
		function restoreSubmittedDraft(message, files, resources, prefill) {
			const restorePrefill = () => {
				activePrefill.value = prefill ? { ...prefill } : null;
			};
			if (isDirty()) {
				if (inputText.value.trim()) return false;
				inputText.value = message;
				restorePrefill();
				return true;
			}
			inputText.value = message;
			restorePrefill();
			attachedFiles.value = [...files];
			attachedResources.value = [...resources];
			return true;
		}
		/**
		* `prefill` is the snapshot its caller took when it read the message, not live
		* state: `handleSubmit` awaits file conversion in between, and the composer can
		* be edited during that await.
		*/
		function submitComposerMessage(message, attachments, prefill, responseStartedAtEpochMs = instanceAiResponseNow(), draftSnapshot) {
			if (!canSubmitMessage(message, attachments?.length ?? 0)) return;
			trackSelectedSuggestionSubmitted(message);
			const submittedFiles = draftSnapshot?.files ?? [...attachedFiles.value];
			const submittedResources = draftSnapshot?.resources ?? [...attachedResources.value];
			const mentionCounts = draftSnapshot?.mentionCounts ?? mentionAttachments.snapshotCounts();
			const mentionedWorkflowIds = draftSnapshot?.mentionedWorkflowIds ?? mentionAttachments.snapshotMentionedWorkflowIds();
			const restoreMentions = mentionAttachments.detachSubmission(draftSnapshot?.mentionRecordIds);
			emitSubmittedMessage(message, attachments, () => {
				const restored = restoreSubmittedDraft(message, submittedFiles, submittedResources, prefill);
				restoreMentions();
				return restored;
			}, resolveAuthorship(message, prefill), responseStartedAtEpochMs, mentionCounts, mentionedWorkflowIds);
			resetDraftComposer();
		}
		function submitSuggestion(payload) {
			const prompt = getSuggestionPrompt(payload);
			selectedSuggestionDraft.value = {
				...payload,
				originalPrompt: prompt
			};
			submitComposerMessage(prompt, void 0, {
				text: prompt,
				prefillType: payload.prefillType,
				prefillId: payload.suggestionId
			});
		}
		async function handleSubmit() {
			const text = inputText.value.trim();
			const prefill = activePrefill.value;
			if (!canSubmitMessage(text, attachedFiles.value.length + attachedResources.value.length)) return;
			mentions.close();
			const responseStartedAtEpochMs = instanceAiResponseNow();
			const submittedFiles = [...attachedFiles.value];
			const submittedResources = [...attachedResources.value];
			const mentionRecordIds = mentionAttachments.snapshotSubmission();
			const mentionCounts = mentionAttachments.snapshotCounts();
			const mentionedWorkflowIds = mentionAttachments.snapshotMentionedWorkflowIds();
			isPreparingSubmission.value = true;
			let fileAttachments;
			try {
				fileAttachments = submittedFiles.length ? (await Promise.all(submittedFiles.map(convertFileToBinaryData))).map((b) => ({
					type: "file",
					data: b.data,
					mimeType: b.mimeType,
					fileName: b.fileName ?? "unnamed"
				})) : [];
			} finally {
				isPreparingSubmission.value = false;
			}
			const attachments = [...fileAttachments, ...submittedResources];
			submitComposerMessage(text, attachments.length ? attachments : void 0, prefill, responseStartedAtEpochMs, {
				files: submittedFiles,
				resources: submittedResources,
				mentionRecordIds,
				mentionCounts,
				mentionedWorkflowIds
			});
		}
		function removeResource(index) {
			mentionAttachments.removeResource(index);
		}
		watch(() => instanceAiStore.pendingComposerAttachments, (pending) => {
			if (pending.length === 0) return;
			const consumed = instanceAiStore.consumePendingAttachments();
			for (const attachment of consumed) {
				if (attachment.type === "file") continue;
				if (attachment.type === "element") attachedResources.value = attachedResources.value.filter((a) => a.type !== "element");
				if (attachment.type === "nodes") {
					const existing = attachedResources.value.find((a) => a.type === "nodes" && a.workflowId === attachment.workflowId);
					if (existing) {
						existing.sets = mergeNodeSets(existing.sets, attachment.sets);
						existing.workflowName = attachment.workflowName ?? existing.workflowName;
						continue;
					}
				}
				attachedResources.value = [...attachedResources.value, attachment];
			}
		}, {
			deep: true,
			immediate: true
		});
		watch(() => {
			const element = attachedResources.value.find((a) => a.type === "element");
			return element?.type === "element" ? element.appId : null;
		}, (appId) => instanceAiStore.setComposerElementAppId(appId), { immediate: true });
		onBeforeUnmount(() => instanceAiStore.setComposerElementAppId(null));
		function handleStop() {
			mentions.close();
			emit("stop");
		}
		function handleComposerKeydown(event) {
			if (!mentionMenuOpen.value) {
				/** Keep text navigation, modified shortcuts, and composition unchanged. */
				if (event.key === "ArrowUp" && event.target instanceof HTMLTextAreaElement && event.target === chatInputRef.value?.getInputElement() && !event.target.value && !event.defaultPrevented && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.isComposing && event.keyCode !== IME_COMPOSITION_KEYCODE && !event.repeat && attachedFiles.value.length > 0 && removingFiles.value.size === 0) {
					event.preventDefault();
					event.stopPropagation();
					attachmentGroupRef.value?.focus();
					return;
				}
				return;
			}
			const handled = mentionPickerRef.value?.handleExternalKeydown(event) ?? false;
			const hasModifier = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;
			const isComposing = event.isComposing || event.keyCode === IME_COMPOSITION_KEYCODE;
			if (handled || event.key !== "Enter" || hasModifier || isComposing) return;
			event.preventDefault();
			event.stopPropagation();
		}
		function handleTabAutocomplete() {
			if (!inputText.value && props.contextualSuggestion) setPrefill({
				text: props.contextualSuggestion,
				prefillType: "contextual_followup"
			});
		}
		function handleFilesSelected(files) {
			attachedFiles.value.push(...files);
		}
		function handleFilesRejected(files) {
			for (const file of files) toast.showMessage({
				type: "error",
				title: i18n.baseText("agents.chat.attachments.unsupportedType", { interpolate: { fileName: file.name } })
			});
		}
		function handleFileRemove(file) {
			const idx = attachedFiles.value.indexOf(file);
			if (idx !== -1) attachedFiles.value.splice(idx, 1);
		}
		function getTelemetryContext(telemetryPayload) {
			return {
				threadId: props.currentThreadId || void 0,
				suggestionCatalogVersion: resolvedSuggestionCatalogVersion.value,
				telemetryPayload: {
					...props.suggestionTelemetryPayload,
					...telemetryPayload
				}
			};
		}
		function getSuggestionPrompt(payload) {
			return payload.prompt ?? i18n.baseText(payload.promptKey);
		}
		function getPreviewPromptText(preview) {
			if (!preview) return null;
			if (typeof preview === "string") return i18n.baseText(preview);
			return preview.prompt;
		}
		function trackSelectedSuggestionSubmitted(message) {
			const selectedSuggestion = selectedSuggestionDraft.value;
			if (!selectedSuggestion) return;
			promptSuggestionsTelemetry.trackSuggestionSubmitted({
				...getTelemetryContext(selectedSuggestion.telemetryPayload),
				suggestionCatalogVersion: selectedSuggestion.suggestionCatalogVersion ?? resolvedSuggestionCatalogVersion.value,
				suggestionId: selectedSuggestion.suggestionId,
				suggestionKind: selectedSuggestion.suggestionKind,
				position: selectedSuggestion.position,
				promptModified: message !== selectedSuggestion.originalPrompt
			});
		}
		function handleQuickExamplesOpened(payload) {
			if (payload.suggestionId !== "quick-examples") return;
			promptSuggestionsTelemetry.trackQuickExamplesOpened({
				...getTelemetryContext(),
				suggestionId: payload.suggestionId,
				position: payload.position
			});
		}
		function trackSuggestionSelected(payload) {
			promptSuggestionsTelemetry.trackSuggestionSelected({
				...getTelemetryContext(payload.telemetryPayload),
				suggestionId: payload.suggestionId,
				suggestionKind: payload.suggestionKind,
				position: payload.position,
				suggestionTitle: payload.suggestionTitle
			});
		}
		function handleSuggestionsCycled(payload) {
			promptSuggestionsTelemetry.trackSuggestionsCycled({
				...getTelemetryContext(payload.telemetryPayload),
				visibleSuggestionIds: payload.visibleSuggestionIds,
				cycleCount: payload.cycleCount
			});
		}
		async function handleSuggestionInsert(payload) {
			trackSuggestionSelected(payload);
			previewPrompt.value = null;
			const prompt = getSuggestionPrompt(payload);
			selectedSuggestionDraft.value = {
				...payload,
				originalPrompt: prompt
			};
			activePrefill.value = {
				text: prompt,
				prefillType: payload.prefillType,
				prefillId: payload.suggestionId
			};
			inputText.value = prompt;
			await nextTick();
			chatInputRef.value?.focus();
		}
		const resizable = computed(() => {
			if (previewPrompt.value) return {
				minRows: DEFAULT_AUTOSIZE_ROWS,
				maxRows: DEFAULT_AUTOSIZE_ROWS
			};
			return {
				minRows: DEFAULT_AUTOSIZE_ROWS,
				maxRows: DEFAULT_MAX_AUTOSIZE_ROWS
			};
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "composerRef",
				ref: composerRef,
				class: normalizeClass(_ctx.$style.composer),
				"data-test-id": "instance-ai-composer",
				onKeydownCapture: handleComposerKeydown,
				onPointerdownCapture: _cache[5] || (_cache[5] = (...args) => unref(mentions).saveSelection && unref(mentions).saveSelection(...args)),
				onClickCapture: _cache[6] || (_cache[6] = (...args) => unref(mentions).handleCaretMove && unref(mentions).handleCaretMove(...args)),
				onKeyupCapture: _cache[7] || (_cache[7] = (...args) => unref(mentions).handleCaretMove && unref(mentions).handleCaretMove(...args)),
				onSelectCapture: _cache[8] || (_cache[8] = (...args) => unref(mentions).handleCaretMove && unref(mentions).handleCaretMove(...args))
			}, [
				createVNode(ChatInputBase_default, {
					ref_key: "chatInputRef",
					ref: chatInputRef,
					"model-value": inputText.value,
					class: normalizeClass(_ctx.$style.inputWrapper),
					placeholder: placeholder.value,
					"placeholder-preview": canPreviewPlaceholder.value ? props.placeholderPreview : void 0,
					"is-streaming": props.isStreaming,
					"can-submit": canSubmit.value,
					disabled: isGatedBySetup.value || isPreparingSubmission.value || props.isOutOfCredits,
					autosize: resizable.value,
					"composer-height": props.composerHeight,
					"max-length": unref(EXTENDED_PROMPT_MAX_LENGTH),
					"show-voice": "",
					"show-attach": showAttach.value,
					"show-attach-button": props.attachOnlyMimeTypes !== void 0,
					"accepted-mime-types": props.attachOnlyMimeTypes ?? props.acceptedMimeTypes,
					"attached-encoded-bytes": attachedEncodedBytes.value,
					"onUpdate:modelValue": unref(mentions).handleTextChange,
					onSubmit: handleSubmit,
					onStop: handleStop,
					onTab: handleTabAutocomplete,
					onFilesSelected: handleFilesSelected,
					onFilesRejected: handleFilesRejected
				}, createSlots({
					attachments: withCtx(() => [props.contextChip || attachedResources.value.length > 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.attachments)
					}, [props.contextChip ? (openBlock(), createBlock(InstanceAiResourceChip_default, {
						key: 0,
						label: props.contextChip.label,
						icon: props.contextChip.icon ?? "robot",
						"remove-label": unref(i18n).baseText("generic.close"),
						"test-id": props.contextChip.testId ?? "instance-ai-handoff-context-chip",
						"remove-test-id": "instance-ai-handoff-context-chip-dismiss",
						removable: "",
						onRemove: _cache[0] || (_cache[0] = ($event) => emit("dismiss-context-chip"))
					}, null, 8, [
						"label",
						"icon",
						"remove-label",
						"test-id"
					])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(attachedResources.value, (attachment, index) => {
						return openBlock(), createBlock(AttachmentPreview_default, {
							key: `res-${index}`,
							attachment,
							"is-removable": true,
							onRemoveResource: ($event) => removeResource(index),
							"onUpdate:attachment": ($event) => unref(mentionAttachments).updateResource(index, $event)
						}, null, 8, [
							"attachment",
							"onRemoveResource",
							"onUpdate:attachment"
						]);
					}), 128))], 2)) : createCommentVNode("", true), attachedFiles.value.length > 0 ? (openBlock(), createBlock(unref(AttachmentGroup_default), {
						key: 1,
						ref_key: "attachmentGroupRef",
						ref: attachmentGroupRef,
						class: normalizeClass(_ctx.$style.attachmentGroup)
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(attachedFiles.value, (file) => {
							return openBlock(), createBlock(unref(Attachment_default), {
								key: getFileId(file),
								"file-name": file.name,
								"mime-type": file.type,
								"size-bytes": file.size,
								src: unref(previewUrl)(file),
								"is-removable": true,
								onRemoveStart: ($event) => removingFiles.value.add(file),
								onRemove: ($event) => handleFileRemove(file),
								onRemoveEnd: ($event) => removingFiles.value.delete(file)
							}, null, 8, [
								"file-name",
								"mime-type",
								"size-bytes",
								"src",
								"onRemoveStart",
								"onRemove",
								"onRemoveEnd"
							]);
						}), 128))]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					_: 2
				}, [_ctx.$slots["footer-start"] || _ctx.$slots["footer-after-menu"] || props.attachOnlyMimeTypes === void 0 ? {
					name: "footer-start",
					fn: withCtx(() => [
						renderSlot(_ctx.$slots, "footer-start"),
						props.attachOnlyMimeTypes === void 0 ? (openBlock(), createBlock(InstanceAiInputMenu_default, {
							key: 0,
							disabled: isBusy.value || isGatedBySetup.value,
							"is-streaming": props.isStreaming,
							"project-id": props.mentionProjectId,
							onAttachFiles: _cache[1] || (_cache[1] = ($event) => chatInputRef.value?.openFilePicker())
						}, null, 8, [
							"disabled",
							"is-streaming",
							"project-id"
						])) : createCommentVNode("", true),
						renderSlot(_ctx.$slots, "footer-after-menu")
					]),
					key: "0"
				} : void 0, shouldShowMentions.value ? {
					name: "right-actions",
					fn: withCtx(() => [createVNode(AssistantAtMentionPicker_default, {
						ref_key: "mentionPickerRef",
						ref: mentionPickerRef,
						modelValue: unref(mentionMenuOpen),
						"onUpdate:modelValue": [_cache[2] || (_cache[2] = ($event) => isRef(mentionMenuOpen) ? mentionMenuOpen.value = $event : null), unref(mentions).handleMenuOpenChange],
						query: unref(mentionQuery),
						"project-id": props.mentionProjectId,
						artifacts: props.mentionArtifacts,
						"active-workflow-id": props.mentionActiveWorkflowId,
						"excluded-keys": excludedMentionContext.value.keys,
						"excluded-workflow-ids": excludedMentionContext.value.workflowIds,
						"input-element": inputElement.value,
						reference: composerRef.value,
						disabled: !canUseMentions.value,
						onSelect: handleMentionSelection,
						onEmptySearch: handleMentionEmptySearch
					}, null, 8, [
						"modelValue",
						"query",
						"project-id",
						"artifacts",
						"active-workflow-id",
						"excluded-keys",
						"excluded-workflow-ids",
						"input-element",
						"reference",
						"disabled",
						"onUpdate:modelValue"
					])]),
					key: "1"
				} : void 0]), 1032, [
					"model-value",
					"class",
					"placeholder",
					"placeholder-preview",
					"is-streaming",
					"can-submit",
					"disabled",
					"autosize",
					"composer-height",
					"max-length",
					"show-attach",
					"show-attach-button",
					"accepted-mime-types",
					"attached-encoded-bytes",
					"onUpdate:modelValue"
				]),
				renderSlot(_ctx.$slots, "footer"),
				renderSlot(_ctx.$slots, "before-suggestions"),
				createVNode(Transition, {
					name: "suggestions-fade",
					duration: SUGGESTIONS_TRANSITION_DURATION
				}, {
					default: withCtx(() => [canShowSuggestions.value && props.suggestions ? (openBlock(), createBlock(resolveDynamicComponent(resolvedSuggestionsComponent.value), mergeProps({
						key: 0,
						class: _ctx.$style.suggestions,
						suggestions: props.suggestions,
						disabled: isBusy.value || isGatedBySetup.value
					}, props.suggestionsComponentProps, {
						onPreviewChange: _cache[3] || (_cache[3] = ($event) => previewPrompt.value = getPreviewPromptText($event)),
						onQuickExamplesOpened: handleQuickExamplesOpened,
						onCycleSuggestions: handleSuggestionsCycled,
						onInsertSuggestion: handleSuggestionInsert,
						onWorkflowPreview: _cache[4] || (_cache[4] = ($event) => emit("workflow-preview", $event))
					}), null, 16, [
						"class",
						"suggestions",
						"disabled"
					])) : createCommentVNode("", true)]),
					_: 1
				})
			], 34);
		};
	}
}), [["__cssModules", { "$style": {
	composer: "_composer_393ar_1",
	inputWrapper: "_inputWrapper_393ar_9",
	suggestions: "_suggestions_393ar_13",
	attachments: "_attachments_393ar_17",
	attachmentGroup: "_attachmentGroup_393ar_45"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/WorkflowBuilderUnavailableNotice.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowBuilderUnavailableNotice_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowBuilderUnavailableNotice",
	setup(__props) {
		const i18n = useI18n();
		const settingsStore = useInstanceAiSettingsStore();
		const descriptionKey = computed(() => settingsStore.isSandboxEnabled ? "instanceAi.workflowBuilderUnavailable.serviceUrlDescription" : "instanceAi.workflowBuilderUnavailable.enableSandboxDescription");
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCallout_default), {
				class: normalizeClass(_ctx.$style.notice),
				theme: "warning",
				"data-test-id": "instance-ai-workflow-builder-unavailable"
			}, {
				default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.copy) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("instanceAi.workflowBuilderUnavailable.title")), 1), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(descriptionKey.value)), 1)], 2)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	notice: "_notice_soy4g_1",
	copy: "_copy_soy4g_5"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/LimitedModeNotice.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 1 };
var LimitedModeNotice_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LimitedModeNotice",
	setup(__props) {
		const i18n = useI18n();
		const settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		const instanceAiSettingsStore = useInstanceAiSettingsStore();
		const isDismissed = useLocalStorage(() => LOCAL_STORAGE_INSTANCE_AI_LIMITED_MODE_DISMISSED(usersStore.currentUserId ?? ""), false, { writeDefaults: false });
		const isLimited = computed(() => !settingsStore.isAiDataSharingEnabled);
		return (_ctx, _cache) => {
			return isLimited.value && !unref(isDismissed) ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.notice),
				theme: "warning",
				"data-test-id": "instance-ai-limited-mode-notice"
			}, {
				trailingContent: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					icon: "x",
					variant: "ghost",
					size: "small",
					"aria-label": unref(i18n).baseText("generic.dismiss"),
					title: unref(i18n).baseText("generic.dismiss"),
					"data-test-id": "instance-ai-limited-mode-dismiss",
					onClick: _cache[0] || (_cache[0] = ($event) => isDismissed.value = true)
				}, null, 8, ["aria-label", "title"])]),
				default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.copy) }, [
					createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("instanceAi.limitedMode.title")), 1),
					createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.limitedMode.description")), 1),
					unref(instanceAiSettingsStore).canManageAiUsage ? (openBlock(), createBlock(unref(RouterLink), {
						key: 0,
						to: { name: unref(INSTANCE_AI_SETTINGS_VIEW) },
						"data-test-id": "instance-ai-limited-mode-settings-link"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.limitedMode.settingsLink")), 1)]),
						_: 1
					}, 8, ["to"])) : (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(unref(i18n).baseText("instanceAi.limitedMode.askAdmin")), 1))
				], 2)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	notice: "_notice_soy4g_1",
	copy: "_copy_soy4g_5"
} }]]);
//#endregion
export { CloudBrowserTasksKey as a, NodesAttachmentChips_default as c, isCloudBrowserAgent as d, isCloudBrowserResourceDecision as f, InstanceAiInputMenu_default as i, elementAttachmentLabel as l, WorkflowBuilderUnavailableNotice_default as n, useCloudBrowserTasks as o, InstanceAiViewHeader_default as p, InstanceAiInput_default as r, AttachmentPreview_default as s, LimitedModeNotice_default as t, useCreditWarningBanner as u };
