import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Ef as watchEffect, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Kf as toRef, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xd as guardReactiveProps, Xf as unref, Xo as useRouter, Yo as useRoute, Zd as h, _p as normalizeClass, af as onBeforeMount, bd as I18nT, ff as openBlock, gf as resolveComponent, hf as renderSlot, ip as init_shared_esm_bundler, iu as ElOptionGroup, lf as onMounted, mf as renderList, of as onBeforeUnmount, ru as ElOption, vf as resolveDynamicComponent, vp as normalizeProps, zd as createBaseVNode, zf as reactive, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { Cd as useWorkflowHistoryStore, Cx as WORKFLOW_HISTORY_PUBLISH_MODAL_KEY, GS as EnterpriseEditionFeature, Jg as useUIStore, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Sx as WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY, Wp as useWorkflowsListStore, Xd as createWorkflowDocumentId, YM as N8nActionToggle_default, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, cO as pickVersionedSettings, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, hM as N8nLink_default, jM as createEventBus, jN as useI18n, nD as getResourcePermissions, nN as N8nBadge_default, p as telemetry, pM as N8nSelect_default, tN as N8nLoading_default, vN as N8nIconButton_default, wx as WORKFLOW_HISTORY_VERSION_UNPUBLISH, xN as N8nIcon_default, xx as WORKFLOW_HISTORY_DIFF_MODAL_KEY, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { n as getVersionLabel, t as generateVersionLabelFromId } from "./useWorkflowVersionLabel-cYv19BC7.js";
import { i as getPublishedVersionId, n as formatTimestamp, r as getLastPublishedVersion, t as computeTimelineEntries } from "./utils-BtEtrbw8.js";
import { t as useWorkflowActivate } from "./useWorkflowActivate-DR1rBXaN.js";
import { t as WorkflowDiffView_default } from "./WorkflowDiffView-BDT5YKXW.js";
import { t as require_omit } from "./omit-DpgS2zJe.js";
import { t as useIntersectionObserver } from "./useIntersectionObserver-BTGMngAL.js";
import "./useIntersectionObserver-CVH8U9lD.js";
import { t as formatPublicationDuration } from "./publicationHistoryUtils-CnuI4Tp_.js";
import { t as EngineBadge_default } from "./EngineBadge-BXn1soV3.js";
import { t as WorkflowPreviewHost_default } from "./WorkflowPreviewHost-Db8bVV7I.js";
//#region src/features/workflows/workflowHistory/components/WorkflowVersionStatusIndicator.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var WorkflowVersionStatusIndicator_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowVersionStatusIndicator",
	props: { status: { default: "default" } },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", { class: normalizeClass([_ctx.$style.indicator, _ctx.$style[`indicator-${__props.status}`]]) }, null, 2);
		};
	}
}), [["__cssModules", { "$style": {
	indicator: "_indicator_a6dzc_1",
	"indicator-published": "_indicator-published_a6dzc_9",
	"indicator-latest": "_indicator-latest_a6dzc_13",
	"indicator-default": "_indicator-default_a6dzc_17"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/components/usePublishedByDetails.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var usePublishedByDetails = (publishInfo) => {
	const i18n = useI18n();
	return computed(() => {
		const info = unref(publishInfo);
		if (!info) return "";
		const { date, time } = formatTimestamp(info.publishedAt);
		const publishedAt = i18n.baseText("workflowHistory.item.createdAt", { interpolate: {
			date,
			time
		} });
		return `${i18n.baseText("workflowHistory.item.publishedBy")} ${info.publishedBy ?? "Unknown"}, ${publishedAt}`;
	});
};
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowHistoryPublishedTooltip.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowHistoryPublishedTooltip_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistoryPublishedTooltip",
	props: {
		label: {},
		publishInfo: { default: void 0 },
		secondaryText: { default: void 0 },
		status: { default: "default" },
		placement: { default: "left" },
		offset: { default: 8 }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const publishedByDetails = usePublishedByDetails(toRef(props, "publishInfo"));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				placement: props.placement,
				"show-after": 300,
				offset: props.offset,
				"content-class": _ctx.$style.tooltipContent
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tooltipContentTitle) }, [createVNode(WorkflowVersionStatusIndicator_default, { status: props.status }, null, 8, ["status"]), createVNode(unref(N8nText_default), {
					size: "small",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.label) + " ", 1), props.status === "published" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(" (" + toDisplayString(unref(i18n).baseText("workflows.published")) + ") ", 1)], 64)) : createCommentVNode("", true)]),
					_: 1
				})], 2), createVNode(unref(N8nText_default), {
					size: "small",
					class: normalizeClass(_ctx.$style.tooltipSecondaryText)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.secondaryText ?? unref(publishedByDetails)), 1)]),
					_: 1
				}, 8, ["class"])]),
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"placement",
				"offset",
				"content-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	tooltipContentTitle: "_tooltipContentTitle_1w3z6_1",
	tooltipSecondaryText: "_tooltipSecondaryText_1w3z6_7",
	tooltipContent: "_tooltipContent_1w3z6_1"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowVersionEngineBadge.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowVersionEngineBadge.vue
