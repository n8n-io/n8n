import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, yp as normalizeStyle } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Jf as RestrictedMenuItemMarker_default, Jg as useUIStore, SN as _plugin_vue_export_helper_default, Xf as ContactAdminModal_default, bf as getNodeItemRestriction, du as TOOLS_MANAGER_MODAL_KEY, fN as N8nTooltip_default, fu as TOOL_SETTINGS_MODAL_KEY, hu as NodeIcon_default, jN as useI18n, ua as useChatStore, uf as useNodeTypesStore, vN as N8nIconButton_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useChatToolPolicy } from "./useChatToolRestriction-C4mNTPsX.js";
//#region src/features/ai/chatHub/components/ToolsSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var CREATE_NEW_TOOL_ID = "action::create-new";
var ToolsSelector_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolsSelector",
	props: {
		disabled: { type: Boolean },
		checkedToolIds: {},
		customAgentId: {},
		disabledTooltip: {},
		stacked: { type: Boolean }
	},
	emits: ["toggle"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const chatStore = useChatStore();
		const i18n = useI18n();
		const $style = useCssModule();
		useChatToolPolicy();
		const dropdownRef = useTemplateRef("dropdownMenu");
		const searchQuery = ref("");
		const contactAdmin = ref(null);
		const checkedToolIdsSet = computed(() => new Set(props.checkedToolIds));
		const toolCount = computed(() => props.checkedToolIds.length);
		const displayToolNodeTypes = computed(() => {
			const maxIcons = toolCount.value > 3 ? 2 : 3;
			return chatStore.configuredTools.filter((t) => checkedToolIdsSet.value.has(t.definition.id)).slice(0, maxIcons).map((t) => nodeTypesStore.getNodeType(t.definition.type, t.definition.typeVersion)).filter(Boolean);
		});
		const remainingToolCount = computed(() => {
			if (toolCount.value > 3) return toolCount.value - 2;
			return 0;
		});
		const toolsLabel = computed(() => {
			if (toolCount.value === 1) {
				const toolId = props.checkedToolIds[0];
				const tool = chatStore.configuredTools.find((t) => t.definition.id === toolId);
				if (tool) return tool.definition.name;
			}
			if (toolCount.value > 1) return i18n.baseText("chatHub.tools.selector.label.count", { adjustToNumber: toolCount.value });
			return i18n.baseText("chatHub.tools.selector.label.default");
		});
		function openToolsManager() {
			dropdownRef.value?.close();
			uiStore.openModalWithData({
				name: TOOLS_MANAGER_MODAL_KEY,
				data: {
					tools: chatStore.configuredTools.filter((t) => checkedToolIdsSet.value.has(t.definition.id)).map((t) => t.definition),
					onConfirm: () => {},
					customAgentId: props.customAgentId,
					...props.stacked ? { stacked: true } : {}
				}
			});
		}
		function openToolSettings(item) {
			dropdownRef.value?.close();
			const tool = item.data?.tool;
			if (!tool) return;
			const otherToolNames = chatStore.configuredTools.filter((t) => t.definition.id !== tool.id).map((t) => t.definition.name);
			uiStore.openModalWithData({
				name: TOOL_SETTINGS_MODAL_KEY,
				data: {
					node: { ...tool },
					existingToolNames: otherToolNames,
					onConfirm: async (configuredNode) => {
						await chatStore.updateConfiguredTool(tool.id, configuredNode);
					},
					...props.stacked ? { stacked: true } : {}
				}
			});
		}
		function isToggleLocked(restriction, checked) {
			return !!restriction && !checked;
		}
		const menuItems = computed(() => {
			const query = searchQuery.value.toLowerCase();
			const toolItems = chatStore.configuredTools.filter((tool) => {
				if (!query) return true;
				const def = tool.definition;
				const nodeType = nodeTypesStore.getNodeType(def.type, def.typeVersion);
				const nameMatch = def.name.toLowerCase().includes(query);
				const typeMatch = nodeType?.displayName.toLowerCase().includes(query);
				return nameMatch || typeMatch;
			}).map((tool) => {
				const checked = checkedToolIdsSet.value.has(tool.definition.id);
				const restriction = getNodeItemRestriction(tool.definition.type);
				return {
					id: `tool::${tool.definition.id}`,
					label: tool.definition.name,
					checked,
					keepOpen: isToggleLocked(restriction, checked),
					class: restriction ? $style.restricted : void 0,
					data: {
						nodeType: nodeTypesStore.getNodeType(tool.definition.type, tool.definition.typeVersion),
						tool: tool.definition,
						restriction
					}
				};
			});
			toolItems.push({
				id: CREATE_NEW_TOOL_ID,
				label: i18n.baseText("chatHub.tools.selector.createNew"),
				icon: {
					type: "icon",
					value: "plus"
				},
				divided: true
			});
			return toolItems;
		});
		function handleSelect(id) {
			if (id === CREATE_NEW_TOOL_ID) {
				openToolsManager();
				return;
			}
			const [command, toolId] = id.split("::");
			if (command !== "tool") return;
			const item = menuItems.value.find((i) => i.id === id);
			if (item && isToggleLocked(item.data?.restriction, item.checked)) return;
			emit("toggle", toolId);
		}
		function restrictedTypeName(item) {
			return item.data?.nodeType?.displayName ?? item.data?.tool.type ?? "";
		}
		function requestContactAdmin(item, audience) {
			dropdownRef.value?.close();
			contactAdmin.value = {
				typeName: restrictedTypeName(item),
				audience
			};
		}
		function handleSearch(query) {
			searchQuery.value = query;
		}
		onMounted(async () => {
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(unref($style).container) }, [unref(chatStore).configuredTools.length === 0 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: __props.disabledTooltip,
				disabled: !__props.disabledTooltip || !__props.disabled,
				placement: "bottom"
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"native-type": "button",
					class: normalizeClass(unref($style).toolsButton),
					disabled: __props.disabled,
					icon: "plus",
					"data-test-id": "chat-tools-button",
					onClick: openToolsManager
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(toolsLabel.value), 1)]),
					_: 1
				}, 8, ["class", "disabled"])]),
				_: 1
			}, 8, ["content", "disabled"])) : (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 1,
				content: __props.disabledTooltip,
				disabled: !__props.disabledTooltip || !__props.disabled,
				placement: "bottom"
			}, {
				default: withCtx(() => [createVNode(unref(DropdownMenu_default), {
					ref: "dropdownMenu",
					items: menuItems.value,
					placement: "top-start",
					"extra-popper-class": "tools-selector-dropdown",
					searchable: "",
					"search-placeholder": unref(i18n).baseText("chatHub.toolsManager.searchPlaceholder"),
					"empty-text": unref(i18n).baseText("chatHub.toolsManager.noResults"),
					onSelect: handleSelect,
					onSearch: handleSearch
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						"native-type": "button",
						disabled: __props.disabled,
						icon: toolCount.value === 0 ? "plus" : void 0,
						"data-test-id": "chat-tools-button"
					}, {
						default: withCtx(() => [toolCount.value > 0 ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(unref($style).iconStack)
						}, [(openBlock(true), createElementBlock(Fragment, null, renderList(displayToolNodeTypes.value, (nodeType, i) => {
							return openBlock(), createBlock(NodeIcon_default, {
								key: `${nodeType?.name}-${i}`,
								style: normalizeStyle({ zIndex: i + 1 }),
								"node-type": nodeType,
								class: normalizeClass([unref($style).icon, { [unref($style).iconOverlap]: i !== 0 }]),
								circle: true,
								size: 12
							}, null, 8, [
								"style",
								"node-type",
								"class"
							]);
						}), 128)), remainingToolCount.value > 0 ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass([
								unref($style).icon,
								unref($style).iconOverlap,
								unref($style).countBadge
							])
						}, " +" + toDisplayString(remainingToolCount.value), 3)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(toolsLabel.value), 1)]),
						_: 1
					}, 8, ["disabled", "icon"])]),
					"search-prefix": withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
					"search-suffix": withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "settings",
						variant: "ghost",
						size: "medium",
						text: "",
						class: normalizeClass(unref($style).settingsButton),
						onClick: withModifiers(openToolsManager, ["stop"])
					}, null, 8, ["class"])]),
					"item-leading": withCtx(({ item }) => [item.data?.nodeType ? (openBlock(), createBlock(NodeIcon_default, {
						key: 0,
						"node-type": item.data.nodeType,
						size: 16,
						class: normalizeClass({ [unref($style).restrictedIcon]: !!item.data.restriction })
					}, null, 8, ["node-type", "class"])) : item.icon?.type === "icon" ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: item.icon.value,
						size: "large"
					}, null, 8, ["icon"])) : createCommentVNode("", true)]),
					"item-trailing": withCtx(({ item }) => [item.id !== CREATE_NEW_TOOL_ID ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
						item.data?.restriction ? (openBlock(), createBlock(unref(RestrictedMenuItemMarker_default), {
							key: 0,
							"node-type-name": restrictedTypeName(item),
							restriction: item.data.restriction,
							onContactAdmin: (audience) => requestContactAdmin(item, audience)
						}, null, 8, [
							"node-type-name",
							"restriction",
							"onContactAdmin"
						])) : createCommentVNode("", true),
						createVNode(unref(N8nIconButton_default), {
							icon: "settings",
							variant: "ghost",
							size: "medium",
							text: "",
							class: normalizeClass(unref($style).itemSettingsButton),
							"data-test-id": "chat-tool-item-settings",
							onClick: withModifiers(($event) => openToolSettings(item), ["stop"])
						}, null, 8, ["class", "onClick"]),
						!item.checked ? (openBlock(), createElementBlock("span", {
							key: 1,
							class: normalizeClass(unref($style).checkPlaceholder)
						}, null, 2)) : createCommentVNode("", true)
					], 64)) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"items",
					"search-placeholder",
					"empty-text"
				])]),
				_: 1
			}, 8, ["content", "disabled"])), createVNode(unref(ContactAdminModal_default), {
				"type-name": contactAdmin.value?.typeName ?? "",
				audience: contactAdmin.value?.audience ?? "instance",
				open: contactAdmin.value !== null,
				"onUpdate:open": _cache[0] || (_cache[0] = (isOpen) => !isOpen && (contactAdmin.value = null))
			}, null, 8, [
				"type-name",
				"audience",
				"open"
			])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_wpk22_1",
	toolsButton: "_toolsButton_wpk22_6",
	transparentBg: "_transparentBg_wpk22_11",
	iconStack: "_iconStack_wpk22_15",
	icon: "_icon_wpk22_15",
	iconOverlap: "_iconOverlap_wpk22_30",
	countBadge: "_countBadge_wpk22_34",
	settingsButton: "_settingsButton_wpk22_47",
	itemSettingsButton: "_itemSettingsButton_wpk22_55",
	restricted: "_restricted_wpk22_59",
	restrictedIcon: "_restrictedIcon_wpk22_60",
	checkPlaceholder: "_checkPlaceholder_wpk22_64"
} }]]);
//#endregion
export { ToolsSelector_default as t };
