import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Ho as RouterLink, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, $j as N8nLogo_default, Dj as isCustomMenuItem, Ls as useGlobalEntityCreation, SN as _plugin_vue_export_helper_default, Xj as NewBadge_default, Yj as N8nMenuItem_default, Zj as PreviewBadge_default, bm as useSourceControlStore, d_ as PROTECTED_INSTANCE_DOCS_URL, eN as DropdownMenuItem_default, fC as VIEWS, fN as N8nTooltip_default, hM as N8nLink_default, jN as useI18n, ln as KeyboardShortcutTooltip_default, nN as N8nBadge_default, sj as N8nScrollArea_default, vN as N8nIconButton_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, zt as useMcpDiscovery } from "./app-D5flEmb-.js";
import { t as ClaudeLogo_default } from "./ClaudeLogo-BjBNPRr6.js";
//#region src/app/components/BottomMenu.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var BottomMenu_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "BottomMenu",
	props: {
		items: {},
		isCollapsed: { type: Boolean },
		settingsSections: { default: void 0 }
	},
	emits: ["select", "logout"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const router = useRouter();
		const i18n = useI18n();
		const isSettingsOpen = ref(false);
		/** A settings row keeps its menu item in `data`, so the trailing slot can show its tags. */
		function toSettingsEntry(item) {
			return {
				id: item.id,
				testId: item.id,
				label: item.label,
				icon: typeof item.icon === "string" ? {
					type: "icon",
					value: item.icon
				} : item.icon,
				disabled: item.disabled,
				data: item
			};
		}
		const settingsEntries = computed(() => {
			if (props.settingsSections) return props.settingsSections.flatMap((section) => [...section.title ? [{
				id: `section-${section.id}`,
				label: section.title,
				header: true
			}] : [], ...section.items.map(toSettingsEntry)]);
			return (props.items.find((item) => item.id === "settings")?.children ?? []).filter((child) => !isCustomMenuItem(child)).map(toSettingsEntry);
		});
		function handleSettingsSelect(key) {
			const item = settingsEntries.value.find((entry) => entry.id === key)?.data;
			if (item?.route?.to) router.push(item.route.to);
			else if (item?.link) window.open(item.link.href, item.link.target ?? "_self");
			handleSelect(key);
		}
		function handleSelect(key) {
			emit("select", key);
		}
		function onLogout() {
			emit("logout");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass({
				[_ctx.$style.bottomMenu]: true,
				[_ctx.$style.collapsed]: __props.isCollapsed
			}) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.bottomMenuItems) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.items, (item) => {
				return openBlock(), createElementBlock(Fragment, { key: item.id }, [item.children && item.id === "settings" ? (openBlock(), createBlock(unref(DropdownMenu_default), {
					key: "settings",
					modelValue: isSettingsOpen.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isSettingsOpen.value = $event),
					items: settingsEntries.value,
					placement: "right-end",
					"max-height": "min(530px, var(--reka-dropdown-menu-content-available-height))",
					"extra-popper-class": _ctx.$style.settingsMenu,
					"content-test-id": "main-sidebar-settings-list"
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nMenuItem_default), {
						"data-test-id": `main-sidebar-${item.id}`,
						class: normalizeClass(_ctx.$style.menuTrigger),
						item,
						compact: __props.isCollapsed,
						active: isSettingsOpen.value,
						role: "button",
						tabindex: "0",
						onClick: () => handleSelect(item.id)
					}, null, 8, [
						"data-test-id",
						"class",
						"item",
						"compact",
						"active",
						"onClick"
					])]),
					content: withCtx(() => [createVNode(unref(N8nScrollArea_default), {
						"edge-fade": "y",
						class: normalizeClass(_ctx.$style.settingsList)
					}, {
						default: withCtx(() => [createBaseVNode("div", {
							class: normalizeClass(_ctx.$style.settingsItems),
							"data-menu-items": ""
						}, [(openBlock(true), createElementBlock(Fragment, null, renderList(settingsEntries.value, (entry) => {
							return openBlock(), createBlock(unref(DropdownMenuItem_default), mergeProps({ key: entry.id }, { ref_for: true }, entry, { onSelect: handleSettingsSelect }), {
								"item-trailing": withCtx(({ item: row, ui }) => [
									row.data?.preview ? (openBlock(), createBlock(unref(PreviewBadge_default), {
										key: 0,
										class: normalizeClass(ui.class)
									}, null, 8, ["class"])) : createCommentVNode("", true),
									row.data?.new ? (openBlock(), createBlock(unref(NewBadge_default), {
										key: 1,
										class: normalizeClass(ui.class)
									}, null, 8, ["class"])) : createCommentVNode("", true),
									row.data?.creditsTag ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 2,
										size: "xxsmall",
										variant: "success",
										class: normalizeClass(ui.class)
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(row.data.creditsTag), 1)]),
										_: 2
									}, 1032, ["class"])) : createCommentVNode("", true)
								]),
								_: 1
							}, 16);
						}), 128))], 2)]),
						_: 1
					}, 8, ["class"]), createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.settingsFooter),
						"data-test-id": "main-sidebar-settings-footer"
					}, [createVNode(unref(DropdownMenuItem_default), {
						id: "sign-out",
						"test-id": "main-sidebar-log-out",
						label: unref(i18n).baseText("auth.signout"),
						icon: {
							type: "icon",
							value: "log-out"
						},
						onSelect: onLogout
					}, null, 8, ["label"])], 2)]),
					_: 2
				}, 1032, [
					"modelValue",
					"items",
					"extra-popper-class"
				])) : (openBlock(), createBlock(unref(N8nMenuItem_default), {
					key: 1,
					"data-test-id": `main-sidebar-${item.id}`,
					item,
					compact: __props.isCollapsed,
					class: normalizeClass(item.id === "resource-center" ? _ctx.$style.resourceCenterMenuItem : void 0),
					onClick: () => handleSelect(item.id)
				}, null, 8, [
					"data-test-id",
					"item",
					"compact",
					"class",
					"onClick"
				]))], 64);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	bottomMenu: "_bottomMenu_18d2g_3",
	collapsed: "_collapsed_18d2g_8",
	bottomMenuItems: "_bottomMenuItems_18d2g_12",
	resourceCenterMenuItem: "_resourceCenterMenuItem_18d2g_16",
	menuTrigger: "_menuTrigger_18d2g_21",
	settingsMenu: "_settingsMenu_18d2g_35",
	settingsList: "_settingsList_18d2g_42",
	settingsItems: "_settingsItems_18d2g_47",
	settingsFooter: "_settingsFooter_18d2g_55"
} }]]);
//#endregion
//#region src/experiments/surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu.ts
init_runtime_core_esm_bundler();
function useClaudeCreateMenu(menu, handleMenuSelect) {
	const { showMcpDiscovery, mcpDiscovery, entryLabel, openEntry } = useMcpDiscovery();
	const claudeAppendSlotName = "item.append.claude-mcp";
	const claudeMenu = computed(() => showMcpDiscovery.value ? [
		...menu.value,
		{
			id: "claude-divider",
			isDivider: true
		},
		{
			id: "claude-mcp",
			title: entryLabel.value
		}
	] : menu.value);
	function selectItem(id) {
		if (id === "claude-mcp") openEntry("create_menu");
		else handleMenuSelect(id);
	}
	return {
		claudeMenu,
		claudeAppendSlotName,
		selectItem,
		trackOpen: () => {
			if (showMcpDiscovery.value) mcpDiscovery.trackEntry("create_menu", "viewed");
		}
	};
}
//#endregion
//#region src/app/components/MainSidebarHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["href"];
var MainSidebarHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MainSidebarHeader",
	props: {
		isCollapsed: { type: Boolean },
		hideCreate: { type: Boolean }
	},
	emits: ["collapse", "openCommandBar"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const sourceControlStore = useSourceControlStore();
		const settingsStore = useSettingsStore();
		const router = useRouter();
		function toggleCollapse() {
			emit("collapse");
		}
		function openCommandBar(event) {
			emit("openCommandBar", event);
		}
		const { menu, handleSelect: handleMenuSelect, projectsLimitReachedMessage, upgradeLabel, hasPermissionToCreateProjects } = useGlobalEntityCreation();
		const { claudeMenu, selectItem, trackOpen } = useClaudeCreateMenu(menu, handleMenuSelect);
		function toDropdownItem(item) {
			return {
				id: item.id,
				label: item.title,
				disabled: item.disabled,
				icon: typeof item.icon === "string" ? {
					type: "icon",
					value: item.icon
				} : item.icon,
				data: { route: item.route },
				children: item.submenu?.map(toDropdownItem)
			};
		}
		const creationMenu = computed(() => {
			const items = [];
			let divided = false;
			for (const item of claudeMenu.value) {
				if ("isDivider" in item && item.isDivider) {
					divided = true;
					continue;
				}
				items.push({
					...toDropdownItem(item),
					divided
				});
				divided = false;
			}
			const workflowIndex = items.findIndex((item) => item.id === "workflow");
			const agentIndex = items.findIndex((item) => item.id === "agent");
			if (workflowIndex !== -1 && agentIndex !== -1 && agentIndex !== workflowIndex + 1) {
				const [agentItem] = items.splice(agentIndex, 1);
				items.splice(items.findIndex((item) => item.id === "workflow") + 1, 0, agentItem);
			}
			return items;
		});
		function handleSelect(id) {
			const item = creationMenu.value.flatMap((item) => [item, ...item.children ?? []]).find((item) => item.id === id);
			if (item?.data?.route) router.push(item.data.route);
			selectItem(id);
		}
		function handleLinkClick(event) {
			if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) event.stopPropagation();
			else event.preventDefault();
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass({
				[_ctx.$style.header]: true,
				[_ctx.$style.collapsed]: __props.isCollapsed
			}) }, [
				!__props.isCollapsed ? (openBlock(), createBlock(unref(RouterLink), {
					key: 0,
					to: { name: unref(VIEWS).HOMEPAGE },
					class: normalizeClass(_ctx.$style.logo)
				}, {
					default: withCtx(() => [createVNode(unref(N8nLogo_default), {
						size: "small",
						collapsed: __props.isCollapsed,
						"release-channel": unref(settingsStore).settings.releaseChannel
					}, {
						default: withCtx(() => [unref(sourceControlStore).preferences.branchReadOnly && !__props.isCollapsed ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							placement: "bottom"
						}, {
							content: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "readOnlyEnv.tooltip",
								scope: "global"
							}, {
								link: withCtx(() => [createVNode(unref(N8nLink_default), {
									to: unref(PROTECTED_INSTANCE_DOCS_URL),
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("readOnlyEnv.tooltip.link")), 1)]),
									_: 1
								}, 8, ["to"])]),
								_: 1
							})]),
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								"data-test-id": "read-only-env-icon",
								icon: "lock",
								class: normalizeClass(_ctx.$style.readOnlyEnvironmentIcon)
							}, null, 8, ["class"])]),
							_: 1
						})) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["collapsed", "release-channel"])]),
					_: 1
				}, 8, ["to", "class"])) : createCommentVNode("", true),
				!__props.hideCreate ? (openBlock(), createBlock(unref(DropdownMenu_default), {
					key: 1,
					"data-test-id": "universal-add",
					items: creationMenu.value,
					"content-test-id": "creation-menu",
					placement: "bottom-start",
					modal: false,
					onSelect: handleSelect
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						class: "n8n-button--highlight",
						variant: "ghost",
						size: "small",
						icon: "plus",
						"icon-size": "large",
						"aria-label": unref(i18n).baseText("mainSidebar.header.addNewItem"),
						onClick: unref(trackOpen)
					}, null, 8, ["aria-label", "onClick"])]),
					"item-leading": withCtx(({ item, ui }) => [item.id === "claude-mcp" ? (openBlock(), createBlock(ClaudeLogo_default, {
						key: 0,
						class: normalizeClass(ui.class)
					}, null, 8, ["class"])) : item.icon?.type === "icon" ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: item.icon.value,
						class: normalizeClass(ui.class),
						size: "large"
					}, null, 8, ["icon", "class"])) : item.icon?.type === "emoji" ? (openBlock(), createElementBlock("span", {
						key: 2,
						class: normalizeClass(ui.class)
					}, toDisplayString(item.icon.value), 3)) : createCommentVNode("", true)]),
					"item-label": withCtx(({ item, ui }) => [item.data?.route && !item.disabled ? (openBlock(), createElementBlock("a", {
						key: 0,
						href: unref(router).resolve(item.data.route).href,
						class: normalizeClass([ui.class, _ctx.$style.creationLink]),
						tabindex: "-1",
						onClick: handleLinkClick
					}, toDisplayString(item.label), 11, _hoisted_1)) : (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(ui.class)
					}, toDisplayString(item.label), 3))]),
					"item-trailing": withCtx(({ item }) => [item.id === "workflow" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [unref(sourceControlStore).preferences.branchReadOnly ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "right",
						content: unref(i18n).baseText("readOnlyEnv.cantAdd.workflow")
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.iconButton),
							icon: "lock",
							size: "xsmall"
						}, null, 8, ["class"])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true)], 64)) : item.id === "credential" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [unref(sourceControlStore).preferences.branchReadOnly ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "right",
						content: unref(i18n).baseText("readOnlyEnv.cantAdd.credential")
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.iconButton),
							icon: "lock",
							size: "xsmall"
						}, null, 8, ["class"])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true)], 64)) : item.id === "create-project" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [unref(sourceControlStore).preferences.branchReadOnly ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "right",
						content: unref(i18n).baseText("readOnlyEnv.cantAdd.project")
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.iconButton),
							icon: "lock",
							size: "xsmall"
						}, null, 8, ["class"])]),
						_: 1
					}, 8, ["content"])) : item.disabled ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						placement: "right",
						content: unref(projectsLimitReachedMessage)
					}, {
						default: withCtx(() => [!unref(hasPermissionToCreateProjects) ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.iconButton),
							icon: "lock",
							size: "xsmall"
						}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nButton_default), {
							key: 1,
							variant: "outline",
							size: "mini",
							class: normalizeClass(_ctx.$style.upgradeButton),
							onClick: withModifiers(($event) => unref(handleMenuSelect)(item.id), ["stop"])
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(upgradeLabel)), 1)]),
							_: 1
						}, 8, ["class", "onClick"]))]),
						_: 2
					}, 1032, ["content"])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)]),
					_: 1
				}, 8, ["items"])) : createCommentVNode("", true),
				!unref(settingsStore).isCanvasOnly ? (openBlock(), createBlock(KeyboardShortcutTooltip_default, {
					key: 2,
					placement: __props.isCollapsed ? "right" : "bottom",
					"show-after": 500,
					label: unref(i18n).baseText("nodeView.openCommandBar"),
					shortcut: {
						keys: ["k"],
						metaKey: true
					}
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						class: "n8n-button--highlight",
						variant: "ghost",
						size: "small",
						icon: "search",
						"icon-size": "large",
						"aria-label": unref(i18n).baseText("mainSidebar.header.openCommandPalette"),
						onClick: openCommandBar
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["placement", "label"])) : createCommentVNode("", true),
				createVNode(KeyboardShortcutTooltip_default, {
					placement: __props.isCollapsed ? "right" : "bottom",
					label: __props.isCollapsed ? unref(i18n).baseText("mainSidebar.state.expand") : unref(i18n).baseText("mainSidebar.state.collapse"),
					"show-after": 500,
					shortcut: { keys: ["["] }
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						id: "toggle-sidebar-button",
						class: "n8n-button--highlight",
						variant: "ghost",
						size: "small",
						icon: "panel-left",
						"icon-size": "large",
						"aria-label": unref(i18n).baseText("mainSidebar.header.toggleSidebar"),
						onClick: toggleCollapse
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["placement", "label"])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1y5cs_3",
	collapsed: "_collapsed_1y5cs_16",
	logo: "_logo_1y5cs_21",
	readOnlyEnvironmentIcon: "_readOnlyEnvironmentIcon_1y5cs_29",
	iconButton: "_iconButton_1y5cs_39",
	creationLink: "_creationLink_1y5cs_44",
	upgradeButton: "_upgradeButton_1y5cs_48"
} }]]);
//#endregion
export { BottomMenu_default as n, MainSidebarHeader_default as t };
