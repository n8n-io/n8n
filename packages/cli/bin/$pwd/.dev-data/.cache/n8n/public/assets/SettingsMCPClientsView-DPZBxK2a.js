import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, ui as require_debounce, vf as resolveDynamicComponent, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Bt as McpClientLogoCards_default, Cm as useRBACStore, Gt as useMCPStore, HM as N8nAvatar_default, Hj as SettingsPageHeader_default, Jt as getClientBrand, Kt as EMPTY_OAUTH_CLIENT_FILTERS, Nj as N8nPopover_default, Qt as MCP_DOCS_PAGE_URL, SN as _plugin_vue_export_helper_default, Uj as SettingsLayout_default, Wt as useMcp, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, cN as Input_default, dC as useToast, eC as DEBOUNCE_TIME, ej as N8nDataTableServer_default, en as MCP_SETTINGS_VIEW, gM as N8nInputLabel_default, gj as N8nTimeAgo_default, hE as MCP_CLIENT_TYPE_FILTERS, hM as N8nLink_default, ij as N8nUserSelect_default, jN as useI18n, mE as MCP_CLIENT_CONNECTED_PERIODS, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, qd as useDocumentTitle, qt as getAccessSummary, tN as N8nLoading_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { n as RevokeOAuthClientConfirmModal_default, r as OAuthClientDetailsModal_default, t as useOAuthClientRevoke } from "./useOAuthClientRevoke-9J7RMFuL.js";
//#region ../../modules/mcp/frontend/src/components/McpEmptyStateCard.vue?vue&type=script&setup=true&lang.ts
var import_debounce = /* @__PURE__ */ __toESM(require_debounce(), 1);
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$3 = ["data-test-id"];
var McpEmptyStateCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpEmptyStateCard",
	props: {
		title: {},
		description: {},
		dataTestId: { default: void 0 }
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": __props.dataTestId
			}, [
				createVNode(McpClientLogoCards_default, { class: normalizeClass(_ctx.$style.cards) }, null, 8, ["class"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.copy) }, [createVNode(unref(N8nText_default), {
					bold: "",
					size: "large",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.description), 1)]),
					_: 1
				})], 2),
				_ctx.$slots.actions ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.actions)
				}, [renderSlot(_ctx.$slots, "actions")], 2)) : createCommentVNode("", true)
			], 10, _hoisted_1$3);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_hefy3_450",
	fadeInUp: "_fadeInUp_hefy3_1",
	cards: "_cards_hefy3_468",
	copy: "_copy_hefy3_472",
	actions: "_actions_hefy3_479",
	shimmer: "_shimmer_hefy3_1",
	spin: "_spin_hefy3_1",
	"skeleton-pulse": "_skeleton-pulse_hefy3_1",
	opacityPulse: "_opacityPulse_hefy3_1",
	popoverIn: "_popoverIn_hefy3_1",
	fadeIn: "_fadeIn_hefy3_1",
	collapsibleSlideDown: "_collapsibleSlideDown_hefy3_1",
	collapsibleSlideUp: "_collapsibleSlideUp_hefy3_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_hefy3_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_hefy3_1",
	blurSwapIn: "_blurSwapIn_hefy3_1",
	blurSwapOut: "_blurSwapOut_hefy3_1",
	pulse: "_pulse_hefy3_1",
	pulseGlow: "_pulseGlow_hefy3_1",
	pulseGlowDelayed: "_pulseGlowDelayed_hefy3_1",
	fade: "_fade_hefy3_1",
	fadeInDown: "_fadeInDown_hefy3_1",
	fadeInLeft: "_fadeInLeft_hefy3_1",
	fadeInRight: "_fadeInRight_hefy3_1",
	fadeOut: "_fadeOut_hefy3_1",
	fadeOutDown: "_fadeOutDown_hefy3_1",
	fadeOutUp: "_fadeOutUp_hefy3_1",
	fadeOutLeft: "_fadeOutLeft_hefy3_1",
	fadeOutRight: "_fadeOutRight_hefy3_1",
	ping: "_ping_hefy3_1",
	blinkBackground: "_blinkBackground_hefy3_1",
	typingBlink: "_typingBlink_hefy3_1"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/tabs/OAuthClientOwnerCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var OAuthClientOwnerCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OAuthClientOwnerCell",
	props: {
		owner: {},
		isCurrentUser: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const displayName = computed(() => {
			return [props.owner.firstName, props.owner.lastName].filter(Boolean).join(" ").trim() || props.owner.email;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.cell),
				"data-test-id": "mcp-client-owner-cell"
			}, [createVNode(unref(N8nAvatar_default), {
				"first-name": __props.owner.firstName ?? "",
				"last-name": __props.owner.lastName ?? "",
				size: "xsmall",
				class: normalizeClass(_ctx.$style.avatar)
			}, null, 8, [
				"first-name",
				"last-name",
				"class"
			]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.info) }, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-dark",
				class: normalizeClass(_ctx.$style.name)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(displayName.value) + " ", 1), __props.isCurrentUser ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.oAuthClients.owner.you")), 1)]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class"]), createVNode(unref(N8nText_default), {
				size: "xsmall",
				color: "text-light",
				class: normalizeClass(_ctx.$style.email),
				"data-test-id": "user-email"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.owner.email), 1)]),
				_: 1
			}, 8, ["class"])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	cell: "_cell_1mslm_2",
	avatar: "_avatar_1mslm_9",
	info: "_info_1mslm_13",
	name: "_name_1mslm_19",
	email: "_email_1mslm_20"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/tabs/OAuthClientsFilters.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = { key: 1 };
