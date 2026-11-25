import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, gf as resolveComponent, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Cr as useAiGateway, DA as BaseLayout_default, Fa as unflattenModel, Mp as useCredentialsStore, PA as useMessage, SN as _plugin_vue_export_helper_default, Ta as groupConversationsByDate, Tj as N8nResizeWrapper_default, XM as N8nActionDropdown_default, Yj as N8nMenuItem_default, _N as N8nText_default, cN as Input_default, dC as useToast, eu as CHAT_CONVERSATION_VIEW, fC as VIEWS, hC as useTelemetry, jN as useI18n, ln as KeyboardShortcutTooltip_default, ou as CHAT_VIEW, ru as CHAT_PERSONAL_AGENTS_VIEW, sj as N8nScrollArea_default, su as CHAT_WORKFLOW_AGENTS_VIEW, ua as useChatStore, vN as N8nIconButton_default, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { t as useSettingsItems } from "./useSettingsItems-AIs5iFOz.js";
import { t as useKeybindings } from "./useKeybindings-DShLgy_J.js";
import { t as useSidebarLayout } from "./useSidebarLayout-B-invoq-.js";
import { n as BottomMenu_default, t as MainSidebarHeader_default } from "./MainSidebarHeader-BpX52nBp.js";
import { t as ChatAgentAvatar_default } from "./ChatAgentAvatar-Cy6J2OZW.js";
//#region src/features/ai/chatHub/components/ChatSidebarLink.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var ChatSidebarLink_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatSidebarLink",
	props: {
		active: {
			type: Boolean,
			default: false
		},
		to: {},
		label: {},
		title: {},
		menuItems: { default: () => [] },
		icon: {},
		compact: { type: Boolean }
	},
	emits: ["actionSelect", "click"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.menuItem, { [_ctx.$style.active]: __props.active }]) }, [_ctx.$slots.default ? renderSlot(_ctx.$slots, "default", { key: 0 }) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(_component_RouterLink, {
				to: __props.to,
				class: normalizeClass([_ctx.$style.menuItemLink, { [_ctx.$style.compact]: __props.compact }]),
				title: __props.title,
				onClick: _cache[0] || (_cache[0] = ($event) => emit("click", $event))
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "icon", {}, () => [__props.icon ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					size: "large",
					icon: __props.icon
				}, null, 8, ["icon"])) : createCommentVNode("", true)]), !__props.compact ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.textContainer)
				}, [createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.label),
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.label), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.title),
					size: "medium",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
					_: 1
				}, 8, ["class"])], 2)) : createCommentVNode("", true)]),
				_: 3
			}, 8, [
				"to",
				"class",
				"title"
			]), !__props.compact && __props.menuItems.length > 0 ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
				key: 0,
				items: __props.menuItems,
				class: normalizeClass(_ctx.$style.actionDropdown),
				placement: "bottom-start",
				onSelect: _cache[1] || (_cache[1] = ($event) => emit("actionSelect", $event)),
				onClick: _cache[2] || (_cache[2] = withModifiers(() => {}, ["stop"]))
			}, {
				activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					variant: "ghost",
					icon: "ellipsis",
					class: normalizeClass(_ctx.$style.actionDropdownTrigger)
				}, null, 8, ["class"])]),
				_: 1
			}, 8, ["items", "class"])) : createCommentVNode("", true)], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	menuItem: "_menuItem_1hqff_1",
	active: "_active_1hqff_7",
	menuItemLink: "_menuItemLink_1hqff_11",
	compact: "_compact_1hqff_23",
	textContainer: "_textContainer_1hqff_30",
	label: "_label_1hqff_36",
	title: "_title_1hqff_45",
	actionDropdown: "_actionDropdown_1hqff_54",
	actionDropdownTrigger: "_actionDropdownTrigger_1hqff_65"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatSessionMenuItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatSessionMenuItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatSessionMenuItem",
	props: {
		session: {},
		isRenaming: { type: Boolean },
		active: { type: Boolean },
		compact: { type: Boolean }
	},
	emits: [
		"startRename",
		"cancelRename",
		"confirmRename",
		"delete"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const input = useTemplateRef("input");
		const editedLabel = ref("");
		const chatStore = useChatStore();
		const i18n = useI18n();
		const agent = computed(() => {
			const model = unflattenModel(__props.session);
			if (!model) return null;
			return chatStore.getAgent(model, {
				name: __props.session.agentName,
				icon: __props.session.agentIcon
			});
		});
		const dropdownItems = computed(() => [{
			id: "rename",
			label: i18n.baseText("chatHub.session.actions.rename"),
			icon: "pencil"
		}, {
			id: "delete",
			label: i18n.baseText("chatHub.session.actions.delete"),
			icon: "trash-2"
		}]);
		function handleActionSelect(action) {
			if (action === "rename") {
				editedLabel.value = __props.session.title;
				emit("startRename", __props.session.id);
			} else if (action === "delete") emit("delete", __props.session.id);
		}
		function handleBlur() {
			const trimmed = editedLabel.value.trim();
			if (trimmed && trimmed !== __props.session.title) emit("confirmRename", __props.session.id, trimmed);
			else emit("cancelRename");
		}
		function handleKeyDown(e) {
			if (e.key === "Escape") {
				emit("cancelRename");
				return;
			}
			if (e.key === "Enter" && !e.isComposing) handleBlur();
		}
		watch(() => __props.isRenaming, async (renaming) => {
			if (renaming) {
				editedLabel.value = __props.session.title;
				await nextTick();
				input.value?.focus();
				input.value?.select();
			} else editedLabel.value = "";
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ChatSidebarLink_default, {
				to: {
					name: unref(CHAT_CONVERSATION_VIEW),
					params: { id: __props.session.id }
				},
				active: __props.active,
				compact: __props.compact,
				"menu-items": dropdownItems.value,
				label: __props.session.agentName,
				title: __props.session.title,
				onActionSelect: handleActionSelect
			}, createSlots({
				icon: withCtx(() => [createVNode(ChatAgentAvatar_default, {
					agent: agent.value,
					size: "sm",
					class: normalizeClass(_ctx.$style.avatar)
				}, null, 8, ["agent", "class"])]),
				_: 2
			}, [__props.isRenaming ? {
				name: "default",
				fn: withCtx(() => [createVNode(unref(Input_default), {
					ref_key: "input",
					ref: input,
					modelValue: editedLabel.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => editedLabel.value = $event),
					size: "large",
					onBlur: handleBlur,
					onKeydown: handleKeyDown
				}, null, 8, ["modelValue"])]),
				key: "0"
			} : void 0]), 1032, [
				"to",
				"active",
				"compact",
				"menu-items",
				"label",
				"title"
			]);
		};
	}
}), [["__cssModules", { "$style": { avatar: "_avatar_105yx_1" } }]]);
var SkeletonMenuItem_vue_vue_type_style_index_0_lang_module_default = {
	skeletonItem: "_skeletonItem_1q5u2_450",
	skeletonAvatar: "_skeletonAvatar_1q5u2_459",
	skeletonText: "_skeletonText_1q5u2_460",
	"skeleton-pulse": "_skeleton-pulse_1q5u2_1",
	shimmer: "_shimmer_1q5u2_1",
	spin: "_spin_1q5u2_1",
	opacityPulse: "_opacityPulse_1q5u2_1",
	popoverIn: "_popoverIn_1q5u2_1",
	fadeIn: "_fadeIn_1q5u2_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1q5u2_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1q5u2_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1q5u2_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1q5u2_1",
	blurSwapIn: "_blurSwapIn_1q5u2_1",
	blurSwapOut: "_blurSwapOut_1q5u2_1",
	pulse: "_pulse_1q5u2_1",
	pulseGlow: "_pulseGlow_1q5u2_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1q5u2_1",
	fade: "_fade_1q5u2_1",
	fadeInUp: "_fadeInUp_1q5u2_1",
	fadeInDown: "_fadeInDown_1q5u2_1",
	fadeInLeft: "_fadeInLeft_1q5u2_1",
	fadeInRight: "_fadeInRight_1q5u2_1",
	fadeOut: "_fadeOut_1q5u2_1",
	fadeOutDown: "_fadeOutDown_1q5u2_1",
	fadeOutUp: "_fadeOutUp_1q5u2_1",
	fadeOutLeft: "_fadeOutLeft_1q5u2_1",
	fadeOutRight: "_fadeOutRight_1q5u2_1",
	ping: "_ping_1q5u2_1",
	blinkBackground: "_blinkBackground_1q5u2_1",
	typingBlink: "_typingBlink_1q5u2_1"
};
//#endregion
//#region src/features/ai/chatHub/components/SkeletonMenuItem.vue
init_shared_esm_bundler(), init_runtime_core_esm_bundler();
var _sfc_main = {};
function _sfc_render(_ctx, _cache) {
	return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.skeletonItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.skeletonAvatar) }, null, 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.skeletonText) }, null, 2)], 2);
}
var SkeletonMenuItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(_sfc_main, [["render", _sfc_render], ["__cssModules", { "$style": SkeletonMenuItem_vue_vue_type_style_index_0_lang_module_default }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatSidebarContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatSidebarContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatSidebarContent",
	props: { isCollapsed: { type: Boolean } },
	setup(__props) {
		const route = useRoute();
		const router = useRouter();
		const chatStore = useChatStore();
		const toast = useToast();
		const message = useMessage();
		const credentialsStore = useCredentialsStore();
		const telemetry = useTelemetry();
		const readyToShowSessions = computed(() => chatStore.sessionsReady && credentialsStore.allCredentialTypes.length > 0);
		const i18n = useI18n();
		const renamingSessionId = ref();
		const currentSessionId = computed(() => typeof route.params.id === "string" ? route.params.id : void 0);
		const groupedConversations = computed(() => groupConversationsByDate((chatStore.sessions.ids ?? []).reduce((acc, id) => {
			const session = chatStore.sessions.byId[id];
			if (session && session.type !== "manual") acc.push(session);
			return acc;
		}, [])));
		const newChat = computed(() => ({
			id: "new-chat",
			label: i18n.baseText("chatHub.sidebar.link.newChat"),
			icon: "plus",
			route: { to: {
				name: CHAT_VIEW,
				force: true
			} }
		}));
		const personalAgents = computed(() => ({
			id: "personal-agents",
			label: i18n.baseText("chatHub.sidebar.link.personalAgents"),
			icon: "message-square",
			route: { to: { name: CHAT_PERSONAL_AGENTS_VIEW } }
		}));
		const workflowAgents = computed(() => ({
			id: "workflow-agents",
			label: i18n.baseText("chatHub.sidebar.link.workflowAgents"),
			icon: "robot",
			route: { to: { name: CHAT_WORKFLOW_AGENTS_VIEW } }
		}));
		function handleStartRename(sessionId) {
			renamingSessionId.value = sessionId;
		}
		function handleCancelRename() {
			renamingSessionId.value = void 0;
		}
		async function handleConfirmRename(sessionId, newLabel) {
			try {
				await chatStore.renameSession(sessionId, newLabel);
				renamingSessionId.value = void 0;
			} catch (error) {
				toast.showError(error, i18n.baseText("chatHub.session.updateTitle.error"));
			}
		}
		async function handleDeleteSession(sessionId) {
			if (await message.confirm(i18n.baseText("chatHub.session.delete.confirm.message"), i18n.baseText("chatHub.session.delete.confirm.title"), {
				confirmButtonText: i18n.baseText("chatHub.session.delete.confirm.button"),
				cancelButtonText: i18n.baseText("chatHub.session.delete.cancel.button")
			}) !== "confirm") return;
			try {
				await chatStore.deleteSession(sessionId);
				toast.showMessage({
					type: "success",
					title: i18n.baseText("chatHub.session.delete.success")
				});
				if (sessionId === currentSessionId.value) router.push({ name: CHAT_VIEW });
			} catch (error) {
				toast.showError(error, i18n.baseText("chatHub.session.delete.error"));
			}
		}
		function handleNewChatClick() {
			telemetry.track("User clicked new chat button", { source: "chat_hub" });
		}
		onMounted(() => {
			chatStore.fetchSessions(true, {
				minLoadingTime: 250,
				type: "production"
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.component) }, [createBaseVNode("div", { class: normalizeClass({
				[_ctx.$style.links]: true,
				[_ctx.$style.collapsed]: __props.isCollapsed
			}) }, [
				createVNode(KeyboardShortcutTooltip_default, {
					placement: "right",
					label: unref(i18n).baseText("chatHub.sidebar.link.newChat"),
					"show-after": 500,
					shortcut: {
						keys: ["o"],
						metaKey: true,
						shiftKey: true
					}
				}, {
					default: withCtx(() => [createVNode(unref(N8nMenuItem_default), {
						item: newChat.value,
						compact: __props.isCollapsed,
						active: unref(route).name === unref(CHAT_VIEW),
						onClick: handleNewChatClick
					}, null, 8, [
						"item",
						"compact",
						"active"
					])]),
					_: 1
				}, 8, ["label"]),
				createVNode(unref(N8nMenuItem_default), {
					item: personalAgents.value,
					compact: __props.isCollapsed,
					active: unref(route).name === unref(CHAT_PERSONAL_AGENTS_VIEW)
				}, null, 8, [
					"item",
					"compact",
					"active"
				]),
				createVNode(unref(N8nMenuItem_default), {
					item: workflowAgents.value,
					compact: __props.isCollapsed,
					active: unref(route).name === unref(CHAT_WORKFLOW_AGENTS_VIEW)
				}, null, 8, [
					"item",
					"compact",
					"active"
				])
			], 2), createVNode(unref(N8nScrollArea_default), {
				"as-child": "",
				type: "scroll"
			}, {
				default: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass([_ctx.$style.historySections, { [_ctx.$style.collapsed]: __props.isCollapsed }]),
					"data-test-id": "chat-conversation-list"
				}, [!readyToShowSessions.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.group)
				}, [(openBlock(), createElementBlock(Fragment, null, renderList(10, (i) => {
					return createVNode(SkeletonMenuItem_default, { key: `loading-${i}` });
				}), 64))], 2)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(groupedConversations.value, (group, index) => {
					return openBlock(), createElementBlock("div", {
						key: group.group,
						class: normalizeClass(_ctx.$style.group)
					}, [
						!__props.isCollapsed ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.groupHeader),
							size: "small",
							bold: "",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(group.group), 1)]),
							_: 2
						}, 1032, ["class"])) : createCommentVNode("", true),
						(openBlock(true), createElementBlock(Fragment, null, renderList(group.sessions, (session) => {
							return openBlock(), createBlock(ChatSessionMenuItem_default, {
								key: session.id,
								session,
								compact: __props.isCollapsed,
								active: currentSessionId.value === session.id,
								"is-renaming": renamingSessionId.value === session.id,
								onStartRename: handleStartRename,
								onCancelRename: handleCancelRename,
								onConfirmRename: handleConfirmRename,
								onDelete: handleDeleteSession
							}, null, 8, [
								"session",
								"compact",
								"active",
								"is-renaming"
							]);
						}), 128)),
						index === groupedConversations.value.length - 1 && unref(chatStore).sessions.hasMore && !unref(chatStore).sessionsLoading ? (openBlock(), createBlock(unref(N8nMenuItem_default), {
							key: 1,
							item: {
								id: "load-more-sessions",
								label: unref(i18n).baseText("chatHub.sidebar.loadMoreSessions"),
								icon: "circle-ellipsis"
							},
							compact: __props.isCollapsed,
							onClick: _cache[0] || (_cache[0] = () => unref(chatStore).fetchMoreSessions({ minLoadingTime: 250 }))
						}, null, 8, ["item", "compact"])) : createCommentVNode("", true),
						index === groupedConversations.value.length - 1 && unref(chatStore).sessionsLoading ? (openBlock(), createElementBlock(Fragment, { key: 2 }, renderList(10, (i) => {
							return createVNode(SkeletonMenuItem_default, { key: i });
						}), 64)) : createCommentVNode("", true)
					], 2);
				}), 128))], 2)]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	logoContainer: "_logoContainer_1qfhw_1",
	component: "_component_1qfhw_7",
	header: "_header_1qfhw_13",
	logo: "_logo_1qfhw_1",
	links: "_links_1qfhw_29",
	collapsed: "_collapsed_1qfhw_34",
	historySections: "_historySections_1qfhw_38",
	group: "_group_1qfhw_48",
	groupHeader: "_groupHeader_1qfhw_54",
	loading: "_loading_1qfhw_58",
	empty: "_empty_1qfhw_59"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ChatSidebar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatSidebar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatSidebar",
	setup(__props) {
		const i18n = useI18n();
		const router = useRouter();
		const { isCollapsed, isResizing, sidebarWidth, onResizeStart, onResize, onResizeEnd, toggleCollapse } = useSidebarLayout();
		function openCommandBar(event) {
			event.stopPropagation();
			nextTick(() => {
				const keyboardEvent = new KeyboardEvent("keydown", {
					key: "k",
					code: "KeyK",
					metaKey: true,
					bubbles: true,
					cancelable: true
				});
				document.dispatchEvent(keyboardEvent);
			});
		}
		const { settingsItems, settingsSections, handleSettingsItemSelect } = useSettingsItems();
		const { fetchWallet, isEnabled: isAiGatewayEnabled } = useAiGateway();
		onMounted(() => {
			if (isAiGatewayEnabled.value) fetchWallet();
		});
		const mainMenuItems = computed(() => [{
			id: "settings",
			label: i18n.baseText("mainSidebar.settings"),
			icon: "settings",
			available: true,
			children: settingsItems.value
		}]);
		const visibleMenuItems = computed(() => mainMenuItems.value.filter((item) => item.available !== false));
		useKeybindings({ ["bracketleft"]: () => toggleCollapse() });
		const onLogout = () => {
			router.push({ name: VIEWS.SIGNOUT });
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nResizeWrapper_default), {
				id: "side-menu",
				class: normalizeClass({
					[_ctx.$style.sideMenu]: true,
					[_ctx.$style.sideMenuCollapsed]: unref(isCollapsed),
					[_ctx.$style.sideMenuResizing]: unref(isResizing)
				}),
				width: unref(sidebarWidth),
				style: normalizeStyle(unref(isCollapsed) ? {} : { width: `${unref(sidebarWidth)}px` }),
				"supported-directions": ["right"],
				"min-width": unref(200),
				"max-width": unref(500),
				"grid-size": 8,
				onResizestart: unref(onResizeStart),
				onResize: unref(onResize),
				onResizeend: unref(onResizeEnd)
			}, {
				default: withCtx(() => [createVNode(MainSidebarHeader_default, {
					"hide-create": "",
					"is-collapsed": unref(isCollapsed),
					onCollapse: unref(toggleCollapse),
					onOpenCommandBar: openCommandBar
				}, null, 8, ["is-collapsed", "onCollapse"]), createVNode(unref(N8nScrollArea_default), { "as-child": "" }, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.scrollArea) }, [createVNode(ChatSidebarContent_default, { "is-collapsed": unref(isCollapsed) }, null, 8, ["is-collapsed"]), createVNode(BottomMenu_default, {
						items: visibleMenuItems.value,
						"settings-sections": unref(settingsSections),
						"is-collapsed": unref(isCollapsed),
						onSelect: unref(handleSettingsItemSelect),
						onLogout
					}, null, 8, [
						"items",
						"settings-sections",
						"is-collapsed",
						"onSelect"
					])], 2)]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"class",
				"width",
				"style",
				"min-width",
				"max-width",
				"onResizestart",
				"onResize",
				"onResizeend"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	sideMenu: "_sideMenu_1m85p_1",
	sideMenuCollapsed: "_sideMenuCollapsed_1m85p_11",
	sideMenuResizing: "_sideMenuResizing_1m85p_15",
	scrollArea: "_scrollArea_1m85p_19"
} }]]);
//#endregion
//#region src/app/layouts/ChatLayout.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/app/layouts/ChatLayout.vue
var ChatLayout_default = /* @__PURE__ */ defineComponent({
	__name: "ChatLayout",
	setup(__props) {
		return (_ctx, _cache) => {
			const _component_RouterView = resolveComponent("RouterView");
			return openBlock(), createBlock(BaseLayout_default, null, {
				sidebar: withCtx(() => [createVNode(ChatSidebar_default)]),
				default: withCtx(() => [createVNode(_component_RouterView)]),
				_: 1
			});
		};
	}
});
//#endregion
export { ChatLayout_default as default };
