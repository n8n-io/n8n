import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Ir as captureException, Jd as defineComponent, Kd as createVNode, Mu as useElementBounding, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Of as withDirectives, Pd as Fragment, Rd as computed, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xd as guardReactiveProps, Xf as unref, _f as resolveDirective, _p as normalizeClass, ef as inject, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, jd as vShow, kf as withMemo, lf as onMounted, mf as renderList, of as onBeforeUnmount, qf as toRefs, rf as mergeProps, uf as onUnmounted, vp as normalizeProps, xu as onClickOutside, yp as normalizeStyle, yr as require_camelCase, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, AN as i18n, Af as transformNodeType, Bl as useKeyboardNavigation, Cb as HTTP_REQUEST_NODE_TYPE, Cf as isNodeItemRestricted, Cr as useAiGateway, Df as shouldShowCommunityNodeDetails, Dr as useQuickConnect, E_ as COMMUNITY_NODES_INSTALLATION_DOCS_URL, Ef as removePreviewToken, Ff as useInlineAgentsExperiment, Gn as useAgentResourcesLocator, Jg as useUIStore, Jj as N8nNodeCreatorNode_default, Kj as N8nNotice_default, LM as N8nCallout_default, Lk as isCommunityPackageName, Ll as useNodeCreatorStore, Mb as OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE, Mp as useCredentialsStore, Ob as MESSAGE_AN_AGENT_NODE_TYPE, Of as sinkRestrictedNodesLast, Qy as DRAG_EVENT_DATA_KEY, Rl as useViewStacks, SN as _plugin_vue_export_helper_default, Td as useEmptyCanvasGroupsFlag, Tf as prepareCommunityNodeDetailsViewStack, Un as useAgentScopeProjectId, Vl as NODE_CREATOR_VIEWS, Wn as useAgentProjectNameResolver, Wr as useChatPanelStore, Xl as useNodeType, Xy as CUSTOM_API_CALL_KEY, Yf as RestrictedNodePopover_default, _C as useUsersStore, _N as N8nText_default, _b as CHAT_TRIGGER_NODE_TYPE, _f as filterAndSearchNodes, _u as getNodeIconSize, ab as HUMAN_IN_THE_LOOP_CATEGORY, bf as getNodeItemRestriction, by as useDebounce, cb as REQUEST_NODE_FORM_URL, cg as getNewNodePosition, db as isNodeCreatorOpenFromConnection, df as useActionsGenerator, eC as DEBOUNCE_TIME, eb as ADD_EMPTY_GROUP_NODE_CREATOR_ITEM, fN as N8nTooltip_default, gC as useBannersStore, hC as useTelemetry, hM as N8nLink_default, hu as NodeIcon_default, jN as useI18n, kp as useAiGatewayStore, nN as N8nBadge_default, nb as AI_CATEGORY_MCP_NODES, ng as DEFAULT_NODE_SIZE, qj as N8nNodeIcon_default, rd as useFocusPanelStore, sM as OVERLAY_LAYER_SELECTOR, sS as EmbeddedCanvasElementKey, sr as useCalloutHelpers, tM as N8nInfoTip_default, tN as N8nLoading_default, ub as TRIGGER_NODE_CREATOR_VIEW, uf as useNodeTypesStore, vN as N8nIconButton_default, vd as useExternalHooks, vf as flattenCreateElements, vu as getNodeIconSource, wf as isNodePreviewKey, xN as N8nIcon_default, xf as getRootSearchCallouts, yC as useSettingsStore, yN as N8nButton_default, yf as getNodeCreatorSearchItems, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { n as CommunityNodeFooter_default, r as useInstalledCommunityPackage, t as CommunityNodeUpdateInfo_default } from "./CommunityNodeUpdateInfo-CMogL5vE.js";
import { t as useActions } from "./useActions-kp1kjbFB.js";
import { t as useInstallNode } from "./useInstallNode-8BEUfP2t.js";
import { t as ContactAdministratorToInstall_default } from "./ContactAdministratorToInstall-DUdafexG.js";
import { n as useGatewayCreditsPromotion, r as QuickConnectBanner_default, t as GatewayCreditsPromotion_default } from "./GatewayCreditsPromotion-DZRlGjzW.js";
import { t as verified_default } from "./verified-Q2mvxwOl.js";
import { n as SuggestionFooter_default, t as McpRegistrySuggestionFooter_default } from "./McpRegistrySuggestionFooter-CgPpYIFt.js";
import { t as useIntersectionObserver } from "./useIntersectionObserver-BTGMngAL.js";
import "./useIntersectionObserver-CVH8U9lD.js";
//#region src/app/components/transitions/SlideTransition.vue
init_runtime_core_esm_bundler(), init_runtime_dom_esm_bundler();
var _sfc_main = {};
function _sfc_render(_ctx, _cache) {
	return openBlock(), createBlock(Transition, { name: "slide" }, {
		default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, void 0, true)]),
		_: 3
	});
}
var SlideTransition_default = /*#__PURE__*/ _plugin_vue_export_helper_default(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ffd9b1ff"]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/NodeItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var NodeItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeItem",
	props: {
		nodeType: {},
		subcategory: { default: void 0 },
		active: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { actions } = useNodeCreatorStore();
		const { getAddedNodesAndConnections } = useActions();
		const { activeViewStack } = useViewStacks();
		const { isSubNodeType } = useNodeType({ nodeType: props.nodeType });
		const nodeTypesStore = useNodeTypesStore();
		const restriction = computed(() => getNodeItemRestriction(props.nodeType.name));
		const rowRef = ref(null);
		const dragging = ref(false);
		const draggablePosition = ref({
			x: -100,
			y: -100
		});
		const draggableDataTransfer = ref(null);
		const description = computed(() => {
			if (isCommunityNodePreview.value || isCommunityNode.value) return props.nodeType.description;
			if (isSendAndWaitCategory.value) return "";
			if (props.subcategory === "*" && !props.nodeType.name.startsWith("n8n-creds-base") && !activeViewStack.search) return "";
			return i18n.headerText({
				key: `headers.${shortNodeType.value}.description`,
				fallback: props.nodeType.description
			});
		});
		const showActionArrow = computed(() => {
			if (restriction.value) return false;
			if (shouldShowCommunityNodeDetails(isCommunityNode.value, activeViewStack)) return true;
			if (opensAgentSubPanel.value) return true;
			return hasActions.value && !isSendAndWaitCategory.value;
		});
		const opensAgentSubPanel = computed(() => props.nodeType.name === MESSAGE_AN_AGENT_NODE_TYPE);
		const isSendAndWaitCategory = computed(() => activeViewStack.subcategory === "Human in the Loop" || activeViewStack.rootView === "HITL");
		const dataTestId = computed(() => {
			if (restriction.value) return "node-creator-restricted-item";
			return hasActions.value ? "node-creator-action-item" : "node-creator-node-item";
		});
		const hasActions = computed(() => {
			return nodeActions.value.length > 1 && !activeViewStack.hideActions;
		});
		const nodeActions = computed(() => {
			return actions[props.nodeType.name] || [];
		});
		const nodeListIconSize = computed(() => {
			const icon = props.nodeType.icon;
			return getNodeIconSize("nodeList", typeof icon === "string" ? icon : void 0);
		});
		const shortNodeType = computed(() => i18n.shortNodeType(props.nodeType.name) || "");
		const draggableStyle = computed(() => ({
			top: `${draggablePosition.value.y}px`,
			left: `${draggablePosition.value.x}px`
		}));
		const isCommunityNode = computed(() => isCommunityPackageName(props.nodeType.name));
		const isCommunityNodePreview = computed(() => isNodePreviewKey(props.nodeType.name));
		const displayName = computed(() => {
			const trimmedDisplayName = props.nodeType.displayName.trimEnd();
			return i18n.headerText({
				key: `headers.${shortNodeType.value}.displayName`,
				fallback: hasActions.value ? trimmedDisplayName.replace("Trigger", "") : trimmedDisplayName
			});
		});
		const isTrigger = computed(() => {
			return props.nodeType.group.includes("trigger") && !hasActions.value;
		});
		const communityNodeType = computed(() => {
			return nodeTypesStore.communityNodeType(removePreviewToken(props.nodeType.name));
		});
		const isOfficial = computed(() => {
			return communityNodeType.value?.isOfficialNode ?? false;
		});
		const author = computed(() => {
			return communityNodeType.value?.displayName ?? displayName.value;
		});
		const tag = computed(() => {
			if (props.nodeType.tag) return props.nodeType.tag;
			if (props.nodeType.deprecated || description.value.toLowerCase().includes("deprecated")) return {
				text: i18n.baseText("nodeCreator.nodeItem.deprecated"),
				type: "info"
			};
		});
		const showNewBadge = computed(() => Boolean(props.nodeType.isNew && activeViewStack.search));
		function onDragStart(event) {
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = "copy";
				event.dataTransfer.dropEffect = "copy";
				event.dataTransfer.setDragImage(draggableDataTransfer.value, 0, 0);
				event.dataTransfer.setData(DRAG_EVENT_DATA_KEY, JSON.stringify(getAddedNodesAndConnections([{ type: props.nodeType.name }])));
			}
			dragging.value = true;
		}
		function onDragEnd() {
			dragging.value = false;
			setTimeout(() => {
				draggablePosition.value = {
					x: -100,
					y: -100
				};
			}, 300);
		}
		function onCommunityNodeTooltipClick(event) {
			if (event.target.localName === "a") telemetry.track("user clicked cnr docs link", { source: "nodes panel node" });
		}
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createBlock(unref(N8nNodeCreatorNode_default), {
				ref_key: "rowRef",
				ref: rowRef,
				draggable: !restriction.value && !showActionArrow.value,
				disabled: !!restriction.value,
				class: normalizeClass(_ctx.$style.nodeItem),
				description: description.value,
				title: displayName.value,
				"show-action-arrow": showActionArrow.value,
				"is-trigger": isTrigger.value,
				"is-official": isOfficial.value,
				"data-test-id": dataTestId.value,
				tag: tag.value,
				"is-new": showNewBadge.value,
				onDragstart: onDragStart,
				onDragend: onDragEnd
			}, createSlots({
				icon: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.iconWrapper) }, [unref(isSubNodeType) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.subNodeBackground)
				}, null, 2)) : createCommentVNode("", true), createVNode(NodeIcon_default, {
					class: normalizeClass(_ctx.$style.nodeIcon),
					"node-type": __props.nodeType,
					size: nodeListIconSize.value,
					"color-default": "var(--color--foreground--shade-2)"
				}, null, 8, [
					"class",
					"node-type",
					"size"
				])], 2)]),
				dragContent: withCtx(() => [withDirectives(createBaseVNode("div", {
					ref_key: "draggableDataTransfer",
					ref: draggableDataTransfer,
					class: normalizeClass(_ctx.$style.draggable),
					style: normalizeStyle(draggableStyle.value)
				}, [createVNode(NodeIcon_default, {
					"node-type": __props.nodeType,
					size: 40,
					shrink: false,
					"color-default": "var(--color--foreground--shade-2)",
					onClickCapture: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
				}, null, 8, ["node-type"])], 6), [[vShow, dragging.value]])]),
				_: 2
			}, [isOfficial.value ? {
				name: "extraDetails",
				fn: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					placement: "top",
					"show-after": 500
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.officialNode.tooltip", { interpolate: { author: author.value } })), 1)]),
					default: withCtx(() => [createVNode(unref(verified_default), { class: normalizeClass([_ctx.$style.icon, _ctx.$style.official]) }, null, 8, ["class"])]),
					_: 1
				})]),
				key: "0"
			} : isCommunityNode.value && !isCommunityNodePreview.value && !unref(activeViewStack)?.communityNodeDetails ? {
				name: "extraDetails",
				fn: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					placement: "top",
					"show-after": 500
				}, {
					content: withCtx(() => [withDirectives(createBaseVNode("p", {
						class: normalizeClass(_ctx.$style.communityNodeIcon),
						onClick: onCommunityNodeTooltipClick
					}, null, 2), [[_directive_n8n_html, unref(i18n).baseText("generic.communityNode.tooltip", { interpolate: {
						packageName: __props.nodeType.name.split(".")[0],
						docURL: unref(COMMUNITY_NODES_INSTALLATION_DOCS_URL)
					} })]])]),
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						size: "small",
						class: normalizeClass(_ctx.$style.icon),
						icon: "box"
					}, null, 8, ["class"])]),
					_: 1
				})]),
				key: "1"
			} : void 0, restriction.value ? {
				name: "trailing",
				fn: withCtx(() => [createVNode(unref(RestrictedNodePopover_default), {
					"node-type-name": displayName.value,
					restriction: restriction.value,
					anchor: rowRef.value,
					active: __props.active
				}, null, 8, [
					"node-type-name",
					"restriction",
					"anchor",
					"active"
				])]),
				key: "2"
			} : void 0]), 1032, [
				"draggable",
				"disabled",
				"class",
				"description",
				"title",
				"show-action-arrow",
				"is-trigger",
				"is-official",
				"data-test-id",
				"tag",
				"is-new"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	nodeItem: "_nodeItem_hwzgq_1",
	iconWrapper: "_iconWrapper_hwzgq_9",
	nodeIcon: "_nodeIcon_hwzgq_16",
	subNodeBackground: "_subNodeBackground_hwzgq_20",
	communityNodeIcon: "_communityNodeIcon_hwzgq_32",
	draggable: "_draggable_hwzgq_36",
	draggableDataTransfer: "_draggableDataTransfer_hwzgq_50",
	icon: "_icon_hwzgq_9",
	official: "_official_hwzgq_60"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/SubcategoryItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var import_camelCase = /* @__PURE__ */ __toESM(require_camelCase(), 1);
var SubcategoryItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SubcategoryItem",
	props: { item: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const subcategoryName = computed(() => (0, import_camelCase.default)(props.item.subcategory || props.item.title));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nNodeCreatorNode_default), {
				class: normalizeClass(_ctx.$style.subCategory),
				title: unref(i18n).baseText(`nodeCreator.subcategoryNames.${subcategoryName.value}`),
				"is-trigger": false,
				description: unref(i18n).baseText(`nodeCreator.subcategoryDescriptions.${subcategoryName.value}`),
				"show-action-arrow": true,
				"is-new": __props.item.new
			}, {
				icon: withCtx(() => [createVNode(unref(N8nNodeIcon_default), mergeProps({
					type: "icon",
					name: __props.item.icon,
					circle: false,
					"show-tooltip": false
				}, __props.item.iconProps), null, 16, ["name"])]),
				_: 1
			}, 8, [
				"class",
				"title",
				"description",
				"is-new"
			]);
		};
	}
}), [["__cssModules", { "$style": { subCategory: "_subCategory_1tgdz_1" } }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/LabelItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$6 = ["textContent"];
var LabelItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LabelItem",
	props: { item: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.label) }, [createBaseVNode("span", {
				class: normalizeClass(_ctx.$style.name),
				textContent: toDisplayString(__props.item.key)
			}, null, 10, _hoisted_1$6)], 2);
		};
	}
}), [["__cssModules", { "$style": { label: "_label_1krlx_1" } }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/ActionItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var ActionItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ActionItem",
	props: {
		nodeType: {},
		action: {}
	},
	setup(__props) {
		const props = __props;
		const telemetry = useTelemetry();
		const { getActionData, getAddedNodesAndConnections, setAddedNodeActionParameters } = useActions();
		const { activeViewStack } = useViewStacks();
		const state = reactive({
			dragging: false,
			draggablePosition: {
				x: -100,
				y: -100
			},
			storeWatcher: null,
			draggableDataTransfer: null
		});
		const draggableStyle = computed(() => ({
			top: `${state.draggablePosition.y}px`,
			left: `${state.draggablePosition.x}px`
		}));
		const actionData = computed(() => getActionData(props.action));
		const isTriggerAction = (action) => action.name?.toLowerCase().includes("trigger") || action.name === "n8n-nodes-base.webhook";
		function onDragStart(event) {
			/**
			* Workaround for firefox, that doesn't attach the pageX and pageY coordinates to "ondrag" event.
			* All browsers attach the correct page coordinates to the "dragover" event.
			* @bug https://bugzilla.mozilla.org/show_bug.cgi?id=505521
			*/
			document.body.addEventListener("dragover", onDragOver);
			const { pageX: x, pageY: y } = event;
			if (event.dataTransfer && actionData.value.key) {
				event.dataTransfer.effectAllowed = "copy";
				event.dataTransfer.dropEffect = "copy";
				event.dataTransfer.setDragImage(state.draggableDataTransfer, 0, 0);
				event.dataTransfer.setData(DRAG_EVENT_DATA_KEY, JSON.stringify(getAddedNodesAndConnections([{ type: actionData.value.key }])));
				if (telemetry) state.storeWatcher = setAddedNodeActionParameters(actionData.value, telemetry, activeViewStack.rootView);
				document.body.addEventListener("dragend", onDragEnd);
			}
			state.dragging = true;
			state.draggablePosition = {
				x,
				y
			};
		}
		function onDragOver(event) {
			if (!state.dragging || event.pageX === 0 && event.pageY === 0) return;
			const [x, y] = getNewNodePosition([], [event.pageX - DEFAULT_NODE_SIZE[0] / 2, event.pageY - DEFAULT_NODE_SIZE[1] / 2]);
			state.draggablePosition = {
				x,
				y
			};
		}
		function onDragEnd() {
			if (state.storeWatcher) state.storeWatcher();
			document.body.removeEventListener("dragend", onDragEnd);
			document.body.removeEventListener("dragover", onDragOver);
			state.dragging = false;
			setTimeout(() => {
				state.draggablePosition = {
					x: -100,
					y: -100
				};
			}, 300);
		}
		const { draggableDataTransfer, dragging } = toRefs(state);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nNodeCreatorNode_default), {
				draggable: "",
				class: normalizeClass(_ctx.$style.action),
				title: __props.action.displayName,
				"is-trigger": isTriggerAction(__props.action),
				"data-keyboard-nav": "true",
				onDragstart: onDragStart,
				onDragend: onDragEnd
			}, {
				dragContent: withCtx(() => [createBaseVNode("div", {
					ref_key: "draggableDataTransfer",
					ref: draggableDataTransfer,
					class: normalizeClass(_ctx.$style.draggableDataTransfer)
				}, null, 2), withDirectives(createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.draggable),
					style: normalizeStyle(draggableStyle.value)
				}, [createVNode(NodeIcon_default, {
					"node-type": __props.nodeType,
					size: 40,
					shrink: false,
					onClickCapture: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
				}, null, 8, ["node-type"])], 6), [[vShow, unref(dragging)]])]),
				icon: withCtx(() => [createVNode(NodeIcon_default, { "node-type": __props.action }, null, 8, ["node-type"])]),
				_: 1
			}, 8, [
				"class",
				"title",
				"is-trigger"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	action: "_action_7ntmn_1",
	nodeIcon: "_nodeIcon_7ntmn_13",
	draggable: "_draggable_7ntmn_17",
	draggableDataTransfer: "_draggableDataTransfer_7ntmn_31"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/AgentItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentItem",
	props: { agent: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nNodeCreatorNode_default), {
				class: normalizeClass(_ctx.$style.agentItem),
				title: __props.agent.name,
				"is-trigger": false,
				description: __props.agent.description,
				"data-test-id": "node-creator-agent-item"
			}, {
				icon: withCtx(() => [__props.agent.variant === "create" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.createIcon)
				}, [createVNode(unref(N8nIcon_default), {
					icon: "plus",
					size: 16
				})], 2)) : (openBlock(), createBlock(AgentPersonalisationIcon_default, {
					key: 1,
					personalisation: __props.agent.personalisation,
					size: 20
				}, null, 8, ["personalisation"]))]),
				_: 1
			}, 8, [
				"class",
				"title",
				"description"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	agentItem: "_agentItem_dyher_1",
	createIcon: "_createIcon_dyher_8"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/ViewItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ViewItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ViewItem",
	props: {
		view: {},
		showActionArrow: {
			type: Boolean,
			default: true
		}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nNodeCreatorNode_default), {
				class: normalizeClass(_ctx.$style.view),
				title: __props.view.title,
				tag: __props.view.tag,
				"is-trigger": false,
				description: __props.view.description,
				"show-action-arrow": __props.showActionArrow
			}, {
				icon: withCtx(() => [createVNode(unref(N8nNodeIcon_default), {
					type: "icon",
					name: __props.view.icon,
					circle: false,
					"show-tooltip": false
				}, null, 8, ["name"])]),
				_: 1
			}, 8, [
				"class",
				"title",
				"tag",
				"description",
				"show-action-arrow"
			]);
		};
	}
}), [["__cssModules", { "$style": { view: "_view_1nn8u_1" } }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/LinkItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var LinkItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LinkItem",
	props: { link: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nNodeCreatorNode_default), {
				class: normalizeClass(_ctx.$style.creatorLink),
				title: __props.link.title,
				"is-trigger": false,
				description: __props.link.description,
				tag: __props.link.tag,
				"show-action-arrow": true
			}, {
				icon: withCtx(() => [createVNode(unref(N8nNodeIcon_default), {
					type: "icon",
					name: __props.link.icon,
					circle: false,
					"show-tooltip": false
				}, null, 8, ["name"])]),
				_: 1
			}, 8, [
				"class",
				"title",
				"description",
				"tag"
			]);
		};
	}
}), [["__cssModules", { "$style": { creatorLink: "_creatorLink_13l8d_1" } }]]);
//#endregion
//#region src/features/settings/communityNodes/components/nodeCreator/CommunityNodeInstallHint.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CommunityNodeInstallHint_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CommunityNodeInstallHint",
	props: { hint: {} },
	setup(__props) {
		const isAdminOrOwner = computed(() => useUsersStore().isAdminOrOwner);
		return (_ctx, _cache) => {
			return isAdminOrOwner.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.container)
			}, [createVNode(unref(N8nIcon_default), {
				color: "text-light",
				icon: "info",
				size: "large"
			}), createVNode(unref(N8nText_default), {
				color: "text-base",
				size: "medium"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.hint), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_ifr1t_1" } }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/CommunityNodeItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CommunityNodeItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CommunityNodeItem",
	props: { isPreview: { type: Boolean } },
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [__props.isPreview ? (openBlock(), createBlock(CommunityNodeInstallHint_default, {
				key: 0,
				hint: unref(i18n).baseText("communityNodeItem.node.hint")
			}, null, 8, ["hint"])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.marginLeft)
			}, [createVNode(unref(N8nButton_default), {
				variant: "outline",
				size: "medium",
				icon: "plus",
				label: unref(i18n).baseText("communityNodeItem.label"),
				outline: ""
			}, null, 8, ["label"])], 2))]);
		};
	}
}), [["__cssModules", { "$style": { marginLeft: "_marginLeft_1i3be_1" } }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/CategoryItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$5 = ["textContent"];
var CategoryItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CategoryItem",
	props: {
		expanded: {
			type: Boolean,
			default: true
		},
		active: { type: Boolean },
		count: {},
		name: {},
		isTrigger: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const categoryName = computed(() => {
			const itemsCount = props.count || 0;
			return itemsCount > 0 ? `${props.name} (${itemsCount})` : props.name;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", mergeProps({ class: _ctx.$style.categoryWrapper }, _ctx.$attrs, {
				"data-keyboard-nav": "true",
				"data-test-id": "node-creator-category-item"
			}), [createBaseVNode("div", { class: normalizeClass({
				[_ctx.$style.category]: true,
				[_ctx.$style.active]: __props.active
			}) }, [
				createBaseVNode("span", { class: normalizeClass(_ctx.$style.name) }, [
					createBaseVNode("span", { textContent: toDisplayString(categoryName.value) }, null, 8, _hoisted_1$5),
					__props.isTrigger ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						icon: "bolt-filled",
						size: "xsmall",
						class: normalizeClass(_ctx.$style.triggerIcon)
					}, null, 8, ["class"])) : createCommentVNode("", true),
					renderSlot(_ctx.$slots, "default")
				], 2),
				renderSlot(_ctx.$slots, "trailing"),
				__props.expanded ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					icon: "chevron-down",
					color: "text-light",
					size: "large"
				})) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "chevron-up",
					color: "text-light",
					size: "large"
				}))
			], 2)], 16);
		};
	}
}), [["__cssModules", { "$style": {
	triggerIcon: "_triggerIcon_cr08d_1",
	category: "_category_cr08d_6",
	active: "_active_cr08d_27",
	name: "_name_cr08d_31"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Renderers/CategorizedItemsRenderer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$4 = ["data-category-collapsed"];
var CategorizedItemsRenderer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CategorizedItemsRenderer",
	props: {
		elements: { default: () => [] },
		category: {},
		disabled: { type: Boolean },
		activeIndex: {},
		isTriggerCategory: { type: Boolean },
		mouseOverTooltip: {},
		expanded: { type: Boolean },
		showSeparator: { type: Boolean },
		hideHeader: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const { popViewStack, activeViewStack } = useViewStacks();
		const { registerKeyHook } = useKeyboardNavigation();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const nodeCreatorStore = useNodeCreatorStore();
		const i18n = useI18n();
		const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);
		const actionCount = computed(() => props.elements.filter(({ type }) => type === "action").length);
		const expanded = ref(props.expanded ?? false);
		const isPreview = computed(() => activeViewStack.communityNodeDetails && !activeViewStack.communityNodeDetails.installed);
		function toggleExpanded() {
			setExpanded(!expanded.value);
		}
		function setExpanded(isExpanded) {
			const prev = expanded.value;
			expanded.value = isExpanded;
			if (expanded.value && !prev) nodeCreatorStore.onCategoryExpanded({
				category_name: props.category,
				workflow_id: workflowDocumentStore.value.workflowId
			});
		}
		const $style = useCssModule();
		const containerClasses = computed(() => ({
			[$style.categorizedItemsRenderer]: true,
			[$style.separator]: expanded.value && props.showSeparator,
			[$style.headerless]: props.hideHeader
		}));
		function arrowRight() {
			if (expanded.value) return;
			setExpanded(true);
		}
		function arrowLeft() {
			if (!expanded.value) {
				popViewStack();
				return;
			}
			setExpanded(false);
		}
		watch(() => props.elements, () => {
			setExpanded(true);
		});
		registerKeyHook(`CategoryRight_${props.category}`, {
			keyboardKeys: ["ArrowRight"],
			condition: (type, activeItemId) => type === "category" && props.category === activeItemId,
			handler: arrowRight
		});
		registerKeyHook(`CategoryToggle_${props.category}`, {
			keyboardKeys: ["Enter"],
			condition: (type, activeItemId) => type === "category" && props.category === activeItemId,
			handler: toggleExpanded
		});
		registerKeyHook(`CategoryLeft_${props.category}`, {
			keyboardKeys: ["ArrowLeft"],
			condition: (type, activeItemId) => type === "category" && props.category === activeItemId,
			handler: arrowLeft
		});
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(containerClasses.value),
				"data-category-collapsed": !expanded.value
			}, [
				!__props.hideHeader ? (openBlock(), createBlock(CategoryItem_default, {
					key: 0,
					class: normalizeClass(unref($style).categoryItem),
					name: __props.category,
					disabled: __props.disabled,
					active: activeItemId.value === __props.category,
					count: actionCount.value,
					expanded: expanded.value,
					"is-trigger": __props.isTriggerCategory,
					"data-keyboard-nav-type": "category",
					"data-keyboard-nav-id": __props.category,
					onClick: toggleExpanded
				}, createSlots({
					default: withCtx(() => [__props.mouseOverTooltip ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(unref($style).mouseOverTooltip)
					}, [createVNode(unref(N8nTooltip_default), {
						placement: "top",
						"content-class": unref($style).tooltipPopper
					}, {
						content: withCtx(() => [withDirectives(createBaseVNode("div", null, null, 512), [[_directive_n8n_html, __props.mouseOverTooltip]])]),
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "circle-help",
							size: "small"
						})]),
						_: 1
					}, 8, ["content-class"])], 2)) : createCommentVNode("", true)]),
					_: 2
				}, [_ctx.$slots.trailing ? {
					name: "trailing",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "trailing")]),
					key: "0"
				} : void 0]), 1032, [
					"class",
					"name",
					"disabled",
					"active",
					"count",
					"expanded",
					"is-trigger",
					"data-keyboard-nav-id"
				])) : createCommentVNode("", true),
				expanded.value && actionCount.value > 0 && _ctx.$slots.default ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(unref($style).contentSlot)
				}, [renderSlot(_ctx.$slots, "default")], 2)) : createCommentVNode("", true),
				isPreview.value && expanded.value ? (openBlock(), createBlock(CommunityNodeInstallHint_default, {
					key: 2,
					hint: unref(i18n).baseText("communityNodeItem.actions.hint")
				}, null, 8, ["hint"])) : createCommentVNode("", true),
				expanded.value ? (openBlock(), createBlock(ItemsRenderer_default, mergeProps({ key: 3 }, _ctx.$attrs, {
					elements: __props.elements,
					"is-trigger": __props.isTriggerCategory,
					class: [{ [unref($style).preview]: isPreview.value }]
				}), {
					default: withCtx(() => [..._cache[0] || (_cache[0] = [])]),
					empty: withCtx(() => [renderSlot(_ctx.$slots, "empty", normalizeProps(guardReactiveProps({ elements: __props.elements })))]),
					_: 3
				}, 16, [
					"elements",
					"is-trigger",
					"class"
				])) : createCommentVNode("", true)
			], 10, _hoisted_1$4);
		};
	}
}), [["__cssModules", { "$style": {
	mouseOverTooltip: "_mouseOverTooltip_5j861_1",
	categorizedItemsRenderer: "_categorizedItemsRenderer_5j861_9",
	tooltipPopper: "_tooltipPopper_5j861_13",
	contentSlot: "_contentSlot_5j861_17",
	headerless: "_headerless_5j861_26",
	separator: "_separator_5j861_30",
	preview: "_preview_5j861_34"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/SectionHeaderCreditsTag.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var SectionHeaderCreditsTag_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SectionHeaderCreditsTag",
	setup(__props) {
		const aiGatewayStore = useAiGatewayStore();
		const i18n = useI18n();
		const text = computed(() => {
			const balance = aiGatewayStore.balance;
			if (balance === void 0) return void 0;
			return balance <= 0 ? i18n.baseText("aiGateway.wallet.noCredits") : i18n.baseText("aiGateway.wallet.balanceRemaining", { interpolate: { balance: `$${balance.toFixed(2)}` } });
		});
		onMounted(() => {
			aiGatewayStore.fetchWallet();
		});
		return (_ctx, _cache) => {
			return text.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.creditsBalance),
				"data-test-id": "node-creator-credits-balance"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(text.value), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { creditsBalance: "_creditsBalance_1bpqk_1" } }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/ItemTypes/OpenTemplateItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var OpenTemplateItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OpenTemplateItem",
	props: { openTemplate: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nNodeCreatorNode_default), {
				class: normalizeClass({
					[_ctx.$style.creatorOpenTemplate]: true,
					[_ctx.$style.compact]: __props.openTemplate.compact
				}),
				title: __props.openTemplate.title,
				description: __props.openTemplate.description,
				tag: __props.openTemplate.tag,
				"show-action-arrow": true,
				"is-trigger": false
			}, createSlots({ _: 2 }, [__props.openTemplate.icon ? {
				name: "icon",
				fn: withCtx(() => [createVNode(unref(N8nNodeIcon_default), {
					type: "icon",
					name: __props.openTemplate.icon,
					circle: false,
					"show-tooltip": false
				}, null, 8, ["name"])]),
				key: "0"
			} : void 0, __props.openTemplate.nodes ? {
				name: "extraDetails",
				fn: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.openTemplate.nodes, (node) => {
					return openBlock(), createBlock(NodeIcon_default, {
						key: node.name,
						"node-type": node,
						size: 16,
						"show-tooltip": true
					}, null, 8, ["node-type"]);
				}), 128))]),
				key: "1"
			} : void 0]), 1032, [
				"class",
				"title",
				"description",
				"tag"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	creatorOpenTemplate: "_creatorOpenTemplate_1tzxk_1",
	compact: "_compact_1tzxk_9"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Renderers/ItemsRenderer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = { key: 0 };
var _hoisted_2$2 = [
	"data-keyboard-nav-type",
	"data-keyboard-nav-id",
	"onClick"
];
var LAZY_LOAD_THRESHOLD = 20;
var LAZY_LOAD_ITEMS_PER_TICK = 5;
var ItemsRenderer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ItemsRenderer",
	props: {
		elements: { default: () => [] },
		activeIndex: {},
		disabled: { type: Boolean },
		lazyRender: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		"selected",
		"dragstart",
		"dragend"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const renderedItems = ref([]);
		const renderAnimationRequest = ref(0);
		const { activeViewStack } = useViewStacks();
		const activeItemId = computed(() => useKeyboardNavigation()?.activeItemId);
		const communityNode = computed(() => activeViewStack.mode === "community-node");
		const isPreview = computed(() => {
			return communityNode.value && !activeViewStack.communityNodeDetails?.installed;
		});
		const highlightActiveItem = computed(() => {
			if (activeViewStack.communityNodeDetails && !activeViewStack.communityNodeDetails.installed) return false;
			return true;
		});
		function renderItems() {
			if (props.elements.length <= LAZY_LOAD_THRESHOLD || !props.lazyRender) {
				renderedItems.value = props.elements;
				return;
			}
			if (renderedItems.value.length < props.elements.length) {
				renderedItems.value.push(...props.elements.slice(renderedItems.value.length, renderedItems.value.length + LAZY_LOAD_ITEMS_PER_TICK));
				renderAnimationRequest.value = window.requestAnimationFrame(renderItems);
			}
		}
		function wrappedEmit(event, element, $e) {
			if (props.disabled) return;
			switch (event) {
				case "dragstart": if ($e) {
					emit("dragstart", element, $e);
					break;
				}
				case "dragend": if ($e) {
					emit("dragend", element, $e);
					break;
				}
				case "selected":
					emit("selected", element, $e);
					break;
				default: emit(event, element, $e);
			}
		}
		function beforeEnter(el) {
			el.style.height = "0";
		}
		function enter(el) {
			el.style.height = `${el.scrollHeight}px`;
		}
		function beforeLeave(el) {
			el.style.height = `${el.scrollHeight}px`;
		}
		function leave(el) {
			el.style.height = "0";
		}
		onMounted(() => {
			renderItems();
		});
		onUnmounted(() => {
			window.cancelAnimationFrame(renderAnimationRequest.value);
			renderedItems.value = [];
		});
		watch(() => props.elements, () => {
			window.cancelAnimationFrame(renderAnimationRequest.value);
			renderedItems.value = [];
			renderItems();
		});
		return (_ctx, _cache) => {
			return __props.elements.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.itemsRenderer),
				name: "accordion",
				onBeforeEnter: beforeEnter,
				onEnter: enter,
				onBeforeLeave: beforeLeave,
				onLeave: leave
			}, [renderSlot(_ctx.$slots, "default"), (openBlock(true), createElementBlock(Fragment, null, renderList(__props.elements, (item, index) => {
				return openBlock(), createElementBlock("div", { key: item.uuid }, [renderedItems.value.includes(item) ? (openBlock(), createElementBlock("div", _hoisted_1$3, [item.type === "section" ? (openBlock(), createBlock(CategorizedItemsRenderer_default, {
					key: 0,
					elements: item.children,
					expanded: "",
					category: item.title,
					showSeparator: item.showSeparator,
					hideHeader: item.hideHeader,
					onSelected: _cache[0] || (_cache[0] = (child) => wrappedEmit("selected", child))
				}, createSlots({ _: 2 }, [item.trailing === "creditsBalance" ? {
					name: "trailing",
					fn: withCtx(() => [createVNode(SectionHeaderCreditsTag_default)]),
					key: "0"
				} : void 0]), 1032, [
					"elements",
					"category",
					"showSeparator",
					"hideHeader"
				])) : (openBlock(), createElementBlock("div", {
					key: 1,
					ref_for: true,
					ref: "iteratorItems",
					class: normalizeClass({
						clickable: !__props.disabled,
						[_ctx.$style.active]: activeItemId.value === item.uuid && highlightActiveItem.value,
						[_ctx.$style.iteratorItem]: !communityNode.value,
						[_ctx.$style.withSeparator]: item.type === "command" && index > 0 && !unref(activeViewStack).search,
						[_ctx.$style[item.type]]: true,
						[_ctx.$style.preview]: isPreview.value,
						[_ctx.$style.borderless]: item.type === "view" && item.properties.borderless === true
					}),
					"data-test-id": "item-iterator-item",
					"data-keyboard-nav-type": item.type !== "label" ? item.type : void 0,
					"data-keyboard-nav-id": item.uuid,
					onClick: ($event) => wrappedEmit("selected", item)
				}, [
					item.type === "label" ? (openBlock(), createBlock(LabelItem_default, {
						key: 0,
						item
					}, null, 8, ["item"])) : createCommentVNode("", true),
					item.type === "subcategory" ? (openBlock(), createBlock(SubcategoryItem_default, {
						key: 1,
						item: item.properties
					}, null, 8, ["item"])) : createCommentVNode("", true),
					communityNode.value ? (openBlock(), createBlock(CommunityNodeItem_default, {
						key: 2,
						"is-preview": isPreview.value
					}, null, 8, ["is-preview"])) : createCommentVNode("", true),
					item.type === "node" && !communityNode.value ? (openBlock(), createBlock(NodeItem_default, {
						key: 3,
						"node-type": item.properties,
						active: activeItemId.value === item.uuid,
						subcategory: item.subcategory
					}, null, 8, [
						"node-type",
						"active",
						"subcategory"
					])) : createCommentVNode("", true),
					item.type === "action" ? (openBlock(), createBlock(ActionItem_default, {
						key: 4,
						"node-type": item.properties,
						action: item.properties,
						active: true
					}, null, 8, ["node-type", "action"])) : createCommentVNode("", true),
					item.type === "agent" ? (openBlock(), createBlock(AgentItem_default, {
						key: 5,
						agent: item.properties
					}, null, 8, ["agent"])) : item.type === "view" || item.type === "command" ? (openBlock(), createBlock(ViewItem_default, {
						key: 6,
						view: item.properties,
						"show-action-arrow": item.type === "view",
						class: normalizeClass(_ctx.$style.viewItem)
					}, null, 8, [
						"view",
						"show-action-arrow",
						"class"
					])) : item.type === "link" ? (openBlock(), createBlock(LinkItem_default, {
						key: 7,
						link: item.properties,
						class: normalizeClass(_ctx.$style.linkItem)
					}, null, 8, ["link", "class"])) : item.type === "openTemplate" ? (openBlock(), createBlock(OpenTemplateItem_default, {
						key: 8,
						"open-template": item.properties,
						class: normalizeClass(_ctx.$style.linkItem)
					}, null, 8, ["open-template", "class"])) : createCommentVNode("", true)
				], 10, _hoisted_2$2))])) : (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 1,
					loading: true,
					rows: 1,
					variant: "p",
					class: normalizeClass(_ctx.$style.itemSkeleton)
				}, null, 8, ["class"]))]);
			}), 128))], 34)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.empty)
			}, [renderSlot(_ctx.$slots, "empty")], 2));
		};
	}
}), [["__cssModules", { "$style": {
	itemSkeleton: "_itemSkeleton_wkjhu_1",
	iteratorItem: "_iteratorItem_wkjhu_5",
	label: "_label_wkjhu_17",
	category: "_category_wkjhu_17",
	active: "_active_wkjhu_20",
	empty: "_empty_wkjhu_24",
	itemsRenderer: "_itemsRenderer_wkjhu_28",
	view: "_view_wkjhu_37",
	withSeparator: "_withSeparator_wkjhu_38",
	link: "_link_wkjhu_58",
	borderless: "_borderless_wkjhu_76",
	preview: "_preview_wkjhu_86"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/OrderSwitcher.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/shared/nodeCreator/components/OrderSwitcher.vue
var OrderSwitcher_default = /* @__PURE__ */ defineComponent({
	__name: "OrderSwitcher",
	props: { rootView: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [__props.rootView === unref("Regular") ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [renderSlot(_ctx.$slots, "actions"), renderSlot(_ctx.$slots, "triggers")], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [renderSlot(_ctx.$slots, "triggers"), renderSlot(_ctx.$slots, "actions")], 64))]);
		};
	}
});
//#endregion
//#region src/features/settings/communityNodes/components/nodeCreator/CommunityNodeInfo.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = { key: 2 };
var _hoisted_2$1 = { key: 3 };
var CommunityNodeInfo_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CommunityNodeInfo",
	setup(__props) {
		const { activeViewStack } = useViewStacks();
		const { communityNodeDetails } = activeViewStack;
		const publisherName = ref(void 0);
		const downloads = ref(null);
		const verified = ref(false);
		const official = ref(false);
		const packageName = computed(() => communityNodeDetails?.packageName);
		const nodeTypeName = computed(() => communityNodeDetails?.key);
		const { installedPackage, initInstalledPackage, canUpdatePackage, hasUpdateAvailable } = useInstalledCommunityPackage(nodeTypeName);
		const { getQuickConnectOptionByPackageName } = useQuickConnect();
		const quickConnect = computed(() => {
			const pkg = packageName.value;
			return pkg ? getQuickConnectOptionByPackageName(pkg) : void 0;
		});
		const { promotionText } = useGatewayCreditsPromotion({ nodeType: nodeTypeName });
		const nodeTypesStore = useNodeTypesStore();
		const usersStore = useUsersStore();
		const isAdminOrOwner = computed(() => usersStore.isAdminOrOwner);
		const formatNumber = (number) => {
			if (!number) return null;
			return new Intl.NumberFormat("en-US").format(number);
		};
		async function fetchPackageInfo(packageName) {
			const communityNodeAttributes = await nodeTypesStore.getCommunityNodeAttributes(activeViewStack.communityNodeDetails?.key || "");
			let packageInfo = installedPackage.value;
			if (communityNodeDetails?.installed && !packageInfo) packageInfo = await initInstalledPackage();
			if (communityNodeAttributes) {
				publisherName.value = communityNodeAttributes.companyName ?? communityNodeAttributes.authorName;
				downloads.value = formatNumber(communityNodeAttributes.numberOfDownloads);
				official.value = communityNodeAttributes.isOfficialNode;
				if (!packageInfo) verified.value = true;
				else {
					const verifiedVersions = communityNodeAttributes.nodeVersions?.map((v) => v.npmVersion) ?? [];
					verified.value = verifiedVersions.includes(packageInfo.installedVersion);
				}
				return;
			}
			const url = `https://registry.npmjs.org/${packageName}`;
			try {
				const response = await fetch(url);
				if (!response.ok) {
					captureException(/* @__PURE__ */ new Error("Could not get metadata for package"), { extra: { packageName } });
					return;
				}
				const publisher = (await response.json()).maintainers?.[0]?.name;
				publisherName.value = publisher;
				const downloadsUrl = `https://api.npmjs.org/downloads/range/2022-01-01:${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}/${packageName}`;
				const downloadsResponse = await fetch(downloadsUrl);
				if (!downloadsResponse.ok) {
					captureException(/* @__PURE__ */ new Error("Could not get downloads for package"), { extra: { packageName } });
					return;
				}
				const downloadsData = await downloadsResponse.json();
				if (!downloadsData.downloads?.length) return;
				const total = downloadsData.downloads.reduce((sum, day) => sum + day.downloads, 0);
				downloads.value = formatNumber(total);
			} catch (error) {
				captureException(error, { extra: { packageName } });
			}
		}
		onMounted(async () => {
			if (communityNodeDetails?.packageName) await fetchPackageInfo(communityNodeDetails.packageName);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.description),
					color: "text-base",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(communityNodeDetails)?.description), 1)]),
					_: 1
				}, 8, ["class"]),
				unref(canUpdatePackage) && unref(hasUpdateAvailable) ? (openBlock(), createBlock(CommunityNodeUpdateInfo_default, {
					key: 0,
					"data-test-id": "update-available",
					"package-name": unref(communityNodeDetails)?.packageName,
					source: "node creator panel"
				}, null, 8, ["package-name"])) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.separator)
				}, null, 2)),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.info) }, [
					verified.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(official.value ? unref(i18n).baseText("communityNodeInfo.officialApproved") : unref(i18n).baseText("communityNodeInfo.approved")), 1)]),
						default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.tooltipIcon),
							icon: "shield-half"
						}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
							color: "text-light",
							size: "xsmall",
							bold: "",
							"data-test-id": "verified-tag"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeInfo.approved.label")), 1)]),
							_: 1
						})])]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeInfo.unverified")), 1)]),
						default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.tooltipIcon),
							icon: "box"
						}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
							color: "text-light",
							size: "xsmall",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeInfo.unverified.label")), 1)]),
							_: 1
						})])]),
						_: 1
					})),
					downloads.value ? (openBlock(), createElementBlock("div", _hoisted_1$2, [createVNode(unref(N8nIcon_default), {
						class: normalizeClass(_ctx.$style.tooltipIcon),
						icon: "hard-drive-download"
					}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
						color: "text-light",
						size: "xsmall",
						bold: "",
						"data-test-id": "number-of-downloads"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeInfo.downloads", { interpolate: { downloads: downloads.value } })), 1)]),
						_: 1
					})])) : createCommentVNode("", true),
					publisherName.value ? (openBlock(), createElementBlock("div", _hoisted_2$1, [createVNode(unref(N8nIcon_default), {
						class: normalizeClass(_ctx.$style.tooltipIcon),
						icon: "user"
					}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
						color: "text-light",
						size: "xsmall",
						bold: "",
						"data-test-id": "publisher-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeInfo.publishedBy", { interpolate: { publisherName: publisherName.value } })), 1)]),
						_: 1
					})])) : createCommentVNode("", true),
					quickConnect.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 4,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeInfo.quickConnect.tooltip")), 1)]),
						default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.tooltipIcon),
							icon: "quick-connect"
						}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
							color: "text-light",
							size: "xsmall",
							bold: "",
							"data-test-id": "quick-connect-tag"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeInfo.quickConnect")), 1)]),
							_: 1
						})])]),
						_: 1
					})) : createCommentVNode("", true)
				], 2),
				quickConnect.value ? (openBlock(), createBlock(QuickConnectBanner_default, {
					key: 2,
					text: quickConnect.value?.text,
					disclaimer: quickConnect.value?.disclaimer
				}, null, 8, ["text", "disclaimer"])) : createCommentVNode("", true),
				unref(promotionText) ? (openBlock(), createBlock(GatewayCreditsPromotion_default, {
					key: 3,
					text: unref(promotionText),
					class: normalizeClass(_ctx.$style.gatewayCreditsPromotion)
				}, null, 8, ["text", "class"])) : createCommentVNode("", true),
				!isAdminOrOwner.value && !unref(communityNodeDetails)?.installed ? (openBlock(), createBlock(ContactAdministratorToInstall_default, { key: 4 })) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_o1ugb_1",
	nodeIcon: "_nodeIcon_o1ugb_10",
	description: "_description_o1ugb_15",
	gatewayCreditsPromotion: "_gatewayCreditsPromotion_o1ugb_19",
	separator: "_separator_o1ugb_23",
	info: "_info_o1ugb_29",
	tooltipIcon: "_tooltipIcon_o1ugb_44",
	contactOwnerHint: "_contactOwnerHint_o1ugb_50"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Modes/ActionsMode.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var ActionsMode_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ActionsMode",
	emits: ["nodeTypeSelected"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const usersStore = useUsersStore();
		const { popViewStack, updateCurrentViewStack } = useViewStacks();
		const { registerKeyHook } = useKeyboardNavigation();
		const { setAddedNodeActionParameters, getActionData, actionDataToNodeTypeSelectedPayload, getPlaceholderTriggerActions, parseCategoryActions, actionsCategoryLocales } = useActions();
		const nodeCreatorStore = useNodeCreatorStore();
		const nodeTypesStore = useNodeTypesStore();
		const { openSampleWorkflowTemplate } = useCalloutHelpers();
		const parsedTriggerActions = computed(() => parseActions(actions.value, actionsCategoryLocales.value.triggers, false));
		const parsedActionActions = computed(() => parseActions(actions.value, actionsCategoryLocales.value.actions, !search.value));
		const parsedTriggerActionsBaseline = computed(() => parseActions(useViewStacks().activeViewStack.baselineItems || [], actionsCategoryLocales.value.triggers, false));
		const parsedActionActionsBaseline = computed(() => parseActions(useViewStacks().activeViewStack.baselineItems || [], actionsCategoryLocales.value.actions, !search.value));
		const triggerCategoryName = computed(() => parsedTriggerActions.value.length || search.value ? actionsCategoryLocales.value.triggers : `${actionsCategoryLocales.value.triggers} (${placeholderTriggerActions.length})`);
		const actions = computed(() => {
			return (useViewStacks().activeViewStack.items || []).filter((p) => p.properties.actionKey !== CUSTOM_API_CALL_KEY);
		});
		const search = computed(() => useViewStacks().activeViewStack.search);
		const subcategory = computed(() => useViewStacks().activeViewStack.subcategory);
		const rootView = computed(() => useViewStacks().activeViewStack.rootView);
		const communityNodeDetails = computed(() => useViewStacks().activeViewStack?.communityNodeDetails);
		const placeholderTriggerActions = getPlaceholderTriggerActions(subcategory.value || "");
		const { getQuickConnectOptionByPackageName } = useQuickConnect();
		const quickConnect = computed(() => {
			const items = useViewStacks().activeViewStack.items;
			if (!communityNodeDetails.value && items?.length) return getQuickConnectOptionByPackageName(items[0].key);
			return null;
		});
		const { promotionText } = useGatewayCreditsPromotion({ nodeType: () => {
			const items = useViewStacks().activeViewStack.items;
			return !communityNodeDetails.value && items?.length ? items[0].key : void 0;
		} });
		const hasNoTriggerActions = computed(() => parseCategoryActions(useViewStacks().activeViewStack.baselineItems || [], actionsCategoryLocales.value.triggers, !search.value).length === 0);
		const containsAPIAction = computed(() => {
			return (useViewStacks().activeViewStack.baselineItems || []).some((p) => {
				return (p.properties.actionKey ?? "") === "__CUSTOM_API_CALL__";
			}) && !nodeTypesStore.isNodeTypeUnavailable("n8n-nodes-base.httpRequest");
		});
		const isTriggerRootView = computed(() => rootView.value === TRIGGER_NODE_CREATOR_VIEW);
		const shouldShowTriggers = computed(() => {
			if (communityNodeDetails.value && !parsedTriggerActions.value.length) return !isNodePreviewKey(useViewStacks().activeViewStack?.items?.[0].key) && isTriggerRootView.value;
			return isTriggerRootView.value || parsedTriggerActionsBaseline.value.length !== 0;
		});
		registerKeyHook("ActionsKeyRight", {
			keyboardKeys: ["ArrowRight", "Enter"],
			condition: (type) => type === "action",
			handler: onKeySelect
		});
		registerKeyHook("ActionsKeyLeft", {
			keyboardKeys: ["ArrowLeft"],
			condition: (type) => type === "action",
			handler: arrowLeft
		});
		function parseActions(base, locale, withLabels = false) {
			return parseCategoryActions(base, locale, withLabels);
		}
		function arrowLeft() {
			popViewStack();
		}
		function onKeySelect(activeItemId) {
			const activeAction = [...actions.value, ...placeholderTriggerActions].find((a) => a.uuid === activeItemId);
			if (activeAction) onSelected(activeAction);
		}
		function onSelected(actionCreateElement) {
			if (actionCreateElement.type === "openTemplate") openSampleWorkflowTemplate(actionCreateElement.properties.templateId, { telemetry: { source: "nodeCreator" } });
			if (actionCreateElement.type !== "action") return;
			const actionData = getActionData(actionCreateElement.properties);
			if (placeholderTriggerActions.some((p) => p.key === actionCreateElement.key) && isTriggerRootView.value) {
				const actionNode = actions.value[0]?.key;
				if (actionNode) emit("nodeTypeSelected", [{ type: actionData.key }, { type: actionNode }]);
			} else if (actionData?.key === "@n8n/n8n-nodes-langchain.openAi" && (actionData?.value)?.resource === "assistant" && (actionData?.value)?.operation === "message") emit("nodeTypeSelected", [{ type: OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE }]);
			else if (isNodePreviewKey(actionData?.key)) return;
			else {
				const payload = actionDataToNodeTypeSelectedPayload(actionData);
				emit("nodeTypeSelected", [payload]);
			}
			if (telemetry) setAddedNodeActionParameters(actionData, telemetry, rootView.value);
		}
		function trackActionsView() {
			const activeViewStack = useViewStacks().activeViewStack;
			const trigger_action_count = (activeViewStack.baselineItems || [])?.filter((action) => action.key.toLowerCase().includes("trigger")).length;
			const trackingPayload = {
				app_identifier: [...actions.value, ...placeholderTriggerActions][0].key,
				actions: (activeViewStack.baselineItems || [])?.map((action) => action.properties.displayName),
				regular_action_count: (activeViewStack.baselineItems || [])?.length - trigger_action_count,
				trigger_action_count
			};
			useExternalHooks().run("nodeCreateList.onViewActions", trackingPayload);
			nodeCreatorStore.onViewActions(trackingPayload);
		}
		function resetSearch() {
			updateCurrentViewStack({ search: "" });
		}
		function addHttpNode() {
			const updateData = {
				name: "",
				key: HTTP_REQUEST_NODE_TYPE,
				value: { authentication: "predefinedCredentialType" }
			};
			emit("nodeTypeSelected", [{ type: HTTP_REQUEST_NODE_TYPE }]);
			if (telemetry) setAddedNodeActionParameters(updateData);
			const app_identifier = actions.value[0]?.key;
			if (!app_identifier) return;
			useExternalHooks().run("nodeCreateList.onActionsCustmAPIClicked", { app_identifier });
			nodeCreatorStore.onActionsCustomAPIClicked({ app_identifier });
		}
		onMounted(() => {
			trackActionsView();
		});
		const callouts = computed(() => []);
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createElementBlock("div", { class: normalizeClass({
				[_ctx.$style.container]: true,
				[_ctx.$style.containerPaddingBottom]: !communityNodeDetails.value
			}) }, [
				createVNode(ItemsRenderer_default, {
					elements: callouts.value,
					class: normalizeClass(_ctx.$style.items),
					onSelected
				}, null, 8, ["elements", "class"]),
				communityNodeDetails.value ? (openBlock(), createBlock(CommunityNodeInfo_default, { key: 0 })) : createCommentVNode("", true),
				quickConnect.value || unref(promotionText) ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.banner)
				}, [quickConnect.value ? (openBlock(), createBlock(QuickConnectBanner_default, {
					key: 0,
					text: quickConnect.value.text,
					disclaimer: quickConnect.value.disclaimer
				}, null, 8, ["text", "disclaimer"])) : createCommentVNode("", true), unref(promotionText) ? (openBlock(), createBlock(GatewayCreditsPromotion_default, {
					key: 1,
					text: unref(promotionText)
				}, null, 8, ["text"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
				rootView.value ? (openBlock(), createBlock(OrderSwitcher_default, {
					key: 2,
					"root-view": rootView.value
				}, createSlots({ _: 2 }, [shouldShowTriggers.value ? {
					name: "triggers",
					fn: withCtx(() => [withMemo([search.value], () => createVNode(CategorizedItemsRenderer_default, {
						elements: parsedTriggerActions.value,
						category: triggerCategoryName.value,
						"mouse-over-tooltip": unref(i18n).baseText("nodeCreator.actionsTooltip.triggersStartWorkflow"),
						"is-trigger-category": "",
						expanded: isTriggerRootView.value || parsedActionActions.value.length === 0,
						onSelected
					}, createSlots({ _: 2 }, [hasNoTriggerActions.value ? {
						name: "empty",
						fn: withCtx(() => [hasNoTriggerActions.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "info",
							iconless: "",
							slim: "",
							"data-test-id": "actions-panel-no-triggers-callout"
						}, {
							default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("nodeCreator.actionsCallout.noTriggerItems", { interpolate: { nodeName: subcategory.value ?? "" } })]])]),
							_: 1
						})) : createCommentVNode("", true), createVNode(ItemsRenderer_default, {
							elements: unref(placeholderTriggerActions),
							onSelected
						}, null, 8, ["elements"])]),
						key: "0"
					} : {
						name: "empty",
						fn: withCtx(() => [withDirectives(createBaseVNode("p", {
							class: normalizeClass(_ctx.$style.resetSearch),
							onClick: resetSearch
						}, null, 2), [[_directive_n8n_html, unref(i18n).baseText("nodeCreator.actionsCategory.noMatchingTriggers")]])]),
						key: "1"
					}]), 1032, [
						"elements",
						"category",
						"mouse-over-tooltip",
						"expanded"
					]), _cache, 0)]),
					key: "0"
				} : void 0, !isTriggerRootView.value || parsedActionActionsBaseline.value.length !== 0 ? {
					name: "actions",
					fn: withCtx(() => [withMemo([search.value], () => createVNode(CategorizedItemsRenderer_default, {
						elements: parsedActionActions.value,
						category: unref(actionsCategoryLocales).actions,
						"mouse-over-tooltip": unref(i18n).baseText("nodeCreator.actionsTooltip.actionsPerformStep"),
						expanded: !isTriggerRootView.value || parsedTriggerActions.value.length === 0,
						onSelected
					}, {
						empty: withCtx(() => [!search.value ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
							key: 0,
							theme: "info",
							type: "note",
							class: normalizeClass(_ctx.$style.actionsEmpty)
						}, {
							default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("nodeCreator.actionsCallout.noActionItems", { interpolate: { nodeName: subcategory.value ?? "" } })]])]),
							_: 1
						}, 8, ["class"])) : withDirectives((openBlock(), createElementBlock("p", {
							key: 1,
							class: normalizeClass(_ctx.$style.resetSearch),
							"data-test-id": "actions-panel-no-matching-actions",
							onClick: resetSearch
						}, null, 2)), [[_directive_n8n_html, unref(i18n).baseText("nodeCreator.actionsCategory.noMatchingActions")]])]),
						default: withCtx(() => [!unref(usersStore).userActivated && isTriggerRootView.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "info",
							iconless: "",
							slim: "",
							"data-test-id": "actions-panel-activation-callout"
						}, {
							default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("nodeCreator.actionsCallout.triggersStartWorkflow")]])]),
							_: 1
						})) : createCommentVNode("", true)]),
						_: 1
					}, 8, [
						"elements",
						"category",
						"mouse-over-tooltip",
						"expanded"
					]), _cache, 1)]),
					key: "1"
				} : void 0]), 1032, ["root-view"])) : createCommentVNode("", true),
				containsAPIAction.value && !communityNodeDetails.value ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.apiHint)
				}, [withDirectives(createBaseVNode("span", { onClick: withModifiers(addHttpNode, ["prevent"]) }, null, 512), [[_directive_n8n_html, unref(i18n).baseText("nodeCreator.actionsList.apiCall", { interpolate: { node: subcategory.value ?? "" } })]])], 2)) : createCommentVNode("", true),
				communityNodeDetails.value ? (openBlock(), createBlock(CommunityNodeFooter_default, {
					key: 4,
					class: normalizeClass(_ctx.$style.communityNodeFooter),
					"package-name": communityNodeDetails.value.packageName,
					"node-type-name": communityNodeDetails.value.key,
					"show-manage": communityNodeDetails.value.installed && unref(usersStore).isAdminOrOwner
				}, null, 8, [
					"class",
					"package-name",
					"node-type-name",
					"show-manage"
				])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1cear_1",
	containerPaddingBottom: "_containerPaddingBottom_1cear_7",
	communityNodeFooter: "_communityNodeFooter_1cear_11",
	resetSearch: "_resetSearch_1cear_15",
	actionsEmpty: "_actionsEmpty_1cear_29",
	apiHint: "_apiHint_1cear_37",
	banner: "_banner_1cear_45"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Modes/AgentsMode.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentsMode_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentsMode",
	emits: ["nodeTypeSelected"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const { debounce } = useDebounce();
		const { popViewStack, updateCurrentViewStack } = useViewStacks();
		const { registerKeyHook } = useKeyboardNavigation();
		const { setAddedNodeActionParameters, shouldPrependChatTrigger } = useActions();
		const nodeCreatorStore = useNodeCreatorStore();
		const uiStore = useUIStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const projectId = useAgentScopeProjectId();
		const { resolveProjectName } = useAgentProjectNameResolver();
		const { agentsResources, isLoadingResources, loadError, hasMoreAgentsToLoad, onSearchFilter, loadMore, setAgentsResources } = useAgentResourcesLocator(projectId, resolveProjectName);
		const search = computed(() => useViewStacks().activeViewStack.search ?? "");
		const debouncedSearchFilter = debounce((term) => {
			onSearchFilter(term);
		}, {
			debounceTime: getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
			trailing: true
		});
		watch(search, (term) => debouncedSearchFilter(term));
		const { isFeatureEnabled: isInlineAgentsEnabled } = useInlineAgentsExperiment();
		const staticElements = computed(() => {
			if (!isInlineAgentsEnabled.value) return [];
			return [{
				key: "agent-create-new",
				uuid: "agent-create-new",
				type: "agent",
				properties: {
					name: i18n.baseText("nodeCreator.agentsPanel.createNewAgent"),
					description: i18n.baseText("nodeCreator.agentsPanel.createNewAgentDescription"),
					variant: "create"
				}
			}, {
				key: i18n.baseText("nodeCreator.agentsPanel.existingAgentsLabel"),
				uuid: "agents-divider",
				type: "label",
				subcategory: "",
				properties: { key: i18n.baseText("nodeCreator.agentsPanel.existingAgentsLabel") }
			}];
		});
		const agentElements = computed(() => agentsResources.value.map((agent) => ({
			key: agent.value,
			uuid: `agent-${agent.value}`,
			type: "agent",
			properties: {
				name: agent.name,
				variant: "existing",
				agentId: agent.value,
				personalisation: agent.personalisation
			}
		})));
		const showEmptyState = computed(() => !isLoadingResources.value && !loadError.value && agentElements.value.length === 0);
		const showLoadingSkeleton = computed(() => isLoadingResources.value && agentElements.value.length === 0);
		const loadMoreSentinel = ref(null);
		const observerRoot = ref(null);
		const { observe: observeForLoadMore } = useIntersectionObserver({
			root: observerRoot,
			onIntersect: () => {
				loadMore();
			}
		});
		watch([
			loadMoreSentinel,
			hasMoreAgentsToLoad,
			() => agentElements.value.length
		], ([sentinel, canLoadMore]) => {
			if (sentinel && canLoadMore) observeForLoadMore(sentinel);
		}, { immediate: true });
		function chatInputMessagePreset() {
			const willAutoAddChatTrigger = shouldPrependChatTrigger([{ type: MESSAGE_AN_AGENT_NODE_TYPE }]);
			const connectsToChatTrigger = (uiStore.lastInteractedWithNodeId ? workflowDocumentStore.value.getNodeById(uiStore.lastInteractedWithNodeId) : void 0)?.type === CHAT_TRIGGER_NODE_TYPE;
			return willAutoAddChatTrigger || connectsToChatTrigger ? { message: "={{ $json.chatInput }}" } : {};
		}
		function onSelected(element) {
			if (element.type !== "agent") return;
			const messagePreset = chatInputMessagePreset();
			emit("nodeTypeSelected", [{ type: MESSAGE_AN_AGENT_NODE_TYPE }]);
			if (element.properties.variant === "create") {
				setAddedNodeActionParameters({
					name: element.properties.name,
					key: MESSAGE_AN_AGENT_NODE_TYPE,
					value: {
						agentSource: "inline",
						...messagePreset
					}
				});
				nodeCreatorStore.onAgentPanelOptionSelected({ choice: "create_new" });
				return;
			}
			setAddedNodeActionParameters({
				name: element.properties.name,
				key: MESSAGE_AN_AGENT_NODE_TYPE,
				value: {
					agentSource: "referenced",
					agentId: {
						__rl: true,
						mode: "list",
						value: element.properties.agentId ?? "",
						cachedResultName: element.properties.name
					},
					...messagePreset
				}
			});
			nodeCreatorStore.onAgentPanelOptionSelected({ choice: "existing_agent" });
		}
		function onKeySelect(activeItemId) {
			const element = [...staticElements.value, ...agentElements.value].find((item) => item.uuid === activeItemId);
			if (element) onSelected(element);
		}
		registerKeyHook("AgentsModeSelect", {
			keyboardKeys: ["ArrowRight", "Enter"],
			condition: (type) => type === "agent",
			handler: onKeySelect
		});
		registerKeyHook("AgentsModeLeft", {
			keyboardKeys: ["ArrowLeft"],
			condition: (type) => type === "agent",
			handler: () => popViewStack()
		});
		function resetSearch() {
			updateCurrentViewStack({ search: "" });
		}
		onMounted(() => {
			setAgentsResources();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "node-creator-agents-panel"
			}, [createVNode(ItemsRenderer_default, {
				elements: staticElements.value,
				onSelected
			}, null, 8, ["elements"]), showLoadingSkeleton.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.state),
				loading: true,
				rows: 3,
				variant: "p"
			}, null, 8, ["class"])) : unref(loadError) && agentElements.value.length === 0 ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.state),
				"data-test-id": "agents-panel-load-error"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeCreator.agentsPanel.loadError")), 1)]),
				_: 1
			}), createVNode(unref(N8nLink_default), {
				size: "small",
				onClick: unref(setAgentsResources)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
				_: 1
			}, 8, ["onClick"])], 2)) : showEmptyState.value ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.state),
				"data-test-id": "agents-panel-empty"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(search.value ? unref(i18n).baseText("nodeCreator.agentsPanel.noMatchingAgents") : unref(i18n).baseText("nodeCreator.agentsPanel.empty")), 1)]),
				_: 1
			}), search.value ? (openBlock(), createBlock(unref(N8nLink_default), {
				key: 0,
				size: "small",
				onClick: resetSearch
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.clear")), 1)]),
				_: 1
			})) : createCommentVNode("", true)], 2)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [createVNode(ItemsRenderer_default, {
				elements: agentElements.value,
				onSelected
			}, null, 8, ["elements"]), unref(loadError) ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.state),
				"data-test-id": "agents-panel-load-more-error"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeCreator.agentsPanel.loadError")), 1)]),
				_: 1
			}), createVNode(unref(N8nLink_default), {
				size: "small",
				onClick: unref(setAgentsResources)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
				_: 1
			}, 8, ["onClick"])], 2)) : unref(hasMoreAgentsToLoad) && !unref(isLoadingResources) ? (openBlock(), createElementBlock("div", {
				key: 1,
				ref_key: "loadMoreSentinel",
				ref: loadMoreSentinel,
				class: normalizeClass(_ctx.$style.sentinel),
				"data-test-id": "agents-panel-load-more"
			}, [createVNode(unref(N8nLoading_default), {
				loading: true,
				rows: 1,
				variant: "p"
			})], 2)) : createCommentVNode("", true)], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_rh57o_1",
	state: "_state_rh57o_7",
	sentinel: "_sentinel_rh57o_14"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Panel/NoResults.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var NoResults_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NoResults",
	props: {
		query: {},
		rootView: { default: void 0 },
		suggestHttpRequest: {
			type: Boolean,
			default: true
		},
		suggestWebhook: {
			type: Boolean,
			default: true
		}
	},
	emits: ["addHttpNode", "addWebhookNode"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const showWebhook = computed(() => props.suggestWebhook && props.rootView === "Trigger");
		const showHttpRequest = computed(() => props.suggestHttpRequest && (props.rootView === "Regular" || props.rootView === "Trigger"));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.noResults),
				"data-test-id": "node-creator-no-results"
			}, [createBaseVNode("p", { class: normalizeClass(_ctx.$style.title) }, toDisplayString(unref(i18n).baseText("nodeCreator.noResults.noResultsFor", { interpolate: { query: __props.query } })), 3), showWebhook.value || showHttpRequest.value ? (openBlock(), createElementBlock("p", {
				key: 0,
				class: normalizeClass(_ctx.$style.action)
			}, [
				createTextVNode(toDisplayString(unref(i18n).baseText("nodeCreator.noResults.connectUsingSuggestedNode")) + " ", 1),
				showWebhook.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nLink_default), {
					size: "small",
					theme: "text",
					underline: "",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("addWebhookNode"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeCreator.noResults.webhook")), 1)]),
					_: 1
				}), showHttpRequest.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(` ${unref(i18n).baseText("nodeCreator.noResults.or")} `), 1)], 64)) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
				showHttpRequest.value ? (openBlock(), createBlock(unref(N8nLink_default), {
					key: 1,
					size: "small",
					theme: "text",
					underline: "",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("addHttpNode"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeCreator.noResults.httpRequest")), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				createTextVNode(" " + toDisplayString(unref(i18n).baseText("nodeCreator.noResults.node")), 1)
			], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	noResults: "_noResults_1m42b_1",
	action: "_action_1m42b_19",
	title: "_title_1m42b_23"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Modes/NodesMode.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var NodesMode_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodesMode",
	emits: ["nodeTypeSelected", "emptyGroupSelected"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const { isRagStarterCalloutVisible, openSampleWorkflowTemplate } = useCalloutHelpers();
		const nodeCreatorStore = useNodeCreatorStore();
		const { mergedNodes, onSubcategorySelected } = nodeCreatorStore;
		const { pushViewStack, popViewStack, isAiSubcategoryView, isHitlSubcategoryView, getFilteredActions, subcategoryStack, viewStackByKey } = useViewStacks();
		const { setAddedNodeActionParameters, nodeCreateElementToNodeTypeSelectedPayload } = useActions();
		const emptyCanvasGroupsEnabled = useEmptyCanvasGroupsFlag();
		const { registerKeyHook } = useKeyboardNavigation();
		const activeViewStack = computed(() => useViewStacks().activeViewStack);
		const shouldHideEmptyGroupCommand = computed(() => !emptyCanvasGroupsEnabled.value || nodeCreatorStore.openingContext === "replacement");
		const visibleItems = computed(() => {
			const items = activeViewStack.value.items ?? [];
			if (!shouldHideEmptyGroupCommand.value) return items;
			return items.filter((item) => item.key !== ADD_EMPTY_GROUP_NODE_CREATOR_ITEM);
		});
		const isMcpCategory = computed(() => activeViewStack.value.subcategory === AI_CATEGORY_MCP_NODES);
		const globalSearchItemsDiff = computed(() => useViewStacks().globalSearchItemsDiff);
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const nodeTypesStore = useNodeTypesStore();
		const communityNodesAndActions = computed(() => nodeTypesStore.communityNodesAndActions);
		const moreFromCommunity = computed(() => {
			const hits = filterAndSearchNodes(communityNodesAndActions.value.mergedNodes, activeViewStack.value.search ?? "", {
				isAiSubcategory: isAiSubcategoryView(activeViewStack.value),
				isHitlSubcategory: isHitlSubcategoryView(activeViewStack.value),
				aiConnectionType: activeViewStack.value.connectionType
			});
			return sinkRestrictedNodesLast(hits, isNodeItemRestricted);
		});
		const isSearchResultEmpty = computed(() => {
			return !visibleItems.value.some((item) => !isMcpCategory.value || item.key !== "@n8n/n8n-nodes-langchain.mcpClientTool" || isNodeItemRestricted(item.key)) && globalCallouts.value.length + globalSearchItemsDiff.value.length + moreFromCommunity.value.length === 0;
		});
		const showSuggestionFooter = computed(() => isMcpCategory.value || isSearchResultEmpty.value);
		function onSelected(item) {
			if (item.key === "add-empty-group" && shouldHideEmptyGroupCommand.value) return;
			if (item.type === "node" && isNodeItemRestricted(item.key)) return;
			if (item.type === "subcategory") {
				pushViewStack(subcategoryStack(item, activeViewStack.value.rootView));
				onSubcategorySelected({ subcategory: item.key });
			}
			if (item.type === "node") {
				const payload = nodeCreateElementToNodeTypeSelectedPayload(item);
				let nodeActions = getFilteredActions(activeViewStack.value, item, nodeCreatorStore.actions);
				const notInstalledCommunityNode = isCommunityPackageName(item.key) && !nodeTypesStore.getIsNodeInstalled(item.key);
				const nodeIcon = getNodeIconSource(item.properties, null, workflowDocumentStore?.value?.getExpressionHandler() ?? null);
				if (item.key === "n8n-nodes-base.messageAnAgent") {
					pushViewStack({
						title: item.properties.displayName,
						nodeIcon,
						rootView: activeViewStack.value.rootView,
						hasSearch: true,
						mode: "agents",
						items: []
					});
					return;
				}
				if (shouldShowCommunityNodeDetails(isCommunityPackageName(item.key), activeViewStack.value) || notInstalledCommunityNode) {
					if (!nodeActions.length) nodeActions = getFilteredActions(activeViewStack.value, item, communityNodesAndActions.value.actions);
					const viewStack = prepareCommunityNodeDetailsViewStack(item, nodeIcon, activeViewStack.value.rootView, nodeActions);
					pushViewStack(viewStack);
					return;
				}
				if (nodeActions.length === 1) {
					emit("nodeTypeSelected", [payload]);
					setAddedNodeActionParameters({
						name: nodeActions[0].defaults.name ?? item.properties.displayName,
						key: item.key,
						value: nodeActions[0].values
					});
					return;
				}
				if (nodeActions.length === 0 || activeViewStack.value.hideActions) {
					emit("nodeTypeSelected", [payload]);
					return;
				}
				const transformedActions = nodeActions?.map((a) => transformNodeType(a, item.properties.displayName, "action"));
				pushViewStack({
					subcategory: item.properties.displayName,
					title: item.properties.displayName,
					nodeIcon,
					rootView: activeViewStack.value.rootView,
					hasSearch: true,
					mode: "actions",
					items: transformedActions
				});
			}
			if (item.type === "command") {
				if (item.key === "add-empty-group") emit("emptyGroupSelected");
				return;
			}
			if (item.type === "view") {
				const stack = viewStackByKey(item.key);
				if (!stack) {
					console.warn(`No view found for ${item.key}`);
					return;
				}
				pushViewStack(stack);
			}
			if (item.type === "link") window.open(item.properties.url, "_blank");
			if (item.type === "openTemplate") openSampleWorkflowTemplate(item.properties.templateId, { telemetry: { source: "nodeCreator" } });
		}
		const globalCallouts = computed(() => [...getRootSearchCallouts(activeViewStack.value.search ?? "", { isRagStarterCalloutVisible: isRagStarterCalloutVisible.value }, mergedNodes)]);
		function arrowLeft() {
			popViewStack();
		}
		function onKeySelect(activeItemId) {
			const item = flattenCreateElements([
				...globalCallouts.value ?? [],
				...visibleItems.value,
				...globalSearchItemsDiff.value ?? [],
				...moreFromCommunity.value ?? []
			]).find((i) => i.uuid === activeItemId);
			if (!item) return;
			onSelected(item);
		}
		registerKeyHook("MainViewArrowRight", {
			keyboardKeys: ["ArrowRight", "Enter"],
			condition: (type) => [
				"subcategory",
				"node",
				"link",
				"view",
				"openTemplate",
				"command"
			].includes(type),
			handler: onKeySelect
		});
		registerKeyHook("MainViewArrowLeft", {
			keyboardKeys: ["ArrowLeft"],
			condition: (type) => [
				"subcategory",
				"node",
				"link",
				"view",
				"openTemplate"
			].includes(type),
			handler: arrowLeft
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", { class: normalizeClass({ [_ctx.$style.withSuggestionFooter]: showSuggestionFooter.value }) }, [
				globalCallouts.value.length > 0 ? (openBlock(), createBlock(ItemsRenderer_default, {
					key: 0,
					elements: globalCallouts.value,
					class: normalizeClass(_ctx.$style.items),
					onSelected
				}, null, 8, ["elements", "class"])) : createCommentVNode("", true),
				withMemo([activeViewStack.value.search, unref(emptyCanvasGroupsEnabled)], () => createVNode(ItemsRenderer_default, {
					elements: visibleItems.value,
					class: normalizeClass([_ctx.$style.items, { [_ctx.$style.emptyItems]: isSearchResultEmpty.value && !isMcpCategory.value }]),
					onSelected
				}, createSlots({ _: 2 }, [isSearchResultEmpty.value ? {
					name: "empty",
					fn: withCtx(() => [createVNode(NoResults_default, {
						query: activeViewStack.value.search ?? "",
						"root-view": activeViewStack.value.rootView,
						"suggest-webhook": !unref(isNodeItemRestricted)(unref("n8n-nodes-base.webhook")) && !unref(nodeTypesStore).isNodeTypeUnavailable(unref("n8n-nodes-base.webhook")),
						"suggest-http-request": !unref(isNodeItemRestricted)(unref("n8n-nodes-base.httpRequest")) && !unref(nodeTypesStore).isNodeTypeUnavailable(unref("n8n-nodes-base.httpRequest")),
						onAddWebhookNode: _cache[0] || (_cache[0] = ($event) => emit("nodeTypeSelected", [{ type: unref("n8n-nodes-base.webhook") }])),
						onAddHttpNode: _cache[1] || (_cache[1] = ($event) => emit("nodeTypeSelected", [{ type: unref("n8n-nodes-base.httpRequest") }]))
					}, null, 8, [
						"query",
						"root-view",
						"suggest-webhook",
						"suggest-http-request"
					])]),
					key: "0"
				} : void 0]), 1032, ["elements", "class"]), _cache, 2),
				isMcpCategory.value && isSearchResultEmpty.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.mcpNoResults)
				}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeCreator.noResults.noResultsFor", { interpolate: { query: activeViewStack.value.search ?? "" } })), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				globalSearchItemsDiff.value.length > 0 ? (openBlock(), createBlock(CategorizedItemsRenderer_default, {
					key: 2,
					elements: globalSearchItemsDiff.value,
					category: unref(i18n).baseText("nodeCreator.categoryNames.otherCategories"),
					expanded: true,
					onSelected
				}, null, 8, ["elements", "category"])) : createCommentVNode("", true),
				moreFromCommunity.value.length > 0 ? (openBlock(), createBlock(CategorizedItemsRenderer_default, {
					key: 3,
					elements: moreFromCommunity.value,
					category: unref(i18n).baseText("nodeCreator.categoryNames.moreFromCommunity"),
					expanded: true,
					onSelected
				}, null, 8, ["elements", "category"])) : createCommentVNode("", true),
				isMcpCategory.value ? (openBlock(), createBlock(McpRegistrySuggestionFooter_default, {
					key: 4,
					prompt: unref(i18n).baseText("nodeCreator.noResults.needAnotherCapability"),
					action: unref(i18n).baseText("nodeCreator.noResults.suggestTool"),
					class: normalizeClass(_ctx.$style.suggestionFooter)
				}, null, 8, [
					"prompt",
					"action",
					"class"
				])) : showSuggestionFooter.value ? (openBlock(), createBlock(SuggestionFooter_default, {
					key: 5,
					prompt: unref(i18n).baseText("nodeCreator.noResults.needNativeIntegration"),
					action: unref(i18n).baseText("nodeCreator.noResults.suggestNode"),
					url: unref(REQUEST_NODE_FORM_URL),
					class: normalizeClass([_ctx.$style.suggestionFooter, _ctx.$style.insetSuggestionFooter])
				}, null, 8, [
					"prompt",
					"action",
					"url",
					"class"
				])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	items: "_items_19bs3_1",
	withSuggestionFooter: "_withSuggestionFooter_19bs3_5",
	emptyItems: "_emptyItems_19bs3_13",
	mcpNoResults: "_mcpNoResults_19bs3_19",
	suggestionFooter: "_suggestionFooter_19bs3_26",
	insetSuggestionFooter: "_insetSuggestionFooter_19bs3_30"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Panel/SearchBar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["placeholder", "value"];
var SearchBar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SearchBar",
	props: {
		placeholder: { default: "" },
		modelValue: { default: "" }
	},
	emits: ["update:modelValue"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		const state = reactive({ inputRef: null });
		const externalHooks = useExternalHooks();
		function focus() {
			state.inputRef?.focus();
		}
		function onInput(event) {
			const input = event.target;
			emit("update:modelValue", input.value.trim());
		}
		function clear() {
			emit("update:modelValue", "");
		}
		onMounted(() => {
			externalHooks.run("nodeCreatorSearchBar.mount", { inputRef: state.inputRef });
			setTimeout(focus, 0);
		});
		onBeforeUnmount(() => {
			state.inputRef?.remove();
		});
		const { inputRef } = toRefs(state);
		__expose({ focus });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.searchContainer),
				"data-test-id": "search-bar"
			}, [
				createBaseVNode("div", { class: normalizeClass({
					[_ctx.$style.prefix]: true,
					[_ctx.$style.active]: __props.modelValue.length > 0
				}) }, [createVNode(unref(N8nIcon_default), {
					icon: "search",
					size: "small"
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.text) }, [createBaseVNode("input", {
					ref_key: "inputRef",
					ref: inputRef,
					placeholder: __props.placeholder,
					value: __props.modelValue,
					class: normalizeClass(_ctx.$style.input),
					autofocus: "",
					"data-test-id": "node-creator-search-bar",
					tabindex: "0",
					onInput
				}, null, 42, _hoisted_1$1)], 2),
				__props.modelValue.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.suffix, _ctx.$style.clickable]),
					onClick: clear
				}, [createVNode(unref(N8nIcon_default), {
					size: "small",
					icon: "circle-x"
				})], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	searchContainer: "_searchContainer_rv6ce_1",
	prefix: "_prefix_rv6ce_17",
	active: "_active_rv6ce_22",
	text: "_text_rv6ce_26",
	suffix: "_suffix_rv6ce_42",
	clear: "_clear_rv6ce_48",
	clickable: "_clickable_rv6ce_61"
} }]]);
//#endregion
//#region src/features/settings/communityNodes/components/nodeCreator/CommunityNodeDetails.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CommunityNodeDetails_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CommunityNodeDetails",
	setup(__props) {
		const { activeViewStack, pushViewStack, popViewStack, getAllNodeCreateElements, updateCurrentViewStack } = useViewStacks();
		const { communityNodeDetails } = activeViewStack;
		const packageName = computed(() => activeViewStack.communityNodeDetails?.packageName);
		const { getQuickConnectOptionByPackageName } = useQuickConnect();
		const quickConnect = computed(() => {
			const pkg = packageName.value;
			return pkg ? getQuickConnectOptionByPackageName(pkg) : void 0;
		});
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const nodeCreatorStore = useNodeCreatorStore();
		const { installNode, loading } = useInstallNode();
		const isAdminOrOwner = computed(() => useUsersStore().isAdminOrOwner);
		const updateViewStack = (key) => {
			const installedNodeKey = removePreviewToken(key);
			const installedNode = getAllNodeCreateElements().find((node) => node.key === installedNodeKey);
			if (installedNode) {
				const nodeActions = nodeCreatorStore.actions?.[installedNode.key] || [];
				popViewStack();
				updateCurrentViewStack({ searchItems: getNodeCreatorSearchItems(nodeCreatorStore.mergedNodes, activeViewStack.searchItems ?? []) });
				const viewStack = prepareCommunityNodeDetailsViewStack(installedNode, getNodeIconSource(installedNode.properties, null, workflowDocumentStore?.value?.getExpressionHandler() ?? null), activeViewStack.rootView, nodeActions);
				pushViewStack(viewStack, { transitionDirection: "none" });
			} else {
				const viewStack = { ...activeViewStack };
				viewStack.communityNodeDetails.installed = true;
				pushViewStack(activeViewStack, { resetStacks: true });
			}
		};
		const updateStoresAndViewStack = (key) => {
			updateViewStack(key);
			nodeCreatorStore.removeNodeFromMergedNodes(key);
		};
		const onInstall = async () => {
			if (isAdminOrOwner.value && activeViewStack.communityNodeDetails && !communityNodeDetails?.installed) {
				const { key, packageName } = activeViewStack.communityNodeDetails;
				if ((await installNode({
					type: "verified",
					packageName,
					nodeType: key,
					telemetry: {
						source: "cnr package detail page",
						hasQuickConnect: quickConnect.value !== void 0
					}
				})).success) updateStoresAndViewStack(key);
			}
		};
		return (_ctx, _cache) => {
			return unref(communityNodeDetails) ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.container)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.title) }, [
				unref(communityNodeDetails).nodeIcon ? (openBlock(), createBlock(NodeIcon_default, {
					key: 0,
					class: normalizeClass(_ctx.$style.nodeIcon),
					"icon-source": unref(communityNodeDetails).nodeIcon,
					circle: false,
					"show-tooltip": false
				}, null, 8, ["class", "icon-source"])) : createCommentVNode("", true),
				createBaseVNode("span", null, toDisplayString(unref(communityNodeDetails).title), 1),
				unref(communityNodeDetails).official ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					placement: "bottom",
					"show-after": 500
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.officialNode.tooltip", { interpolate: { author: unref(communityNodeDetails).companyName ?? unref(communityNodeDetails).title } })), 1)]),
					default: withCtx(() => [createVNode(unref(verified_default), { class: normalizeClass(_ctx.$style.officialIcon) }, null, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true)
			], 2), createBaseVNode("div", null, [unref(communityNodeDetails).installed ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.installed)
			}, [!unref(communityNodeDetails).official ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.installedIcon),
				icon: "box"
			}, null, 8, ["class"])) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
				color: "text-light",
				size: "small",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodeDetails.installed")), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true), isAdminOrOwner.value && !unref(communityNodeDetails).installed ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 1,
				loading: unref(loading),
				disabled: unref(loading),
				label: unref(i18n).baseText("communityNodeDetails.install"),
				size: "small",
				"data-test-id": "install-community-node-button",
				onClick: onInstall
			}, null, 8, [
				"loading",
				"disabled",
				"label"
			])) : createCommentVNode("", true)])], 2)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_hyqqa_1",
	header: "_header_hyqqa_9",
	title: "_title_hyqqa_16",
	nodeIcon: "_nodeIcon_hyqqa_24",
	installedIcon: "_installedIcon_hyqqa_29",
	officialIcon: "_officialIcon_hyqqa_35",
	installed: "_installed_hyqqa_29"
} }]]);
//#endregion
//#region src/features/settings/communityNodes/components/nodeCreator/CommunityNodeDocsLink.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CommunityNodeDocsLink_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CommunityNodeDocsLink",
	props: { packageName: {} },
	setup(__props) {
		const props = __props;
		const openCommunityNodeDocsPage = () => {
			const newTab = window.open(`https://www.npmjs.com/package/${props.packageName}`, "_blank");
			if (newTab) newTab.opener = null;
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nLink_default), {
				theme: "text",
				class: normalizeClass(_ctx.$style.container),
				title: unref(i18n).baseText("communityNodesDocsLink.link.title"),
				onClick: openCommunityNodeDocsPage
			}, {
				default: withCtx(() => [createVNode(unref(N8nText_default), {
					size: "small",
					bold: "",
					style: { "margin-right": "5px" }
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityNodesDocsLink.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nIcon_default), { icon: "external-link" })]),
				_: 1
			}, 8, ["class", "title"]);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_mwl8p_1" } }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/Panel/NodesListPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["textContent"];