var OAuthClientsFilters_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OAuthClientsFilters",
	props: {
		modelValue: {},
		owners: {},
		showOwnerFilter: { type: Boolean },
		currentUserId: {}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const CLIENT_TYPE_OPTIONS = MCP_CLIENT_TYPE_FILTERS;
		const CONNECTED_OPTIONS = MCP_CLIENT_CONNECTED_PERIODS;
		const connectedOptionLabels = {
			last7: i18n.baseText("settings.mcp.oAuthClients.filters.connected.lastXDays", { interpolate: { count: 7 } }),
			last30: i18n.baseText("settings.mcp.oAuthClients.filters.connected.lastXDays", { interpolate: { count: 30 } }),
			older: i18n.baseText("settings.mcp.oAuthClients.filters.connected.older")
		};
		const filtersLength = computed(() => {
			const { type, ownerId, connected } = props.modelValue;
			return [
				type,
				ownerId,
				connected
			].filter((value) => value !== null).length;
		});
		const hasFilters = computed(() => filtersLength.value > 0);
		function setKeyValue(key, value) {
			emit("update:modelValue", {
				...props.modelValue,
				[key]: value === "" ? null : value
			});
		}
		function resetFilters() {
			emit("update:modelValue", {
				...props.modelValue,
				type: null,
				ownerId: null,
				connected: null
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				width: "304px",
				"content-class": _ctx.$style["popover-content"],
				align: "end"
			}, {
				trigger: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style["trigger-wrapper"]) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					icon: "funnel",
					size: "medium",
					"icon-only": !hasFilters.value,
					active: hasFilters.value,
					"aria-label": unref(i18n).baseText("forms.resourceFiltersDropdown.filters"),
					"data-test-id": "mcp-clients-filters-trigger"
				}, {
					default: withCtx(() => [hasFilters.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 0,
						class: normalizeClass(_ctx.$style["filter-button-count"]),
						"data-test-id": "mcp-clients-filters-count",
						variant: "primary"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(filtersLength.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true), hasFilters.value ? (openBlock(), createElementBlock("span", _hoisted_1$2, toDisplayString(unref(i18n).baseText("forms.resourceFiltersDropdown.filters")), 1)) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"icon-only",
					"active",
					"aria-label"
				])], 2)]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["filters-dropdown"]),
					"data-test-id": "mcp-clients-filters-dropdown"
				}, [
					createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("settings.mcp.oAuthClients.filters.clientType"),
						bold: false,
						size: "small",
						color: "text-base",
						class: "mb-3xs"
					}, null, 8, ["label"]),
					createVNode(unref(N8nSelect_default), {
						"model-value": __props.modelValue.type ?? "",
						size: "medium",
						"data-test-id": "mcp-clients-filter-type",
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => setKeyValue("type", $event))
					}, {
						default: withCtx(() => [createVNode(unref(N8nOption_default), {
							value: "",
							label: unref(i18n).baseText("settings.mcp.oAuthClients.filters.clientType.all")
						}, null, 8, ["label"]), (openBlock(true), createElementBlock(Fragment, null, renderList(unref(CLIENT_TYPE_OPTIONS), (type) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: type,
								value: type,
								label: unref(i18n).baseText(`settings.mcp.oAuthClients.filters.clientType.${type}`)
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, ["model-value"]),
					__props.showOwnerFilter ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("settings.mcp.oAuthClients.filters.connectedBy"),
						bold: false,
						size: "small",
						color: "text-base",
						class: "mt-s mb-3xs"
					}, null, 8, ["label"]), createVNode(unref(N8nUserSelect_default), {
						users: __props.owners ?? [],
						"model-value": __props.modelValue.ownerId ?? "",
						"current-user-id": __props.currentUserId,
						placeholder: unref(i18n).baseText("settings.mcp.oAuthClients.filters.connectedBy.all"),
						size: "medium",
						clearable: "",
						"data-test-id": "mcp-clients-filter-owner",
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => setKeyValue("ownerId", $event ?? ""))
					}, null, 8, [
						"users",
						"model-value",
						"current-user-id",
						"placeholder"
					])], 64)) : createCommentVNode("", true),
					createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("settings.mcp.oAuthClients.filters.connected"),
						bold: false,
						size: "small",
						color: "text-base",
						class: "mt-s mb-3xs"
					}, null, 8, ["label"]),
					createVNode(unref(N8nSelect_default), {
						"model-value": __props.modelValue.connected ?? "",
						size: "medium",
						"data-test-id": "mcp-clients-filter-connected",
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => setKeyValue("connected", $event))
					}, {
						default: withCtx(() => [createVNode(unref(N8nOption_default), {
							value: "",
							label: unref(i18n).baseText("settings.mcp.oAuthClients.filters.connected.allTime")
						}, null, 8, ["label"]), (openBlock(true), createElementBlock(Fragment, null, renderList(unref(CONNECTED_OPTIONS), (period) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: period,
								value: period,
								label: connectedOptionLabels[period]
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, ["model-value"]),
					hasFilters.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass([_ctx.$style["filters-dropdown-footer"], "mt-s"])
					}, [createVNode(unref(N8nLink_default), {
						"data-test-id": "mcp-clients-filters-reset",
						onClick: resetFilters
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("forms.resourceFiltersDropdown.reset")), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, ["content-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	"popover-content": "_popover-content_1tniw_1",
	"trigger-wrapper": "_trigger-wrapper_1tniw_5",
	"filter-button-count": "_filter-button-count_1tniw_12",
	"filters-dropdown-footer": "_filters-dropdown-footer_1tniw_17"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/tabs/OAuthClientsTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "oauth-clients-table" };
var _hoisted_2 = { key: 0 };
var _hoisted_3 = {
	key: 2,
	class: "mt-s mb-xl"
};
var _hoisted_4 = { key: 1 };
var OAuthClientsTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OAuthClientsTable",
	props: {
		clients: {},
		loading: { type: Boolean },
		scopeTools: {}
	},
	emits: [
		"revokeClient",
		"update:ownership",
		"update:filters",
		"update:options"
	],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const mcpStore = useMCPStore();
		const rbacStore = useRBACStore();
		const usersStore = useUsersStore();
		const rootStore = useRootStore();
		const props = __props;
		const emit = __emit;
		const page = computed({
			get: () => mcpStore.oauthClientsPage,
			set: (value) => emit("update:options", {
				page: value,
				itemsPerPage: itemsPerPage.value
			})
		});
		const itemsPerPage = computed({
			get: () => mcpStore.oauthClientsPageSize,
			set: (value) => emit("update:options", {
				page: page.value,
				itemsPerPage: value
			})
		});
		const detailsClient = ref(null);
		const detailsOpen = ref(false);
		const canManageAllClients = computed(() => rbacStore.hasScope("mcp:manage"));
		const ownership = computed(() => mcpStore.oauthClientsOwnership);
		const offeredScopes = computed(() => props.scopeTools ? Object.keys(props.scopeTools) : void 0);
		const tabOptions = computed(() => [{
			label: i18n.baseText("settings.mcp.oAuthClients.tabs.mine"),
			value: "mine",
			tag: String(mcpStore.oauthClientTotals.mine)
		}, {
			label: i18n.baseText("settings.mcp.oAuthClients.tabs.all"),
			value: "all",
			tag: String(mcpStore.oauthClientTotals.all ?? 0)
		}]);
		const filters = ref({ ...EMPTY_OAUTH_CLIENT_FILTERS });
		const searchQuery = ref("");
		const hasActiveFilters = computed(() => filters.value.search.trim() !== "" || filters.value.type !== null || filters.value.ownerId !== null || filters.value.connected !== null);
		const totalClients = computed(() => mcpStore.oauthClientTotals.all ?? mcpStore.oauthClientTotals.mine);
		const showEmptyState = computed(() => props.clients.length === 0 && totalClients.value === 0 && !hasActiveFilters.value);
		function onFiltersChange(newFilters) {
			filters.value = newFilters;
			emit("update:filters", newFilters);
		}
		const applySearch = (0, import_debounce.default)((value) => {
			onFiltersChange({
				...filters.value,
				search: value
			});
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		function onSearchInput(value) {
			searchQuery.value = value;
			applySearch(value);
		}
		const ownerOptions = computed(() => mcpStore.oauthClientOwners.map((owner) => ({
			id: owner.id,
			firstName: owner.firstName,
			lastName: owner.lastName,
			email: owner.email,
			fullName: [owner.firstName, owner.lastName].filter(Boolean).join(" ") || void 0
		})));
		function onOwnershipChange(newOwnership) {
			if (newOwnership === ownership.value) return;
			applySearch.cancel();
			filters.value = { ...EMPTY_OAUTH_CLIENT_FILTERS };
			searchQuery.value = "";
			emit("update:ownership", newOwnership);
		}
		function rowId(row) {
			return `${row.id}:${row.owner?.id ?? "mine"}`;
		}
		const tableHeaders = computed(() => [
			{
				title: i18n.baseText("settings.mcp.oAuthClients.table.clientName"),
				key: "name",
				width: 190,
				disableSort: true,
				value() {}
			},
			...ownership.value === "all" ? [{
				title: i18n.baseText("settings.mcp.oAuthClients.table.connectedBy"),
				key: "owner",
				width: 200,
				disableSort: true,
				value() {}
			}] : [],
			{
				title: i18n.baseText("settings.mcp.oAuthClients.table.access"),
				key: "scopes",
				disableSort: true,
				value() {}
			},
			{
				title: i18n.baseText("settings.mcp.oAuthClients.table.connectedAt"),
				key: "grantedAt",
				width: 110,
				disableSort: true,
				value() {}
			},
			{
				title: "",
				key: "actions",
				align: "end",
				width: 140,
				disableSort: true,
				value() {}
			}
		]);
		function accessSummary(client) {
			return getAccessSummary(i18n, client, offeredScopes.value);
		}
		function revokeLabel(client) {
			return i18n.baseText("settings.mcp.oAuthClients.table.action.revokeAccessFor", { interpolate: { name: client.name } });
		}
		function clientTypeLabel(client) {
			const type = getClientBrand(client.name).type;
			if (!type) return null;
			return i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}`);
		}
		function openDetails(item) {
			detailsClient.value = item;
			detailsOpen.value = true;
		}
		function onRevoke(item) {
			emit("revokeClient", item);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$1, [props.loading ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nLoading_default), {
				loading: props.loading,
				variant: "h1",
				class: "mb-l"
			}, null, 8, ["loading"]), createVNode(unref(N8nLoading_default), {
				loading: props.loading,
				variant: "p",
				rows: 5,
				"shrink-last": false
			}, null, 8, ["loading"])])) : showEmptyState.value ? (openBlock(), createBlock(McpEmptyStateCard_default, {
				key: 1,
				"data-test-id": "mcp-clients-empty",
				title: unref(i18n).baseText("settings.mcp.connectedClients.empty.title"),
				description: unref(i18n).baseText("settings.mcp.connectedClients.empty.description")
			}, null, 8, ["title", "description"])) : (openBlock(), createElementBlock("div", _hoisted_3, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolbar) }, [canManageAllClients.value ? (openBlock(), createBlock(unref(Tabs_default), {
				key: 0,
				"model-value": ownership.value,
				options: tabOptions.value,
				"data-test-id": "mcp-clients-tabs",
				"onUpdate:modelValue": onOwnershipChange
			}, null, 8, ["model-value", "options"])) : (openBlock(), createElementBlock("div", _hoisted_4)), createBaseVNode("div", { class: normalizeClass(_ctx.$style.filters) }, [createVNode(unref(Input_default), {
				"model-value": searchQuery.value,
				placeholder: unref(i18n).baseText("settings.mcp.oAuthClients.search.placeholder"),
				class: normalizeClass(_ctx.$style.search),
				size: "medium",
				clearable: "",
				"data-test-id": "mcp-clients-search",
				"onUpdate:modelValue": onSearchInput
			}, {
				prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
				_: 1
			}, 8, [
				"model-value",
				"placeholder",
				"class"
			]), createVNode(OAuthClientsFilters_default, {
				"model-value": filters.value,
				owners: ownerOptions.value,
				"show-owner-filter": ownership.value === "all",
				"current-user-id": unref(usersStore).currentUser?.id,
				"onUpdate:modelValue": onFiltersChange
			}, null, 8, [
				"model-value",
				"owners",
				"show-owner-filter",
				"current-user-id"
			])], 2)], 2), createVNode(unref(N8nDataTableServer_default), {
				page: page.value,
				"onUpdate:page": _cache[0] || (_cache[0] = ($event) => page.value = $event),
				"items-per-page": itemsPerPage.value,
				"onUpdate:itemsPerPage": _cache[1] || (_cache[1] = ($event) => itemsPerPage.value = $event),
				class: normalizeClass(_ctx.$style.table),
				"data-test-id": "oauth-clients-data-table",
				headers: tableHeaders.value,
				items: props.clients,
				"items-length": unref(mcpStore).oauthClientsCount,
				"item-value": rowId,
				"onClick:row": _cache[2] || (_cache[2] = (_, { item }) => openDetails(item))
			}, createSlots({
				[`item.name`]: withCtx(({ item }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.client) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style["client-icon-chip"]) }, [unref(getClientBrand)(item.name).icon ? (openBlock(), createBlock(resolveDynamicComponent(unref(getClientBrand)(item.name).icon), {
					key: 0,
					class: normalizeClass(_ctx.$style["client-icon"])
				}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "mcp",
					class: normalizeClass(_ctx.$style["client-icon"])
				}, null, 8, ["class"]))], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style["client-name"]) }, [createVNode(unref(N8nText_default), {
					"data-test-id": "mcp-client-name",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.name), 1)]),
					_: 2
				}, 1024), clientTypeLabel(item) ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					"data-test-id": "mcp-client-type",
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(clientTypeLabel(item)), 1)]),
					_: 2
				}, 1024)) : createCommentVNode("", true)], 2)], 2)]),
				[`item.owner`]: withCtx(({ item }) => [item.owner ? (openBlock(), createBlock(OAuthClientOwnerCell_default, {
					key: 0,
					owner: item.owner,
					"is-current-user": item.owner.id === unref(usersStore).currentUser?.id
				}, null, 8, ["owner", "is-current-user"])) : createCommentVNode("", true)]),
				[`item.scopes`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), {
					"data-test-id": "mcp-client-access",
					color: "text-light",
					class: normalizeClass(_ctx.$style.access)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(accessSummary(item)), 1)]),
					_: 2
				}, 1032, ["class"])]),
				[`item.grantedAt`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), {
					"data-test-id": "mcp-client-created-at",
					color: "text-base"
				}, {
					default: withCtx(() => [createVNode(unref(N8nTimeAgo_default), {
						date: new Date(item.grantedAt).toISOString(),
						capitalize: "",
						locale: unref(rootStore).defaultLocale
					}, null, 8, ["date", "locale"])]),
					_: 2
				}, 1024)]),
				[`item.actions`]: withCtx(({ item }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["row-actions"]) }, [createVNode(unref(N8nButton_default), {
					class: normalizeClass(_ctx.$style["revoke-action"]),
					variant: "outline",
					size: "small",
					"aria-label": revokeLabel(item),
					"data-test-id": "mcp-oauth-client-revoke-button",
					onClick: withModifiers(($event) => onRevoke(item), ["stop"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.oAuthClients.table.action.revokeAccess")), 1)]),
					_: 1
				}, 8, [
					"class",
					"aria-label",
					"onClick"
				])], 2)]),
				_: 2
			}, [unref(mcpStore).oauthClientsCount === 0 ? {
				name: "cover",
				fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["empty-state"]) }, [createVNode(unref(N8nText_default), {
					"data-test-id": "mcp-clients-no-results",
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.oAuthClients.search.noResults")), 1)]),
					_: 1
				})], 2)]),
				key: "0"
			} : void 0]), 1032, [
				"page",
				"items-per-page",
				"class",
				"headers",
				"items",
				"items-length"
			])])), createVNode(OAuthClientDetailsModal_default, {
				open: detailsOpen.value,
				"onUpdate:open": _cache[3] || (_cache[3] = ($event) => detailsOpen.value = $event),
				client: detailsClient.value,
				onRevoke
			}, null, 8, ["open", "client"])]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_8cagm_1",
	toolbar: "_toolbar_8cagm_7",
	filters: "_filters_8cagm_15",
	search: "_search_8cagm_21",
	client: "_client_8cagm_25",
	"client-icon-chip": "_client-icon-chip_8cagm_31",
	"client-icon": "_client-icon_8cagm_31",
	access: "_access_8cagm_53",
	"client-name": "_client-name_8cagm_66",
	"empty-state": "_empty-state_8cagm_71",
	"row-actions": "_row-actions_8cagm_83",
	table: "_table_8cagm_89",
	"revoke-action": "_revoke-action_8cagm_94"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/SettingsMCPClientsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { "data-test-id": "mcp-clients-view" };
var SettingsMCPClientsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsMCPClientsView",
	setup(__props) {
		const i18n = useI18n();
		const toast = useToast();
		const mcp = useMcp();
		const route = useRoute();
		const router = useRouter();
		const documentTitle = useDocumentTitle({ releaseChannel: useSettingsStore().settings.releaseChannel });
		const mcpStore = useMCPStore();
		const rbacStore = useRBACStore();
		const oAuthClientsLoading = ref(false);
		const { revokeClient, revoking, isRevokingForOther, requestRevoke, cancelRevoke, confirmRevoke } = useOAuthClientRevoke();
		const fetchoAuthCLients = async () => {
			try {
				oAuthClientsLoading.value = true;
				await mcpStore.getAllOAuthClients();
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.error.fetching.oAuthClients"));
			} finally {
				setTimeout(() => {
					oAuthClientsLoading.value = false;
				}, 200);
			}
		};
		const onOwnershipChange = async (ownership) => {
			if (route.query.tab !== ownership) router.replace({ query: {
				...route.query,
				tab: ownership
			} });
			try {
				oAuthClientsLoading.value = true;
				await mcpStore.setOAuthClientsOwnership(ownership);
				if (ownership === "all") mcp.trackViewedAllClients();
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.error.fetching.oAuthClients"));
			} finally {
				setTimeout(() => {
					oAuthClientsLoading.value = false;
				}, 200);
			}
		};
		/**
		* `?tab=all` deep-links to everyone's clients (the overview sends managers here
		* when they have none of their own). Only honoured for `mcp:manage` holders: the
		* endpoint rejects the instance-wide list for anyone else.
		*/
		const requestedOwnership = () => {
			if (route.query.tab === "all") return rbacStore.hasScope("mcp:manage") ? "all" : "mine";
			if (route.query.tab === "mine") return "mine";
		};
		const onClientsFiltersChange = async (filters) => {
			try {
				await mcpStore.setOAuthClientsFilters(filters);
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.error.fetching.oAuthClients"));
			}
		};
		const onClientsOptionsChange = async (options) => {
			try {
				await mcpStore.setOAuthClientsPagination(options.page, options.itemsPerPage);
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.error.fetching.oAuthClients"));
			}
		};
		const onBack = () => {
			router.push({ name: MCP_SETTINGS_VIEW });
		};
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.mcp.connectedClients.title"));
			if (!mcpStore.mcpAccessEnabled) {
				await router.replace({ name: MCP_SETTINGS_VIEW });
				return;
			}
			const ownership = requestedOwnership();
			if (ownership && ownership !== mcpStore.oauthClientsOwnership) {
				await onOwnershipChange(ownership);
				return;
			}
			await fetchoAuthCLients();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				"full-width": "",
				"show-back": "",
				"back-label": unref(i18n).baseText("settings.mcp.back"),
				class: normalizeClass(_ctx.$style.layout),
				onBack
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.mcp.connectedClients.title"),
						description: unref(i18n).baseText("settings.mcp.connectedClients.description"),
						"docs-url": unref(MCP_DOCS_PAGE_URL)
					}, null, 8, [
						"title",
						"description",
						"docs-url"
					]),
					createBaseVNode("div", _hoisted_1, [createVNode(OAuthClientsTable_default, {
						"data-test-id": "mcp-oauth-clients-table",
						clients: unref(mcpStore).oauthClients,
						"scope-tools": unref(mcpStore).oauthClientScopeTools,
						loading: oAuthClientsLoading.value,
						onRevokeClient: unref(requestRevoke),
						"onUpdate:ownership": onOwnershipChange,
						"onUpdate:filters": onClientsFiltersChange,
						"onUpdate:options": onClientsOptionsChange,
						onRefresh: fetchoAuthCLients
					}, null, 8, [
						"clients",
						"scope-tools",
						"loading",
						"onRevokeClient"
					])]),
					createVNode(RevokeOAuthClientConfirmModal_default, {
						client: unref(revokeClient),
						open: !!unref(revokeClient),
						loading: unref(revoking),
						"revoking-for-other": !!unref(revokeClient) && unref(isRevokingForOther)(unref(revokeClient)),
						onConfirm: unref(confirmRevoke),
						onCancel: unref(cancelRevoke),
						"onUpdate:open": unref(cancelRevoke)
					}, null, 8, [
						"client",
						"open",
						"loading",
						"revoking-for-other",
						"onConfirm",
						"onCancel",
						"onUpdate:open"
					])
				]),
				_: 1
			}, 8, ["back-label", "class"]);
		};
	}
}), [["__cssModules", { "$style": { layout: "_layout_g942e_2" } }]]);
//#endregion
export { SettingsMCPClientsView_default as default };
