import { $d as init_runtime_core_esm_bundler, Ad as vModelText, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bd as I18nT, do as storeToRefs, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, of as onBeforeUnmount, pd as useDebounceFn, ua as DateTime, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Cm as useRBACStore, Fy as DOCS_DOMAIN, HA as AlertDialog_default, HM as N8nAvatar_default, Hj as SettingsPageHeader_default, Jg as useUIStore, KA as Dialog_default, Kd as useDocumentTitle, Nj as N8nPopover_default, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, Uj as SettingsLayout_default, WA as DialogBody_default, XM as N8nActionDropdown_default, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, bC as useRootStore, bM as N8nExternalLink_default, b_ as API_KEY_CREATE_OR_EDIT_MODAL_KEY, cN as Input_default, dC as useToast, eC as DEBOUNCE_TIME, ej as N8nDataTableServer_default, f as usePrefetchModals, fN as N8nTooltip_default, hC as useTelemetry, jN as useI18n, mC as useCloudPlanStore, nN as N8nBadge_default, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as useElementOverflow } from "./useElementOverflow-Bq13ByqI.js";
import { i as isApiKeyExpired, n as RevokeApiKeyConfirmModal_default, r as getApiKeyOwnerDisplayName, t as useApiKeysStore } from "./apiKeys.store-ergIYmID.js";
//#region src/features/settings/apiKeys/components/ApiKeyOwnerFilter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = ["aria-expanded"];
var _hoisted_2 = ["placeholder", "aria-label"];
var _hoisted_3 = {
	id: "api-key-owner-filter-listbox",
	role: "listbox",
	"aria-multiselectable": "true"
};
var _hoisted_4 = ["aria-selected"];
var _hoisted_5 = [
	"aria-selected",
	"data-test-id",
	"onClick"
];
var _hoisted_6 = ["disabled"];
var ApiKeyOwnerFilter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyOwnerFilter",
	props: {
		modelValue: { default: () => [] },
		users: { default: () => [] },
		currentUserId: { default: "" },
		counts: { default: () => ({}) },
		totalCount: { default: void 0 }
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const open = ref(false);
		const filter = ref("");
		const selectedSet = computed(() => new Set(props.modelValue));
		const allOwnerIds = computed(() => props.users.map((user) => user.id));
		const allSelected = computed(() => props.users.length > 0 && props.modelValue.length === props.users.length);
		const someSelected = computed(() => props.modelValue.length > 0 && props.modelValue.length < props.users.length);
		const effectiveAll = computed(() => allSelected.value || props.modelValue.length === 0);
		const displayName = (user) => getApiKeyOwnerDisplayName(user);
		const filteredUsers = computed(() => {
			const needle = filter.value.trim().toLowerCase();
			if (!needle) return props.users;
			return props.users.filter((user) => {
				const nameMatch = displayName(user).toLowerCase().includes(needle);
				const emailMatch = user.email?.toLowerCase().includes(needle) ?? false;
				return nameMatch || emailMatch;
			});
		});
		const sortedUsers = computed(() => [...filteredUsers.value].sort((a, b) => displayName(a).localeCompare(displayName(b))));
		const effectiveTotalCount = computed(() => props.totalCount ?? Object.values(props.counts).reduce((sum, count) => sum + count, 0));
		const selectedKeyCount = computed(() => effectiveAll.value ? effectiveTotalCount.value : props.modelValue.reduce((sum, id) => sum + (props.counts[id] ?? 0), 0));
		const pillCount = computed(() => effectiveAll.value ? props.users.length : props.modelValue.length);
		const singleSelectedUser = computed(() => !effectiveAll.value && props.modelValue.length === 1 ? props.users.find((user) => user.id === props.modelValue[0]) : void 0);
		const triggerLabel = computed(() => {
			if (effectiveAll.value) return i18n.baseText("settings.api.owners.all");
			if (singleSelectedUser.value) return displayName(singleSelectedUser.value);
			return i18n.baseText("settings.api.owners.selected", {
				interpolate: { count: props.modelValue.length },
				adjustToNumber: props.modelValue.length
			});
		});
		const summaryLabel = computed(() => effectiveAll.value ? i18n.baseText("settings.api.owners.summary.all", {
			interpolate: { count: selectedKeyCount.value },
			adjustToNumber: selectedKeyCount.value
		}) : i18n.baseText("settings.api.owners.summary.filtered", {
			interpolate: { count: selectedKeyCount.value },
			adjustToNumber: selectedKeyCount.value
		}));
		function toggleUser(id) {
			const next = new Set(selectedSet.value);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			emit("update:modelValue", [...next]);
		}
		function toggleAll() {
			emit("update:modelValue", allSelected.value ? [] : allOwnerIds.value);
		}
		function clearFilter() {
			emit("update:modelValue", allOwnerIds.value);
		}
		watch(open, (isOpen, wasOpen) => {
			if (wasOpen && !isOpen && props.modelValue.length === 0) emit("update:modelValue", allOwnerIds.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				open: open.value,
				"enable-scrolling": false,
				width: "300px",
				"data-test-id": "api-key-owner-filter",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => open.value = $event)
			}, {
				trigger: withCtx(() => [createBaseVNode("button", {
					type: "button",
					role: "combobox",
					"aria-expanded": open.value,
					"aria-haspopup": "listbox",
					"aria-controls": "api-key-owner-filter-listbox",
					class: normalizeClass([_ctx.$style.trigger, { [_ctx.$style.triggerOpen]: open.value }]),
					"data-test-id": "api-key-owner-filter-trigger"
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.triggerLeft) }, [
					singleSelectedUser.value ? (openBlock(), createBlock(unref(N8nAvatar_default), {
						key: 0,
						"first-name": singleSelectedUser.value.firstName,
						"last-name": singleSelectedUser.value.lastName,
						size: "xsmall"
					}, null, 8, ["first-name", "last-name"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: "users",
						class: normalizeClass(_ctx.$style.triggerIcon)
					}, null, 8, ["class"])),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.triggerText) }, toDisplayString(triggerLabel.value), 3),
					createVNode(unref(N8nBadge_default), { class: normalizeClass(_ctx.$style.triggerTag) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(pillCount.value), 1)]),
						_: 1
					}, 8, ["class"])
				], 2), createVNode(unref(N8nIcon_default), {
					icon: "chevron-down",
					class: normalizeClass(_ctx.$style.chevron)
				}, null, 8, ["class"])], 10, _hoisted_1$2)]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.panel) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.search) }, [createVNode(unref(N8nIcon_default), {
						icon: "search",
						class: normalizeClass(_ctx.$style.searchIcon)
					}, null, 8, ["class"]), withDirectives(createBaseVNode("input", {
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => filter.value = $event),
						type: "text",
						placeholder: unref(i18n).baseText("settings.api.owners.search"),
						"aria-label": unref(i18n).baseText("settings.api.owners.search"),
						class: normalizeClass(_ctx.$style.searchInput),
						"data-test-id": "api-key-owner-filter-search"
					}, null, 10, _hoisted_2), [[vModelText, filter.value]])], 2),
					createBaseVNode("div", _hoisted_3, [
						createBaseVNode("button", {
							type: "button",
							role: "option",
							"aria-selected": allSelected.value,
							class: normalizeClass([_ctx.$style.option, { [_ctx.$style.optionSelected]: allSelected.value }]),
							"data-test-id": "api-key-owner-filter-all",
							onClick: toggleAll
						}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionLeft) }, [
							createVNode(unref(Checkbox_default), {
								"model-value": allSelected.value,
								indeterminate: someSelected.value,
								class: normalizeClass(_ctx.$style.checkbox),
								"aria-hidden": "true",
								tabindex: "-1"
							}, null, 8, [
								"model-value",
								"indeterminate",
								"class"
							]),
							createBaseVNode("span", { class: normalizeClass(_ctx.$style.allAvatar) }, [createVNode(unref(N8nIcon_default), { icon: "users" })], 2),
							createVNode(unref(N8nText_default), {
								class: normalizeClass(_ctx.$style.allLabel),
								color: "text-dark"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.owners.all")), 1)]),
								_: 1
							}, 8, ["class"])
						], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionRight) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.count) }, toDisplayString(effectiveTotalCount.value), 3)], 2)], 10, _hoisted_4),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.divider) }, null, 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedUsers.value, (user) => {
							return openBlock(), createElementBlock("button", {
								key: user.id,
								type: "button",
								role: "option",
								"aria-selected": selectedSet.value.has(user.id),
								class: normalizeClass([_ctx.$style.option, { [_ctx.$style.optionSelected]: selectedSet.value.has(user.id) }]),
								"data-test-id": `api-key-owner-filter-option-${user.id}`,
								onClick: ($event) => toggleUser(user.id)
							}, [createBaseVNode("span", { class: normalizeClass([_ctx.$style.optionLeft, _ctx.$style.personLeft]) }, [
								createVNode(unref(Checkbox_default), {
									"model-value": selectedSet.value.has(user.id),
									class: normalizeClass(_ctx.$style.checkbox),
									"aria-hidden": "true",
									tabindex: "-1"
								}, null, 8, ["model-value", "class"]),
								createVNode(unref(N8nAvatar_default), {
									"first-name": user.firstName,
									"last-name": user.lastName,
									size: "xsmall"
								}, null, 8, ["first-name", "last-name"]),
								createBaseVNode("span", { class: normalizeClass(_ctx.$style.personText) }, [createVNode(unref(N8nText_default), {
									class: normalizeClass(_ctx.$style.personName),
									color: "text-dark"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(displayName(user)) + " ", 1), __props.currentUserId === user.id ? (openBlock(), createElementBlock("span", {
										key: 0,
										class: normalizeClass(_ctx.$style.you)
									}, toDisplayString(unref(i18n).baseText("settings.api.owners.you")), 3)) : createCommentVNode("", true)]),
									_: 2
								}, 1032, ["class"]), createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light",
									class: normalizeClass(_ctx.$style.personEmail)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(user.email), 1)]),
									_: 2
								}, 1032, ["class"])], 2)
							], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionRight) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.count) }, toDisplayString(__props.counts[user.id] ?? 0), 3)], 2)], 10, _hoisted_5);
						}), 128)), !sortedUsers.value.length ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.noResults)
						}, toDisplayString(unref(i18n).baseText("settings.api.owners.noResults")), 3)) : createCommentVNode("", true)], 2)
					]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.summary) }, toDisplayString(summaryLabel.value), 3), createBaseVNode("button", {
						type: "button",
						class: normalizeClass(_ctx.$style.clear),
						disabled: effectiveAll.value,
						"data-test-id": "api-key-owner-filter-clear",
						onClick: clearFilter
					}, toDisplayString(unref(i18n).baseText("settings.api.owners.clear")), 11, _hoisted_6)], 2)
				], 2)]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	trigger: "_trigger_q0h17_1",
	panel: "_panel_q0h17_2",
	triggerOpen: "_triggerOpen_q0h17_23",
	triggerLeft: "_triggerLeft_q0h17_28",
	triggerIcon: "_triggerIcon_q0h17_35",
	triggerText: "_triggerText_q0h17_40",
	triggerTag: "_triggerTag_q0h17_50",
	chevron: "_chevron_q0h17_54",
	search: "_search_q0h17_69",
	searchIcon: "_searchIcon_q0h17_78",
	searchInput: "_searchInput_q0h17_83",
	optionList: "_optionList_q0h17_96",
	option: "_option_q0h17_96",
	optionSelected: "_optionSelected_q0h17_119",
	optionLeft: "_optionLeft_q0h17_124",
	personLeft: "_personLeft_q0h17_131",
	checkbox: "_checkbox_q0h17_135",
	allAvatar: "_allAvatar_q0h17_140",
	allLabel: "_allLabel_q0h17_151",
	personText: "_personText_q0h17_155",
	personName: "_personName_q0h17_161",
	you: "_you_q0h17_168",
	personEmail: "_personEmail_q0h17_172",
	optionRight: "_optionRight_q0h17_178",
	count: "_count_q0h17_185",
	divider: "_divider_q0h17_190",
	noResults: "_noResults_q0h17_196",
	footer: "_footer_q0h17_203",
	summary: "_summary_q0h17_212",
	clear: "_clear_q0h17_217"
} }]]);
//#endregion
//#region src/features/settings/apiKeys/components/ApiKeyLabelCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ApiKeyLabelCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyLabelCell",
	props: {
		label: {},
		apiKey: {}
	},
	setup(__props) {
		const props = __props;
		const labelEl = ref(null);
		const { isOverflowing } = useElementOverflow(labelEl, "x", [() => props.label]);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.cell) }, [createVNode(unref(N8nTooltip_default), {
				content: __props.label,
				"show-after": 500,
				disabled: !unref(isOverflowing),
				"content-class": _ctx.$style.tooltip
			}, {
				default: withCtx(() => [createBaseVNode("span", {
					ref_key: "labelEl",
					ref: labelEl,
					class: normalizeClass(_ctx.$style.label)
				}, [createVNode(unref(N8nText_default), { bold: "" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.label), 1)]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, [
				"content",
				"disabled",
				"content-class"
			]), createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light",
				class: normalizeClass(_ctx.$style.redacted)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.apiKey), 1)]),
				_: 1
			}, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	cell: "_cell_a2vxi_1",
	label: "_label_a2vxi_8",
	redacted: "_redacted_a2vxi_16",
	tooltip: "_tooltip_a2vxi_20"
} }]]);
//#endregion
//#region src/features/settings/apiKeys/components/ApiKeyOwnerCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ApiKeyOwnerCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyOwnerCell",
	props: {
		owner: {},
		isCurrentUser: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const displayName = computed(() => getApiKeyOwnerDisplayName(props.owner));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.cell),
				"data-test-id": "api-key-owner-cell"
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
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.owners.you")), 1)]),
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
	cell: "_cell_13slr_1",
	avatar: "_avatar_13slr_8",
	info: "_info_13slr_12",
	name: "_name_13slr_18",
	email: "_email_13slr_19"
} }]]);
//#endregion
//#region src/features/settings/apiKeys/components/ApiKeyScopesCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["disabled"];
var ApiKeyScopesCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyScopesCell",
	props: { apiKey: {} },
	emits: ["open"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("button", {
				type: "button",
				class: normalizeClass(_ctx.$style.button),
				disabled: !__props.apiKey.scopes.length,
				"data-test-id": "api-key-scopes-cell",
				onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("open", __props.apiKey), ["stop"]))
			}, toDisplayString(__props.apiKey.scopes.length), 11, _hoisted_1$1);
		};
	}
}), [["__cssModules", { "$style": { button: "_button_3gmwk_1" } }]]);
//#endregion
//#region src/features/settings/apiKeys/components/ApiKeyTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { "data-test-id": "api-key-table" };
var ApiKeyTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyTable",
	props: /*@__PURE__*/ mergeModels({
		apiKeys: {},
		itemsLength: {},
		loading: { type: Boolean },
		currentUserId: { default: void 0 },
		showOwner: {
			type: Boolean,
			default: true
		},
		canUpdate: {
			type: Boolean,
			default: true
		}
	}, {
		"tableOptions": { default: () => ({}) },
		"tableOptionsModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"edit",
		"revoke",
		"rotate",
		"open-scopes",
		"update:options"
	], ["update:tableOptions"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const tableOptions = useModel(__props, "tableOptions");
		const i18n = useI18n();
		function formatExpiration(expiresAt) {
			if (!expiresAt) return i18n.baseText("settings.api.expiration.never");
			return DateTime.fromSeconds(expiresAt).toFormat("d LLL yyyy");
		}
		function formatLastUsed(iso) {
			if (!iso) return i18n.baseText("settings.api.lastUsed.never");
			return DateTime.fromISO(iso).toRelative() ?? i18n.baseText("settings.api.lastUsed.never");
		}
		function isOwn(apiKey) {
			if (!props.currentUserId) return true;
			return apiKey.owner?.id === props.currentUserId;
		}
		function onRowClick(_event, payload) {
			emit("edit", payload.item);
		}
		function getRowActions(apiKey) {
			const actions = [];
			if (isOwn(apiKey) && props.canUpdate) {
				actions.push({
					id: "edit",
					label: i18n.baseText("settings.api.actions.edit"),
					icon: "square-pen",
					testId: "api-key-edit-action"
				});
				if (!isApiKeyExpired(apiKey)) actions.push({
					id: "rotate",
					label: i18n.baseText("settings.api.actions.rotate"),
					icon: "refresh-cw",
					testId: "api-key-rotate-action"
				});
			} else actions.push({
				id: "view",
				label: i18n.baseText("settings.api.actions.view"),
				icon: "eye",
				testId: "api-key-view-action"
			});
			actions.push({
				id: "revoke",
				label: i18n.baseText("settings.api.actions.revoke"),
				icon: "trash-2",
				testId: "api-key-revoke-action",
				divided: true,
				variant: "destructive"
			});
			return actions;
		}
		function onAction(action, apiKey) {
			if (action === "revoke") emit("revoke", apiKey);
			else if (action === "rotate") emit("rotate", apiKey);
			else emit("edit", apiKey);
		}
		const rows = computed(() => props.apiKeys);
		const headers = computed(() => [
			{
				title: i18n.baseText("settings.api.columns.name"),
				key: "label",
				width: 280,
				resize: false
			},
			...props.showOwner ? [{
				title: i18n.baseText("settings.api.columns.owner"),
				key: "owner",
				width: 240,
				disableSort: true,
				resize: false
			}] : [],
			{
				title: i18n.baseText("settings.api.columns.scopes"),
				key: "scopes",
				resize: false
			},
			{
				title: i18n.baseText("settings.api.columns.expiration"),
				key: "expiresAt",
				disableSort: true,
				resize: false
			},
			{
				title: i18n.baseText("settings.api.columns.lastUsed"),
				key: "lastUsedAt",
				resize: false
			},
			{
				title: "",
				key: "actions",
				align: "end",
				width: 80,
				disableSort: true,
				resize: false,
				value: () => void 0
			}
		]);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nDataTableServer_default), {
				"sort-by": tableOptions.value.sortBy,
				"onUpdate:sortBy": _cache[2] || (_cache[2] = ($event) => tableOptions.value.sortBy = $event),
				page: tableOptions.value.page,
				"onUpdate:page": _cache[3] || (_cache[3] = ($event) => tableOptions.value.page = $event),
				"items-per-page": tableOptions.value.itemsPerPage,
				"onUpdate:itemsPerPage": _cache[4] || (_cache[4] = ($event) => tableOptions.value.itemsPerPage = $event),
				headers: headers.value,
				items: rows.value,
				"items-length": __props.itemsLength,
				loading: __props.loading,
				"page-sizes": [
					10,
					25,
					50
				],
				"row-props": { class: _ctx.$style.clickableRow },
				"onUpdate:options": _cache[5] || (_cache[5] = ($event) => emit("update:options", $event)),
				"onClick:row": onRowClick
			}, {
				[`item.label`]: withCtx(({ item }) => [createVNode(ApiKeyLabelCell_default, {
					label: item.label,
					"api-key": item.apiKey
				}, null, 8, ["label", "api-key"])]),
				[`item.owner`]: withCtx(({ item }) => [item.owner ? (openBlock(), createBlock(ApiKeyOwnerCell_default, {
					key: 0,
					owner: item.owner,
					"is-current-user": isOwn(item)
				}, null, 8, ["owner", "is-current-user"])) : createCommentVNode("", true)]),
				[`item.scopes`]: withCtx(({ item }) => [createVNode(ApiKeyScopesCell_default, {
					"api-key": item,
					onOpen: _cache[0] || (_cache[0] = ($event) => emit("open-scopes", $event))
				}, null, 8, ["api-key"])]),
				[`item.expiresAt`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), { color: item.expiresAt ? void 0 : "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(formatExpiration(item.expiresAt)), 1)]),
					_: 2
				}, 1032, ["color"])]),
				[`item.lastUsedAt`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), { color: item.lastUsedAt ? void 0 : "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(formatLastUsed(item.lastUsedAt)), 1)]),
					_: 2
				}, 1032, ["color"])]),
				[`item.actions`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.rowActions),
					onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
				}, [createVNode(unref(N8nActionDropdown_default), {
					items: getRowActions(item),
					placement: "bottom-end",
					"activator-size": "small",
					"data-test-id": "api-key-actions-toggle",
					onSelect: (action) => onAction(action, item)
				}, null, 8, ["items", "onSelect"])], 2)]),
				_: 2
			}, 1032, [
				"sort-by",
				"page",
				"items-per-page",
				"headers",
				"items",
				"items-length",
				"loading",
				"row-props"
			])]);
		};
	}
}), [["__cssModules", { "$style": {
	rowActions: "_rowActions_l12j0_1",
	clickableRow: "_clickableRow_l12j0_7"
} }]]);
//#endregion
//#region src/features/settings/apiKeys/components/ApiKeyScopesModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ApiKeyScopesModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyScopesModal",
	props: {
		apiKey: {},
		open: { type: Boolean }
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const title = computed(() => props.apiKey ? i18n.baseText("settings.api.scopes.modal.title", { interpolate: { label: props.apiKey.label } }) : "");
		const scopes = computed(() => props.apiKey?.scopes ?? []);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				header: title.value,
				size: "medium",
				"data-test-id": "api-key-scopes-modal",
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
					default: withCtx(() => [!scopes.value.length ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.scopes.modal.empty")), 1)]),
						_: 1
					})) : (openBlock(), createElementBlock("ul", {
						key: 1,
						class: normalizeClass(_ctx.$style.pills)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(scopes.value, (scope) => {
						return openBlock(), createElementBlock("li", {
							key: scope,
							class: normalizeClass(_ctx.$style.pill)
						}, toDisplayString(scope), 3);
					}), 128))], 2))]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_rvqdf_1",
	pills: "_pills_rvqdf_5",
	pill: "_pill_rvqdf_5"
} }]]);
//#endregion
//#region src/features/settings/apiKeys/components/RotateApiKeyConfirmModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/settings/apiKeys/components/RotateApiKeyConfirmModal.vue
var RotateApiKeyConfirmModal_default = /* @__PURE__ */ defineComponent({
	__name: "RotateApiKeyConfirmModal",
	props: {
		apiKey: {},
		open: { type: Boolean },
		loading: { type: Boolean }
	},
	emits: [
		"update:open",
		"confirm",
		"cancel"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const title = computed(() => props.apiKey ? i18n.baseText("settings.api.rotate.title", { interpolate: { label: props.apiKey.label } }) : "");
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AlertDialog_default), {
				open: __props.open,
				title: title.value,
				description: unref(i18n).baseText("settings.api.rotate.description"),
				"action-label": unref(i18n).baseText("settings.api.rotate.button"),
				"cancel-label": unref(i18n).baseText("generic.cancel"),
				"action-variant": "solid",
				loading: __props.loading,
				size: "medium",
				"data-test-id": "api-key-rotate-confirm",
				onAction: _cache[0] || (_cache[0] = ($event) => emit("confirm")),
				onCancel: _cache[1] || (_cache[1] = ($event) => emit("cancel")),
				"onUpdate:open": _cache[2] || (_cache[2] = ($event) => emit("update:open", $event))
			}, null, 8, [
				"open",
				"title",
				"description",
				"action-label",
				"cancel-label",
				"loading"
			]);
		};
	}
});
//#endregion
//#region src/features/settings/apiKeys/views/SettingsApiView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SettingsApiView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsApiView",
	setup(__props) {
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const cloudPlanStore = useCloudPlanStore();
		const usersStore = useUsersStore();
		const rbacStore = useRBACStore();
		const { showError, showMessage } = useToast();
		const documentTitle = useDocumentTitle();
		const i18n = useI18n();
		const { goToUpgrade } = usePageRedirectionHelper();
		const telemetry = useTelemetry();
		usePrefetchModals([API_KEY_CREATE_OR_EDIT_MODAL_KEY], { enabled: () => settingsStore.isPublicApiEnabled });
		const loading = ref(false);
		const apiKeysStore = useApiKeysStore();
		const { fetchApiKeys, setOwnership, setLabelFilter, setOwnerFilter, applyTableOptions, deleteApiKey, rotateApiKey, getApiKeyAvailableScopes } = apiKeysStore;
		const { apiKeys, apiKeysCount, totalCountForOwnership, ownership, labelFilter, ownerIds, owners, totalMineCount, totalAllCount, hasAnyKeys, tableOptions } = storeToRefs(apiKeysStore);
		const ownerOptions = computed(() => owners.value.map((owner) => ({
			id: owner.id,
			firstName: owner.firstName,
			lastName: owner.lastName,
			email: owner.email
		})));
		const ownerKeyCounts = computed(() => owners.value.reduce((acc, owner) => {
			acc[owner.id] = owner.keyCount;
			return acc;
		}, {}));
		const selectedOwnerIds = computed(() => ownerIds.value ?? ownerOptions.value.map((owner) => owner.id));
		async function onOwnerFilterChange(selected) {
			try {
				loading.value = true;
				await setOwnerFilter(selected);
			} catch (error) {
				showError(error, i18n.baseText("settings.api.view.error"));
			} finally {
				loading.value = false;
			}
		}
		const searchQuery = ref(labelFilter.value);
		const onSearch = useDebounceFn(async (value) => {
			try {
				loading.value = true;
				await setLabelFilter(value.trim());
			} catch (error) {
				showError(error, i18n.baseText("settings.api.view.error"));
			} finally {
				loading.value = false;
			}
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		function onSearchInput(value) {
			searchQuery.value = value;
			onSearch(value);
		}
		const { isSwaggerUIEnabled, publicApiPath, publicApiLatestVersion } = settingsStore;
		const { baseUrl } = useRootStore();
		const { isPublicApiEnabled } = settingsStore;
		const showKeyTable = computed(() => isPublicApiEnabled && hasAnyKeys.value);
		const apiDocsURL = computed(() => {
			if (!isSwaggerUIEnabled) return `https://${DOCS_DOMAIN}/api/api-reference/`;
			return `${`${baseUrl.replace(/\/+$/, "")}/${publicApiPath.replace(/^\/+/, "")}`}/v${publicApiLatestVersion}/docs`;
		});
		const scopesModalApiKey = ref(null);
		const revokeApiKey = ref(null);
		const revoking = ref(false);
		const rotateConfirmApiKey = ref(null);
		const rotating = ref(false);
		const canManageAllKeys = computed(() => rbacStore.hasScope("apiKey:manage"));
		const canCreateKeys = computed(() => rbacStore.hasScope("apiKey:create"));
		const canUpdateKeys = computed(() => rbacStore.hasScope("apiKey:update"));
		const tabOptions = computed(() => [{
			label: i18n.baseText("settings.api.tabs.mine"),
			value: "mine",
			tag: String(totalMineCount.value)
		}, {
			label: i18n.baseText("settings.api.tabs.all"),
			value: "all",
			tag: String(totalAllCount.value)
		}]);
		async function onTabChange(newOwnership) {
			try {
				loading.value = true;
				await setOwnership(newOwnership);
				if (newOwnership === "all") telemetry.track("User viewed all API keys");
			} catch (error) {
				showError(error, i18n.baseText("settings.api.view.error"));
			} finally {
				loading.value = false;
			}
		}
		async function onTableUpdate() {
			try {
				loading.value = true;
				await applyTableOptions();
			} catch (error) {
				showError(error, i18n.baseText("settings.api.view.error"));
			} finally {
				loading.value = false;
			}
		}
		const onCreateApiKey = () => {
			telemetry.track("User clicked create API key button");
			uiStore.openModalWithData({
				name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
				data: { mode: "new" }
			});
		};
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.api"));
			if (!isPublicApiEnabled) return;
			apiKeysStore.$reset();
			searchQuery.value = "";
			await getApiKeysAndScopes();
		});
		onBeforeUnmount(() => {
			apiKeysStore.$reset();
		});
		function onUpgrade() {
			goToUpgrade("settings-n8n-api", "upgrade-api", "redirect");
		}
		async function getApiKeysAndScopes() {
			try {
				loading.value = true;
				await Promise.all([fetchApiKeys(), getApiKeyAvailableScopes()]);
			} catch (error) {
				showError(error, i18n.baseText("settings.api.view.error"));
			} finally {
				loading.value = false;
			}
		}
		function onEdit(apiKey) {
			uiStore.openModalWithData({
				name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
				data: {
					mode: "edit",
					activeId: apiKey.id
				}
			});
		}
		function onRevokeRequest(apiKey) {
			revokeApiKey.value = apiKey;
		}
		async function onRevokeConfirm() {
			if (!revokeApiKey.value) return;
			const apiKey = revokeApiKey.value;
			revoking.value = true;
			try {
				await deleteApiKey(apiKey.id);
				showMessage({
					title: i18n.baseText("settings.api.revoke.toast"),
					type: "success"
				});
				revokeApiKey.value = null;
			} catch (e) {
				showError(e, i18n.baseText("settings.api.delete.error"));
			} finally {
				revoking.value = false;
				telemetry.track("User clicked delete API key button", { is_own: apiKey.owner?.id === usersStore.currentUser?.id });
			}
		}
		function onRotateRequest(apiKey) {
			rotateConfirmApiKey.value = apiKey;
		}
		async function onRotateConfirm() {
			if (!rotateConfirmApiKey.value) return;
			const apiKey = rotateConfirmApiKey.value;
			rotating.value = true;
			try {
				const rotated = await rotateApiKey(apiKey.id);
				rotateConfirmApiKey.value = null;
				showMessage({
					title: i18n.baseText("settings.api.rotate.toast"),
					type: "success"
				});
				uiStore.openModalWithData({
					name: API_KEY_CREATE_OR_EDIT_MODAL_KEY,
					data: {
						mode: "new",
						rotatedApiKey: rotated
					}
				});
				telemetry.track("User clicked rotate API key button", { is_own: true });
			} catch (e) {
				showError(e, i18n.baseText("settings.api.rotate.error"));
			} finally {
				rotating.value = false;
			}
		}
		function onOpenScopes(apiKey) {
			scopesModalApiKey.value = apiKey;
			telemetry.track("User clicked view API key scopes", { is_own: apiKey.owner?.id === usersStore.currentUser?.id });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				"full-width": showKeyTable.value,
				class: normalizeClass(_ctx.$style.layout)
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.api"),
						"show-docs-link": false,
						"data-test-id": "api-keys-header"
					}, {
						description: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "medium",
							color: "text-base"
						}, {
							default: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "settings.api.view.info",
								tag: "span",
								scope: "global"
							}, {
								apiPlayground: withCtx(() => [createVNode(unref(N8nExternalLink_default), {
									inline: "",
									size: "small",
									"data-test-id": "api-playground-link",
									href: apiDocsURL.value
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.view.info.apiPlayground")), 1)]),
									_: 1
								}, 8, ["href"])]),
								webhook: withCtx(() => [createVNode(unref(N8nExternalLink_default), {
									inline: "",
									size: "small",
									"data-test-id": "webhook-docs-link",
									href: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.view.info.webhook")), 1)]),
									_: 1
								})]),
								documentation: withCtx(() => [createVNode(unref(N8nExternalLink_default), {
									inline: "",
									size: "small",
									"data-test-id": "api-docs-link",
									href: "https://docs.n8n.io/api"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.view.info.documentation")), 1)]),
									_: 1
								})]),
								_: 1
							})]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"]),
					showKeyTable.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.tableArea)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolbar) }, [canManageAllKeys.value ? (openBlock(), createBlock(unref(Tabs_default), {
						key: 0,
						"model-value": unref(ownership),
						options: tabOptions.value,
						"data-test-id": "api-keys-tabs",
						class: normalizeClass(_ctx.$style.tabs),
						"onUpdate:modelValue": onTabChange
					}, null, 8, [
						"model-value",
						"options",
						"class"
					])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.controls) }, [
						createVNode(unref(Input_default), {
							"model-value": searchQuery.value,
							placeholder: unref(i18n).baseText("settings.api.search.placeholder"),
							class: normalizeClass(_ctx.$style.search),
							size: "medium",
							clearable: "",
							"data-test-id": "api-keys-search",
							"onUpdate:modelValue": onSearchInput
						}, {
							prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
							_: 1
						}, 8, [
							"model-value",
							"placeholder",
							"class"
						]),
						canManageAllKeys.value && unref(ownership) === "all" ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.ownerFilter)
						}, [createVNode(ApiKeyOwnerFilter_default, {
							"model-value": selectedOwnerIds.value,
							users: ownerOptions.value,
							counts: ownerKeyCounts.value,
							"total-count": unref(totalAllCount),
							"current-user-id": unref(usersStore).currentUser?.id,
							"data-test-id": "api-keys-owner-filter",
							"onUpdate:modelValue": onOwnerFilterChange
						}, null, 8, [
							"model-value",
							"users",
							"counts",
							"total-count",
							"current-user-id"
						])], 2)) : createCommentVNode("", true),
						createVNode(unref(N8nTooltip_default), {
							disabled: canCreateKeys.value,
							content: unref(i18n).baseText("settings.api.create.disabledTooltip")
						}, {
							default: withCtx(() => [createVNode(unref(N8nButton_default), {
								size: "medium",
								disabled: !canCreateKeys.value,
								"data-test-id": "api-key-create-button",
								onClick: onCreateApiKey
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.create.button")), 1)]),
								_: 1
							}, 8, ["disabled"])]),
							_: 1
						}, 8, ["disabled", "content"])
					], 2)], 2), unref(totalCountForOwnership) > 0 && unref(apiKeysCount) > 0 ? (openBlock(), createBlock(ApiKeyTable_default, {
						key: 0,
						"table-options": unref(tableOptions),
						"onUpdate:tableOptions": _cache[0] || (_cache[0] = ($event) => isRef(tableOptions) ? tableOptions.value = $event : null),
						"api-keys": unref(apiKeys),
						"items-length": unref(apiKeysCount),
						loading: loading.value,
						"current-user-id": unref(usersStore).currentUser?.id,
						"show-owner": canManageAllKeys.value && unref(ownership) === "all",
						"can-update": canUpdateKeys.value,
						class: normalizeClass(_ctx.$style.table),
						onEdit,
						onRevoke: onRevokeRequest,
						onRotate: onRotateRequest,
						onOpenScopes,
						"onUpdate:options": onTableUpdate
					}, null, 8, [
						"table-options",
						"api-keys",
						"items-length",
						"loading",
						"current-user-id",
						"show-owner",
						"can-update",
						"class"
					])) : unref(labelFilter).trim() ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-light",
						class: normalizeClass(_ctx.$style.noResults),
						"data-test-id": "api-keys-no-results"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.search.noResults")), 1)]),
						_: 1
					}, 8, ["class"])) : unref(ownership) === "mine" ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 2,
						color: "text-light",
						class: normalizeClass(_ctx.$style.noResults),
						"data-test-id": "api-keys-empty-mine"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.empty.mine")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
					!unref(isPublicApiEnabled) && unref(cloudPlanStore).userIsTrialing ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 1,
						"data-test-id": "public-api-upgrade-cta",
						heading: unref(i18n).baseText("settings.api.trial.upgradePlan.title"),
						description: unref(i18n).baseText("settings.api.trial.upgradePlan.description"),
						"button-text": unref(i18n).baseText("settings.api.trial.upgradePlan.cta"),
						"onClick:button": onUpgrade
					}, null, 8, [
						"heading",
						"description",
						"button-text"
					])) : createCommentVNode("", true),
					unref(isPublicApiEnabled) && !unref(hasAnyKeys) ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 2,
						"button-text": unref(i18n).baseText(loading.value ? "settings.api.create.button.loading" : "settings.api.create.button"),
						"button-disabled": !canCreateKeys.value,
						description: unref(i18n).baseText("settings.api.create.description"),
						"onClick:button": onCreateApiKey
					}, {
						disabledButtonTooltip: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.create.disabledTooltip")), 1)]),
						_: 1
					}, 8, [
						"button-text",
						"button-disabled",
						"description"
					])) : createCommentVNode("", true),
					createVNode(ApiKeyScopesModal_default, {
						"api-key": scopesModalApiKey.value,
						open: !!scopesModalApiKey.value,
						"onUpdate:open": _cache[1] || (_cache[1] = ($event) => scopesModalApiKey.value = null)
					}, null, 8, ["api-key", "open"]),
					createVNode(RevokeApiKeyConfirmModal_default, {
						"api-key": revokeApiKey.value,
						open: !!revokeApiKey.value,
						loading: revoking.value,
						"revoking-for-other": !!revokeApiKey.value?.owner && revokeApiKey.value.owner.id !== unref(usersStore).currentUser?.id,
						onConfirm: onRevokeConfirm,
						onCancel: _cache[2] || (_cache[2] = ($event) => revokeApiKey.value = null),
						"onUpdate:open": _cache[3] || (_cache[3] = ($event) => revokeApiKey.value = null)
					}, null, 8, [
						"api-key",
						"open",
						"loading",
						"revoking-for-other"
					]),
					createVNode(RotateApiKeyConfirmModal_default, {
						"api-key": rotateConfirmApiKey.value,
						open: !!rotateConfirmApiKey.value,
						loading: rotating.value,
						onConfirm: onRotateConfirm,
						onCancel: _cache[4] || (_cache[4] = ($event) => rotateConfirmApiKey.value = null),
						"onUpdate:open": _cache[5] || (_cache[5] = ($event) => rotateConfirmApiKey.value = null)
					}, null, 8, [
						"api-key",
						"open",
						"loading"
					])
				]),
				_: 1
			}, 8, ["full-width", "class"]);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_1ulwu_2",
	tableArea: "_tableArea_1ulwu_6",
	toolbar: "_toolbar_1ulwu_16",
	tabs: "_tabs_1ulwu_23",
	controls: "_controls_1ulwu_28",
	search: "_search_1ulwu_36",
	ownerFilter: "_ownerFilter_1ulwu_40",
	table: "_table_1ulwu_6",
	noResults: "_noResults_1ulwu_49"
} }]]);
//#endregion
export { SettingsApiView_default as default };
