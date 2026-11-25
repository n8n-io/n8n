import { $d as init_runtime_core_esm_bundler, Ad as vModelText, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, gf as resolveComponent, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jr as useInstanceAiStore, Kd as useDocumentTitle, Pn as formatTimeAgo, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, XM as N8nActionDropdown_default, _N as N8nText_default, bt as clearPendingThreadHandoff, cN as Input_default, dC as useToast, jN as useI18n, o as useAssistantAgentThreadsStore, vN as N8nIconButton_default, xN as N8nIcon_default, yN as N8nButton_default, zc as useAgentsN8nChatFlag } from "./app-D5flEmb-.js";
import { t as PageViewLayout_default } from "./PageViewLayout-BBSbPiAB.js";
import { i as isAssistantChatItem, n as chatItemRoute, r as chatItemTitle, s as useAgentN8nChatThreadsStore, t as agentThreadActions } from "./mergeRecentChats-BLSTj3Bo.js";
import { t as RecentChatIcon_default } from "./RecentChatIcon-BbCwK2R8.js";
import { t as useMergedChatHistory } from "./useMergedChatHistory-DvubheEu.js";
//#region src/features/ai/instanceAi/InstanceAiThreadsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["onKeydown", "onBlur"];
var InstanceAiThreadsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiThreadsView",
	setup(__props) {
		const store = useInstanceAiStore();
		const agentThreadsStore = useAgentN8nChatThreadsStore();
		const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
		const i18n = useI18n();
		const router = useRouter();
		const toast = useToast();
		const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
		useDocumentTitle().set(i18n.baseText("instanceAi.sidebar.chatHistory"));
		const { items: mergedThreads, hasMore, history, isLoading, error, search, listRef, sentinelRef, loadMore } = useMergedChatHistory();
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
		function itemTitle(item) {
			return chatItemTitle(item, i18n);
		}
		const itemRoute = chatItemRoute;
		/** An n8n Assistant thread on either runtime. n8n Chat agent threads have no rename. */
		function startRename({ thread }) {
			editingThreadId.value = thread.id;
			editingTitle.value = thread.title ?? "";
			nextTick(() => {
				renameInput.value?.focus();
				renameInput.value?.select();
			});
		}
		function setRenameInput(element) {
			renameInput.value = element instanceof HTMLInputElement ? element : null;
		}
		async function confirmRename(item) {
			const { thread } = item;
			if (editingThreadId.value !== thread.id) return;
			editingThreadId.value = null;
			const title = editingTitle.value.trim();
			if (!title || title === thread.title) return;
			try {
				if (item.kind === "assistant") await store.renameThread(thread.id, title);
				else await assistantAgentThreadsStore.renameThread(thread.id, title);
				toast.showMessage({
					type: "success",
					title: i18n.baseText("instanceAi.threads.renameSuccess")
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("instanceAi.threads.renameError"));
			}
		}
		async function handleThreadAction(action, item) {
			if (action === "rename") startRename(item);
			if (action !== "delete") return;
			if (item.kind === "assistant-agent") await assistantAgentThreadsStore.deleteThread(item.thread);
			else if (await store.deleteThread(item.thread.id)) clearPendingThreadHandoff(item.thread.id);
		}
		/** The delete-only menu of n8n Chat agent threads. */
		async function handleAgentThreadAction(action, item) {
			if (action === "delete") await agentThreadsStore.deleteThread(item.thread);
		}
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createBlock(PageViewLayout_default, {
				"full-width": "",
				"data-test-id": "instance-ai-threads-view"
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.page) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [
					createVNode(unref(N8nIconButton_default), {
						icon: "arrow-left",
						variant: "ghost",
						"aria-label": unref(i18n).baseText("instanceAi.threads.backToAssistant"),
						onClick: _cache[0] || (_cache[0] = ($event) => unref(router).push({ name: unref("InstanceAi") }))
					}, null, 8, ["aria-label"]),
					createVNode(unref(N8nHeading_default), {
						class: normalizeClass(_ctx.$style.heading),
						tag: "h1",
						size: "xlarge",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.sidebar.chatHistory")), 1)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(Input_default), {
						modelValue: unref(search),
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(search) ? search.value = $event : null),
						class: normalizeClass(_ctx.$style.search),
						size: "small",
						clearable: "",
						maxlength: 500,
						placeholder: unref(i18n).baseText("instanceAi.threads.searchPlaceholder"),
						"data-test-id": "instance-ai-threads-search"
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "search",
							size: "small"
						})]),
						_: 1
					}, 8, [
						"modelValue",
						"class",
						"placeholder"
					]),
					createVNode(unref(N8nButton_default), {
						size: "small",
						icon: "plus",
						onClick: _cache[2] || (_cache[2] = ($event) => unref(router).push({ name: unref("InstanceAi") }))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.thread.new")), 1)]),
						_: 1
					})
				], 2), createBaseVNode("div", {
					ref_key: "listRef",
					ref: listRef,
					class: normalizeClass(_ctx.$style.list)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(mergedThreads), (item) => {
					return openBlock(), createElementBlock("div", {
						key: item.thread.id,
						class: normalizeClass(_ctx.$style.row),
						"data-test-id": "instance-ai-history-thread"
					}, [unref(isAssistantChatItem)(item) && editingThreadId.value === item.thread.id ? withDirectives((openBlock(), createElementBlock("input", {
						key: 0,
						ref_for: true,
						ref: setRenameInput,
						"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => editingTitle.value = $event),
						class: normalizeClass(_ctx.$style.renameInput),
						type: "text",
						maxlength: "255",
						onKeydown: [withKeys(($event) => confirmRename(item), ["enter"]), _cache[4] || (_cache[4] = withKeys(($event) => editingThreadId.value = null, ["escape"]))],
						onBlur: ($event) => confirmRename(item)
					}, null, 42, _hoisted_1)), [[vModelText, editingTitle.value]]) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
						createVNode(_component_RouterLink, {
							to: unref(itemRoute)(item),
							class: normalizeClass(_ctx.$style.link),
							title: itemTitle(item),
							onDblclick: withModifiers(($event) => unref(isAssistantChatItem)(item) && startRename(item), ["prevent"])
						}, {
							default: withCtx(() => [unref(isAgentsN8nChatFlag) ? (openBlock(), createBlock(RecentChatIcon_default, {
								key: 0,
								class: normalizeClass(_ctx.$style.icon),
								item,
								size: 20
							}, null, 8, ["class", "item"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 1,
								class: normalizeClass(_ctx.$style.icon),
								icon: "message-circle",
								size: "medium"
							}, null, 8, ["class"])), createVNode(unref(N8nText_default), {
								class: normalizeClass(_ctx.$style.title),
								size: "medium"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(itemTitle(item)), 1)]),
								_: 2
							}, 1032, ["class"])]),
							_: 2
						}, 1032, [
							"to",
							"class",
							"title",
							"onDblclick"
						]),
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(formatTimeAgo)(item.thread.updatedAt)), 1)]),
							_: 2
						}, 1024),
						unref(isAssistantChatItem)(item) ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
							key: 0,
							items: threadActions,
							class: normalizeClass(_ctx.$style.actions),
							placement: "bottom-end",
							onSelect: ($event) => handleThreadAction($event, item)
						}, {
							activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								variant: "ghost",
								icon: "ellipsis",
								"aria-label": unref(i18n).baseText("instanceAi.threads.actions")
							}, null, 8, ["aria-label"])]),
							_: 1
						}, 8, ["class", "onSelect"])) : (openBlock(), createBlock(unref(N8nActionDropdown_default), {
							key: 1,
							items: unref(agentActions),
							class: normalizeClass(_ctx.$style.actions),
							placement: "bottom-end",
							onSelect: ($event) => handleAgentThreadAction($event, item)
						}, {
							activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								variant: "ghost",
								icon: "ellipsis",
								"aria-label": unref(i18n).baseText("instanceAi.threads.actions")
							}, null, 8, ["aria-label"])]),
							_: 1
						}, 8, [
							"items",
							"class",
							"onSelect"
						]))
					], 64))], 2);
				}), 128)), unref(isLoading) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.status),
					role: "status"
				}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.loading")), 1)]),
					_: 1
				})], 2)) : unref(error) ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.status),
					role: "alert"
				}, [createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.threads.loadError")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					"data-test-id": "instance-ai-threads-retry",
					onClick: unref(loadMore)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				}, 8, ["onClick"])], 2)) : unref(hasMore) ? (openBlock(), createElementBlock("div", {
					key: 2,
					ref_key: "sentinelRef",
					ref: sentinelRef,
					class: normalizeClass(_ctx.$style.sentinel)
				}, null, 2)) : unref(mergedThreads).length === 0 ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.status)
				}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(unref(history).search ? "instanceAi.threads.noSearchResults" : "instanceAi.sidebar.noThreads")), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true)], 2)], 2)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	page: "_page_1s7fz_1",
	header: "_header_1s7fz_11",
	heading: "_heading_1s7fz_18",
	search: "_search_1s7fz_23",
	list: "_list_1s7fz_27",
	row: "_row_1s7fz_33",
	actions: "_actions_1s7fz_43",
	link: "_link_1s7fz_47",
	icon: "_icon_1s7fz_57",
	title: "_title_1s7fz_62",
	renameInput: "_renameInput_1s7fz_78",
	status: "_status_1s7fz_92",
	sentinel: "_sentinel_1s7fz_100"
} }]]);
//#endregion
export { InstanceAiThreadsView_default as default };