var _hoisted_2 = ["textContent"];
var NodesListPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodesListPanel",
	setup(__props) {
		const i18n = useI18n();
		const { callDebounced, debounce } = useDebounce();
		const { mergedNodes } = useNodeCreatorStore();
		const { pushViewStack, popViewStack, updateCurrentViewStack, viewStack } = useViewStacks();
		const { setActiveItemIndex, attachKeydownEvent, detachKeydownEvent } = useKeyboardNavigation();
		const nodeCreatorStore = useNodeCreatorStore();
		const uiStore = useUIStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const { isAdminOrOwner } = useUsersStore();
		const isAddingInsideGroup = computed(() => {
			if (!isNodeCreatorOpenFromConnection(nodeCreatorStore.openSource)) return false;
			const sourceNodeId = uiStore.lastInteractedWithNodeId;
			return sourceNodeId !== void 0 && workflowDocumentStore.value.getGroupForNode(sourceNodeId) !== void 0;
		});
		const activeViewStack = computed(() => useViewStacks().activeViewStack);
		const communityNodeDetails = computed(() => activeViewStack.value.communityNodeDetails);
		const viewStacks = computed(() => useViewStacks().viewStacks);
		const isActionsMode = computed(() => useViewStacks().activeViewStackMode === "actions");
		const isAgentsMode = computed(() => useViewStacks().activeViewStackMode === "agents");
		const searchPlaceholder = computed(() => {
			let node = activeViewStack.value?.title;
			if (communityNodeDetails.value) node = communityNodeDetails.value.title;
			if (isActionsMode.value) return i18n.baseText("nodeCreator.actionsCategory.searchActions", { interpolate: { node } });
			if (isAgentsMode.value) return i18n.baseText("nodeCreator.agentsPanel.searchPlaceholder");
			return i18n.baseText("nodeCreator.searchBar.searchNodes");
		});
		const showSearchBar = computed(() => {
			if (activeViewStack.value.communityNodeDetails) return false;
			return activeViewStack.value.hasSearch;
		});
		const nodeCreatorView = computed(() => useNodeCreatorStore().selectedView);
		const isCommunityNodeActionsMode = computed(() => {
			return communityNodeDetails.value && isActionsMode.value && activeViewStack.value.subcategory;
		});
		const viewStackTitle = computed(() => {
			if (nodeCreatorStore.openingContext === "replacement") return i18n.baseText("nodeCreator.replaceNode.title");
			return activeViewStack.value.title;
		});
		function getDefaultActiveIndex(search = "") {
			if (activeViewStack.value.mode === "actions") return 1;
			else if (activeViewStack.value.sections) return search ? 0 : 1;
			return 0;
		}
		function applySearch(value) {
			if (!activeViewStack.value.uuid) return;
			if (activeViewStack.value.search === value) return;
			updateCurrentViewStack({ search: value });
			setActiveItemIndex(getDefaultActiveIndex(value));
			if (value.length) callDebounced(nodeCreatorStore.onNodeFilterChanged, {
				trailing: true,
				debounceTime: 2e3
			}, {
				newValue: value,
				filteredNodes: activeViewStack.value.items ?? [],
				filterMode: activeViewStack.value.rootView ?? "Regular",
				subcategory: activeViewStack.value.subcategory,
				title: activeViewStack.value.title
			});
		}
		const debouncedApplySearch = debounce((value, scheduledForViewUuid) => {
			if (activeViewStack.value.uuid !== scheduledForViewUuid) return;
			applySearch(value);
		}, {
			trailing: true,
			debounceTime: DEBOUNCE_TIME.INPUT.SEARCH
		});
		function onSearch(value) {
			if (value === "") {
				debouncedApplySearch.cancel();
				applySearch(value);
				return;
			}
			debouncedApplySearch(value, activeViewStack.value.uuid);
		}
		function flushPendingSearchOnNavigation(event) {
			if ([
				"Enter",
				"ArrowDown",
				"ArrowUp"
			].includes(event.key)) debouncedApplySearch.flush();
		}
		function onTransitionEnd() {
			if (viewStacks.value.length === 0) cleanupopeningContext();
			setActiveItemIndex(getDefaultActiveIndex());
		}
		function cleanupopeningContext() {
			nodeCreatorStore.openingContext = null;
			nodeCreatorStore.isReplacingFromSetupPanel = false;
		}
		onMounted(() => {
			document.addEventListener("keydown", flushPendingSearchOnNavigation, { capture: true });
			attachKeydownEvent();
			setActiveItemIndex(getDefaultActiveIndex());
		});
		onUnmounted(() => {
			document.removeEventListener("keydown", flushPendingSearchOnNavigation, { capture: true });
			cleanupopeningContext();
			detachKeydownEvent();
		});
		watch(() => nodeCreatorView.value, (selectedView) => {
			const additionalOptions = { [HUMAN_IN_THE_LOOP_CATEGORY]: { hasSearch: false } };
			const view = NODE_CREATOR_VIEWS[selectedView](mergedNodes);
			const items = isAddingInsideGroup.value ? view.items.filter((item) => item.key !== ADD_EMPTY_GROUP_NODE_CREATOR_ITEM) : view.items;
			pushViewStack({
				...viewStack({
					...view,
					items
				}, selectedView),
				...additionalOptions[selectedView]
			});
			const pending = nodeCreatorStore.consumePendingInitialViewStack();
			if (pending) pushViewStack(pending);
		}, { immediate: true });
		function onBackButton() {
			popViewStack();
		}
		return (_ctx, _cache) => {
			return viewStacks.value.length > 0 ? (openBlock(), createBlock(Transition, {
				key: 0,
				name: `panel-slide-${activeViewStack.value.transitionDirection}`,
				onAfterLeave: onTransitionEnd
			}, {
				default: withCtx(() => [(openBlock(), createElementBlock("aside", {
					key: `${activeViewStack.value.uuid}`,
					class: normalizeClass([_ctx.$style.nodesListPanel, activeViewStack.value.panelClass]),
					onKeydownCapture: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
				}, [
					createBaseVNode("header", {
						class: normalizeClass({
							[_ctx.$style.header]: true,
							[_ctx.$style.hasBg]: !activeViewStack.value.subtitle,
							"nodes-list-panel-header": true
						}),
						"data-test-id": "nodes-list-header"
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.top) }, [
						viewStacks.value.length > 1 && !activeViewStack.value.preventBack ? (openBlock(), createElementBlock("button", {
							key: 0,
							class: normalizeClass(_ctx.$style.backButton),
							onClick: onBackButton
						}, [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.backButtonIcon),
							icon: "arrow-left",
							size: "large"
						}, null, 8, ["class"])], 2)) : createCommentVNode("", true),
						activeViewStack.value.nodeIcon ? (openBlock(), createBlock(NodeIcon_default, {
							key: 1,
							class: normalizeClass(_ctx.$style.nodeIcon),
							"icon-source": activeViewStack.value.nodeIcon,
							circle: false,
							"show-tooltip": false,
							size: unref(getNodeIconSize)("nodeList", activeViewStack.value.nodeIcon?.type === "icon" ? activeViewStack.value.nodeIcon.name : void 0)
						}, null, 8, [
							"class",
							"icon-source",
							"size"
						])) : createCommentVNode("", true),
						activeViewStack.value.title ? (openBlock(), createElementBlock("p", {
							key: 2,
							class: normalizeClass(_ctx.$style.title),
							textContent: toDisplayString(viewStackTitle.value)
						}, null, 10, _hoisted_1)) : createCommentVNode("", true),
						communityNodeDetails.value ? (openBlock(), createBlock(CommunityNodeDocsLink_default, {
							key: 3,
							"package-name": communityNodeDetails.value.packageName
						}, null, 8, ["package-name"])) : createCommentVNode("", true)
					], 2), activeViewStack.value.subtitle ? (openBlock(), createElementBlock("p", {
						key: 0,
						class: normalizeClass({
							[_ctx.$style.subtitle]: true,
							[_ctx.$style.offsetSubtitle]: viewStacks.value.length > 1
						}),
						textContent: toDisplayString(activeViewStack.value.subtitle)
					}, null, 10, _hoisted_2)) : createCommentVNode("", true)], 2),
					showSearchBar.value ? (openBlock(), createBlock(SearchBar_default, {
						key: 0,
						class: normalizeClass(_ctx.$style.searchBar),
						placeholder: searchPlaceholder.value ? searchPlaceholder.value : unref(i18n).baseText("nodeCreator.searchBar.searchNodes"),
						"model-value": activeViewStack.value.search,
						"onUpdate:modelValue": onSearch
					}, null, 8, [
						"class",
						"placeholder",
						"model-value"
					])) : createCommentVNode("", true),
					communityNodeDetails.value ? (openBlock(), createBlock(CommunityNodeDetails_default, { key: 1 })) : createCommentVNode("", true),
					communityNodeDetails.value && !isActionsMode.value ? (openBlock(), createBlock(CommunityNodeInfo_default, { key: 2 })) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.renderedItems) }, [activeViewStack.value.info && !activeViewStack.value.search ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.info),
						content: activeViewStack.value.info,
						theme: "warning"
					}, null, 8, ["class", "content"])) : createCommentVNode("", true), isActionsMode.value && activeViewStack.value.subcategory ? (openBlock(), createBlock(ActionsMode_default, normalizeProps(mergeProps({ key: 1 }, _ctx.$attrs)), null, 16)) : isAgentsMode.value ? (openBlock(), createBlock(AgentsMode_default, normalizeProps(mergeProps({ key: 2 }, _ctx.$attrs)), null, 16)) : (openBlock(), createBlock(NodesMode_default, mergeProps({
						key: 3,
						"root-view": nodeCreatorView.value
					}, _ctx.$attrs), null, 16, ["root-view"]))], 2),
					communityNodeDetails.value && !isCommunityNodeActionsMode.value ? (openBlock(), createBlock(CommunityNodeFooter_default, {
						key: 3,
						"package-name": communityNodeDetails.value.packageName,
						"node-type-name": communityNodeDetails.value.key,
						"show-manage": communityNodeDetails.value.installed && unref(isAdminOrOwner)
					}, null, 8, [
						"package-name",
						"node-type-name",
						"show-manage"
					])) : createCommentVNode("", true)
				], 34))]),
				_: 1
			}, 8, ["name"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	info: "_info_1nzfj_23",
	backButton: "_backButton_1nzfj_27",
	backButtonIcon: "_backButtonIcon_1nzfj_36",
	nodeIcon: "_nodeIcon_1nzfj_41",
	renderedItems: "_renderedItems_1nzfj_47",
	searchBar: "_searchBar_1nzfj_59",
	nodesListPanel: "_nodesListPanel_1nzfj_63",
	footer: "_footer_1nzfj_81",
	top: "_top_1nzfj_92",
	header: "_header_1nzfj_97",
	hasBg: "_hasBg_1nzfj_103",
	title: "_title_1nzfj_108",
	subtitle: "_subtitle_1nzfj_119",
	offsetSubtitle: "_offsetSubtitle_1nzfj_127"
} }]]);
//#endregion
//#region src/features/shared/nodeCreator/components/NodeCreator.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var NodeCreator_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeCreator",
	props: {
		active: { type: Boolean },
		onNodeTypeSelected: { type: Function }
	},
	emits: [
		"closeNodeCreator",
		"nodeTypeSelected",
		"emptyGroupSelected"
	],
	setup(__props, { emit: __emit }) {
		const OUTSIDE_CLICK_WHITELIST = [".el-overlay-dialog", OVERLAY_LAYER_SELECTOR];
		const props = __props;
		const { resetViewStacks } = useViewStacks();
		const { registerKeyHook } = useKeyboardNavigation();
		const emit = __emit;
		const uiStore = useUIStore();
		const bannersStore = useBannersStore();
		const chatPanelStore = useChatPanelStore();
		const focusPanelStore = useFocusPanelStore();
		const settingsStore = useSettingsStore();
		const nodeCreatorStore = useNodeCreatorStore();
		const { setActions, setMergeNodes, consumePendingInitialViewStack } = nodeCreatorStore;
		const { generateMergedNodesAndActions } = useActionsGenerator();
		const state = reactive({
			nodeCreator: null,
			mousedownInsideEvent: null
		});
		const viewStacksLength = computed(() => useViewStacks().viewStacks.length);
		const embeddedCanvas = inject(EmbeddedCanvasElementKey, ref(null));
		const { top: embeddedCanvasTop } = useElementBounding(embeddedCanvas);
		const isBesideFocusPanel = computed(() => !embeddedCanvas.value && nodeCreatorStore.isReplacingFromSetupPanel && focusPanelStore.focusPanelActive);
		const nodeCreatorInlineStyle = computed(() => {
			const rightPosition = getRightOffset();
			return {
				top: `${getTopOffset()}px`,
				"--node-creator--right": `${rightPosition}px`
			};
		});
		function getTopOffset() {
			if (embeddedCanvas.value) return embeddedCanvasTop.value;
			return settingsStore.isCanvasOnly ? 0 : bannersStore.bannersHeight + uiStore.headerHeight;
		}
		function getRightOffset() {
			const chatOffset = chatPanelStore.isOpen ? chatPanelStore.width : 0;
			return isBesideFocusPanel.value ? chatOffset + focusPanelStore.focusPanelWidth : chatOffset;
		}
		function onMouseUpOutside() {
			if (state.mousedownInsideEvent) {
				const clickEvent = new MouseEvent("click", {
					bubbles: true,
					cancelable: true
				});
				state.mousedownInsideEvent.target?.dispatchEvent(clickEvent);
				state.mousedownInsideEvent = null;
				unBindOnMouseUpOutside();
			}
		}
		function unBindOnMouseUpOutside() {
			document.removeEventListener("mouseup", onMouseUpOutside);
			document.removeEventListener("touchstart", onMouseUpOutside);
		}
		function onMouseUp() {
			state.mousedownInsideEvent = null;
			unBindOnMouseUpOutside();
		}
		function onMouseDown(event) {
			state.mousedownInsideEvent = event;
			document.addEventListener("mouseup", onMouseUpOutside);
			document.addEventListener("touchstart", onMouseUpOutside);
		}
		function onDragOver(event) {
			event.preventDefault();
		}
		function onDrop(event) {
			if (!event.dataTransfer) return;
			const dragData = event.dataTransfer.getData(DRAG_EVENT_DATA_KEY);
			const nodeCreatorBoundingRect = state.nodeCreator.getBoundingClientRect();
			if (dragData && event.pageX >= nodeCreatorBoundingRect.x && event.pageY >= nodeCreatorBoundingRect.y) event.stopPropagation();
		}
		const { fetchConfig: fetchAiGatewayConfig } = useAiGateway();
		onMounted(() => {
			fetchAiGatewayConfig();
		});
		watch(() => props.active, (isActive) => {
			if (!isActive) {
				resetViewStacks();
				consumePendingInitialViewStack();
			}
		});
		watch(viewStacksLength, (value) => {
			if (value === 0) emit("closeNodeCreator");
		});
		registerKeyHook("NodeCreatorCloseEscape", {
			keyboardKeys: ["Escape"],
			handler: () => emit("closeNodeCreator")
		});
		watch(() => ({
			httpOnlyCredentials: useCredentialsStore().httpOnlyCredentialTypes,
			nodeTypes: useNodeTypesStore().visibleNodeTypes
		}), ({ nodeTypes, httpOnlyCredentials }) => {
			const { actions, mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);
			setActions(actions);
			setMergeNodes(mergedNodes);
		}, { immediate: true });
		const { nodeCreator } = toRefs(state);
		onBeforeUnmount(() => {
			unBindOnMouseUpOutside();
		});
		onClickOutside(nodeCreator, (event) => {
			if (event.target instanceof Element && event.target.closest(OUTSIDE_CLICK_WHITELIST.join(", "))) return;
			emit("closeNodeCreator");
		}, { ignore: OUTSIDE_CLICK_WHITELIST });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createBaseVNode("aside", { class: normalizeClass(_ctx.$style.nodeCreatorScrim) }, null, 2),
				__props.active ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					variant: "outline",
					class: normalizeClass(_ctx.$style.close),
					icon: "x",
					"aria-label": "Close Node Creator",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("closeNodeCreator"))
				}, null, 8, ["class"])) : createCommentVNode("", true),
				createVNode(SlideTransition_default, null, {
					default: withCtx(() => [__props.active ? (openBlock(), createElementBlock("div", {
						key: 0,
						ref_key: "nodeCreator",
						ref: nodeCreator,
						class: normalizeClass({
							[_ctx.$style.nodeCreator]: true,
							[_ctx.$style.besideFocusPanel]: isBesideFocusPanel.value
						}),
						style: normalizeStyle(nodeCreatorInlineStyle.value),
						"data-test-id": "node-creator",
						onDragover: onDragOver,
						onDrop,
						onMousedown: onMouseDown,
						onMouseup: onMouseUp
					}, [createVNode(NodesListPanel_default, {
						onNodeTypeSelected: __props.onNodeTypeSelected,
						onEmptyGroupSelected: _cache[1] || (_cache[1] = ($event) => emit("emptyGroupSelected"))
					}, null, 8, ["onNodeTypeSelected"])], 38)) : createCommentVNode("", true)]),
					_: 1
				})
			]);
		};
	}
}), [["__cssModules", { "$style": {
	nodeCreator: "_nodeCreator_rrkjp_5",
	besideFocusPanel: "_besideFocusPanel_rrkjp_16",
	nodeCreatorScrim: "_nodeCreatorScrim_rrkjp_20",
	active: "_active_rrkjp_32",
	close: "_close_rrkjp_36"
} }]]);
//#endregion
export { NodeCreator_default as default };