var WorkflowVersionEngineBadge_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowVersionEngineBadge",
	props: {
		settings: {},
		size: {}
	},
	setup(__props) {
		const props = __props;
		const engine = computed(() => pickVersionedSettings(props.settings).engineType);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(EngineBadge_default, {
				engine: engine.value,
				size: props.size,
				"data-test-id": "workflow-history-engine-badge"
			}, null, 8, ["engine", "size"]);
		};
	}
});
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowHistoryListItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var WorkflowHistoryListItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistoryListItem",
	props: {
		item: {},
		index: {},
		compareWith: { default: null },
		actions: {},
		isSelected: {
			type: Boolean,
			default: false
		},
		isPublished: {
			type: Boolean,
			default: false
		},
		isGrouped: {
			type: Boolean,
			default: false
		},
		isPending: {
			type: Boolean,
			default: false
		},
		isWorkflowDiffsEnabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"action",
		"preview",
		"mounted",
		"compare"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const usersStore = useUsersStore();
		const actionsVisible = ref(false);
		const itemElement = ref(null);
		const formattedCreatedAt = computed(() => {
			const { date, time } = formatTimestamp(props.item.createdAt);
			return i18n.baseText("workflowHistory.item.createdAt", { interpolate: {
				date,
				time
			} });
		});
		const authorLabel = computed(() => {
			const allAuthors = props.item.authors.split(", ");
			let displayLabel = allAuthors[0];
			if (allAuthors.length > 1) displayLabel = `${displayLabel} + ${allAuthors.length - 1}`;
			return displayLabel;
		});
		const versionName = computed(() => {
			const currentVersionId = props.index === 0 ? props.item.versionId : void 0;
			return getVersionLabel({
				workflowHistory: props.item,
				currentVersionId
			});
		});
		const versionStatus = computed(() => {
			if (props.isPublished) return "published";
			return props.index === 0 ? "latest" : "default";
		});
		const getPublishedUserName = (userId) => {
			if (!userId) return null;
			const user = usersStore.usersById[userId];
			return user?.fullName ?? user?.email ?? null;
		};
		const wrapperProps = computed(() => {
			const lastPublishedVersion = getLastPublishedVersion(props.item.workflowPublishHistory);
			if (!lastPublishedVersion) return null;
			const publishedBy = getPublishedUserName(lastPublishedVersion.userId);
			return {
				label: versionName.value,
				status: versionStatus.value,
				publishInfo: {
					publishedBy,
					publishedAt: lastPublishedVersion.createdAt,
					isCurrentlyPublished: props.isPublished
				}
			};
		});
		const isCompareDisabled = computed(() => !props.compareWith?.versionId);
		const compareTooltipLines = computed(() => {
			if (!props.compareWith?.name) return null;
			const compareName = props.isSelected ? versionName.value : props.compareWith.name;
			const withName = props.isSelected ? props.compareWith.name : versionName.value;
			return {
				compareLine: i18n.baseText("workflowHistory.item.compareTooltip.compareLine", { interpolate: { name: compareName } }),
				withLine: i18n.baseText("workflowHistory.item.compareTooltip.withLine", { interpolate: { name: withName } })
			};
		});
		const onAction = (value) => {
			emit("action", {
				action: value,
				id: props.item.versionId,
				data: {
					formattedCreatedAt: formattedCreatedAt.value,
					versionName: versionName.value,
					description: props.item.description
				}
			});
		};
		const onVisibleChange = (visible) => {
			actionsVisible.value = visible;
		};
		const onItemClick = (event) => {
			emit("preview", {
				event,
				id: props.item.versionId
			});
		};
		const onCompareClick = () => {
			if (!props.compareWith?.versionId) return;
			emit("compare", { id: props.compareWith.versionId });
		};
		onMounted(() => {
			emit("mounted", {
				index: props.index,
				offsetTop: itemElement.value?.offsetTop ?? 0,
				isSelected: props.isSelected
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(wrapperProps.value ? WorkflowHistoryPublishedTooltip_default : "span"), normalizeProps(guardReactiveProps(wrapperProps.value ?? {})), {
				default: withCtx(() => [createBaseVNode("li", {
					ref_key: "itemElement",
					ref: itemElement,
					"data-test-id": "workflow-history-list-item",
					role: "button",
					class: normalizeClass({
						[_ctx.$style.item]: true,
						[_ctx.$style.selected]: props.isSelected,
						[_ctx.$style.actionsVisible]: actionsVisible.value,
						[_ctx.$style.grouped]: props.isGrouped,
						[_ctx.$style.firstItem]: props.index === 0
					}),
					onClick: onItemClick
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.timelineColumn) }, [!props.isGrouped ? (openBlock(), createBlock(WorkflowVersionStatusIndicator_default, {
					key: 0,
					status: versionStatus.value
				}, null, 8, ["status"])) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.wrapper) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.mainRow) }, [createVNode(unref(N8nText_default), {
						size: "small",
						bold: true,
						color: "text-dark",
						class: normalizeClass(_ctx.$style.mainLine)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(versionName.value) + " ", 1), props.isPublished ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(" (" + toDisplayString(unref(i18n).baseText("workflowHistory.item.active")) + ") ", 1)], 64)) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["class"]), createVNode(WorkflowVersionEngineBadge_default, { settings: props.item.settings }, null, 8, ["settings"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.metaRow) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base",
						class: normalizeClass(_ctx.$style.metaAuthor)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(authorLabel.value) + ", ", 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						tag: "time",
						size: "small",
						color: "text-base",
						class: normalizeClass(_ctx.$style.metaTime)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(formattedCreatedAt.value), 1)]),
						_: 1
					}, 8, ["class"])], 2)], 2),
					props.isWorkflowDiffsEnabled ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						disabled: isCompareDisabled.value,
						placement: "top",
						"content-class": _ctx.$style.compareTooltipContent
					}, createSlots({
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							icon: "file-diff",
							disabled: isCompareDisabled.value,
							class: normalizeClass(_ctx.$style.compareButton),
							"data-test-id": "workflow-history-compare-item-button",
							onClick: withModifiers(onCompareClick, ["stop"])
						}, null, 8, ["disabled", "class"])]),
						_: 2
					}, [compareTooltipLines.value ? {
						name: "content",
						fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.compareTooltip) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.compareTooltipLine) }, toDisplayString(compareTooltipLines.value.compareLine), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.compareTooltipLine) }, toDisplayString(compareTooltipLines.value.withLine), 3)], 2)]),
						key: "0"
					} : void 0]), 1032, ["disabled", "content-class"])) : createCommentVNode("", true),
					props.isPending ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.actions),
						onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
					}, [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "ellipsis-12",
						size: "small",
						"icon-size": "small",
						loading: "",
						"aria-label": unref(i18n).baseText("workflowHistory.content.actions"),
						"data-test-id": "workflow-history-list-item-pending"
					}, null, 8, ["aria-label"])], 2)) : (openBlock(), createBlock(unref(N8nActionToggle_default), {
						key: 2,
						class: normalizeClass(_ctx.$style.actions),
						actions: props.actions,
						placement: "bottom-end",
						onAction,
						onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"])),
						onVisibleChange
					}, null, 8, ["class", "actions"]))
				], 2)], 2)]),
				_: 1
			}, 16);
		};
	}
}), [["__cssModules", { "$style": {
	item: "_item_1988l_1",
	grouped: "_grouped_1988l_11",
	selected: "_selected_1988l_11",
	firstItem: "_firstItem_1988l_18",
	wrapper: "_wrapper_1988l_24",
	timelineColumn: "_timelineColumn_1988l_38",
	content: "_content_1988l_75",
	mainRow: "_mainRow_1988l_83",
	mainLine: "_mainLine_1988l_89",
	metaRow: "_metaRow_1988l_97",
	metaAuthor: "_metaAuthor_1988l_106",
	metaTime: "_metaTime_1988l_111",
	actions: "_actions_1988l_116",
	compareButton: "_compareButton_1988l_123",
	compareTooltip: "_compareTooltip_1988l_127",
	compareTooltipContent: "_compareTooltipContent_1988l_131",
	compareTooltipLine: "_compareTooltipLine_1988l_135"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowHistoryUpgradeFooter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$3 = { "data-test-id": "prune-time-display" };
var WorkflowHistoryUpgradeFooter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistoryUpgradeFooter",
	props: {
		pruneTimeDisplay: {},
		withTopBorder: {
			type: Boolean,
			default: false
		}
	},
	emits: ["upgrade"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.retention, { [_ctx.$style.withTopBorder]: props.withTopBorder }]) }, [createBaseVNode("span", _hoisted_1$3, toDisplayString(props.pruneTimeDisplay), 1), createVNode(unref(I18nT), {
				keypath: "workflowHistory.upgrade",
				tag: "span",
				scope: "global"
			}, {
				link: withCtx(() => [createBaseVNode("a", {
					href: "#",
					onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("upgrade"), ["prevent"]))
				}, toDisplayString(unref(i18n).baseText("workflowHistory.upgrade.link")), 1)]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	retention: "_retention_1wfct_1",
	withTopBorder: "_withTopBorder_1wfct_9"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowHistoryList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = ["aria-expanded", "onClick"];
var _hoisted_2 = ["aria-label"];
var _hoisted_3 = { key: 2 };
var WorkflowHistoryList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistoryList",
	props: {
		items: {},
		selectedItem: {},
		actions: {},
		requestNumberOfItems: {},
		lastReceivedItemsLength: {},
		evaluatedPruneTimeInHours: {},
		shouldUpgrade: { type: Boolean },
		isListLoading: { type: Boolean },
		publishedVersionId: {},
		pendingVersionId: {},
		isWorkflowDiffsEnabled: { type: Boolean }
	},
	emits: [
		"action",
		"preview",
		"loadMore",
		"upgrade",
		"compare"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const listElement = ref(null);
		const loadMoreSentinel = ref(null);
		const shouldAutoScroll = ref(true);
		const expandedGroups = reactive(/* @__PURE__ */ new Set());
		const timelineEntries = computed(() => {
			return computeTimelineEntries(props.items);
		});
		const toggleGroup = (groupId) => {
			if (expandedGroups.has(groupId)) expandedGroups.delete(groupId);
			else expandedGroups.add(groupId);
		};
		const hasMoreItems = computed(() => props.lastReceivedItemsLength === props.requestNumberOfItems);
		const { observe: observeForLoadMore } = useIntersectionObserver({
			root: listElement,
			threshold: .01,
			onIntersect: () => {
				shouldAutoScroll.value = false;
				emit("loadMore", {
					take: props.requestNumberOfItems,
					skip: props.items.length
				});
			}
		});
		watch([
			loadMoreSentinel,
			hasMoreItems,
			() => props.items.length
		], ([sentinel, canLoadMore]) => {
			if (sentinel && canLoadMore) observeForLoadMore(sentinel);
		}, { immediate: true });
		const getActions = (item, index) => {
			let filteredActions = props.actions;
			if (index === 0) filteredActions = filteredActions.filter((action) => action.value !== "restore");
			if (item.versionId === props.publishedVersionId) filteredActions = filteredActions.filter((action) => action.value !== "publish");
			else filteredActions = filteredActions.filter((action) => action.value !== "unpublish");
			return filteredActions;
		};
		const onAction = ({ action, id, data }) => {
			shouldAutoScroll.value = false;
			emit("action", {
				action,
				id,
				data
			});
		};
		const onPreview = ({ event, id }) => {
			shouldAutoScroll.value = false;
			emit("preview", {
				event,
				id
			});
		};
		const onCompare = ({ id }) => {
			shouldAutoScroll.value = false;
			emit("compare", { id });
		};
		const getHistoryVersionLabel = (workflowHistory) => {
			const currentVersionId = props.items[0]?.versionId;
			return getVersionLabel({
				workflowHistory,
				currentVersionId
			});
		};
		const getItemToCompareWith = (item, index) => {
			if (!props.isWorkflowDiffsEnabled) return null;
			if (!props.selectedItem) return null;
			if (props.items[index]?.versionId === props.selectedItem?.versionId) {
				const previousVersion = props.items[index + 1];
				if (!previousVersion) return null;
				return {
					name: getHistoryVersionLabel(previousVersion),
					versionId: previousVersion.versionId
				};
			}
			return {
				name: getHistoryVersionLabel(props.selectedItem),
				versionId: item.versionId
			};
		};
		const onItemMounted = ({ offsetTop, isSelected }) => {
			if (isSelected && shouldAutoScroll.value) {
				shouldAutoScroll.value = false;
				listElement.value?.scrollTo({
					top: offsetTop,
					behavior: "smooth"
				});
			}
		};
		const pruneTimeDisplay = computed(() => {
			const timeInHours = props.evaluatedPruneTimeInHours;
			if (timeInHours < 24) {
				const key = timeInHours === 1 ? "workflowHistory.limitHour" : "workflowHistory.limitHours";
				return i18n.baseText(key, { interpolate: { hours: String(timeInHours) } });
			} else {
				const days = Math.round(timeInHours / 24);
				const key = days === 1 ? "workflowHistory.limitDay" : "workflowHistory.limitDays";
				return i18n.baseText(key, { interpolate: { days: String(days) } });
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("ul", {
				ref_key: "listElement",
				ref: listElement,
				class: normalizeClass(_ctx.$style.list),
				"data-test-id": "workflow-history-list"
			}, [
				(openBlock(true), createElementBlock(Fragment, null, renderList(timelineEntries.value, (entry) => {
					return openBlock(), createElementBlock(Fragment, { key: entry.type === "version" ? entry.item.versionId : entry.groupId }, [
						entry.type === "group-header" ? (openBlock(), createElementBlock("li", {
							key: 0,
							class: normalizeClass(_ctx.$style.groupHeader),
							"aria-expanded": expandedGroups.has(entry.groupId),
							role: "button",
							"data-test-id": "workflow-history-group-header",
							onClick: ($event) => toggleGroup(entry.groupId)
						}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.groupTimelineColumn) }, [createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.groupChevron),
							icon: expandedGroups.has(entry.groupId) ? "chevron-down" : "chevron-right",
							size: "small"
						}, null, 8, ["class", "icon"])], 2), createVNode(unref(N8nText_default), {
							color: "text-base",
							size: "small",
							class: normalizeClass(_ctx.$style.groupLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowHistory.group.unnamedVersions", {
								adjustToNumber: entry.count,
								interpolate: { count: String(entry.count) }
							})), 1)]),
							_: 2
						}, 1032, ["class"])], 10, _hoisted_1$2)) : createCommentVNode("", true),
						entry.type === "group-header" && expandedGroups.has(entry.groupId) ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(entry.versions, (versionEntry) => {
							return openBlock(), createBlock(WorkflowHistoryListItem_default, {
								key: versionEntry.item.versionId,
								index: versionEntry.originalIndex,
								item: versionEntry.item,
								"compare-with": getItemToCompareWith(versionEntry.item, versionEntry.originalIndex),
								"is-selected": versionEntry.item.versionId === props.selectedItem?.versionId,
								"is-published": versionEntry.item.versionId === props.publishedVersionId,
								"is-pending": versionEntry.item.versionId === props.pendingVersionId,
								actions: getActions(versionEntry.item, versionEntry.originalIndex),
								"is-workflow-diffs-enabled": props.isWorkflowDiffsEnabled,
								"is-grouped": true,
								onAction,
								onPreview,
								onCompare,
								onMounted: onItemMounted
							}, null, 8, [
								"index",
								"item",
								"compare-with",
								"is-selected",
								"is-published",
								"is-pending",
								"actions",
								"is-workflow-diffs-enabled"
							]);
						}), 128)) : createCommentVNode("", true),
						entry.type === "version" ? (openBlock(), createBlock(WorkflowHistoryListItem_default, {
							key: 2,
							index: entry.originalIndex,
							item: entry.item,
							"compare-with": getItemToCompareWith(entry.item, entry.originalIndex),
							"is-selected": entry.item.versionId === props.selectedItem?.versionId,
							"is-published": entry.item.versionId === props.publishedVersionId,
							"is-pending": entry.item.versionId === props.pendingVersionId,
							actions: getActions(entry.item, entry.originalIndex),
							"is-workflow-diffs-enabled": props.isWorkflowDiffsEnabled,
							onAction,
							onPreview,
							onCompare,
							onMounted: onItemMounted
						}, null, 8, [
							"index",
							"item",
							"compare-with",
							"is-selected",
							"is-published",
							"is-pending",
							"actions",
							"is-workflow-diffs-enabled"
						])) : createCommentVNode("", true)
					], 64);
				}), 128)),
				props.items.length && hasMoreItems.value ? (openBlock(), createElementBlock("li", {
					key: 0,
					ref_key: "loadMoreSentinel",
					ref: loadMoreSentinel,
					class: normalizeClass(_ctx.$style.sentinel),
					"aria-hidden": "true"
				}, null, 2)) : createCommentVNode("", true),
				props.isListLoading ? (openBlock(), createElementBlock("li", {
					key: 1,
					class: normalizeClass(_ctx.$style.loader),
					role: "status",
					"aria-live": "polite",
					"aria-busy": "true",
					"aria-label": unref(i18n).baseText("generic.loading")
				}, [
					createVNode(unref(N8nLoading_default), {
						rows: 3,
						class: "mb-xs"
					}),
					createVNode(unref(N8nLoading_default), {
						rows: 3,
						class: "mb-xs"
					}),
					createVNode(unref(N8nLoading_default), {
						rows: 3,
						class: "mb-xs"
					})
				], 10, _hoisted_2)) : createCommentVNode("", true),
				props.shouldUpgrade ? (openBlock(), createElementBlock("li", _hoisted_3, [createVNode(WorkflowHistoryUpgradeFooter_default, {
					"prune-time-display": pruneTimeDisplay.value,
					onUpgrade: _cache[0] || (_cache[0] = ($event) => emit("upgrade"))
				}, null, 8, ["prune-time-display"])])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	list: "_list_1bvye_1",
	loader: "_loader_1bvye_11",
	sentinel: "_sentinel_1bvye_15",
	groupHeader: "_groupHeader_1bvye_19",
	groupTimelineColumn: "_groupTimelineColumn_1bvye_30",
	groupLabel: "_groupLabel_1bvye_66",
	groupChevron: "_groupChevron_1bvye_70"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowHistoryContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var import_omit = /* @__PURE__ */ __toESM(require_omit(), 1);
var MAX_DESCRIPTION_LENGTH = 200;
var WorkflowHistoryContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistoryContent",
	props: {
		workflow: {},
		workflowVersion: {},
		actions: {},
		isPublished: { type: Boolean },
		isListLoading: { type: Boolean },
		isFirstItemShown: { type: Boolean },
		pendingVersionId: {}
	},
	emits: ["action"],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const props = __props;
		const emit = __emit;
		const workflowVersionPreview = computed(() => {
			if (!props.workflowVersion || !props.workflow) return;
			return {
				...(0, import_omit.default)(props.workflow, "pinData"),
				nodeGroups: props.workflowVersion.nodeGroups,
				nodes: props.workflowVersion.nodes,
				connections: props.workflowVersion.connections
			};
		});
		const previewDocumentId = computed(() => createWorkflowDocumentId(props.workflow?.id ?? "", `history-preview-${props.workflowVersion?.versionId ?? ""}`));
		const formattedCreatedAt = computed(() => {
			if (!props.workflowVersion) return "";
			const { date, time } = formatTimestamp(props.workflowVersion.createdAt);
			return i18n.baseText("workflowHistory.item.createdAt", { interpolate: {
				date,
				time
			} });
		});
		const versionNameDisplay = computed(() => {
			if (!props.workflowVersion) return "";
			return getVersionLabel({
				workflowHistory: props.workflowVersion,
				currentVersionId: props.workflow?.versionId
			});
		});
		const isDescriptionExpanded = ref(false);
		const description = computed(() => props.workflowVersion?.description ?? "");
		const isDescriptionLong = computed(() => description.value.length > MAX_DESCRIPTION_LENGTH);
		const displayDescription = computed(() => {
			if (!isDescriptionLong.value || isDescriptionExpanded.value) return description.value;
			return description.value.substring(0, MAX_DESCRIPTION_LENGTH) + "... ";
		});
		const toggleDescription = () => {
			isDescriptionExpanded.value = !isDescriptionExpanded.value;
		};
		const actions = computed(() => {
			let filteredActions = props.actions;
			if (props.isFirstItemShown) filteredActions = filteredActions.filter((action) => action.value !== "restore");
			if (props.isPublished) filteredActions = filteredActions.filter((action) => action.value !== "publish");
			else filteredActions = filteredActions.filter((action) => action.value !== "unpublish");
			return filteredActions;
		});
		const isLoading = computed(() => Boolean(props.pendingVersionId) && props.pendingVersionId === props.workflowVersion?.versionId);
		const onAction = (value) => {
			if (!props.workflowVersion) return;
			emit("action", {
				action: value,
				id: props.workflowVersion.versionId,
				data: {
					formattedCreatedAt: formattedCreatedAt.value,
					versionName: versionNameDisplay.value,
					description: description.value
				}
			});
		};
		watch(() => props.workflowVersion, () => {
			isDescriptionExpanded.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.content) }, [workflowVersionPreview.value && !props.isListLoading ? (openBlock(), createBlock(WorkflowPreviewHost_default, {
				key: 0,
				"document-id": previewDocumentId.value,
				workflow: workflowVersionPreview.value
			}, null, 8, ["document-id", "workflow"])) : createCommentVNode("", true), props.workflowVersion ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.info)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.card) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.descriptionBox) }, [versionNameDisplay.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				placement: "right",
				"show-after": 300
			}, {
				content: withCtx(() => [createTextVNode(toDisplayString(formattedCreatedAt.value), 1)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleRow) }, [createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.mainLine),
					bold: "",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(versionNameDisplay.value), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(WorkflowVersionEngineBadge_default, {
					settings: props.workflowVersion.settings,
					size: "xxsmall"
				}, null, 8, ["settings"])], 2)]),
				_: 1
			})) : createCommentVNode("", true), description.value ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 1,
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(displayDescription.value) + " ", 1), isDescriptionLong.value ? (openBlock(), createBlock(unref(N8nLink_default), {
					key: 0,
					size: "small",
					onClick: toggleDescription
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(isDescriptionExpanded.value ? unref(i18n).baseText("generic.showLess") : unref(i18n).baseText("generic.showMore")), 1)]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			})) : createCommentVNode("", true)], 2), createVNode(unref(N8nActionToggle_default), {
				class: normalizeClass(_ctx.$style.actions),
				actions: actions.value,
				placement: "bottom-end",
				"data-test-id": "workflow-history-content-actions",
				onAction
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "large",
					loading: isLoading.value,
					"data-test-id": "action-toggle-button"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowHistory.content.actions")) + " ", 1), createVNode(unref(N8nIcon_default), {
						class: "ml-3xs",
						icon: "chevron-down",
						size: "small"
					})]),
					_: 1
				}, 8, ["loading"])]),
				_: 1
			}, 8, ["class", "actions"])], 2)], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_zmjwh_1",
	info: "_info_zmjwh_11",
	card: "_card_zmjwh_19",
	descriptionBox: "_descriptionBox_zmjwh_26",
	titleRow: "_titleRow_zmjwh_38",
	mainLine: "_mainLine_zmjwh_45",
	actions: "_actions_zmjwh_53"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowHistoryVersionSelect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowHistoryVersionSelect_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistoryVersionSelect",
	props: {
		modelValue: {},
		options: {},
		dataTestId: {}
	},
	emits: ["update:modelValue", "upgrade"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const popperContainer = ref(null);
		const filter = ref("");
		const i18n = useI18n();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const optionsByValue = computed(() => {
			return new Map(props.options.map((option) => [option.value, option]));
		});
		const selectedOption = computed(() => {
			return optionsByValue.value.get(props.modelValue);
		});
		const selectedOptionWrapperProps = computed(() => {
			const publishInfo = selectedOption.value?.publishInfo;
			if (!publishInfo) return null;
			return {
				label: selectedOption.value.label,
				status: selectedOption.value.status,
				publishInfo
			};
		});
		const groupedOptions = computed(() => {
			const groups = /* @__PURE__ */ new Map();
			for (const option of props.options) {
				const key = option.createdAt ? formatTimestamp(option.createdAt).date : "Unknown";
				const groupOptions = groups.get(key);
				if (groupOptions) groupOptions.push(option);
				else groups.set(key, [option]);
			}
			return Array.from(groups.entries()).map(([dateLabel, options]) => ({
				dateLabel,
				options
			}));
		});
		const selectedOptionHasPublishInfo = computed(() => {
			return Boolean(selectedOption.value?.publishInfo);
		});
		const filterGroupOptions = (group, normalizedFilter) => {
			const filteredOptions = group.options.filter((option) => option.label.toLowerCase().includes(normalizedFilter));
			if (filteredOptions.length === group.options.length) return group;
			return {
				...group,
				options: filteredOptions
			};
		};
		const filteredGroupedOptions = computed(() => {
			if (!filter.value) return groupedOptions.value;
			const normalizedFilter = filter.value.toLowerCase().trim();
			const filteredGroups = [];
			for (const group of groupedOptions.value) {
				const filteredGroup = filterGroupOptions(group, normalizedFilter);
				if (filteredGroup.options.length > 0) filteredGroups.push(filteredGroup);
			}
			return filteredGroups;
		});
		function onFilter(query = "") {
			filter.value = query;
		}
		function onVisibleChange(isVisible) {
			if (!isVisible) filter.value = "";
		}
		const pruneTimeDisplay = computed(() => {
			const timeInHours = unref(workflowHistoryStore.evaluatedPruneTime) ?? 0;
			if (timeInHours < 24) {
				const key = timeInHours === 1 ? "workflowHistory.limitHour" : "workflowHistory.limitHours";
				return i18n.baseText(key, { interpolate: { hours: String(timeInHours) } });
			}
			const days = Math.round(timeInHours / 24);
			const key = days === 1 ? "workflowHistory.limitDay" : "workflowHistory.limitDays";
			return i18n.baseText(key, { interpolate: { days: String(days) } });
		});
		const shouldShowUpgradeFooter = computed(() => Boolean(unref(workflowHistoryStore.shouldUpgrade)));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", {
				ref_key: "popperContainer",
				ref: popperContainer
			}, null, 512), (openBlock(), createBlock(resolveDynamicComponent(selectedOptionHasPublishInfo.value ? WorkflowHistoryPublishedTooltip_default : "span"), normalizeProps(guardReactiveProps(selectedOptionWrapperProps.value ?? {})), {
				default: withCtx(() => [createVNode(unref(N8nSelect_default), {
					"model-value": props.modelValue,
					size: "small",
					filterable: "",
					"filter-method": onFilter,
					class: normalizeClass(_ctx.$style.select),
					"popper-class": _ctx.$style["workflow-history-version-select-dropdown"],
					"append-to": popperContainer.value,
					teleported: "",
					"data-test-id": props.dataTestId,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => emit("update:modelValue", $event)),
					onVisibleChange
				}, createSlots({
					prefix: withCtx(() => [createVNode(WorkflowVersionStatusIndicator_default, { status: selectedOption.value?.status }, null, 8, ["status"])]),
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(filteredGroupedOptions.value, (group) => {
						return openBlock(), createBlock(unref(ElOptionGroup), {
							key: group.dateLabel,
							label: group.dateLabel
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(group.options, (option) => {
								return openBlock(), createBlock(unref(ElOption), {
									key: option.value,
									value: option.value,
									label: option.label
								}, {
									default: withCtx(() => [option.publishInfo ? (openBlock(), createBlock(WorkflowHistoryPublishedTooltip_default, {
										key: 0,
										label: option.label,
										status: option.status,
										"publish-info": option.publishInfo,
										offset: 24,
										placement: "right"
									}, {
										default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionRow) }, [createVNode(WorkflowVersionStatusIndicator_default, { status: option.status }, null, 8, ["status"]), createBaseVNode("span", null, toDisplayString(option.label), 1)], 2)]),
										_: 2
									}, 1032, [
										"label",
										"status",
										"publish-info"
									])) : (openBlock(), createElementBlock("span", {
										key: 1,
										class: normalizeClass(_ctx.$style.optionRow)
									}, [createVNode(WorkflowVersionStatusIndicator_default, { status: option.status }, null, 8, ["status"]), createBaseVNode("span", null, toDisplayString(option.label), 1)], 2))]),
									_: 2
								}, 1032, ["value", "label"]);
							}), 128))]),
							_: 2
						}, 1032, ["label"]);
					}), 128))]),
					_: 2
				}, [shouldShowUpgradeFooter.value ? {
					name: "footer",
					fn: withCtx(() => [createVNode(WorkflowHistoryUpgradeFooter_default, {
						"prune-time-display": pruneTimeDisplay.value,
						"with-top-border": true,
						onUpgrade: _cache[0] || (_cache[0] = ($event) => emit("upgrade"))
					}, null, 8, ["prune-time-display"])]),
					key: "0"
				} : void 0]), 1032, [
					"model-value",
					"class",
					"popper-class",
					"append-to",
					"data-test-id"
				])]),
				_: 1
			}, 16))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1kknw_1",
	select: "_select_1kknw_5",
	"workflow-history-version-select-dropdown": "_workflow-history-version-select-dropdown_1kknw_13",
	optionRow: "_optionRow_1kknw_27"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/useWorkflowHistoryVersionOptions.ts
