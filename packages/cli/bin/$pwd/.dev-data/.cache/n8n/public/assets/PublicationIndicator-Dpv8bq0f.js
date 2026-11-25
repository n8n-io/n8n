import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Xf as unref, Yd as getCurrentInstance, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, rf as mergeProps } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, M_ as FOLDER_LIST_ITEM_ACTIONS, N_ as MCP_ACCESS_ACTIONS, SN as _plugin_vue_export_helper_default, _N as N8nText_default, fN as N8nTooltip_default, jN as useI18n, nN as N8nBadge_default, vN as N8nIconButton_default, wj as N8nStatusDot_default, ym as useFavoritesStore, yu as TimeAgo_default } from "./app-D5flEmb-.js";
//#region src/features/core/folders/components/FolderCardActions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var FolderCardActions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "FolderCardActions",
	props: {
		folder: {},
		actions: { default: () => [] },
		showMcpAccessActions: {
			type: Boolean,
			default: false
		}
	},
	emits: ["action"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const favoritesStore = useFavoritesStore();
		const dropdownId = `folder-card-actions-dropdown-${getCurrentInstance()?.uid ?? 0}`;
		const mcpAccessAction = computed(() => ({
			label: i18n.baseText("resourceActions.mcpAccess.manage"),
			value: MCP_ACCESS_ACTIONS.MANAGE,
			disabled: false,
			children: [{
				label: i18n.baseText("resourceActions.mcpAccess.enable"),
				value: MCP_ACCESS_ACTIONS.ENABLE,
				disabled: false,
				tooltip: i18n.baseText("resourceActions.mcpAccess.enable.tooltip", { interpolate: { scopeName: props.folder.name } })
			}, {
				label: i18n.baseText("resourceActions.mcpAccess.disable"),
				value: MCP_ACCESS_ACTIONS.DISABLE,
				disabled: false,
				tooltip: i18n.baseText("resourceActions.mcpAccess.disable.tooltip", { interpolate: { scopeName: props.folder.name } })
			}]
		}));
		const allActions = computed(() => {
			const favoriteAction = {
				label: favoritesStore.isFavorite(props.folder.id, "folder") ? i18n.baseText("favorites.remove") : i18n.baseText("favorites.add"),
				value: FOLDER_LIST_ITEM_ACTIONS.TOGGLE_FAVORITE,
				disabled: false
			};
			const renameIndex = props.actions.findIndex((action) => action.value === FOLDER_LIST_ITEM_ACTIONS.RENAME);
			const actions = [...props.actions];
			actions.splice(renameIndex === -1 ? actions.length : renameIndex, 0, favoriteAction);
			return props.showMcpAccessActions ? [...actions, mcpAccessAction.value] : actions;
		});
		function toMenuItem(action) {
			return {
				id: action.value,
				testId: `action-${action.value}`,
				label: action.label,
				disabled: action.disabled,
				children: action.children?.map(toMenuItem),
				data: action.tooltip ? { tooltip: action.tooltip } : void 0
			};
		}
		const menuItems = computed(() => allActions.value.map(toMenuItem));
		async function onAction(action) {
			if (action === FOLDER_LIST_ITEM_ACTIONS.TOGGLE_FAVORITE) {
				await favoritesStore.toggleFavorite(props.folder.id, "folder");
				return;
			}
			emit("action", action);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				"data-test-id": "folder-card-actions",
				onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop", "prevent"])),
				onKeydown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
			}, [createVNode(unref(DropdownMenu_default), {
				id: dropdownId,
				items: menuItems.value,
				placement: "bottom-end",
				"extra-popper-class": _ctx.$style.dropdown,
				onSelect: onAction
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					class: "action-toggle",
					variant: "ghost",
					icon: "ellipsis-12",
					size: "small",
					"icon-size": "medium",
					role: "button",
					"aria-controls": dropdownId,
					"aria-label": unref(i18n).baseText("generic.more")
				}, null, 8, ["aria-label"])]),
				"item-label": withCtx(({ item, ui }) => [item.data?.tooltip ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: item.data.tooltip,
					placement: "left",
					"show-after": 300,
					teleported: ""
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(ui.class),
						size: "medium",
						color: item.disabled ? "text-light" : "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
						_: 2
					}, 1032, ["class", "color"])]),
					_: 2
				}, 1032, ["content"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					class: normalizeClass(ui.class),
					size: "medium",
					color: item.disabled ? "text-light" : "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
					_: 2
				}, 1032, ["class", "color"]))]),
				_: 1
			}, 8, ["items", "extra-popper-class"])], 32);
		};
	}
}), [["__cssModules", { "$style": { dropdown: "_dropdown_jlj2y_1" } }]]);
//#endregion
//#region src/features/core/folders/components/FolderCardSubtitle.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var FolderCardSubtitle_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "FolderCardSubtitle",
	props: {
		resourceCount: {},
		resourceLabel: {},
		subFolderCount: {},
		createdAt: {},
		updatedAt: {},
		testIdPrefix: { default: "folder-card" }
	},
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.subtitle),
				"data-test-id": `${__props.testIdPrefix}-subtitle`
			}, [
				__props.resourceCount > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					class: normalizeClass([_ctx.$style.infoCell, _ctx.$style.count]),
					size: "small",
					color: "text-light",
					"data-test-id": `${__props.testIdPrefix}-resource-count`
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.resourceLabel), 1)]),
					_: 1
				}, 8, ["class", "data-test-id"])) : createCommentVNode("", true),
				__props.subFolderCount > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					class: normalizeClass([_ctx.$style.infoCell, _ctx.$style.count]),
					size: "small",
					color: "text-light",
					"data-test-id": `${__props.testIdPrefix}-folder-count`
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.folderCount", { interpolate: { count: __props.subFolderCount } })), 1)]),
					_: 1
				}, 8, ["class", "data-test-id"])) : createCommentVNode("", true),
				createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.infoCell),
					size: "small",
					color: "text-light",
					"data-test-id": `${__props.testIdPrefix}-last-updated`
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workerList.item.lastUpdated")) + " ", 1), createVNode(TimeAgo_default, { date: __props.updatedAt }, null, 8, ["date"])]),
					_: 1
				}, 8, ["class", "data-test-id"]),
				createVNode(unref(N8nText_default), {
					class: normalizeClass([_ctx.$style.infoCell, _ctx.$style.created]),
					size: "small",
					color: "text-light",
					"data-test-id": `${__props.testIdPrefix}-created`
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.item.created")) + " ", 1), createVNode(TimeAgo_default, { date: __props.createdAt }, null, 8, ["date"])]),
					_: 1
				}, 8, ["class", "data-test-id"])
			], 10, _hoisted_1);
		};
	}
}), [["__cssModules", { "$style": {
	subtitle: "_subtitle_19yy5_113",
	count: "_count_19yy5_117",
	infoCell: "_infoCell_19yy5_121",
	created: "_created_19yy5_127"
} }]]);
//#endregion
//#region src/app/components/PublicationIndicator.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var PublicationIndicator_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "PublicationIndicator",
	props: {
		label: {},
		variant: { default: "success" },
		tooltip: { default: null }
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return __props.tooltip ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				placement: "top",
				"as-child": ""
			}, {
				content: withCtx(() => [createTextVNode(toDisplayString(__props.tooltip), 1)]),
				default: withCtx(() => [createVNode(unref(N8nBadge_default), mergeProps(_ctx.$attrs, {
					class: _ctx.$style.indicator,
					tabindex: "0"
				}), {
					leading: withCtx(() => [createVNode(unref(N8nStatusDot_default), { variant: __props.variant }, null, 8, ["variant"])]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(__props.label), 1)]),
					_: 1
				}, 16, ["class"])]),
				_: 1
			})) : (openBlock(), createBlock(unref(N8nBadge_default), mergeProps({ key: 1 }, _ctx.$attrs, { class: _ctx.$style.indicator }), {
				leading: withCtx(() => [createVNode(unref(N8nStatusDot_default), { variant: __props.variant }, null, 8, ["variant"])]),
				default: withCtx(() => [createTextVNode(" " + toDisplayString(__props.label), 1)]),
				_: 1
			}, 16, ["class"]));
		};
	}
}), [["__cssModules", { "$style": { indicator: "_indicator_6a55n_3" } }]]);
//#endregion
export { FolderCardSubtitle_default as n, FolderCardActions_default as r, PublicationIndicator_default as t };
