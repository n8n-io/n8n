import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Kd as useDocumentTitle, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, ej as N8nDataTableServer_default, fC as VIEWS, fN as N8nTooltip_default, jN as useI18n, kp as useAiGatewayStore, nN as N8nBadge_default, tN as N8nLoading_default, xM as N8nEmptyState_default, xr as useAiGatewayTopUp, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/ai/gateway/views/SettingsAiGatewayView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = { key: 1 };
var _hoisted_3 = { key: 1 };
var PAGE_SIZE = 50;
var SettingsAiGatewayView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsAiGatewayView",
	setup(__props) {
		const i18n = useI18n();
		const router = useRouter();
		const documentTitle = useDocumentTitle();
		const aiGatewayStore = useAiGatewayStore();
		const { openTopUp } = useAiGatewayTopUp();
		const isLoading = ref(false);
		const isAppending = ref(false);
		const offset = ref(0);
		const walletBalance = computed(() => aiGatewayStore.balance);
		const walletBadgeText = computed(() => walletBalance.value !== void 0 ? i18n.baseText("aiGateway.wallet.balanceRemaining", { interpolate: { balance: `$${Number(walletBalance.value).toFixed(2)}` } }) : void 0);
		const entries = computed(() => aiGatewayStore.usageEntries);
		const total = computed(() => aiGatewayStore.usageTotal);
		const hasMore = computed(() => offset.value + PAGE_SIZE < total.value);
		const showUsageSectionSkeleton = computed(() => isLoading.value && !isAppending.value);
		const tableHeaders = ref([
			{
				title: i18n.baseText("settings.n8nConnect.usage.col.date"),
				key: "timestamp",
				width: 200,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.n8nConnect.usage.col.provider"),
				key: "provider",
				width: 120,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.n8nConnect.usage.col.resource"),
				key: "model",
				width: 220,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.n8nConnect.usage.col.inputTokens"),
				key: "inputTokens",
				width: 120,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.n8nConnect.usage.col.outputTokens"),
				key: "outputTokens",
				width: 120,
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.n8nConnect.usage.col.cost"),
				key: "cost",
				width: 100,
				disableSort: true,
				resize: false
			}
		]);
		function formatDate(timestamp) {
			return new Intl.DateTimeFormat(void 0, {
				day: "2-digit",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			}).format(new Date(timestamp));
		}
		function formatTokens(value) {
			return value !== void 0 ? String(value) : "—";
		}
		function rowId(row, index) {
			return `${row.timestamp}-${row.model}-${row.provider}-${index}`;
		}
		function rowExecutionId(row) {
			return row.metadata?.executionId;
		}
		function rowWorkflowId(row) {
			return row.metadata?.workflowId;
		}
		function isRowClickable(row) {
			return Boolean(rowExecutionId(row) && rowWorkflowId(row));
		}
		function onRowClick(row) {
			const executionId = rowExecutionId(row);
			const workflowId = rowWorkflowId(row);
			if (executionId && workflowId) router.push({
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					workflowId,
					executionId
				}
			});
		}
		async function load() {
			isAppending.value = false;
			offset.value = 0;
			isLoading.value = true;
			try {
				await aiGatewayStore.fetchUsage(0, PAGE_SIZE);
			} finally {
				isLoading.value = false;
			}
		}
		async function refresh() {
			await Promise.all([aiGatewayStore.fetchWallet({ force: true }), load()]);
		}
		async function loadMore() {
			if (isLoading.value) return;
			isAppending.value = true;
			offset.value += PAGE_SIZE;
			isLoading.value = true;
			try {
				await aiGatewayStore.fetchMoreUsage(offset.value, PAGE_SIZE);
			} finally {
				isLoading.value = false;
				isAppending.value = false;
			}
		}
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.n8nConnect.title"));
			await refresh();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "settings-ai-gateway"
			}, [createBaseVNode("header", {
				class: normalizeClass(_ctx.$style.mainHeader),
				"data-test-id": "ai-gateway-settings-header"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headings) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headingRow) }, [createVNode(unref(N8nHeading_default), { size: "2xlarge" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nConnect.title")), 1)]),
				_: 1
			}), walletBadgeText.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
				key: 0,
				size: "xsmall",
				variant: "success",
				"data-test-id": "ai-gateway-header-credits-badge"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(walletBadgeText.value), 1)]),
				_: 1
			})) : createCommentVNode("", true)], 2), createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nConnect.description")), 1)]),
				_: 1
			})], 2), createVNode(unref(N8nButton_default), {
				label: unref(i18n).baseText("settings.n8nConnect.wallet.topUp"),
				icon: "hand-coins",
				variant: "solid",
				"data-test-id": "ai-gateway-topup-button",
				onClick: _cache[0] || (_cache[0] = ($event) => unref(openTopUp)({ source: "settings_page" }))
			}, null, 8, ["label"])], 2), createBaseVNode("div", null, [showUsageSectionSkeleton.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nLoading_default), {
				loading: true,
				variant: "h1",
				class: normalizeClass(_ctx.$style.usageTableHeader)
			}, null, 8, ["class"]), createVNode(unref(N8nLoading_default), {
				loading: true,
				variant: "p",
				rows: 5,
				"shrink-last": false
			})])) : (openBlock(), createElementBlock("div", _hoisted_2, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.usageTableHeader) }, [createVNode(unref(N8nHeading_default), {
					size: "medium",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nConnect.usage.title")), 1)]),
					_: 1
				}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.usageTableActions) }, [createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("settings.n8nConnect.usage.refresh.tooltip") }, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						"icon-only": "",
						size: "small",
						icon: "refresh-cw",
						"aria-label": unref(i18n).baseText("generic.refresh"),
						loading: isLoading.value && !isAppending.value,
						onClick: refresh
					}, null, 8, ["aria-label", "loading"])]),
					_: 1
				}, 8, ["content"])], 2)], 2),
				entries.value.length === 0 ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
					key: 0,
					heading: unref(i18n).baseText("settings.n8nConnect.usage.empty")
				}, null, 8, ["heading"])) : (openBlock(), createBlock(unref(N8nDataTableServer_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.gatewayUsageTable),
					headers: tableHeaders.value,
					items: entries.value,
					"items-length": entries.value.length,
					pagination: false,
					loading: isLoading.value && isAppending.value,
					"item-value": rowId,
					"row-props": (row) => isRowClickable(row) ? { class: _ctx.$style.clickableRow } : {},
					"onClick:row": _cache[1] || (_cache[1] = (_, { item }) => onRowClick(item))
				}, {
					[`item.timestamp`]: withCtx(({ item }) => [isRowClickable(item) ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("settings.n8nConnect.usage.openExecution")
					}, {
						default: withCtx(() => [createBaseVNode("span", null, toDisplayString(formatDate(item.timestamp)), 1)]),
						_: 2
					}, 1032, ["content"])) : (openBlock(), createElementBlock("span", _hoisted_3, toDisplayString(formatDate(item.timestamp)), 1))]),
					[`item.provider`]: withCtx(({ item }) => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.providerBadge) }, toDisplayString(item.provider), 3)]),
					[`item.model`]: withCtx(({ item }) => [createTextVNode(toDisplayString(item.model), 1)]),
					[`item.inputTokens`]: withCtx(({ item }) => [createTextVNode(toDisplayString(formatTokens(item.inputTokens)), 1)]),
					[`item.outputTokens`]: withCtx(({ item }) => [createTextVNode(toDisplayString(formatTokens(item.outputTokens)), 1)]),
					[`item.cost`]: withCtx(({ item }) => [createTextVNode(toDisplayString(`$${Number(item.cost).toFixed(4)}`), 1)]),
					_: 2
				}, 1032, [
					"class",
					"headers",
					"items",
					"items-length",
					"loading",
					"row-props"
				])),
				hasMore.value && entries.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.loadMore)
				}, [createVNode(unref(N8nButton_default), {
					label: unref(i18n).baseText("settings.n8nConnect.usage.loadMore"),
					loading: isLoading.value && isAppending.value,
					onClick: loadMore
				}, null, 8, ["label", "loading"])], 2)) : createCommentVNode("", true)
			]))])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1se74_1",
	mainHeader: "_mainHeader_1se74_8",
	headings: "_headings_1se74_21",
	headingRow: "_headingRow_1se74_28",
	usageTableHeader: "_usageTableHeader_1se74_36",
	usageTableActions: "_usageTableActions_1se74_43",
	gatewayUsageTable: "_gatewayUsageTable_1se74_49",
	clickableRow: "_clickableRow_1se74_53",
	providerBadge: "_providerBadge_1se74_60",
	loadMore: "_loadMore_1se74_70"
} }]]);
//#endregion
export { SettingsAiGatewayView_default as default };
