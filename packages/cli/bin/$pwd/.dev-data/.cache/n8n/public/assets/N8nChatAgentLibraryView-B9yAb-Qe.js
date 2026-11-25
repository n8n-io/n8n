import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, pd as useDebounceFn } from "./vendor-Hx42-oQF.js";
import { Bc as useAgentsN8nChatVariant, SN as _plugin_vue_export_helper_default, TM as N8nPagination_default, _N as N8nText_default, cN as Input_default, eC as DEBOUNCE_TIME, jN as useI18n, xM as N8nEmptyState_default, xN as N8nIcon_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as N8nChatPageLayout_default } from "./N8nChatPageLayout-BraQthtK.js";
import { r as useN8nChatAgents, t as N8nChatAgentGrid_default } from "./N8nChatAgentGrid-Dvwfk848.js";
//#region src/features/agents/n8nChatPage/N8nChatAgentLibraryView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var N8nChatAgentLibraryView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "N8nChatAgentLibraryView",
	setup(__props) {
		const i18n = useI18n();
		const searchInput = ref("");
		const query = ref("");
		const page = ref(1);
		const pageSize = ref(50);
		const PAGE_SIZE_OPTIONS = [
			10,
			25,
			50,
			100
		];
		const { agents, count, isLoading, loadFailed, retry } = useN8nChatAgents({
			query,
			page,
			pageSize
		});
		const onSearch = useDebounceFn((value) => {
			const trimmed = value.trim();
			if (trimmed === query.value) return;
			query.value = trimmed;
			page.value = 1;
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		function onSearchInput(value) {
			searchInput.value = value;
			onSearch(value);
		}
		const hasSearch = computed(() => query.value.length > 0);
		const showPagination = computed(() => count.value > 0);
		const { isVariantB } = useAgentsN8nChatVariant();
		const includeAssistant = computed(() => isVariantB.value && !hasSearch.value && page.value === 1);
		const showEmptyState = computed(() => !includeAssistant.value && !isLoading.value && !loadFailed.value && count.value === 0);
		function onPageSizeChange(size) {
			pageSize.value = size;
			page.value = 1;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(N8nChatPageLayout_default, null, {
				default: withCtx(() => [
					createVNode(unref(N8nText_default), {
						tag: "h1",
						size: "xlarge",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.n8nChatPage.library.title")), 1)]),
						_: 1
					}),
					createVNode(unref(Input_default), {
						"model-value": searchInput.value,
						placeholder: unref(i18n).baseText("agents.n8nChatPage.library.search.placeholder"),
						maxlength: unref(128),
						size: "medium",
						clearable: "",
						"data-testid": "n8n-chat-library-search",
						"onUpdate:modelValue": onSearchInput
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
						_: 1
					}, 8, [
						"model-value",
						"placeholder",
						"maxlength"
					]),
					showEmptyState.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 0,
						"data-testid": "n8n-chat-library-empty",
						icon: {
							type: "icon",
							value: "bot"
						},
						heading: hasSearch.value ? unref(i18n).baseText("agents.n8nChatPage.library.empty.noResults.title") : unref(i18n).baseText("agents.n8nChatPage.library.empty.noAgents.title")
					}, null, 8, ["heading"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [!unref(loadFailed) || includeAssistant.value ? (openBlock(), createBlock(N8nChatAgentGrid_default, {
						key: 0,
						agents: unref(loadFailed) ? [] : unref(agents),
						loading: !unref(loadFailed) && unref(isLoading),
						"include-assistant": includeAssistant.value,
						source: "library",
						onAgentMadeAvailable: unref(retry)
					}, null, 8, [
						"agents",
						"loading",
						"include-assistant",
						"onAgentMadeAvailable"
					])) : createCommentVNode("", true), unref(loadFailed) ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 1,
						"data-testid": "n8n-chat-library-error",
						icon: {
							type: "icon",
							value: "circle-alert"
						},
						heading: unref(i18n).baseText("agents.n8nChatPage.library.loadFailed.title"),
						"button-text": unref(i18n).baseText("generic.retry"),
						"onClick:button": unref(retry)
					}, null, 8, [
						"heading",
						"button-text",
						"onClick:button"
					])) : createCommentVNode("", true)], 64)),
					showPagination.value ? (openBlock(), createBlock(unref(N8nPagination_default), {
						key: 2,
						page: page.value,
						"onUpdate:page": _cache[0] || (_cache[0] = ($event) => page.value = $event),
						class: normalizeClass(_ctx.$style.pagination),
						"items-per-page": pageSize.value,
						total: unref(count),
						"page-sizes": PAGE_SIZE_OPTIONS,
						"data-test-id": "n8n-chat-agent-library-pagination",
						"onUpdate:itemsPerPage": onPageSizeChange
					}, null, 8, [
						"page",
						"class",
						"items-per-page",
						"total"
					])) : createCommentVNode("", true)
				]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": { pagination: "_pagination_14wbs_1" } }]]);
//#endregion
export { N8nChatAgentLibraryView_default as default };