init_runtime_core_esm_bundler();
var useWorkflowHistoryVersionOptions = ({ availableVersions, currentWorkflowVersionId, publishedWorkflowVersionId, selectedVersionIds, resolveUserDisplayName }) => {
	const versionsById = computed(() => {
		return new Map(availableVersions.value.map((version) => [version.versionId, version]));
	});
	const getVersionById = (versionId) => versionsById.value.get(versionId);
	const getVersionLabelById = (versionId) => {
		const workflowHistory = getVersionById(versionId) ?? {
			versionId,
			name: null
		};
		return getVersionLabel({
			workflowHistory,
			currentVersionId: currentWorkflowVersionId.value
		});
	};
	const getVersionStatusById = (versionId) => {
		if (versionId === publishedWorkflowVersionId.value) return "published";
		return versionId === currentWorkflowVersionId.value ? "latest" : "default";
	};
	const getVersionPublishInfoById = (versionId) => {
		const historyVersion = getVersionById(versionId);
		if (!historyVersion) return;
		const publishInfo = getLastPublishedVersion(historyVersion.workflowPublishHistory);
		if (!publishInfo) return;
		return {
			publishedBy: resolveUserDisplayName(publishInfo.userId),
			publishedAt: publishInfo.createdAt
		};
	};
	const getVersionCreatedAtById = (versionId) => {
		return getVersionById(versionId)?.createdAt;
	};
	return {
		getVersionLabelById,
		versionOptions: computed(() => {
			const options = new Map(availableVersions.value.map((version) => [version.versionId, getVersionLabelById(version.versionId)]));
			for (const versionId of selectedVersionIds.value) if (versionId && !options.has(versionId)) options.set(versionId, getVersionLabelById(versionId));
			return Array.from(options.entries()).map(([value, label]) => ({
				value,
				label,
				status: getVersionStatusById(value),
				publishInfo: getVersionPublishInfoById(value),
				createdAt: getVersionCreatedAtById(value)
			}));
		})
	};
};
//#endregion
//#region src/features/workflows/workflowHistory/views/WorkflowHistoryDiff.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowHistoryDiff_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistoryDiff",
	props: {
		workflowId: {},
		sourceWorkflowVersionId: {},
		targetWorkflowVersionId: {},
		availableVersions: {}
	},
	emits: ["close", "versionsChange"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const rootStore = useRootStore();
		const workflowsListStore = useWorkflowsListStore();
		const usersStore = useUsersStore();
		const isLoading = ref(true);
		const sourceWorkflow = ref();
		const targetWorkflow = ref();
		const sourceLabel = ref("");
		const targetLabel = ref("");
		const selectedSourceVersionId = ref(props.sourceWorkflowVersionId);
		const selectedTargetVersionId = ref(props.targetWorkflowVersionId);
		const currentWorkflowVersionId = ref();
		const publishedWorkflowVersionId = ref();
		const loadRequestId = ref(0);
		const { getVersionLabelById, versionOptions } = useWorkflowHistoryVersionOptions({
			availableVersions: computed(() => props.availableVersions),
			currentWorkflowVersionId,
			publishedWorkflowVersionId,
			selectedVersionIds: computed(() => [selectedSourceVersionId.value, selectedTargetVersionId.value]),
			resolveUserDisplayName: (userId) => {
				if (!userId) return null;
				const user = usersStore.usersById[userId];
				return user?.fullName ?? user?.email ?? null;
			}
		});
		const loadComparedVersions = async (sourceVersionId, targetVersionId) => {
			const requestId = ++loadRequestId.value;
			isLoading.value = true;
			try {
				const [workflow, sourceWorkflowVersion, targetWorkflowVersion] = await Promise.all([
					workflowsListStore.fetchWorkflow(props.workflowId),
					workflowHistoryStore.getWorkflowVersion(props.workflowId, sourceVersionId),
					workflowHistoryStore.getWorkflowVersion(props.workflowId, targetVersionId)
				]);
				if (requestId !== loadRequestId.value) return;
				if (sourceWorkflowVersion.workflowId !== props.workflowId || targetWorkflowVersion.workflowId !== props.workflowId) throw new Error(i18n.baseText("workflowDiff.versionMismatchError"));
				currentWorkflowVersionId.value = workflow.versionId;
				publishedWorkflowVersionId.value = workflow.activeVersionId ?? void 0;
				const workflowWithoutPinData = (0, import_omit.default)(workflow, "pinData");
				sourceWorkflow.value = {
					...workflowWithoutPinData,
					versionId: sourceWorkflowVersion.versionId,
					nodes: sourceWorkflowVersion.nodes,
					connections: sourceWorkflowVersion.connections,
					nodeGroups: sourceWorkflowVersion.nodeGroups ?? []
				};
				targetWorkflow.value = {
					...workflowWithoutPinData,
					versionId: targetWorkflowVersion.versionId,
					nodes: targetWorkflowVersion.nodes,
					connections: targetWorkflowVersion.connections,
					nodeGroups: targetWorkflowVersion.nodeGroups ?? []
				};
				sourceLabel.value = getVersionLabelById(sourceWorkflowVersion.versionId);
				targetLabel.value = getVersionLabelById(targetWorkflowVersion.versionId);
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowDiff.compareVersionsLoadError"));
				emit("close");
			} finally {
				if (requestId === loadRequestId.value) isLoading.value = false;
			}
		};
		const swapSelectedVersions = () => {
			const previousSourceVersionId = selectedSourceVersionId.value;
			selectedSourceVersionId.value = selectedTargetVersionId.value;
			selectedTargetVersionId.value = previousSourceVersionId;
		};
		const trackVersionSelectionInDiff = (side, versionId) => {
			telemetry.track("user_selects_version_in_diff", {
				instance_id: rootStore.instanceId,
				workflow_id: props.workflowId,
				version_id: versionId,
				side,
				source: "version_history"
			});
		};
		const onSourceVersionChange = (nextSourceVersionId) => {
			trackVersionSelectionInDiff("source", nextSourceVersionId);
			if (nextSourceVersionId === selectedTargetVersionId.value) {
				swapSelectedVersions();
				return;
			}
			selectedSourceVersionId.value = nextSourceVersionId;
		};
		const onTargetVersionChange = (nextTargetVersionId) => {
			trackVersionSelectionInDiff("target", nextTargetVersionId);
			if (nextTargetVersionId === selectedSourceVersionId.value) {
				swapSelectedVersions();
				return;
			}
			selectedTargetVersionId.value = nextTargetVersionId;
		};
		watch(() => [props.sourceWorkflowVersionId, props.targetWorkflowVersionId], ([sourceVersionId, targetVersionId]) => {
			selectedSourceVersionId.value = sourceVersionId;
			selectedTargetVersionId.value = targetVersionId;
		});
		watch([selectedSourceVersionId, selectedTargetVersionId], ([sourceVersionId, targetVersionId]) => {
			emit("versionsChange", {
				sourceVersionId,
				targetVersionId
			});
			loadComparedVersions(sourceVersionId, targetVersionId);
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [isLoading.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.state)
			}, [createVNode(unref(N8nText_default), { color: "text-base" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.loading")), 1)]),
				_: 1
			})], 2)) : sourceWorkflow.value && targetWorkflow.value ? (openBlock(), createBlock(WorkflowDiffView_default, {
				key: 1,
				"source-workflow": sourceWorkflow.value,
				"target-workflow": targetWorkflow.value,
				"source-label": sourceLabel.value,
				"target-label": targetLabel.value,
				"show-back-button": true,
				source: "version_history",
				onBack: _cache[0] || (_cache[0] = ($event) => emit("close"))
			}, {
				sourceLabel: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sourceBadge) }, [createVNode(WorkflowHistoryVersionSelect_default, {
					"model-value": selectedSourceVersionId.value,
					options: unref(versionOptions),
					"data-test-id": "workflow-history-diff-source-version",
					"onUpdate:modelValue": onSourceVersionChange
				}, null, 8, ["model-value", "options"])], 2)]),
				targetLabel: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sourceBadge) }, [createVNode(WorkflowHistoryVersionSelect_default, {
					"model-value": selectedTargetVersionId.value,
					options: unref(versionOptions),
					"data-test-id": "workflow-history-diff-target-version",
					"onUpdate:modelValue": onTargetVersionChange
				}, null, 8, ["model-value", "options"])], 2)]),
				_: 1
			}, 8, [
				"source-workflow",
				"target-workflow",
				"source-label",
				"target-label"
			])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_178ta_1",
	state: "_state_178ta_7",
	sourceBadge: "_sourceBadge_178ta_14"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/components/WorkflowPublishTimelineContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var _hoisted_1$1 = [
	"role",
	"tabindex",
	"onClick",
	"onKeydown"
];
/** Brief unpublished gaps shorter than this are version-change artefacts, not real deactivations */
var TRANSIENT_DEACTIVATION_MS = 2e3;
/** Adoption point for publish-timeline tracking — older events may be incomplete */
var PAGE_SIZE = 100;
var WorkflowPublishTimelineContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowPublishTimelineContent",
	props: {
		workflowId: {},
		selectedVersionId: {}
	},
	emits: ["selectVersion"],
	setup(__props, { emit: __emit }) {
		const ADOPTION_VERSION = {
			major: 2,
			minor: 17,
			patch: 0
		};
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const isLoading = ref(true);
		const isLoadingMore = ref(false);
		const hasLoadError = ref(false);
		const hasMore = ref(false);
		const events = ref([]);
		const fetchedCount = ref(0);
		const adoptionDate = ref(null);
		const contentElement = ref(null);
		const loadMoreSentinel = ref(null);
		let disposed = false;
		const isToday = (date) => {
			const now = /* @__PURE__ */ new Date();
			return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
		};
		const formatShortDate = (date) => {
			if (isToday(date)) return (0, import_dateformat.default)(date, "HH:MM");
			const format = date.getFullYear() !== (/* @__PURE__ */ new Date()).getFullYear() ? "d mmm yyyy" : "d mmm";
			return (0, import_dateformat.default)(date, format);
		};
		const titleFor = (event) => {
			if (event.event === "deactivated") return event.versionName ? i18n.baseText("workflowHistory.publishTimeline.event.deactivatedVersion", { interpolate: { version: event.versionName } }) : i18n.baseText("workflowHistory.publishTimeline.event.deactivated");
			if (!event.versionId) return i18n.baseText("workflowHistory.publishTimeline.event.activatedDeletedVersion");
			if (event.versionName) return i18n.baseText("workflowHistory.publishTimeline.event.activatedVersion", { interpolate: { version: event.versionName } });
			return i18n.baseText("workflowHistory.publishTimeline.event.activated");
		};
		const tooltipLabelFor = (event) => {
			if (!event.versionId) return event.event === "deactivated" ? i18n.baseText("workflowHistory.publishTimeline.event.deactivated") : i18n.baseText("workflowHistory.publishTimeline.event.activatedDeletedVersion");
			return event.versionName ?? generateVersionLabelFromId(event.versionId);
		};
		const buildSecondaryText = (event, user) => {
			const action = event.event === "activated" ? i18n.baseText("workflowHistory.publishTimeline.event.activated") : i18n.baseText("workflowHistory.publishTimeline.event.deactivated");
			const { date, time } = formatTimestamp(event.createdAt);
			const datetime = i18n.baseText("workflowHistory.item.createdAt", { interpolate: {
				date,
				time
			} });
			if (user) return i18n.baseText("workflowHistory.publishTimeline.tooltip.byUser", { interpolate: {
				action,
				user,
				datetime
			} });
			return i18n.baseText("workflowHistory.publishTimeline.tooltip.noUser", { interpolate: {
				action,
				datetime
			} });
		};
		const buildEntry = (event, next) => {
			const status = event.event === "activated" ? "published" : "unpublished";
			const startedAt = new Date(event.createdAt);
			const endedAt = next ? new Date(next.createdAt) : null;
			const versionId = event.versionId;
			const user = event.user ? `${event.user.firstName} ${event.user.lastName}` : null;
			const isLatest = !next;
			const durationKey = status === "published" ? "workflowHistory.publishTimeline.activeDuration" : "workflowHistory.publishTimeline.inactiveDuration";
			return {
				status,
				startedAt,
				endedAt,
				versionId,
				user,
				isLatest,
				isClickable: !!versionId,
				isSelected: !!versionId && versionId === props.selectedVersionId,
				isDeletedVersion: status === "published" && !versionId,
				settings: event.settings,
				title: titleFor(event),
				durationLabel: i18n.baseText(durationKey, { interpolate: { duration: formatPublicationDuration(startedAt, endedAt ?? /* @__PURE__ */ new Date()) } }),
				shortDate: formatShortDate(startedAt),
				tooltipLabel: tooltipLabelFor(event),
				tooltipStatus: isLatest && status === "published" ? "published" : "default",
				tooltipSecondaryText: buildSecondaryText(event, user)
			};
		};
		const isMeaningfulEntry = (entry) => {
			if (entry.status !== "unpublished" || entry.endedAt === null) return true;
			return entry.endedAt.getTime() - entry.startedAt.getTime() >= TRANSIENT_DEACTIVATION_MS;
		};
		const entries = computed(() => events.value.map((event, idx) => buildEntry(event, events.value[idx + 1])).toReversed().filter(isMeaningfulEntry));
		const showDeletedVersionsDisclaimer = computed(() => {
			if (adoptionDate.value === null || hasMore.value) return false;
			const adoptionTime = adoptionDate.value.getTime();
			return events.value.some((e) => new Date(e.createdAt).getTime() < adoptionTime);
		});
		const adoptionShortDate = computed(() => adoptionDate.value ? formatShortDate(adoptionDate.value) : "");
		const handleSelect = (entry) => {
			if (entry.versionId) emit("selectVersion", entry.versionId);
		};
		const oldestFirst = (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id;
		const fetchNextPage = async () => {
			const page = await workflowHistoryStore.getPublishTimeline(props.workflowId, {
				take: PAGE_SIZE,
				skip: fetchedCount.value
			});
			if (disposed) return;
			fetchedCount.value += page.length;
			hasMore.value = page.length === PAGE_SIZE;
			const loadedIds = new Set(events.value.map(({ id }) => id));
			events.value = [...events.value, ...page.filter(({ id }) => !loadedIds.has(id))].sort(oldestFirst);
		};
		const loadTimeline = async () => {
			if (disposed) return;
			isLoading.value = true;
			hasLoadError.value = false;
			try {
				const [, firstAdoptionDate] = await Promise.all([fetchNextPage(), workflowHistoryStore.getVersionFirstAdoptionDate(ADOPTION_VERSION).catch(() => null)]);
				if (!disposed) adoptionDate.value = firstAdoptionDate ? new Date(firstAdoptionDate) : null;
			} catch (error) {
				if (!disposed) {
					hasLoadError.value = true;
					toast.showError(error, i18n.baseText("workflowHistory.title"));
				}
			} finally {
				if (!disposed) isLoading.value = false;
			}
		};
		const loadMore = async () => {
			if (disposed || isLoadingMore.value || !hasMore.value) return;
			isLoadingMore.value = true;
			hasLoadError.value = false;
			try {
				await fetchNextPage();
			} catch (error) {
				if (!disposed) {
					hasLoadError.value = true;
					toast.showError(error, i18n.baseText("workflowHistory.title"));
				}
			} finally {
				if (!disposed) isLoadingMore.value = false;
			}
		};
		const retry = async () => {
			if (disposed || isLoading.value || isLoadingMore.value) return;
			if (fetchedCount.value === 0) await loadTimeline();
			else await loadMore();
		};
		const { observe: observeForLoadMore } = useIntersectionObserver({
			root: contentElement,
			onIntersect: async () => await loadMore(),
			once: false
		});
		watch([
			loadMoreSentinel,
			hasMore,
			fetchedCount
		], ([sentinel, canLoadMore]) => {
			if (sentinel && canLoadMore) observeForLoadMore(sentinel);
		});
		onMounted(loadTimeline);
		onBeforeUnmount(() => {
			disposed = true;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "contentElement",
				ref: contentElement,
				class: normalizeClass(_ctx.$style.content)
			}, [isLoading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				rows: 4
			})) : entries.value.length === 0 && !hasMore.value && !hasLoadError.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.empty)
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowHistory.publishTimeline.empty")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.timeline) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(entries.value, (entry, idx) => {
					return openBlock(), createBlock(WorkflowHistoryPublishedTooltip_default, {
						key: idx,
						placement: "left",
						label: entry.tooltipLabel,
						status: entry.tooltipStatus,
						"secondary-text": entry.tooltipSecondaryText
					}, {
						default: withCtx(() => [createBaseVNode("div", {
							class: normalizeClass([
								_ctx.$style.timelineItem,
								entry.isClickable && _ctx.$style.timelineItemClickable,
								entry.isSelected && _ctx.$style.timelineItemSelected
							]),
							role: entry.isClickable ? "button" : void 0,
							tabindex: entry.isClickable ? 0 : void 0,
							onClick: ($event) => entry.isClickable && handleSelect(entry),
							onKeydown: [withKeys(($event) => entry.isClickable && handleSelect(entry), ["enter"]), withKeys(withModifiers(($event) => entry.isClickable && handleSelect(entry), ["prevent"]), ["space"])]
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.timelineIndicator) }, [
							createBaseVNode("span", { class: normalizeClass([
								_ctx.$style.timelineLine,
								_ctx.$style.timelineLineAbove,
								idx === 0 && _ctx.$style.timelineLineHidden
							]) }, null, 2),
							entry.status === "unpublished" ? (openBlock(), createElementBlock("span", {
								key: 0,
								class: normalizeClass(_ctx.$style.timelineUnpublished)
							}, [createVNode(unref(N8nIcon_default), {
								icon: "x",
								size: "small"
							})], 2)) : (openBlock(), createElementBlock("span", {
								key: 1,
								class: normalizeClass([_ctx.$style.timelineDot, entry.isLatest ? _ctx.$style.dotPublished : _ctx.$style.dotPastPublished])
							}, null, 2)),
							createBaseVNode("span", { class: normalizeClass([
								_ctx.$style.timelineLine,
								_ctx.$style.timelineLineBelow,
								idx === entries.value.length - 1 && _ctx.$style.timelineLineHidden
							]) }, null, 2)
						], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.timelineContent) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.durationRow) }, [createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-base"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(entry.durationLabel), 1)]),
							_: 2
						}, 1024), entry.versionId ? (openBlock(), createBlock(WorkflowVersionEngineBadge_default, {
							key: 0,
							settings: entry.settings,
							size: "xxsmall",
							class: normalizeClass(_ctx.$style.engineBadge)
						}, null, 8, ["settings", "class"])) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.timelineHeader) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.timelineTitle) }, [createVNode(unref(N8nText_default), {
							bold: true,
							size: "small",
							color: "text-dark",
							class: normalizeClass(_ctx.$style.timelineTitleText)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(entry.title), 1)]),
							_: 2
						}, 1032, ["class"]), entry.isDeletedVersion ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							placement: "top",
							content: unref(i18n).baseText("workflowHistory.publishTimeline.event.activatedDeletedVersion.tooltip")
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "info",
								size: "small",
								class: normalizeClass(_ctx.$style.deletedVersionHint)
							}, null, 8, ["class"])]),
							_: 1
						}, 8, ["content"])) : createCommentVNode("", true)], 2), createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base",
							class: normalizeClass(_ctx.$style.dateText)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(entry.shortDate), 1)]),
							_: 2
						}, 1032, ["class"])], 2)], 2)], 42, _hoisted_1$1)]),
						_: 2
					}, 1032, [
						"label",
						"status",
						"secondary-text"
					]);
				}), 128))], 2),
				hasMore.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					ref_key: "loadMoreSentinel",
					ref: loadMoreSentinel,
					class: normalizeClass(_ctx.$style.sentinel),
					"aria-hidden": "true"
				}, null, 2)) : createCommentVNode("", true),
				isLoadingMore.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 1,
					rows: 1
				})) : createCommentVNode("", true),
				hasLoadError.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					variant: "outline",
					size: "small",
					disabled: isLoading.value || isLoadingMore.value,
					onClick: retry
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				}, 8, ["disabled"])) : createCommentVNode("", true),
				showDeletedVersionsDisclaimer.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 3,
					placement: "top",
					content: unref(i18n).baseText("workflowHistory.publishTimeline.deletedVersionsDisclaimer.tooltip")
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.deletedVersionsDisclaimer)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowHistory.publishTimeline.deletedVersionsDisclaimer", { interpolate: { date: adoptionShortDate.value } })) + " ", 1), createVNode(unref(N8nIcon_default), {
							icon: "info",
							size: "small"
						})]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true)
			], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_7bqzb_1",
	sentinel: "_sentinel_7bqzb_11",
	empty: "_empty_7bqzb_15",
	timeline: "_timeline_7bqzb_24",
	timelineItem: "_timelineItem_7bqzb_29",
	timelineItemClickable: "_timelineItemClickable_7bqzb_42",
	timelineItemSelected: "_timelineItemSelected_7bqzb_49",
	timelineIndicator: "_timelineIndicator_7bqzb_53",
	timelineDot: "_timelineDot_7bqzb_63",
	dotPublished: "_dotPublished_7bqzb_70",
	dotPastPublished: "_dotPastPublished_7bqzb_74",
	timelineUnpublished: "_timelineUnpublished_7bqzb_78",
	timelineLine: "_timelineLine_7bqzb_88",
	timelineLineAbove: "_timelineLineAbove_7bqzb_92",
	timelineLineBelow: "_timelineLineBelow_7bqzb_96",
	timelineLineHidden: "_timelineLineHidden_7bqzb_104",
	timelineContent: "_timelineContent_7bqzb_108",
	timelineHeader: "_timelineHeader_7bqzb_117",
	timelineTitle: "_timelineTitle_7bqzb_124",
	timelineTitleText: "_timelineTitleText_7bqzb_132",
	deletedVersionHint: "_deletedVersionHint_7bqzb_139",
	dateText: "_dateText_7bqzb_144",
	durationRow: "_durationRow_7bqzb_149",
	engineBadge: "_engineBadge_7bqzb_157",
	deletedVersionsDisclaimer: "_deletedVersionsDisclaimer_7bqzb_161"
} }]]);
//#endregion
//#region src/features/workflows/workflowHistory/views/WorkflowHistory.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = { key: 0 };
var WorkflowHistory_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowHistory",
	setup(__props) {
		const workflowHistoryActionTypes = [
			"restore",
			"publish",
			"unpublish",
			"name",
			"clone",
			"open",
			"download"
		];
		const WORKFLOW_HISTORY_ACTIONS = workflowHistoryActionTypes.reduce((record, key) => ({
			...record,
			[key.toUpperCase()]: key
		}), {});
		const route = useRoute();
		const router = useRouter();
		const i18n = useI18n();
		const toast = useToast();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const uiStore = useUIStore();
		const workflowsListStore = useWorkflowsListStore();
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();
		const workflowActivate = useWorkflowActivate();
		const isNamedVersionsEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.NamedVersions]);
		const isWorkflowDiffsEnabled = computed(() => settingsStore.settings.enterprise.workflowDiffs);
		const canRender = ref(true);
		const isListLoading = ref(true);
		const requestNumberOfItems = ref(20);
		const lastReceivedItemsLength = ref(0);
		const publishedWorkflow = ref(null);
		const workflowHistory = ref([]);
		const selectedWorkflowVersion = ref(null);
		const availableActionTypes = computed(() => {
			return workflowHistoryActionTypes.filter((action) => {
				if (action === "publish" && publishedWorkflow.value?.isArchived) return false;
				if (action === "name" && !isNamedVersionsEnabled.value) return false;
				return true;
			});
		});
		const workflowId = computed(() => normalizeSingleRouteParam("workflowId"));
		const versionId = computed(() => normalizeSingleRouteParam("versionId"));
		const diffWithVersionId = computed(() => {
			const value = route.query.diffWith;
			return typeof value === "string" ? value : void 0;
		});
		const editorRoute = computed(() => ({
			name: VIEWS.WORKFLOW,
			params: { workflowId: workflowId.value }
		}));
		const workflowPermissions = computed(() => getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).workflow);
		const publishedWorkflowVersionId = computed(() => {
			const publishedVersionId = getPublishedVersionId(publishedWorkflow.value);
			if (!publishedVersionId) {
				const workflowFromStore = workflowsListStore.getWorkflowById(workflowId.value);
				return getPublishedVersionId(workflowFromStore);
			}
			return publishedVersionId;
		});
		const pendingVersionId = ref(null);
		const actions = computed(() => availableActionTypes.value.map((value) => ({
			label: i18n.baseText(`workflowHistory.item.actions.${value}`),
			disabled: pendingVersionId.value !== null && (value === "clone" || value === "restore" || value === "download") || value === "clone" && !workflowPermissions.value.create || (value === "restore" || value === "name") && !workflowPermissions.value.update || (value === "publish" || value === "unpublish") && !workflowPermissions.value.publish,
			value
		})));
		const initialTab = route.query.tab === "publishTimeline" ? "publishTimeline" : "history";
		const activeTab = ref(initialTab);
		const tabOptions = computed(() => [{
			label: i18n.baseText("workflowHistory.tab.history"),
			value: "history"
		}, {
			label: i18n.baseText("workflowHistory.tab.publishTimeline"),
			value: "publishTimeline"
		}]);
		const isFirstItemShown = computed(() => workflowHistory.value[0]?.versionId === versionId.value);
		const createCompareRoute = (compareVersionId, selectedVersionId = versionId.value) => {
			return {
				name: VIEWS.WORKFLOW_HISTORY,
				params: {
					workflowId: workflowId.value,
					versionId: selectedVersionId
				},
				query: {
					...route.query,
					diffWith: compareVersionId
				}
			};
		};
		const sendTelemetry = (event, extras) => {
			telemetry.track(event, {
				instance_id: useRootStore().instanceId,
				workflow_id: workflowId.value,
				...extras
			});
		};
		const loadMore = async (queryParams) => {
			const history = await workflowHistoryStore.getWorkflowHistory(workflowId.value, queryParams);
			lastReceivedItemsLength.value = history.length;
			const userIds = history.flatMap((item) => item.workflowPublishHistory.map((pub) => pub.userId)).filter((id) => Boolean(id));
			const userIdsToFetch = new Set(userIds);
			await usersStore.fetchUsers({ filter: { ids: Array.from(userIdsToFetch) } });
			workflowHistory.value = workflowHistory.value.concat(history);
		};
		watch(activeTab, (newTab) => {
			if (newTab === "publishTimeline") sendTelemetry("User opened publish timeline");
		});
		const onSelectPublishTimelineVersion = async (id) => {
			sendTelemetry("User selected version from publish timeline");
			await navigateToVersion(id);
		};
		onBeforeMount(async () => {
			sendTelemetry("User opened workflow history");
			if (activeTab.value === "publishTimeline") sendTelemetry("User opened publish timeline");
			try {
				const [workflow] = await Promise.all([workflowsListStore.fetchWorkflow(workflowId.value), loadMore({ take: requestNumberOfItems.value })]);
				publishedWorkflow.value = workflow;
				isListLoading.value = false;
				if (!versionId.value && workflowHistory.value.length) await router.replace({
					name: VIEWS.WORKFLOW_HISTORY,
					params: {
						workflowId: workflowId.value,
						versionId: workflowHistory.value[0].versionId
					},
					query: route.query
				});
			} catch (error) {
				canRender.value = false;
				toast.showError(error, i18n.baseText("workflowHistory.title"));
			}
		});
		const normalizeSingleRouteParam = (name) => {
			const param = route.params[name];
			if (typeof param === "string") return param;
			return param?.[0] ?? "";
		};
		const openInNewTab = (id) => {
			const { href } = router.resolve({
				name: VIEWS.WORKFLOW_HISTORY,
				params: {
					workflowId: workflowId.value,
					versionId: id
				}
			});
			window.open(href, "_blank");
		};
		const cloneWorkflowVersion = async (id, data) => {
			const clonedWorkflow = await workflowHistoryStore.cloneIntoNewWorkflow(workflowId.value, id, data);
			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId: clonedWorkflow.id }
			});
			toast.showMessage({
				title: i18n.baseText("workflowHistory.action.clone.success.title"),
				message: h("a", {
					href,
					target: "_blank"
				}, i18n.baseText("workflowHistory.action.clone.success.message")),
				type: "success",
				duration: 1e4
			});
		};
		const restoreWorkflowVersion = async (id) => {
			const versionIdBeforeRestore = (await workflowsListStore.fetchWorkflow(workflowId.value)).versionId;
			publishedWorkflow.value = await workflowHistoryStore.restoreWorkflow(workflowId.value, id);
			if (publishedWorkflow.value.versionId === versionIdBeforeRestore) {
				toast.showMessage({
					title: i18n.baseText("workflowHistory.action.restore.alreadyRestored"),
					type: "info"
				});
				return;
			}
			const history = await workflowHistoryStore.getWorkflowHistory(workflowId.value, { take: 1 });
			workflowHistory.value = history.concat(workflowHistory.value);
			toast.showMessage({
				title: i18n.baseText("workflowHistory.action.restore.success.title"),
				type: "success"
			});
		};
		const publishWorkflowVersion = (id, data) => {
			const publishEventBus = createEventBus();
			const modalData = ref({
				versionId: id,
				versionName: data.versionName,
				description: data.description,
				modalTitle: i18n.baseText("workflows.publishModal.title"),
				submitButtonLabel: i18n.baseText("workflows.publish"),
				submitting: false,
				eventBus: publishEventBus
			});
			publishEventBus.once("submit", async (submitData) => {
				modalData.value.submitting = true;
				try {
					const { success } = await workflowActivate.publishWorkflow(workflowId.value, id, {
						name: submitData.name,
						description: submitData.description
					});
					if (success) {
						publishedWorkflow.value = workflowsListStore.getWorkflowById(workflowId.value) ?? null;
						const historyItem = workflowHistory.value.find((item) => item.versionId === submitData.versionId);
						if (historyItem) {
							historyItem.name = submitData.name;
							historyItem.description = submitData.description;
							if (publishedWorkflow.value?.activeVersion?.workflowPublishHistory) historyItem.workflowPublishHistory = publishedWorkflow.value.activeVersion.workflowPublishHistory;
						}
						if (selectedWorkflowVersion.value?.versionId === submitData.versionId) selectedWorkflowVersion.value = {
							...selectedWorkflowVersion.value,
							name: submitData.name,
							description: submitData.description,
							workflowPublishHistory: publishedWorkflow.value?.activeVersion?.workflowPublishHistory ?? selectedWorkflowVersion.value.workflowPublishHistory
						};
						sendTelemetry("User published version from history");
						uiStore.closeModal(WORKFLOW_HISTORY_PUBLISH_MODAL_KEY);
					}
				} finally {
					modalData.value.submitting = false;
				}
			});
			uiStore.openModalWithData({
				name: WORKFLOW_HISTORY_PUBLISH_MODAL_KEY,
				data: modalData.value
			});
		};
		const unpublishWorkflowVersion = (id, data) => {
			if (publishedWorkflowVersionId.value !== id) return;
			const unpublishEventBus = createEventBus();
			unpublishEventBus.once("unpublish", async () => {
				const success = await workflowActivate.unpublishWorkflowFromHistory(workflowId.value);
				uiStore.closeModal(WORKFLOW_HISTORY_VERSION_UNPUBLISH);
				if (!success) return;
				publishedWorkflow.value = workflowsListStore.getWorkflowById(workflowId.value) ?? null;
				toast.showMessage({
					title: i18n.baseText("workflowHistory.action.unpublish.success.title"),
					type: "success"
				});
				sendTelemetry("User unpublished workflow from history");
			});
			uiStore.openModalWithData({
				name: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
				data: {
					workflowId: workflowId.value,
					versionName: data.versionName,
					eventBus: unpublishEventBus
				}
			});
		};
		const nameWorkflowVersion = async (id, data) => {
			const nameVersionEventBus = createEventBus();
			const modalData = ref({
				versionId: id,
				versionName: data.versionName,
				description: data.description,
				modalTitle: i18n.baseText("workflowHistory.nameVersionModal.title"),
				submitButtonLabel: i18n.baseText("workflowHistory.nameVersionModal.confirmButton"),
				submitting: false,
				eventBus: nameVersionEventBus
			});
			nameVersionEventBus.once("submit", async (submitData) => {
				modalData.value.submitting = true;
				try {
					await workflowHistoryStore.updateWorkflowHistoryVersion(workflowId.value, id, {
						name: submitData.name,
						description: submitData.description
					});
					const historyItem = workflowHistory.value.find((item) => item.versionId === submitData.versionId);
					if (historyItem) {
						historyItem.name = submitData.name;
						historyItem.description = submitData.description;
					}
					if (selectedWorkflowVersion.value?.versionId === submitData.versionId) selectedWorkflowVersion.value = {
						...selectedWorkflowVersion.value,
						name: submitData.name,
						description: submitData.description
					};
					toast.showMessage({
						title: i18n.baseText("workflowHistory.action.nameVersion.success.title"),
						type: "success"
					});
					sendTelemetry("User named version from history");
					uiStore.closeModal(WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY);
				} catch (error) {
					toast.showError(error, i18n.baseText("workflowHistory.action.nameVersion.error.title"));
				} finally {
					modalData.value.submitting = false;
				}
			});
			uiStore.openModalWithData({
				name: WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY,
				data: modalData.value
			});
		};
		const runSlowAction = async (id, run) => {
			if (pendingVersionId.value) return;
			pendingVersionId.value = id;
			try {
				await run();
			} finally {
				pendingVersionId.value = null;
			}
		};
		const onAction = async ({ action, id, data }) => {
			try {
				switch (action) {
					case WORKFLOW_HISTORY_ACTIONS.OPEN:
						openInNewTab(id);
						sendTelemetry("User opened version in new tab");
						break;
					case WORKFLOW_HISTORY_ACTIONS.DOWNLOAD:
						await runSlowAction(id, async () => {
							await workflowHistoryStore.downloadVersion(workflowId.value, id, data);
							sendTelemetry("User downloaded version");
						});
						break;
					case WORKFLOW_HISTORY_ACTIONS.CLONE:
						await runSlowAction(id, async () => {
							await cloneWorkflowVersion(id, data);
							sendTelemetry("User cloned version");
						});
						break;
					case WORKFLOW_HISTORY_ACTIONS.RESTORE:
						await runSlowAction(id, async () => {
							await restoreWorkflowVersion(id);
							sendTelemetry("User restored version");
						});
						break;
					case WORKFLOW_HISTORY_ACTIONS.PUBLISH:
						publishWorkflowVersion(id, data);
						break;
					case WORKFLOW_HISTORY_ACTIONS.UNPUBLISH:
						unpublishWorkflowVersion(id, data);
						break;
					case WORKFLOW_HISTORY_ACTIONS.NAME: await nameWorkflowVersion(id, data);
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowHistory.action.error.title", { interpolate: { action: i18n.baseText(`workflowHistory.item.actions.${action}`).toLowerCase() } }));
			}
		};
		const navigateToVersion = async (id) => {
			await router.push({
				name: VIEWS.WORKFLOW_HISTORY,
				params: {
					workflowId: workflowId.value,
					versionId: id
				}
			});
		};
		const onPreview = async ({ event, id }) => {
			if (event.metaKey || event.ctrlKey) {
				openInNewTab(id);
				sendTelemetry("User opened version in new tab");
			} else await navigateToVersion(id);
		};
		const onUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("workflow-history", "upgrade-workflow-history");
		};
		const openCompareView = async (compareVersionId) => {
			if (!isWorkflowDiffsEnabled.value) return;
			if (!versionId.value || versionId.value === compareVersionId) return;
			await router.push(createCompareRoute(compareVersionId));
			sendTelemetry("user_clicks_compare_workflows", { source: "version_history" });
		};
		const onDiffVersionsChange = async ({ sourceVersionId, targetVersionId }) => {
			if (!sourceVersionId || !targetVersionId) return;
			if (versionId.value === targetVersionId && diffWithVersionId.value === sourceVersionId) return;
			await router.push(createCompareRoute(sourceVersionId, targetVersionId));
		};
		const closeCompareView = async () => {
			if (uiStore.modalsById["workflowHistoryDiff"]?.open) uiStore.closeModal(WORKFLOW_HISTORY_DIFF_MODAL_KEY);
			const query = { ...route.query };
			delete query.diffWith;
			await router.replace({
				name: VIEWS.WORKFLOW_HISTORY,
				params: {
					workflowId: workflowId.value,
					versionId: versionId.value
				},
				query
			});
		};
		watchEffect(() => {
			const shouldOpenDiffModal = Boolean(isWorkflowDiffsEnabled.value && diffWithVersionId.value && versionId.value);
			const isDiffModalOpen = uiStore.modalsById[WORKFLOW_HISTORY_DIFF_MODAL_KEY]?.open;
			if (shouldOpenDiffModal && !isDiffModalOpen) uiStore.openModal(WORKFLOW_HISTORY_DIFF_MODAL_KEY);
			if (!shouldOpenDiffModal && isDiffModalOpen) uiStore.closeModal(WORKFLOW_HISTORY_DIFF_MODAL_KEY);
		});
		watchEffect(async () => {
			if (!versionId.value) return;
			try {
				const [workflowVersion, workflow] = await Promise.all([workflowHistoryStore.getWorkflowVersion(workflowId.value, versionId.value), workflowsListStore.fetchWorkflow(workflowId.value)]);
				selectedWorkflowVersion.value = workflowVersion;
				publishedWorkflow.value = workflow;
				sendTelemetry("User selected version");
			} catch (error) {
				const message = error instanceof Error ? error.message : void 0;
				if (message?.includes("version")) toast.showError(/* @__PURE__ */ new Error(`${message} "${versionId.value}"&nbsp;`), i18n.baseText("workflowHistory.title"));
				else {
					canRender.value = false;
					toast.showError(error, i18n.baseText("workflowHistory.title"));
				}
			}
		});
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.view) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(publishedWorkflow.value?.name), 1)]),
					_: 1
				}), publishedWorkflow.value?.isArchived ? (openBlock(), createElementBlock("span", _hoisted_1, [createVNode(unref(N8nBadge_default), {
					class: "ml-s",
					variant: "outline",
					"data-test-id": "workflow-archived-tag"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.item.archived")), 1)]),
					_: 1
				})])) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.corner) }, [createVNode(unref(Tabs_default), {
					modelValue: activeTab.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activeTab.value = $event),
					options: tabOptions.value,
					size: "small",
					"data-test-id": "workflow-history-tabs"
				}, null, 8, ["modelValue", "options"]), createVNode(_component_RouterLink, {
					to: editorRoute.value,
					class: normalizeClass(_ctx.$style.closeButton),
					"data-test-id": "workflow-history-close-button"
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "x",
						size: "small"
					})]),
					_: 1
				}, 8, ["to", "class"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.listComponentWrapper) }, [canRender.value && activeTab.value === "history" ? (openBlock(), createBlock(WorkflowHistoryList_default, {
					key: 0,
					items: workflowHistory.value,
					"last-received-items-length": lastReceivedItemsLength.value,
					"selected-item": selectedWorkflowVersion.value,
					actions: actions.value,
					"request-number-of-items": requestNumberOfItems.value,
					"should-upgrade": unref(workflowHistoryStore).shouldUpgrade,
					"evaluated-prune-time-in-hours": unref(workflowHistoryStore).evaluatedPruneTime,
					"is-list-loading": isListLoading.value,
					"published-version-id": publishedWorkflowVersionId.value,
					"pending-version-id": pendingVersionId.value,
					"is-workflow-diffs-enabled": isWorkflowDiffsEnabled.value,
					onAction,
					onPreview,
					onCompare: _cache[1] || (_cache[1] = ({ id }) => openCompareView(id)),
					onLoadMore: loadMore,
					onUpgrade
				}, null, 8, [
					"items",
					"last-received-items-length",
					"selected-item",
					"actions",
					"request-number-of-items",
					"should-upgrade",
					"evaluated-prune-time-in-hours",
					"is-list-loading",
					"published-version-id",
					"pending-version-id",
					"is-workflow-diffs-enabled"
				])) : createCommentVNode("", true), canRender.value && activeTab.value === "publishTimeline" ? (openBlock(), createBlock(WorkflowPublishTimelineContent_default, {
					key: workflowId.value,
					"workflow-id": workflowId.value,
					"selected-version-id": versionId.value,
					onSelectVersion: onSelectPublishTimelineVersion
				}, null, 8, ["workflow-id", "selected-version-id"])) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.contentComponentWrapper) }, [canRender.value ? (openBlock(), createBlock(WorkflowHistoryContent_default, {
					key: 0,
					workflow: publishedWorkflow.value,
					"workflow-version": selectedWorkflowVersion.value,
					"is-published": selectedWorkflowVersion.value?.versionId === publishedWorkflowVersionId.value,
					actions: actions.value,
					"is-list-loading": isListLoading.value,
					"is-first-item-shown": isFirstItemShown.value,
					"pending-version-id": pendingVersionId.value,
					onAction
				}, null, 8, [
					"workflow",
					"workflow-version",
					"is-published",
					"actions",
					"is-list-loading",
					"is-first-item-shown",
					"pending-version-id"
				])) : createCommentVNode("", true)], 2),
				isWorkflowDiffsEnabled.value && diffWithVersionId.value && versionId.value ? (openBlock(), createBlock(Modal_default, {
					key: 0,
					name: unref(WORKFLOW_HISTORY_DIFF_MODAL_KEY),
					"custom-class": _ctx.$style.workflowHistoryDiffModal,
					height: "100%",
					width: "100%",
					"max-width": "100%",
					"max-height": "100%",
					"close-on-press-escape": false,
					"show-close": false,
					"before-close": closeCompareView
				}, {
					content: withCtx(() => [(openBlock(), createBlock(WorkflowHistoryDiff_default, {
						key: `${versionId.value}:${diffWithVersionId.value}`,
						"workflow-id": workflowId.value,
						"source-workflow-version-id": diffWithVersionId.value,
						"target-workflow-version-id": versionId.value,
						"available-versions": workflowHistory.value,
						onVersionsChange: onDiffVersionsChange,
						onClose: closeCompareView
					}, null, 8, [
						"workflow-id",
						"source-workflow-version-id",
						"target-workflow-version-id",
						"available-versions"
					]))]),
					_: 1
				}, 8, ["name", "custom-class"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	view: "_view_6vvik_1",
	header: "_header_6vvik_11",
	corner: "_corner_6vvik_19",
	closeButton: "_closeButton_6vvik_29",
	contentComponentWrapper: "_contentComponentWrapper_6vvik_49",
	listComponentWrapper: "_listComponentWrapper_6vvik_54",
	workflowHistoryDiffModal: "_workflowHistoryDiffModal_6vvik_60"
} }]]);
//#endregion
export { WorkflowHistory_default as default };
