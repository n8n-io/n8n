import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Iu as useEventListener, Jd as defineComponent, Jf as toValue, Kd as createVNode, Kf as toRef, Ld as Teleport, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Pu as useElementSize, Rd as computed, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, Xo as useRouter, _f as resolveDirective, _p as normalizeClass, bd as I18nT, br as require_capitalize, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, of as onBeforeUnmount, pf as provide, rf as mergeProps, xr as require_FileSaver_min, yp as normalizeStyle, yu as computedAsync, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, $d as injectWorkflowDocumentStore, $x as MAX_DISPLAY_DATA_SIZE_LOGS_VIEW, Aj as N8nPulse_default, An as ViewSubExecution_default, Bd as injectWorkflowExecutionStateStore, Dn as InputPanel_default, Ex as WORKFLOW_SETTINGS_MODAL_KEY, Fp as useWorkflowHelpers, Hu as nodeViewEventBus, Jc as useNodeDirtiness, Jg as useUIStore, Kp as injectNDVStore, Ku as dataPinningEventBus, Ln as NodeErrorView_default, Ng as isTriggerPanelObject, Nn as convertToDisplayDateComponents, On as RunData_default, PA as useMessage, QM as useDeviceSupport, Rd as waitingNodeTooltip, Rk as jsonParse, Rn as RedactedDataState_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Sb as FORM_TRIGGER_NODE_TYPE, Tj as N8nResizeWrapper_default, Ur as useInjectWorkflowId, Vg as CanvasNodeDirtiness, Vu as ndvEventBus, Wm as getTriggerNodeServiceName, Xl as useNodeType, Yl as usePinnedData, Zl as useAiSimulatedDataGuard, _N as N8nText_default, _b as CHAT_TRIGGER_NODE_TYPE, _u as getNodeIconSize, bN as N8nSpinner_default, bb as EXECUTABLE_TRIGGER_NODE_TYPES, bu as useStyles, dd as useNodeHelpers, fC as VIEWS, fN as N8nTooltip_default, fk as getNodeOutputs, gl as parseAiContent, gu as useNodeIconSource, hC as useTelemetry, hM as N8nLink_default, hu as NodeIcon_default, jM as createEventBus, jN as useI18n, jk as NodeConnectionTypes, kj as N8nSegmentControl_default, ml as formatTokenUsageCount, nM as N8nInfoAccordion_default, nr as useTelemetryContext, pp as useNodeTypeRestriction, qy as APP_MODALS_ELEMENT_ID, rr as NodeExecuteButton_default, sm as LOCAL_STORAGE_NDV_PANEL_WIDTH, tM as N8nInfoTip_default, tr as NDVEmptyState_default, uf as useNodeTypesStore, ur as Draggable_default, vN as N8nIconButton_default, vd as useExternalHooks, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, zA as openSafeUrl, zn as useExecutionRedaction } from "./app-D5flEmb-.js";
import { t as useKeybindings } from "./useKeybindings-DShLgy_J.js";
import { n as useLogsExecutionData, o as ConsumedTokensDetails_default, r as LogsOverviewRows_default, s as findLogEntryById, t as useLogsTreeExpand, u as getConsumedTokens, y as isNodeLog } from "./useLogsTreeExpand-U8P-Iosx.js";
import { n as getReferencedData, r as getRespondingModelName } from "./utils-BURAX59V.js";
import { a as useNdvAgentConfig, i as NdvAgentConfigKey, t as NodeSettings_default, u as useNodeDocsUrl } from "./NodeSettings-VJ9rbDNa.js";
import { t as useExecutionData } from "./useExecutionData-B6YJChxh.js";
import { t as CopyInput_default } from "./CopyInput-OmhSMN7b.js";
import { t as RunDataParsedAiContent_default } from "./RunDataParsedAiContent-C4P9AkVr.js";
//#region src/features/ndv/panel/components/NDVHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var NDVHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NDVHeader",
	props: {
		nodeName: {},
		nodeTypeName: {},
		docsUrl: {},
		icon: {},
		readOnly: { type: Boolean }
	},
	emits: ["close", "rename"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const i18n = useI18n();
		const emit = __emit;
		const iconSize = computed(() => {
			const iconName = props.icon?.type === "icon" ? props.icon.name : void 0;
			return getNodeIconSize("ndvHeader", iconName);
		});
		function onRename(newNodeName) {
			emit("rename", newNodeName || props.nodeTypeName);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("header", { class: normalizeClass(_ctx.$style.ndvHeader) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [__props.icon ? (openBlock(), createBlock(NodeIcon_default, {
				key: 0,
				class: normalizeClass(_ctx.$style.icon),
				size: iconSize.value,
				"icon-source": __props.icon,
				"node-name": props.nodeTypeName,
				"show-tooltip": true
			}, null, 8, [
				"class",
				"size",
				"icon-source",
				"node-name"
			])) : createCommentVNode("", true), createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.title),
				"data-test-id": "node-title-container"
			}, [createVNode(unref(N8nInlineTextEdit_default), {
				"model-value": __props.nodeName,
				"min-width": 0,
				"max-width": 500,
				placeholder: unref(i18n).baseText("ndv.title.rename.placeholder"),
				"read-only": __props.readOnly,
				"onUpdate:modelValue": onRename
			}, null, 8, [
				"model-value",
				"placeholder",
				"read-only"
			])], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [__props.docsUrl ? (openBlock(), createBlock(unref(N8nLink_default), {
				key: 0,
				theme: "text",
				target: "_blank",
				href: __props.docsUrl
			}, {
				default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.docsLabel) }, [createVNode(unref(N8nText_default), {
					size: "small",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeSettings.docs")), 1)]),
					_: 1
				}), createVNode(unref(N8nIcon_default), { icon: "external-link" })], 2)]),
				_: 1
			}, 8, ["href"])) : createCommentVNode("", true), createVNode(unref(N8nTooltip_default), null, {
				content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("ndv.close.tooltip")), 1)]),
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					variant: "ghost",
					icon: "x",
					"data-test-id": "ndv-close-button",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
				})]),
				_: 1
			})], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	ndvHeader: "_ndvHeader_1e58b_2",
	content: "_content_1e58b_12",
	actions: "_actions_1e58b_19",
	title: "_title_1e58b_34",
	docsLabel: "_docsLabel_1e58b_39",
	icon: "_icon_1e58b_44"
} }]]);
//#endregion
//#region src/features/ndv/panel/composables/useNdvLayout.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useNdvLayout(options) {
	const MIN_MAIN_PANEL_WIDTH_PX = 368;
	const MIN_PANEL_WIDTH_PX = 120;
	const DEFAULT_INPUTLESS_MAIN_WIDTH_PX = 480;
	const DEFAULT_WIDE_MAIN_WIDTH_PX = 640;
	const DEFAULT_REGULAR_MAIN_WIDTH_PX = 420;
	const panelWidthPercentage = ref({
		left: 40,
		main: 20,
		right: 40
	});
	const localStorageKey = computed(() => `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_${toValue(options.paneType).toUpperCase()}`);
	const containerSize = useElementSize(options.container);
	const containerWidth = computed(() => containerSize.width.value);
	const percentageToPixels = (percentage) => {
		return percentage / 100 * containerWidth.value;
	};
	const pixelsToPercentage = (pixels) => {
		return pixels / containerWidth.value * 100;
	};
	const minMainPanelWidthPercentage = computed(() => pixelsToPercentage(MIN_MAIN_PANEL_WIDTH_PX));
	const panelWidthPixels = computed(() => ({
		left: percentageToPixels(panelWidthPercentage.value.left),
		main: percentageToPixels(panelWidthPercentage.value.main),
		right: percentageToPixels(panelWidthPercentage.value.right)
	}));
	const minPanelWidthPercentage = computed(() => pixelsToPercentage(MIN_PANEL_WIDTH_PX));
	const defaultPanelSize = computed(() => {
		switch (toValue(options.paneType)) {
			case "inputless": {
				const main = pixelsToPercentage(DEFAULT_INPUTLESS_MAIN_WIDTH_PX);
				return {
					left: 0,
					main,
					right: 100 - main
				};
			}
			case "wide": {
				const main = pixelsToPercentage(DEFAULT_WIDE_MAIN_WIDTH_PX);
				const panels = (100 - main) / 2;
				return {
					left: panels,
					main,
					right: panels
				};
			}
			default: {
				const main = pixelsToPercentage(DEFAULT_REGULAR_MAIN_WIDTH_PX);
				const panels = (100 - main) / 2;
				return {
					left: panels,
					main,
					right: panels
				};
			}
		}
	});
	const isUsablePanelSize = (size) => !!size && Number.isFinite(size.left) && Number.isFinite(size.main) && Number.isFinite(size.right);
	const safePanelWidth = ({ left, main, right }) => {
		const minLeft = toValue(options.hasInputPanel) ? minPanelWidthPercentage.value : 0;
		const minRight = minPanelWidthPercentage.value;
		const minMain = minMainPanelWidthPercentage.value;
		const newPanelWidth = {
			left: Math.max(minLeft, left),
			main: Math.max(minMain, main),
			right: Math.max(minRight, right)
		};
		const total = newPanelWidth.left + newPanelWidth.main + newPanelWidth.right;
		const sides = newPanelWidth.left + newPanelWidth.right;
		if (total !== 100 && sides > 0) {
			const diff = 100 - total;
			const leftShare = newPanelWidth.left / sides;
			newPanelWidth.left = Math.max(minLeft, newPanelWidth.left + diff * leftShare);
			newPanelWidth.right = Math.max(minRight, newPanelWidth.right + diff * (1 - leftShare));
		}
		return newPanelWidth;
	};
	const persistPanelSize = () => {
		if (!containerWidth.value || !isUsablePanelSize(panelWidthPercentage.value)) return;
		localStorage.setItem(localStorageKey.value, JSON.stringify(panelWidthPercentage.value));
	};
	const loadPanelSize = () => {
		if (!containerWidth.value) return;
		const storedPanelSizeString = localStorage.getItem(localStorageKey.value);
		const defaultSize = defaultPanelSize.value;
		if (storedPanelSizeString) {
			const storedPanelSize = jsonParse(storedPanelSizeString, { fallbackValue: defaultSize });
			panelWidthPercentage.value = safePanelWidth(isUsablePanelSize(storedPanelSize) ? storedPanelSize : defaultSize);
		} else panelWidthPercentage.value = safePanelWidth(defaultSize);
	};
	const onResizeEnd = () => {
		persistPanelSize();
	};
	const resetPanelSize = () => {
		localStorage.removeItem(localStorageKey.value);
		panelWidthPercentage.value = safePanelWidth(defaultPanelSize.value);
	};
	const onResize = (event) => {
		const newMain = Math.max(minMainPanelWidthPercentage.value, pixelsToPercentage(event.width));
		const initialLeft = panelWidthPercentage.value.left;
		const initialMain = panelWidthPercentage.value.main;
		const initialRight = panelWidthPercentage.value.right;
		const diffMain = newMain - initialMain;
		if (event.direction === "left") {
			const potentialLeft = initialLeft - diffMain;
			if (potentialLeft < minPanelWidthPercentage.value) return;
			const newLeft = Math.max(minPanelWidthPercentage.value, potentialLeft);
			panelWidthPercentage.value = safePanelWidth({
				left: newLeft,
				main: newMain,
				right: initialRight
			});
		} else if (event.direction === "right") {
			const potentialRight = initialRight - diffMain;
			if (potentialRight < minPanelWidthPercentage.value) return;
			const newRight = Math.max(minPanelWidthPercentage.value, potentialRight);
			panelWidthPercentage.value = safePanelWidth({
				left: initialLeft,
				main: newMain,
				right: newRight
			});
		}
	};
	const onDrag = (position) => {
		const newLeft = Math.max(minPanelWidthPercentage.value, pixelsToPercentage(position[0]) - panelWidthPercentage.value.main / 2);
		const newRight = Math.max(minPanelWidthPercentage.value, 100 - newLeft - panelWidthPercentage.value.main);
		if (newLeft + panelWidthPercentage.value.main + newRight > 100) return;
		panelWidthPercentage.value.left = newLeft;
		panelWidthPercentage.value.right = newRight;
	};
	watch(containerWidth, (newWidth) => {
		if (!newWidth) return;
		loadPanelSize();
	});
	watch(toRef(options.paneType), () => {
		loadPanelSize();
	}, { immediate: true });
	return {
		containerWidth,
		panelWidthPercentage,
		panelWidthPixels,
		onResize,
		onDrag,
		onResizeEnd,
		resetPanelSize
	};
}
//#endregion
//#region src/features/ndv/runData/components/RunInfo.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RunInfo_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RunInfo",
	props: {
		taskData: {},
		hasStaleData: { type: Boolean },
		hasPinData: { type: Boolean }
	},
	setup(__props) {
		const i18n = useI18n();
		const props = __props;
		const runTaskData = computed(() => {
			return props.taskData;
		});
		const theme = computed(() => {
			return props.taskData?.error ? "danger" : "success";
		});
		const runMetadata = computed(() => {
			if (!runTaskData.value) return null;
			const { date, time } = convertToDisplayDateComponents(runTaskData.value.startTime);
			return {
				executionTime: runTaskData.value.executionTime,
				startTime: `${date} at ${time}`
			};
		});
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return __props.hasStaleData ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
				key: 0,
				theme: "warning-light",
				type: "tooltip",
				"tooltip-placement": "right",
				"data-test-id": "node-run-info-stale"
			}, {
				default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText(__props.hasPinData ? "ndv.output.staleDataWarning.pinData" : "ndv.output.staleDataWarning.regular")]])]),
				_: 1
			})) : runMetadata.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.tooltipRow)
			}, [__props.taskData?.executionStatus !== "canceled" ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
				key: 0,
				type: "note",
				theme: theme.value,
				"data-test-id": `node-run-status-${theme.value}`,
				size: "large"
			}, null, 8, ["theme", "data-test-id"])) : createCommentVNode("", true), createVNode(unref(N8nInfoTip_default), {
				type: "tooltip",
				theme: "info",
				class: normalizeClass(_ctx.$style.infoTooltip),
				"data-test-id": `node-run-info`,
				"tooltip-placement": "right"
			}, {
				default: withCtx(() => [createBaseVNode("div", null, [
					createVNode(unref(N8nText_default), {
						bold: true,
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(runTaskData.value?.error ? unref(i18n).baseText("runData.executionStatus.failed") : runTaskData.value?.executionStatus === "canceled" ? unref(i18n).baseText("runData.executionStatus.canceled") : unref(i18n).baseText("runData.executionStatus.success")), 1)]),
						_: 1
					}),
					_cache[0] || (_cache[0] = createBaseVNode("br", null, null, -1)),
					createVNode(unref(N8nText_default), {
						bold: true,
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("runData.startTime") + ":"), 1)]),
						_: 1
					}),
					createTextVNode(" " + toDisplayString(runMetadata.value.startTime), 1),
					_cache[1] || (_cache[1] = createBaseVNode("br", null, null, -1)),
					createVNode(unref(N8nText_default), {
						bold: true,
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("runData.executionTime") + ":"), 1)]),
						_: 1
					}),
					createTextVNode(" " + toDisplayString(runMetadata.value.executionTime) + " " + toDisplayString(unref(i18n).baseText("runData.ms")), 1)
				])]),
				_: 1
			}, 8, ["class"])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	tooltipRow: "_tooltipRow_b95tu_1",
	infoTooltip: "_infoTooltip_b95tu_7"
} }]]);
//#endregion
//#region src/features/ndv/runData/components/ai/AiRunContentBlock.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var import_capitalize = /* @__PURE__ */ __toESM(require_capitalize(), 1);
var import_FileSaver_min = /* @__PURE__ */ __toESM(require_FileSaver_min(), 1);
var AiRunContentBlock_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AiRunContentBlock",
	props: {
		runData: {},
		error: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const isExpanded = ref(getInitialExpandedState());
		const renderType = ref("rendered");
		const dataSize = ref(0);
		const showData = ref(false);
		const dataSizeInMB = computed(() => (dataSize.value / 1048576).toFixed(1));
		const parsedRun = computed(() => parseAiContent(props.runData.data ?? [], props.runData.type));
		const contentParsed = computed(() => parsedRun.value.some((item) => item.parsedContent?.parsed === true));
		function getInitialExpandedState() {
			return !{
				input: [NodeConnectionTypes.AiDocument, NodeConnectionTypes.AiTextSplitter],
				output: [
					NodeConnectionTypes.AiDocument,
					NodeConnectionTypes.AiEmbedding,
					NodeConnectionTypes.AiTextSplitter,
					NodeConnectionTypes.AiVectorStore
				]
			}[props.runData.inOut].includes(props.runData.type);
		}
		function onBlockHeaderClick() {
			isExpanded.value = !isExpanded.value;
		}
		function onRenderTypeChange(value) {
			renderType.value = value;
		}
		function updateShowData() {
			showData.value = dataSize.value < MAX_DISPLAY_DATA_SIZE_LOGS_VIEW;
		}
		function refreshDataSize() {
			showData.value = false;
			dataSize.value = new Blob([JSON.stringify(props.runData.data)]).size;
			updateShowData();
		}
		function onShowDataAnyway() {
			showData.value = true;
		}
		function downloadJsonData() {
			const fileName = props.runData.inOut === "input" ? "input_data" : "output_data";
			const blob = new Blob([JSON.stringify(props.runData.data, null, 2)], { type: "application/json" });
			(0, import_FileSaver_min.saveAs)(blob, `${fileName}.json`);
		}
		onMounted(() => {
			refreshDataSize();
		});
		watch(() => props.runData.data, () => {
			refreshDataSize();
		});
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.block) }, [createBaseVNode("header", {
				class: normalizeClass(_ctx.$style.blockHeader),
				onClick: onBlockHeaderClick
			}, [
				createBaseVNode("button", { class: normalizeClass(_ctx.$style.blockToggle) }, [createVNode(unref(N8nIcon_default), {
					icon: isExpanded.value ? "chevron-down" : "chevron-right",
					size: "large"
				}, null, 8, ["icon"])], 2),
				createBaseVNode("p", { class: normalizeClass(_ctx.$style.blockTitle) }, toDisplayString(unref(import_capitalize.default)(__props.runData.inOut)), 3),
				contentParsed.value && !__props.error && isExpanded.value ? (openBlock(), createBlock(unref(N8nSegmentControl_default), {
					key: 0,
					size: "small",
					"model-value": renderType.value,
					class: normalizeClass(_ctx.$style.rawSwitch),
					options: [{
						label: "Rendered",
						value: "rendered"
					}, {
						label: "JSON",
						value: "json"
					}],
					"onUpdate:modelValue": onRenderTypeChange
				}, null, 8, ["model-value", "class"])) : createCommentVNode("", true)
			], 2), createBaseVNode("main", { class: normalizeClass({
				[_ctx.$style.blockContent]: true,
				[_ctx.$style.blockContentExpanded]: isExpanded.value
			}) }, [__props.error ? (openBlock(), createBlock(NodeErrorView_default, {
				key: 0,
				error: __props.error,
				class: normalizeClass(_ctx.$style.error),
				"show-details": ""
			}, null, 8, ["error", "class"])) : showData.value ? (openBlock(), createBlock(RunDataParsedAiContent_default, {
				key: 1,
				data: __props.runData.data,
				type: __props.runData.type,
				content: parsedRun.value,
				"render-type": renderType.value
			}, null, 8, [
				"data",
				"type",
				"content",
				"render-type"
			])) : (openBlock(), createElementBlock("section", {
				key: 2,
				class: normalizeClass(_ctx.$style.warning)
			}, [createVNode(NDVEmptyState_default, {
				title: unref(i18n).baseText("ndv.tooMuchData.title", { interpolate: { size: dataSizeInMB.value } }),
				class: normalizeClass(_ctx.$style.warningState)
			}, {
				default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("ndv.tooMuchData.message")]])]),
				_: 1
			}, 8, ["title", "class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.warningActions) }, [createVNode(unref(N8nButton_default), {
				variant: "outline",
				size: "small",
				label: unref(i18n).baseText("runData.downloadBinaryData"),
				onClick: withModifiers(downloadJsonData, ["stop"])
			}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
				size: "small",
				label: unref(i18n).baseText("ndv.tooMuchData.showDataAnyway"),
				onClick: withModifiers(onShowDataAnyway, ["stop"])
			}, null, 8, ["label"])], 2)], 2))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	block: "_block_1ag1t_1",
	blockContent: "_blockContent_1ag1t_8",
	blockContentExpanded: "_blockContentExpanded_1ag1t_12",
	rawSwitch: "_rawSwitch_1ag1t_16",
	blockHeader: "_blockHeader_1ag1t_26",
	blockTitle: "_blockTitle_1ag1t_39",
	blockToggle: "_blockToggle_1ag1t_46",
	error: "_error_1ag1t_54",
	warning: "_warning_1ag1t_58",
	warningState: "_warningState_1ag1t_67",
	warningActions: "_warningActions_1ag1t_71"
} }]]);
//#endregion
//#region src/features/ndv/runData/components/ai/RunDataAiContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$2 = { key: 0 };
var _hoisted_2$1 = { key: 1 };
var _hoisted_3$1 = { key: 2 };
var _hoisted_4$1 = {
	key: 4,
	"data-test-id": "ai-responding-model"
};
var RunDataAiContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RunDataAiContent",
	props: { inputData: {} },
	setup(__props) {
		const props = __props;
		const data = computed(() => props.inputData.runData ? getReferencedData(props.inputData.runData) : void 0);
		const nodeTypesStore = useNodeTypesStore();
		const i18n = useI18n();
		const consumedTokensSum = computed(() => getConsumedTokens(outputRun.value?.data ?? []));
		const respondingModelName = computed(() => getRespondingModelName(outputRun.value?.data ?? []));
		function extractRunMeta(run) {
			const uiNode = props.inputData.node;
			const nodeType = nodeTypesStore.getNodeType(uiNode?.type ?? "");
			return {
				startTimeMs: run.metadata.startTime,
				executionTimeMs: run.metadata.executionTime,
				node: nodeType,
				type: run.inOut,
				connectionType: run.type,
				subExecution: run.metadata?.subExecution
			};
		}
		const outputRun = computed(() => {
			return data.value?.find((r) => r.inOut === "output");
		});
		const runMeta = computed(() => {
			if (outputRun.value === void 0) return;
			return extractRunMeta(outputRun.value);
		});
		const outputError = computed(() => props.inputData.runData?.error);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [runMeta.value?.node ? (openBlock(), createBlock(NodeIcon_default, {
				key: 0,
				class: normalizeClass(_ctx.$style.nodeIcon),
				"node-type": runMeta.value.node,
				size: 20
			}, null, 8, ["class", "node-type"])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerWrap) }, [createBaseVNode("p", { class: normalizeClass(_ctx.$style.title) }, toDisplayString(__props.inputData.node.name), 3), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.meta) }, [
				runMeta.value?.startTimeMs ? (openBlock(), createElementBlock("li", _hoisted_1$2, toDisplayString(runMeta.value?.executionTimeMs) + "ms", 1)) : createCommentVNode("", true),
				runMeta.value?.startTimeMs ? (openBlock(), createElementBlock("li", _hoisted_2$1, [createVNode(unref(N8nTooltip_default), null, {
					content: withCtx(() => [createTextVNode(toDisplayString(new Date(runMeta.value?.startTimeMs).toLocaleString()), 1)]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("runData.aiContentBlock.startedAt", { interpolate: { startTime: new Date(runMeta.value?.startTimeMs).toLocaleTimeString() } })), 1)]),
					_: 1
				})])) : createCommentVNode("", true),
				runMeta.value ? (openBlock(), createElementBlock("li", _hoisted_3$1, [createVNode(ViewSubExecution_default, {
					"task-metadata": runMeta.value,
					"display-mode": "ai",
					inline: true
				}, null, 8, ["task-metadata"])])) : createCommentVNode("", true),
				(consumedTokensSum.value?.totalTokens ?? 0) > 0 ? (openBlock(), createElementBlock("li", {
					key: 3,
					class: normalizeClass(_ctx.$style.tokensUsage)
				}, [createTextVNode(toDisplayString(unref(i18n).baseText("runData.aiContentBlock.tokens", { interpolate: { count: unref(formatTokenUsageCount)(consumedTokensSum.value, "total") } })) + " ", 1), createVNode(unref(N8nInfoTip_default), {
					type: "tooltip",
					theme: "info-light",
					"tooltip-placement": "right"
				}, {
					default: withCtx(() => [createVNode(ConsumedTokensDetails_default, { "consumed-tokens": consumedTokensSum.value }, null, 8, ["consumed-tokens"])]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				respondingModelName.value ? (openBlock(), createElementBlock("li", _hoisted_4$1, [createVNode(unref(N8nTooltip_default), null, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("runData.aiContentBlock.model.tooltip")), 1)]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("runData.aiContentBlock.model", { interpolate: { model: respondingModelName.value } })), 1)]),
					_: 1
				})])) : createCommentVNode("", true)
			], 2)], 2)], 2), (openBlock(true), createElementBlock(Fragment, null, renderList(data.value ?? [], (run, index) => {
				return openBlock(), createElementBlock("main", {
					key: index,
					class: normalizeClass(_ctx.$style.content)
				}, [createVNode(AiRunContentBlock_default, {
					"run-data": run,
					error: run.inOut === "output" ? outputError.value : void 0
				}, null, 8, ["run-data", "error"])], 2);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1ddvo_2",
	nodeIcon: "_nodeIcon_1ddvo_5",
	header: "_header_1ddvo_8",
	headerWrap: "_headerWrap_1ddvo_14",
	title: "_title_1ddvo_18",
	meta: "_meta_1ddvo_25",
	tokensUsage: "_tokensUsage_1ddvo_41"
} }]]);
//#endregion
//#region src/features/ndv/runData/components/ai/RunDataAi.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RunDataAi_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RunDataAi",
	props: {
		node: {},
		runIndex: { default: 0 }
	},
	setup(__props) {
		const i18n = useI18n();
		const filter = computed(() => ({
			rootNodeId: __props.node.id,
			rootNodeRunIndex: __props.runIndex
		}));
		const { entries, execution, latestNodeNameById, loadSubExecution } = useLogsExecutionData({ filter });
		const { flatLogEntries, toggleExpanded } = useLogsTreeExpand(entries, loadSubExecution);
		const selected = shallowRef();
		const selectedNodeEntry = computed(() => selected.value && isNodeLog(selected.value) ? selected.value : void 0);
		function select(entry) {
			selected.value = entry && isNodeLog(entry) && entry.node.id === __props.node.id ? void 0 : entry;
		}
		watch(entries, (latestEntries) => {
			if (!selected.value || findLogEntryById(selected.value.id, latestEntries) === void 0) selected.value = latestEntries[0]?.children[0];
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [unref(flatLogEntries).length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(LogsOverviewRows_default, {
				class: normalizeClass(_ctx.$style.tree),
				"is-compact": "",
				"is-read-only": "",
				"flat-log-entries": unref(flatLogEntries),
				"should-show-token-count-column": false,
				"latest-node-info": unref(latestNodeNameById),
				selected: selected.value,
				"can-open-ndv": false,
				execution: unref(execution),
				onToggleExpanded: unref(toggleExpanded),
				onSelect: select
			}, null, 8, [
				"class",
				"flat-log-entries",
				"latest-node-info",
				"selected",
				"execution",
				"onToggleExpanded"
			]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.runData) }, [selectedNodeEntry.value ? (openBlock(), createBlock(RunDataAiContent_default, {
				key: 0,
				"input-data": selectedNodeEntry.value
			}, null, 8, ["input-data"])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.empty)
			}, [createVNode(unref(N8nText_default), { size: "large" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("ndv.output.ai.empty", { interpolate: { node: __props.node.name } })), 1)]),
				_: 1
			})], 2))], 2)], 64)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.noData)
			}, toDisplayString(unref(i18n).baseText("ndv.output.ai.waiting")), 3))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	noData: "_noData_13eh9_1",
	empty: "_empty_13eh9_9",
	tree: "_tree_13eh9_13",
	runData: "_runData_13eh9_20",
	container: "_container_13eh9_26"
} }]]);
//#endregion
//#region src/features/ndv/panel/components/OutputPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var OutputPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OutputPanel",
	props: {
		runIndex: {},
		isReadOnly: { type: Boolean },
		linkedRuns: { type: Boolean },
		canLinkRuns: { type: Boolean },
		pushRef: {},
		blockUI: {
			type: Boolean,
			default: false
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false
		},
		isPaneActive: {
			type: Boolean,
			default: false
		},
		displayMode: {}
	},
	emits: [
		"linkRun",
		"unlinkRun",
		"runChange",
		"activatePane",
		"tableMounted",
		"itemHover",
		"search",
		"openSettings",
		"execute",
		"displayModeChange"
	],
	setup(__props, { emit: __emit }) {
		const OUTPUT_TYPE = {
			REGULAR: "regular",
			LOGS: "logs"
		};
		const props = __props;
		const emit = __emit;
		const workflowId = useInjectWorkflowId();
		const ndvStore = injectNDVStore();
		const nodeTypesStore = useNodeTypesStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const activeNode = computed(() => ndvStore.value.activeNode);
		const { dirtinessByName } = useNodeDirtiness(() => workflowDocumentStore.value.documentId);
		const uiStore = useUIStore();
		const { isSubNodeType } = useNodeType({ node: activeNode });
		const pinnedData = usePinnedData(activeNode, {
			runIndex: props.runIndex,
			displayMode: props.displayMode
		});
		const outputMode = ref(OUTPUT_TYPE.REGULAR);
		const outputTypes = ref([{
			label: i18n.baseText("ndv.output.outType.regular"),
			value: OUTPUT_TYPE.REGULAR
		}, {
			label: i18n.baseText("ndv.output.outType.logs"),
			value: OUTPUT_TYPE.LOGS
		}]);
		const runDataRef = ref();
		const collapsingColumnName = ref(null);
		const workflowObject = computed(() => workflowDocumentStore.value.getWorkflowObjectAccessorSnapshot());
		const node = computed(() => {
			return ndvStore.value.activeNode ?? void 0;
		});
		const { hasNodeRun, workflowExecution, workflowRunData, nodeRunData } = useExecutionData({ node });
		const { canReveal, reason, revealData, credentialToShare, openCredentialSharing } = useExecutionRedaction();
		const isTriggerNode = computed(() => {
			return !!node.value && nodeTypesStore.isTriggerNode(node.value.type);
		});
		const noOutputActionLabel = computed(() => i18n.baseText(isTriggerNode.value ? "ndv.output.noOutputData.trigger.action" : "ndv.output.noOutputData.notRun.action"));
		const hasAiMetadata = computed(() => {
			if (isNodeRunning.value || !workflowRunData.value) return false;
			if (node.value) {
				const resultData = workflowDocumentStore.value.getParentNodes(node.value.name, "ALL_NON_MAIN").map(workflowExecutionStateStore.value.getActiveExecutionRunDataByNodeName);
				return resultData && Array.isArray(resultData) && resultData.length > 0;
			}
			return false;
		});
		const hasError = computed(() => Boolean(nodeRunData.value?.[props.runIndex]?.error));
		const defaultOutputMode = computed(() => {
			return hasError.value && hasAiMetadata.value ? OUTPUT_TYPE.LOGS : OUTPUT_TYPE.REGULAR;
		});
		const isNodeRunning = computed(() => {
			return workflowRunning.value && !!node.value && workflowExecutionStateStore.value.executingNode.isNodeExecuting(node.value.name);
		});
		const workflowRunning = computed(() => workflowExecutionStateStore.value.isWorkflowRunning);
		const runTaskData = computed(() => {
			if (!node.value || workflowExecution.value === null) return null;
			return nodeRunData.value?.[props.runIndex] ?? null;
		});
		const runsCount = computed(() => nodeRunData.value?.length ?? 0);
		const staleData = computed(() => {
			if (!node.value) return false;
			return dirtinessByName.value[node.value.name] === CanvasNodeDirtiness.PARAMETERS_UPDATED;
		});
		const outputPanelEditMode = computed(() => {
			return ndvStore.value.outputPanelEditMode;
		});
		const canPinData = computed(() => {
			return pinnedData.isValidNodeType.value && !props.isReadOnly;
		});
		const allToolsWereUnusedNotice = computed(() => {
			if (!node.value || runsCount.value === 0 || hasError.value) return void 0;
			if (pinnedData.hasData.value) return void 0;
			const toolsAvailable = workflowDocumentStore.value.getParentNodes(node.value.name, NodeConnectionTypes.AiTool, 1);
			const toolsUsedInLatestRun = toolsAvailable.filter((tool) => !!workflowRunData.value?.[tool]?.[props.runIndex]);
			if (toolsAvailable.length > 0 && toolsUsedInLatestRun.length === 0 && !workflowRunning.value) return i18n.baseText("ndv.output.noToolUsedInfo");
			else return;
		});
		const insertTestData = () => {
			if (!runDataRef.value) return;
			runDataRef.value.enterEditMode({ origin: "insertTestDataLink" });
			telemetry.track("User clicked ndv link", {
				workflow_id: workflowId.value,
				push_ref: props.pushRef,
				node_type: node.value?.type,
				pane: "output",
				type: "insert-test-data"
			});
		};
		const onLinkRun = () => {
			emit("linkRun");
		};
		const onUnlinkRun = () => {
			emit("unlinkRun");
		};
		const openSettings = () => {
			emit("openSettings");
			telemetry.track("User clicked ndv link", {
				node_type: node.value?.type,
				workflow_id: workflowId.value,
				push_ref: props.pushRef,
				pane: "output",
				type: "settings"
			});
		};
		const openWorkflowSettings = () => {
			uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
		};
		const onRunIndexChange = (run) => {
			emit("runChange", run);
		};
		onMounted(() => {
			outputMode.value = defaultOutputMode.value;
		});
		watch(defaultOutputMode, (newValue, oldValue) => {
			if (newValue === OUTPUT_TYPE.LOGS && oldValue === OUTPUT_TYPE.REGULAR && hasNodeRun.value) outputMode.value = defaultOutputMode.value;
		});
		const activatePane = () => {
			emit("activatePane");
		};
		function handleChangeCollapsingColumn(columnName) {
			collapsingColumnName.value = columnName;
		}
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createBlock(RunData_default, {
				ref_key: "runDataRef",
				ref: runDataRef,
				class: normalizeClass(_ctx.$style.runData),
				node: node.value,
				"workflow-object": workflowObject.value,
				"run-index": __props.runIndex,
				"linked-runs": __props.linkedRuns,
				"can-link-runs": __props.canLinkRuns,
				"no-data-in-branch-message": unref(i18n).baseText("ndv.output.noOutputDataInBranch"),
				"is-executing": isNodeRunning.value,
				"executing-message": unref(i18n).baseText("ndv.output.executing"),
				"push-ref": __props.pushRef,
				"block-u-i": __props.blockUI,
				"is-production-execution-preview": __props.isProductionExecutionPreview,
				"search-shortcut": __props.isPaneActive ? "/" : void 0,
				"hide-pagination": outputMode.value === "logs",
				"pane-type": "output",
				"data-output-type": outputMode.value,
				"callout-message": allToolsWereUnusedNotice.value,
				"display-mode": __props.displayMode,
				"disable-ai-content": true,
				"collapsing-table-column-name": collapsingColumnName.value,
				"data-test-id": "ndv-output-panel",
				onActivatePane: activatePane,
				onRunChange: onRunIndexChange,
				onLinkRun,
				onUnlinkRun,
				onTableMounted: _cache[4] || (_cache[4] = ($event) => emit("tableMounted", $event)),
				onItemHover: _cache[5] || (_cache[5] = ($event) => emit("itemHover", $event)),
				onSearch: _cache[6] || (_cache[6] = ($event) => emit("search", $event)),
				onDisplayModeChange: _cache[7] || (_cache[7] = ($event) => emit("displayModeChange", $event)),
				onCollapsingTableColumnChanged: handleChangeCollapsingColumn
			}, createSlots({
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleSection) }, [hasAiMetadata.value ? (openBlock(), createBlock(unref(N8nSegmentControl_default), {
					key: 0,
					modelValue: outputMode.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => outputMode.value = $event),
					"data-test-id": "ai-output-mode-select",
					options: outputTypes.value
				}, null, 8, ["modelValue", "options"])) : (openBlock(), createElementBlock("span", {
					key: 1,
					class: normalizeClass(_ctx.$style.title)
				}, toDisplayString(unref(i18n).baseText(outputPanelEditMode.value.enabled ? "ndv.output.edit" : "ndv.output")), 3)), unref(hasNodeRun) && !unref(pinnedData).hasData.value && (runsCount.value === 1 || runsCount.value > 0 && staleData.value) ? withDirectives((openBlock(), createBlock(RunInfo_default, {
					key: 2,
					"task-data": runTaskData.value,
					"has-stale-data": staleData.value,
					"has-pin-data": unref(pinnedData).hasData.value
				}, null, 8, [
					"task-data",
					"has-stale-data",
					"has-pin-data"
				])), [[vShow, !outputPanelEditMode.value.enabled]]) : createCommentVNode("", true)], 2)]),
				"node-not-run": withCtx(() => [__props.isReadOnly ? (openBlock(), createBlock(NDVEmptyState_default, {
					key: 0,
					title: unref(i18n).baseText(isTriggerNode.value ? "ndv.output.noOutputData.trigger.title" : "ndv.output.noOutputData.notRun.title")
				}, null, 8, ["title"])) : (openBlock(), createBlock(NDVEmptyState_default, {
					key: 1,
					title: unref(i18n).baseText(isTriggerNode.value ? "ndv.output.noOutputData.trigger.title" : "ndv.output.noOutputData.notRun.title"),
					"has-compact-action": ""
				}, createSlots({
					default: withCtx(() => [!canPinData.value || unref(isSubNodeType) ? (openBlock(), createBlock(unref(I18nT), {
						key: 0,
						tag: "span",
						keypath: unref(isSubNodeType) ? "ndv.output.runNodeHintSubNode" : "ndv.output.noOutputData.notRun.description",
						scope: "global"
					}, {
						link: withCtx(() => [createVNode(NodeExecuteButton_default, {
							"hide-icon": "",
							transparent: "",
							variant: "outline",
							"node-name": activeNode.value?.name ?? "",
							label: noOutputActionLabel.value,
							"telemetry-source": "inputs",
							onExecute: _cache[1] || (_cache[1] = ($event) => emit("execute"))
						}, null, 8, ["node-name", "label"]), _cache[9] || (_cache[9] = createBaseVNode("br", null, null, -1))]),
						_: 1
					}, 8, ["keypath"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
						createVNode(NodeExecuteButton_default, {
							"hide-icon": "",
							transparent: "",
							variant: "outline",
							"node-name": activeNode.value?.name ?? "",
							label: noOutputActionLabel.value,
							"telemetry-source": "inputs",
							onExecute: _cache[2] || (_cache[2] = ($event) => emit("execute"))
						}, null, 8, ["node-name", "label"]),
						_cache[10] || (_cache[10] = createBaseVNode("br", null, null, -1)),
						createTextVNode(" " + toDisplayString(unref(i18n).baseText("generic.or")) + " ", 1),
						createVNode(unref(N8nText_default), {
							tag: "a",
							size: "medium",
							color: "primary",
							onClick: insertTestData
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("ndv.output.insertTestData")), 1)]),
							_: 1
						})
					], 64))]),
					actions: withCtx(() => [createVNode(NodeExecuteButton_default, {
						"icon-only": "",
						"hide-label": "",
						variant: "outline",
						size: "medium",
						"node-name": activeNode.value?.name ?? "",
						"aria-label": noOutputActionLabel.value,
						tooltip: noOutputActionLabel.value,
						"telemetry-source": "inputs",
						"data-test-id": "execute-step-compact",
						onExecute: _cache[3] || (_cache[3] = ($event) => emit("execute"))
					}, null, 8, [
						"node-name",
						"aria-label",
						"tooltip"
					])]),
					_: 2
				}, [isTriggerNode.value ? {
					name: "icon",
					fn: withCtx(() => [_cache[8] || (_cache[8] = createBaseVNode("svg", {
						width: "16",
						viewBox: "0 0 14 18",
						fill: "none",
						xmlns: "http://www.w3.org/2000/svg"
					}, [createBaseVNode("path", {
						d: "M10.9062 2.40625L8.5 8.03125H12C12.4062 8.03125 12.7812 8.28125 12.9375 8.65625C13.0625 9.0625 12.9688 9.5 12.6562 9.78125L4.65625 16.7812C4.28125 17.0625 3.78125 17.0938 3.40625 16.8125C3.03125 16.5625 2.875 16.0625 3.0625 15.625L5.46875 10H2C1.5625 10 1.1875 9.75 1.0625 9.375C0.90625 8.96875 1 8.53125 1.3125 8.25L9.3125 1.25C9.6875 0.96875 10.1875 0.9375 10.5625 1.21875C10.9375 1.46875 11.0938 1.96875 10.9062 2.40625Z",
						fill: "currentColor"
					})], -1))]),
					key: "0"
				} : {
					name: "icon",
					fn: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "arrow-right-from-line",
						size: "xlarge"
					})]),
					key: "1"
				}]), 1032, ["title"]))]),
				"node-waiting": withCtx(() => [createVNode(NDVEmptyState_default, {
					title: unref(i18n).baseText("ndv.output.waitNodeWaiting.title"),
					wide: ""
				}, {
					default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(waitingNodeTooltip)(node.value, workflowObject.value, runTaskData.value?.metadata)]])]),
					_: 1
				}, 8, ["title"])]),
				"no-output-data": withCtx(() => [createVNode(NDVEmptyState_default, { title: unref(i18n).baseText("ndv.output.noOutputData.title") }, {
					default: withCtx(() => [
						createTextVNode(toDisplayString(unref(i18n).baseText("ndv.output.noOutputData.message")) + " ", 1),
						createBaseVNode("a", { onClick: openSettings }, toDisplayString(unref(i18n).baseText("ndv.output.noOutputData.message.settings")), 1),
						createTextVNode(" " + toDisplayString(unref(i18n).baseText("ndv.output.noOutputData.message.settingsOption")), 1)
					]),
					_: 1
				}, 8, ["title"])]),
				"recovered-artificial-output-data": withCtx(() => [createVNode(NDVEmptyState_default, { title: unref(i18n).baseText("executionDetails.executionFailed.recoveredNodeTitle") }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionDetails.executionFailed.recoveredNodeMessage")), 1)]),
					_: 1
				}, 8, ["title"])]),
				"data-redacted": withCtx(() => [createVNode(RedactedDataState_default, {
					title: unref(i18n).baseText("ndv.output.redacted.title"),
					reason: unref(reason),
					"can-reveal": unref(canReveal),
					"credential-to-share": unref(credentialToShare),
					onShareCredential: unref(openCredentialSharing),
					onOpenSettings: openWorkflowSettings,
					onReveal: unref(revealData)
				}, null, 8, [
					"title",
					"reason",
					"can-reveal",
					"credential-to-share",
					"onShareCredential",
					"onReveal"
				])]),
				"redacted-error": withCtx(() => [createVNode(RedactedDataState_default, {
					title: unref(i18n).baseText("ndv.output.redacted.title"),
					reason: unref(reason),
					"can-reveal": unref(canReveal),
					"credential-to-share": unref(credentialToShare),
					onShareCredential: unref(openCredentialSharing),
					onOpenSettings: openWorkflowSettings,
					onReveal: unref(revealData)
				}, null, 8, [
					"title",
					"reason",
					"can-reveal",
					"credential-to-share",
					"onShareCredential",
					"onReveal"
				])]),
				_: 2
			}, [outputMode.value === "logs" && node.value ? {
				name: "content",
				fn: withCtx(() => [createVNode(RunDataAi_default, {
					node: node.value,
					"run-index": __props.runIndex,
					"workflow-object": workflowObject.value
				}, null, 8, [
					"node",
					"run-index",
					"workflow-object"
				])]),
				key: "0"
			} : void 0, !unref(pinnedData).hasData.value && runsCount.value > 1 ? {
				name: "run-info",
				fn: withCtx(() => [createVNode(RunInfo_default, { "task-data": runTaskData.value }, null, 8, ["task-data"])]),
				key: "1"
			} : void 0]), 1032, [
				"class",
				"node",
				"workflow-object",
				"run-index",
				"linked-runs",
				"can-link-runs",
				"no-data-in-branch-message",
				"is-executing",
				"executing-message",
				"push-ref",
				"block-u-i",
				"is-production-execution-preview",
				"search-shortcut",
				"hide-pagination",
				"data-output-type",
				"callout-message",
				"display-mode",
				"collapsing-table-column-name"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	runData: "_runData_g1f68_6",
	outputTypeSelect: "_outputTypeSelect_g1f68_10",
	titleSection: "_titleSection_g1f68_15",
	title: "_title_g1f68_15",
	noOutputData: "_noOutputData_g1f68_32",
	link: "_link_g1f68_42"
} }]]);
//#endregion
//#region src/features/ndv/panel/components/PanelDragButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PanelDragButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PanelDragButton",
	emits: [
		"drag",
		"dragstart",
		"dragend"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const onDrag = (e) => {
			emit("drag", e);
		};
		const onDragEnd = () => {
			emit("dragend");
		};
		const onDragStart = () => {
			emit("dragstart");
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Draggable_default, {
				class: normalizeClass(_ctx.$style.dragContainer),
				type: "panel-resize",
				cursor: "ew-resize",
				"data-test-id": "panel-drag-button",
				onDrag,
				onDragstart: onDragStart,
				onDragend: onDragEnd
			}, {
				default: withCtx(({ isDragging }) => [createBaseVNode("button", { class: normalizeClass([_ctx.$style.dragButton, { [_ctx.$style.dragging]: isDragging }]) }, [
					createVNode(unref(N8nIcon_default), {
						class: normalizeClass(_ctx.$style.arrow),
						icon: "arrow-left"
					}, null, 8, ["class"]),
					createVNode(unref(N8nIcon_default), {
						class: normalizeClass(_ctx.$style.handle),
						icon: "menu"
					}, null, 8, ["class"]),
					createVNode(unref(N8nIcon_default), {
						class: normalizeClass(_ctx.$style.arrow),
						icon: "arrow-right"
					}, null, 8, ["class"])
				], 2)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	dragButton: "_dragButton_1qm27_1",
	arrow: "_arrow_1qm27_16",
	handle: "_handle_1qm27_20",
	dragging: "_dragging_1qm27_24"
} }]]);
//#endregion
//#region src/features/ndv/panel/components/TriggerPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { key: "empty" };
var _hoisted_2 = { key: 0 };
var _hoisted_3 = ["data-ndv-empty-state", "data-ndv-pane-min"];
var _hoisted_4 = {
	key: 0,
	class: "mb-xl"
};
var _hoisted_5 = ["textContent"];
var TriggerPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TriggerPanel",
	props: {
		nodeName: {},
		pushRef: { default: "" }
	},
	emits: ["activate", "execute"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const workflowId = useInjectWorkflowId();
		const nodesTypeStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
		const ndvStore = injectNDVStore();
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const executionsHelpEventBus = createEventBus();
		const help = ref(null);
		const node = computed(() => workflowDocumentStore?.value?.getNodeByName(props.nodeName) ?? null);
		const nodeType = computed(() => {
			if (node.value) return nodesTypeStore.getNodeType(node.value.type, node.value.typeVersion);
			return null;
		});
		const triggerPanel = computed(() => {
			const panel = nodeType.value?.triggerPanel;
			if (isTriggerPanelObject(panel)) return panel;
		});
		const hideContent = computed(() => {
			const hideContent = triggerPanel.value?.hideContent;
			if (typeof hideContent === "boolean") return hideContent;
			if (node.value) {
				const hideContentValue = workflowDocumentStore?.value?.getExpressionHandler().getSimpleParameterValue(node.value, hideContent, "internal", {});
				if (typeof hideContentValue === "boolean") return hideContentValue;
			}
			return false;
		});
		const hasIssues = computed(() => {
			return Boolean(node.value?.issues && (node.value.issues.parameters ?? node.value.issues.credentials));
		});
		const serviceName = computed(() => {
			if (nodeType.value) return getTriggerNodeServiceName(nodeType.value);
			return "";
		});
		const displayChatButton = computed(() => {
			return Boolean(node.value && node.value.type === "@n8n/n8n-nodes-langchain.chatTrigger" && node.value.parameters.mode !== "webhook");
		});
		const isWebhookNode = computed(() => {
			return Boolean(node.value && node.value.type === "n8n-nodes-base.webhook");
		});
		const webhookHttpMethod = computedAsync(async () => {
			if (!node.value || !nodeType.value?.webhooks?.length) return;
			const httpMethod = await workflowHelpers.getWebhookExpressionValue(nodeType.value.webhooks[0], "httpMethod", false);
			if (Array.isArray(httpMethod)) return httpMethod.join(", ");
			return httpMethod;
		}, void 0);
		const webhookTestUrl = computedAsync(async () => {
			if (!node.value || !nodeType.value?.webhooks?.length) return;
			return await workflowHelpers.getWebhookUrl(nodeType.value.webhooks[0], node.value, "test");
		}, void 0);
		const isWebhookBasedNode = computed(() => {
			return Boolean(nodeType.value?.webhooks?.length);
		});
		const isPollingNode = computed(() => {
			return Boolean(nodeType.value?.polling);
		});
		const isListeningForEvents = computed(() => {
			if (!node.value || node.value.disabled || !isWebhookBasedNode.value) return false;
			if (!workflowExecutionStateStore.value.executionWaitingForWebhook) return false;
			const executedNode = workflowExecutionStateStore.value.activeExecutionExecutedNode;
			const isCurrentNodeExecuted = executedNode === props.nodeName;
			const isChildNodeExecuted = executedNode ? workflowDocumentStore?.value?.getParentNodes(executedNode).includes(props.nodeName) ?? false : false;
			return !executedNode || isCurrentNodeExecuted || isChildNodeExecuted;
		});
		const workflowRunning = computed(() => workflowExecutionStateStore.value.isWorkflowRunning);
		const isActivelyPolling = computed(() => {
			const triggeredNode = workflowExecutionStateStore.value.activeExecutionExecutedNode;
			return workflowRunning.value && isPollingNode.value && props.nodeName === triggeredNode;
		});
		const isWorkflowActive = computed(() => workflowDocumentStore?.value?.active ?? false);
		const listeningTitle = computed(() => {
			return nodeType.value?.name === "n8n-nodes-base.formTrigger" ? i18n.baseText("ndv.trigger.webhookNode.formTrigger.listening") : i18n.baseText("ndv.trigger.webhookNode.listening");
		});
		const listeningHint = computed(() => {
			switch (nodeType.value?.name) {
				case CHAT_TRIGGER_NODE_TYPE: return i18n.baseText("ndv.trigger.webhookBasedNode.chatTrigger.serviceHint");
				case FORM_TRIGGER_NODE_TYPE: return i18n.baseText("ndv.trigger.webhookBasedNode.formTrigger.serviceHint");
				default: return i18n.baseText("ndv.trigger.webhookBasedNode.serviceHint", { interpolate: { service: serviceName.value } });
			}
		});
		const header = computed(() => {
			if (isActivelyPolling.value) return i18n.baseText("ndv.trigger.pollingNode.fetchingEvent");
			if (triggerPanel.value?.header) return triggerPanel.value.header;
			if (isWebhookBasedNode.value) return i18n.baseText("ndv.trigger.webhookBasedNode.action", { interpolate: { name: serviceName.value } });
			return "";
		});
		const subheader = computed(() => {
			if (isActivelyPolling.value) return i18n.baseText("ndv.trigger.pollingNode.fetchingHint", { interpolate: { name: serviceName.value } });
			return "";
		});
		const executionsHelp = computed(() => {
			if (triggerPanel.value?.executionsHelp) {
				if (typeof triggerPanel.value.executionsHelp === "string") return triggerPanel.value.executionsHelp;
				if (!isWorkflowActive.value && triggerPanel.value.executionsHelp.inactive) return triggerPanel.value.executionsHelp.inactive;
				if (isWorkflowActive.value && triggerPanel.value.executionsHelp.active) return triggerPanel.value.executionsHelp.active;
			}
			if (isWebhookBasedNode.value) {
				if (isWorkflowActive.value) return i18n.baseText("ndv.trigger.webhookBasedNode.executionsHelp.active", { interpolate: { service: serviceName.value } });
				else return i18n.baseText("ndv.trigger.webhookBasedNode.executionsHelp.inactive", { interpolate: { service: serviceName.value } });
			}
			if (isPollingNode.value) {
				if (isWorkflowActive.value) return i18n.baseText("ndv.trigger.pollingNode.executionsHelp.active", { interpolate: { service: serviceName.value } });
				else return i18n.baseText("ndv.trigger.pollingNode.executionsHelp.inactive", { interpolate: { service: serviceName.value } });
			}
			return "";
		});
		const activationHint = computed(() => {
			if (isActivelyPolling.value || !triggerPanel.value) return "";
			if (triggerPanel.value.activationHint) {
				if (typeof triggerPanel.value.activationHint === "string") return triggerPanel.value.activationHint;
				if (!isWorkflowActive.value && typeof triggerPanel.value.activationHint.inactive === "string") return triggerPanel.value.activationHint.inactive;
				if (isWorkflowActive.value && typeof triggerPanel.value.activationHint.active === "string") return triggerPanel.value.activationHint.active;
			}
			if (isWebhookBasedNode.value) {
				if (isWorkflowActive.value) return i18n.baseText("ndv.trigger.webhookBasedNode.activationHint.active", { interpolate: { service: serviceName.value } });
				else return i18n.baseText("ndv.trigger.webhookBasedNode.activationHint.inactive", { interpolate: { service: serviceName.value } });
			}
			if (isPollingNode.value) {
				if (isWorkflowActive.value) return i18n.baseText("ndv.trigger.pollingNode.activationHint.active", { interpolate: { service: serviceName.value } });
				else return i18n.baseText("ndv.trigger.pollingNode.activationHint.inactive", { interpolate: { service: serviceName.value } });
			}
			return "";
		});
		const expandExecutionHelp = () => {
			if (help.value) executionsHelpEventBus.emit("expand");
		};
		const openWebhookUrl = () => {
			telemetry.track("User clicked ndv link", {
				workflow_id: workflowId.value,
				push_ref: props.pushRef,
				pane: "input",
				type: "open-chat"
			});
			window.open(webhookTestUrl.value, "_blank", "noreferrer");
		};
		const onLinkClick = (e) => {
			if (!e.target) return;
			const target = e.target;
			if (target.localName !== "a") return;
			if (target.dataset?.key) {
				e.stopPropagation();
				e.preventDefault();
				if (target.dataset.key === "activate") emit("activate");
				else if (target.dataset.key === "executions") {
					telemetry.track("User clicked ndv link", {
						workflow_id: workflowId.value,
						push_ref: props.pushRef,
						pane: "input",
						type: "open-executions-log"
					});
					ndvStore.value.unsetActiveNodeName();
					router.push({ name: VIEWS.EXECUTIONS });
				} else if (target.dataset.key === "settings") uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			}
		};
		const onTestLinkCopied = () => {
			telemetry.track("User copied webhook URL", {
				pane: "inputs",
				type: "test url"
			});
		};
		const onNodeExecute = () => {
			emit("execute");
		};
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createVNode(Transition, {
				name: "fade",
				mode: "out-in"
			}, {
				default: withCtx(() => [hasIssues.value || hideContent.value ? (openBlock(), createElementBlock("div", _hoisted_1$1)) : isListeningForEvents.value ? (openBlock(), createElementBlock("div", {
					key: "listening",
					class: normalizeClass(_ctx.$style.action),
					"data-test-id": "trigger-listening",
					"data-ndv-empty-state": ""
				}, [createVNode(unref(N8nPulse_default), null, {
					default: withCtx(() => [createVNode(NodeIcon_default, {
						"node-type": nodeType.value,
						size: 40
					}, null, 8, ["node-type"])]),
					_: 1
				}), isWebhookNode.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.action)
				}, [
					createVNode(unref(N8nText_default), {
						tag: "div",
						size: "large",
						color: "text-dark",
						class: "mb-2xs",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("ndv.trigger.webhookNode.listening")), 1)]),
						_: 1
					}),
					createBaseVNode("div", { class: normalizeClass([_ctx.$style.shake, "mb-xs"]) }, [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("ndv.trigger.webhookNode.requestHint", { interpolate: { type: unref(webhookHttpMethod) ?? "" } })), 1)]),
						_: 1
					})], 2),
					createVNode(unref(N8nTooltip_default), {
						content: unref(webhookTestUrl),
						placement: "top",
						"as-child": ""
					}, {
						default: withCtx(() => [createVNode(CopyInput_default, {
							value: unref(webhookTestUrl),
							"toast-title": unref(i18n).baseText("ndv.trigger.copiedTestUrl"),
							class: normalizeClass(["mb-2xl", _ctx.$style.webhookUrl]),
							size: "medium",
							collapse: true,
							truncate: "start",
							"copy-button-text": unref(i18n).baseText("generic.clickToCopy"),
							onCopy: onTestLinkCopied
						}, null, 8, [
							"value",
							"toast-title",
							"class",
							"copy-button-text"
						])]),
						_: 1
					}, 8, ["content"]),
					createVNode(NodeExecuteButton_default, {
						"data-test-id": "trigger-execute-button",
						"node-name": __props.nodeName,
						size: "medium",
						"telemetry-source": "inputs",
						onExecute: onNodeExecute
					}, null, 8, ["node-name"])
				], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.action)
				}, [
					createVNode(unref(N8nText_default), {
						tag: "div",
						size: "large",
						color: "text-dark",
						class: "mb-2xs",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(listeningTitle.value), 1)]),
						_: 1
					}),
					createBaseVNode("div", { class: normalizeClass([_ctx.$style.shake, "mb-xs"]) }, [createVNode(unref(N8nText_default), { tag: "div" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(listeningHint.value), 1)]),
						_: 1
					})], 2),
					displayChatButton.value ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nButton_default), {
						class: "mb-xl",
						onClick: _cache[0] || (_cache[0] = ($event) => openWebhookUrl())
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("ndv.trigger.chatTrigger.openChat")), 1)]),
						_: 1
					})])) : createCommentVNode("", true),
					createVNode(NodeExecuteButton_default, {
						"data-test-id": "trigger-execute-button",
						"node-name": __props.nodeName,
						size: "medium",
						"telemetry-source": "inputs",
						onExecute: onNodeExecute
					}, null, 8, ["node-name"])
				], 2))], 2)) : (openBlock(), createElementBlock("div", {
					key: "default",
					"data-ndv-empty-state": isWebhookNode.value ? "" : void 0,
					"data-ndv-pane-min": isWebhookNode.value ? void 0 : ""
				}, [
					isActivelyPolling.value ? (openBlock(), createElementBlock("div", _hoisted_4, [createVNode(unref(N8nSpinner_default), {
						type: "brand",
						size: "xxlarge"
					})])) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.action) }, [createBaseVNode("div", {
						"data-test-id": "trigger-header",
						class: normalizeClass(_ctx.$style.header)
					}, [header.value ? (openBlock(), createBlock(unref(N8nHeading_default), {
						key: 0,
						tag: "h1",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(header.value), 1)]),
						_: 1
					})) : createCommentVNode("", true), subheader.value ? (openBlock(), createBlock(unref(N8nText_default), { key: 1 }, {
						default: withCtx(() => [createBaseVNode("span", { textContent: toDisplayString(subheader.value) }, null, 8, _hoisted_5)]),
						_: 1
					})) : createCommentVNode("", true)], 2), isWebhookNode.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.fullListen) }, [createVNode(NodeExecuteButton_default, {
						"data-test-id": "trigger-execute-button",
						"node-name": __props.nodeName,
						size: "medium",
						"telemetry-source": "inputs",
						onExecute: onNodeExecute
					}, null, 8, ["node-name"])], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.compactListen) }, [createVNode(NodeExecuteButton_default, {
						"icon-only": "",
						"hide-label": "",
						size: "medium",
						"node-name": __props.nodeName,
						"aria-label": unref(i18n).baseText("ndv.execute.listenForTestEvent"),
						tooltip: unref(i18n).baseText("ndv.execute.listenForTestEvent"),
						"telemetry-source": "inputs",
						"data-test-id": "trigger-execute-button-compact",
						onExecute: onNodeExecute
					}, null, 8, [
						"node-name",
						"aria-label",
						"tooltip"
					])], 2)], 64)) : (openBlock(), createBlock(NodeExecuteButton_default, {
						key: 1,
						"data-test-id": "trigger-execute-button",
						"node-name": __props.nodeName,
						size: "medium",
						"telemetry-source": "inputs",
						onExecute: onNodeExecute
					}, null, 8, ["node-name"]))], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.hints) }, [
						activationHint.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							onClick: onLinkClick
						}, {
							default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, activationHint.value]]), _cache[1] || (_cache[1] = createTextVNode("\xA0 ", -1))]),
							_: 1
						})) : createCommentVNode("", true),
						activationHint.value && executionsHelp.value ? (openBlock(), createBlock(unref(N8nLink_default), {
							key: 1,
							size: "small",
							onClick: expandExecutionHelp
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("ndv.trigger.moreInfo")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						executionsHelp.value ? (openBlock(), createBlock(unref(N8nInfoAccordion_default), {
							key: 2,
							ref_key: "help",
							ref: help,
							class: normalizeClass(_ctx.$style.accordion),
							title: unref(i18n).baseText("ndv.trigger.executionsHint.question"),
							description: executionsHelp.value,
							"event-bus": unref(executionsHelpEventBus),
							"onClick:body": onLinkClick
						}, null, 8, [
							"class",
							"title",
							"description",
							"event-bus"
						])) : createCommentVNode("", true)
					], 2)
				], 8, _hoisted_3))]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_pg5ih_1",
	header: "_header_pg5ih_18",
	action: "_action_pg5ih_25",
	webhookUrl: "_webhookUrl_pg5ih_36",
	fullListen: "_fullListen_pg5ih_41",
	compactListen: "_compactListen_pg5ih_45",
	hints: "_hints_pg5ih_56",
	shake: "_shake_pg5ih_60",
	accordion: "_accordion_pg5ih_81"
} }], ["__scopeId", "data-v-ea68c530"]]);
//#endregion
//#region src/app/composables/useCanvasOnlyExternalLinks.ts
init_reactivity_esm_bundler();
function shouldOpenInNewTab(href) {
	return href !== null && href !== "" && !href.startsWith("#") && !href.startsWith("javascript:");
}
/**
* Makes any link clicked inside the Node Details View open in a new tab, if
* N8N_CANVAS_ONLY is enabled.
*/
function useCanvasOnlyExternalLinks(root) {
	const settingsStore = useSettingsStore();
	const onClick = (event) => {
		if (event.defaultPrevented) return;
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const target = event.target;
		if (!(target instanceof Element)) return;
		const anchor = target.closest("a");
		if (!anchor || !shouldOpenInNewTab(anchor.getAttribute("href"))) return;
		event.preventDefault();
		openSafeUrl(anchor.href);
	};
	useEventListener(() => settingsStore.isCanvasOnly ? toValue(root) : void 0, "click", onClick, { capture: true });
}
//#endregion
//#region src/features/ndv/panel/components/NDVFloatingNodes.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = [
	"data-node-name",
	"data-node-placement",
	"onClick"
];
var NDVFloatingNodes_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NDVFloatingNodes",
	props: { rootNode: {} },
	emits: ["switchSelectedNode"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const nodeTypesStore = useNodeTypesStore();
		const emit = __emit;
		function moveNodeDirection(direction) {
			const matchedDirectionNode = connectedNodes.value[direction][0];
			if (matchedDirectionNode) emit("switchSelectedNode", matchedDirectionNode.node.name);
		}
		function onKeyDown(e) {
			if (e.shiftKey && e.altKey && (e.ctrlKey || e.metaKey)) {
				const matchingDirection = {
					ArrowUp: "outputSub",
					ArrowRight: "outputMain",
					ArrowLeft: "inputMain"
				}[e.key] || null;
				if (matchingDirection) moveNodeDirection(matchingDirection);
			}
		}
		function getINodesFromNames(names) {
			return names.map((name) => {
				const node = workflowDocumentStore?.value?.getNodeByName(name) ?? null;
				if (node) {
					const nodeType = nodeTypesStore.getNodeType(node.type);
					if (nodeType) return {
						node,
						nodeType
					};
				}
				return null;
			}).filter((n) => n !== null);
		}
		const connectedNodes = computed(() => {
			const rootName = props.rootNode.name;
			return {
				["outputSub"]: getINodesFromNames(workflowDocumentStore?.value?.getChildNodes(rootName, "ALL_NON_MAIN") ?? []),
				["outputMain"]: getINodesFromNames(workflowDocumentStore?.value?.getChildNodes(rootName, NodeConnectionTypes.Main, 1) ?? []).reverse(),
				["inputMain"]: getINodesFromNames(workflowDocumentStore?.value?.getParentNodes(rootName, NodeConnectionTypes.Main, 1) ?? []).reverse()
			};
		});
		const connectionGroups = [
			"outputSub",
			"outputMain",
			"inputMain"
		];
		const tooltipPositionMapper = {
			["outputSub"]: "bottom",
			["outputMain"]: "left",
			["inputMain"]: "right"
		};
		onMounted(() => {
			document.addEventListener("keydown", onKeyDown, true);
		});
		onBeforeUnmount(() => {
			document.removeEventListener("keydown", onKeyDown, true);
		});
		__expose({ moveNodeDirection });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(_ctx.$style.floatingNodes),
				"data-test-id": "floating-nodes"
			}, [(openBlock(), createElementBlock(Fragment, null, renderList(connectionGroups, (connectionGroup) => {
				return createBaseVNode("ul", {
					key: connectionGroup,
					class: normalizeClass([_ctx.$style.nodesList, _ctx.$style[connectionGroup]])
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(connectedNodes.value[connectionGroup], ({ node, nodeType }) => {
					return openBlock(), createElementBlock(Fragment, null, [node && nodeType ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: node.name,
						placement: tooltipPositionMapper[connectionGroup],
						teleported: false,
						offset: 16
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(node.name), 1)]),
						default: withCtx(() => [createBaseVNode("li", {
							class: normalizeClass(_ctx.$style.connectedNode),
							"data-test-id": "floating-node",
							"data-node-name": node.name,
							"data-node-placement": connectionGroup,
							onClick: ($event) => emit("switchSelectedNode", node.name)
						}, [createVNode(NodeIcon_default, {
							"node-type": nodeType,
							"node-name": node.name,
							"tooltip-position": tooltipPositionMapper[connectionGroup],
							size: 24,
							circle: ""
						}, null, 8, [
							"node-type",
							"node-name",
							"tooltip-position"
						])], 10, _hoisted_1)]),
						_: 2
					}, 1032, ["placement"])) : createCommentVNode("", true)], 64);
				}), 256))], 2);
			}), 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	floatingNodes: "_floatingNodes_1pkmt_1",
	nodesList: "_nodesList_1pkmt_11",
	inputSub: "_inputSub_1pkmt_25",
	outputSub: "_outputSub_1pkmt_25",
	outputMain: "_outputMain_1pkmt_38",
	inputMain: "_inputMain_1pkmt_38",
	connectedNode: "_connectedNode_1pkmt_51"
} }]]);
//#endregion
//#region src/features/ndv/shared/views/NodeDetailsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var NodeDetailsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeDetailsView",
	props: {
		readOnly: {
			type: Boolean,
			default: false
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"valueChanged",
		"switchSelectedNode",
		"openConnectionNodeCreator",
		"renameNode",
		"stopExecution",
		"replaceNode"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const props = __props;
		const ndvStore = injectNDVStore();
		const externalHooks = useExternalHooks();
		const nodeHelpers = useNodeHelpers();
		const activeNode = computed(() => ndvStore.value.activeNode);
		const { isRestricted } = useNodeTypeRestriction(() => activeNode.value?.type);
		const pinnedData = usePinnedData(activeNode);
		provide(NdvAgentConfigKey, useNdvAgentConfig(activeNode));
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const deviceSupport = useDeviceSupport();
		const workflowId = useInjectWorkflowId();
		const telemetry = useTelemetry();
		const telemetryContext = useTelemetryContext({ view_shown: "ndv" });
		const i18n = useI18n();
		const message = useMessage();
		const aiSimulatedDataGuard = useAiSimulatedDataGuard();
		const { APP_Z_INDEXES } = useStyles();
		const settingsEventBus = createEventBus();
		const runInputIndex = ref(-1);
		const runOutputIndex = computed(() => ndvStore.value.output.run ?? -1);
		const isLinkingEnabled = ref(true);
		const selectedInput = ref();
		const triggerWaitingWarningEnabled = ref(false);
		const isDragging = ref(false);
		const mainPanelPosition = ref(0);
		const pinDataDiscoveryTooltipVisible = ref(false);
		const avgInputRowHeight = ref(0);
		const avgOutputRowHeight = ref(0);
		const isInputPaneActive = ref(false);
		const isOutputPaneActive = ref(false);
		const isPairedItemHoveringEnabled = ref(true);
		const dialogRef = ref();
		const containerRef = useTemplateRef("containerRef");
		const mainPanelRef = useTemplateRef("mainPanelRef");
		useCanvasOnlyExternalLinks(dialogRef);
		const pushRef = computed(() => ndvStore.value.pushRef);
		const workflowObject = computed(() => workflowDocumentStore?.value?.getWorkflowObjectAccessorSnapshot());
		const activeNodeType = computed(() => {
			if (activeNode.value) return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
			return null;
		});
		const isDeprecatedNode = computed(() => activeNodeType.value?.deprecated === true);
		const { docsUrl } = useNodeDocsUrl({ nodeType: activeNodeType });
		const workflowRunning = computed(() => uiStore.isActionActive.workflowRunning);
		const workflowRunData = computed(() => {
			if (workflowExecution.value === null) return null;
			const executionData = workflowExecution.value.data;
			if (executionData?.resultData) return executionData.resultData.runData;
			return null;
		});
		const parentNodes = computed(() => {
			if (activeNode.value) return workflowDocumentStore.value.getParentNodesByDepth(activeNode.value.name, 1).map(({ name }) => name) || [];
			else return [];
		});
		const parentNode = computed(() => {
			for (const parentNodeName of parentNodes.value) {
				if (workflowDocumentStore?.value?.pinnedDataByNodeName?.[parentNodeName]) return parentNodeName;
				if (workflowRunData.value?.[parentNodeName]) return parentNodeName;
			}
			return parentNodes.value[0];
		});
		const inputNodeName = computed(() => {
			if ((activeNode.value && activeNodeType.value && workflowObject.value ? getNodeOutputs(workflowObject.value, activeNode.value, activeNodeType.value) : []).filter((output) => {
				if (typeof output === "string") return output !== NodeConnectionTypes.Main;
				return output.type !== NodeConnectionTypes.Main;
			}).length > 0 && activeNode.value) return workflowDocumentStore.value.getChildNodes(activeNode.value.name, "ALL_NON_MAIN")?.[0];
			return selectedInput.value || parentNode.value;
		});
		const inputNode = computed(() => {
			if (inputNodeName.value) return workflowDocumentStore?.value?.getNodeByName(inputNodeName.value) ?? null;
			return null;
		});
		const inputSize = computed(() => ndvStore.value.ndvInputDataWithPinnedData.length);
		const isTriggerNode = computed(() => !!activeNodeType.value && activeNodeType.value.group.includes("trigger"));
		const showTriggerPanel = computed(() => {
			const override = !!activeNodeType.value?.triggerPanel;
			if (typeof activeNodeType.value?.triggerPanel === "boolean") return override;
			const isWebhookBasedNode = !!activeNodeType.value?.webhooks?.length;
			const isPollingNode = activeNodeType.value?.polling;
			return !props.readOnly && !isRestricted.value && isTriggerNode.value && (isWebhookBasedNode || isPollingNode || override);
		});
		const isExecutableTriggerNode = computed(() => {
			if (!activeNodeType.value) return false;
			return EXECUTABLE_TRIGGER_NODE_TYPES.includes(activeNodeType.value.name);
		});
		const isActiveStickyNode = computed(() => !!ndvStore.value.activeNode && ndvStore.value.activeNode.type === "n8n-nodes-base.stickyNote");
		const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
		const workflowExecution = computed(() => workflowExecutionStateStore.value.activeExecution);
		const maxOutputRun = computed(() => {
			if (activeNode.value === null) return 0;
			const runData = workflowRunData.value;
			if (!runData?.[activeNode.value.name]) return 0;
			if (runData[activeNode.value.name].length) return runData[activeNode.value.name].length - 1;
			return 0;
		});
		const outputRun = computed(() => runOutputIndex.value === -1 ? maxOutputRun.value : Math.min(runOutputIndex.value, maxOutputRun.value));
		const maxInputRun = computed(() => {
			if (inputNode.value === null || activeNode.value === null) return 0;
			const workflowNode = workflowDocumentStore.value.getNodeByName(activeNode.value.name);
			if (!workflowNode || !activeNodeType.value || !workflowObject.value) return 0;
			const outputs = getNodeOutputs(workflowObject.value, workflowNode, activeNodeType.value);
			let node = inputNode.value;
			const runData = workflowRunData.value;
			if (outputs.some((output) => output !== NodeConnectionTypes.Main)) node = activeNode.value;
			if (!node || !runData?.hasOwnProperty(node.name)) return 0;
			if (runData[node.name].length) return runData[node.name].length - 1;
			return 0;
		});
		const inputRun = computed(() => {
			if (isLinkingEnabled.value && maxOutputRun.value === maxInputRun.value) return outputRun.value;
			if (runInputIndex.value === -1) return maxInputRun.value;
			return Math.min(runInputIndex.value, maxInputRun.value);
		});
		const canLinkRuns = computed(() => maxOutputRun.value > 0 && maxOutputRun.value === maxInputRun.value);
		const linked = computed(() => isLinkingEnabled.value && canLinkRuns.value);
		const outputPanelEditMode = computed(() => ndvStore.value.outputPanelEditMode);
		const isWorkflowRunning = computed(() => uiStore.isActionActive.workflowRunning);
		const isExecutionWaitingForWebhook = computed(() => workflowExecutionStateStore.value.executionWaitingForWebhook);
		const blockUi = computed(() => isWorkflowRunning.value || isExecutionWaitingForWebhook.value);
		const foreignCredentials = computed(() => nodeHelpers.getForeignCredentialsIfSharingEnabled(activeNode.value?.credentials));
		const hasForeignCredential = computed(() => foreignCredentials.value.length > 0);
		const inputPanelDisplayMode = computed(() => ndvStore.value.inputPanelDisplayMode);
		const outputPanelDisplayMode = computed(() => ndvStore.value.outputPanelDisplayMode);
		const hasInputPanel = computed(() => !isTriggerNode.value || showTriggerPanel.value);
		const supportedResizeDirections = computed(() => hasInputPanel.value ? ["left", "right"] : ["right"]);
		const nodeSettingsProps = computed(() => ({
			eventBus: settingsEventBus,
			dragging: isDragging.value,
			pushRef: pushRef.value,
			foreignCredentials: foreignCredentials.value,
			readOnly: props.readOnly,
			blockUI: blockUi.value && showTriggerPanel.value,
			executable: !props.readOnly,
			inputSize: inputSize.value
		}));
		const { containerWidth, onDrag, onResize, onResizeEnd, resetPanelSize, panelWidthPercentage, panelWidthPixels } = useNdvLayout({
			container: containerRef,
			hasInputPanel,
			paneType: computed(() => {
				if (!hasInputPanel.value) return "inputless";
				return activeNodeType.value?.parameterPane ?? "regular";
			})
		});
		function onResizeHandleDblClick(event) {
			if (event.target?.closest("[data-test-id=\"resize-handle\"], [data-test-id=\"panel-drag-button\"]")) resetPanelSize();
		}
		const icon = useNodeIconSource(activeNodeType, activeNode);
		const setIsTooltipVisible = ({ isTooltipVisible }) => {
			pinDataDiscoveryTooltipVisible.value = isTooltipVisible;
		};
		const setSelectedInput = (value) => {
			selectedInput.value = value;
		};
		const onKeyDown = (e) => {
			if (e.key === "s" && deviceSupport.isCtrlKeyPressed(e)) e.preventDefault();
		};
		const onInputItemHover = (e) => {
			if (e === null || !inputNodeName.value || !isPairedItemHoveringEnabled.value) {
				ndvStore.value.setHoveringItem(null);
				return;
			}
			const item = {
				nodeName: inputNodeName.value,
				runIndex: inputRun.value,
				outputIndex: e.outputIndex,
				itemIndex: e.itemIndex
			};
			ndvStore.value.setHoveringItem(item);
		};
		const onInputTableMounted = (e) => {
			avgInputRowHeight.value = e.avgRowHeight;
		};
		const onWorkflowActivate = () => {
			ndvStore.value.unsetActiveNodeName();
			nodeViewEventBus.emit("publishWorkflow");
		};
		const onOutputItemHover = (e) => {
			if (e === null || !activeNode.value || !isPairedItemHoveringEnabled.value) {
				ndvStore.value.setHoveringItem(null);
				return;
			}
			const item = {
				nodeName: activeNode.value?.name,
				runIndex: outputRun.value,
				outputIndex: e.outputIndex,
				itemIndex: e.itemIndex
			};
			ndvStore.value.setHoveringItem(item);
		};
		const onDragEnd = () => {
			onResizeEnd();
			isDragging.value = false;
			telemetry.track("User moved parameters pane", {
				window_width: containerWidth.value,
				start_position: mainPanelPosition.value,
				node_type: activeNodeType.value ? activeNodeType.value.name : "",
				push_ref: pushRef.value,
				workflow_id: workflowId.value
			});
		};
		const onDragStart = () => {
			isDragging.value = true;
		};
		const onLinkRunToOutput = () => {
			isLinkingEnabled.value = true;
			trackLinking("output");
		};
		const onUnlinkRun = (pane) => {
			runInputIndex.value = runOutputIndex.value;
			isLinkingEnabled.value = false;
			trackLinking(pane);
		};
		const onNodeExecute = () => {
			setTimeout(() => {
				if (!activeNode.value || !workflowRunning.value) return;
				triggerWaitingWarningEnabled.value = true;
			}, 1e3);
		};
		const openSettings = () => {
			settingsEventBus.emit("openSettings");
		};
		const onReplaceNode = async (nodeId) => {
			await close();
			emit("replaceNode", nodeId);
		};
		const trackLinking = (pane) => {
			telemetry.track("User changed ndv run linking", {
				node_type: activeNodeType.value ? activeNodeType.value.name : "",
				push_ref: pushRef.value,
				linked: linked.value,
				pane
			});
		};
		const onLinkRunToInput = () => {
			ndvStore.value.setOutputRunIndex(runInputIndex.value);
			isLinkingEnabled.value = true;
			trackLinking("input");
		};
		const onSwitchSelectedNode = (nodeTypeName) => {
			emit("switchSelectedNode", nodeTypeName);
		};
		const onOpenConnectionNodeCreator = (nodeTypeName, connectionType) => {
			emit("openConnectionNodeCreator", nodeTypeName, connectionType);
		};
		const close = async () => {
			if (isDragging.value) return;
			if (outputPanelEditMode.value.enabled && activeNode.value) {
				const editsSimulatedOutput = aiSimulatedDataGuard.isSimulatedNodeOutput(workflowExecutionStateStore.value.activeExecution?.id, activeNode.value.name);
				if (await message.confirm(editsSimulatedOutput ? i18n.baseText("ndv.pinData.aiSimulated.confirm.description") : "", i18n.baseText("ndv.pinData.beforeClosing.title"), {
					...editsSimulatedOutput ? { type: "warning" } : {},
					confirmButtonText: i18n.baseText("ndv.pinData.beforeClosing.confirm"),
					cancelButtonText: i18n.baseText("ndv.pinData.beforeClosing.cancel")
				}) === "confirm") {
					const { value } = outputPanelEditMode.value;
					try {
						pinnedData.setData(jsonParse(value), "on-ndv-close-modal");
					} catch (error) {
						console.error(error);
					}
				}
				ndvStore.value.setOutputPanelEditModeEnabled(false);
			}
			await externalHooks.run("dataDisplay.nodeEditingFinished");
			telemetry.track("User closed node modal", {
				node_type: activeNodeType.value ? activeNodeType.value?.name : "",
				push_ref: pushRef.value,
				workflow_id: workflowId.value
			});
			triggerWaitingWarningEnabled.value = false;
			ndvStore.value.unsetActiveNodeName();
			ndvStore.value.resetNDVPushRef();
		};
		useKeybindings({ Escape: close });
		const trackRunChange = (run, pane) => {
			telemetry.track("User changed ndv run dropdown", {
				push_ref: pushRef.value,
				run_index: run,
				node_type: activeNodeType.value ? activeNodeType.value?.name : "",
				pane
			});
		};
		const onRunOutputIndexChange = (run) => {
			ndvStore.value.setOutputRunIndex(run);
			trackRunChange(run, "output");
		};
		const onRunInputIndexChange = (run) => {
			runInputIndex.value = run;
			if (linked.value) ndvStore.value.setOutputRunIndex(run);
			trackRunChange(run, "input");
		};
		const onOutputTableMounted = (e) => {
			avgOutputRowHeight.value = e.avgRowHeight;
		};
		const onInputNodeChange = (value, index) => {
			runInputIndex.value = -1;
			isLinkingEnabled.value = true;
			selectedInput.value = value;
			telemetry.track("User changed ndv input dropdown", {
				node_type: activeNode.value ? activeNode.value.type : "",
				push_ref: pushRef.value,
				workflow_id: workflowId.value,
				selection_value: index,
				input_node_type: inputNode.value ? inputNode.value.type : ""
			});
		};
		const onStopExecution = () => {
			emit("stopExecution");
		};
		const activateInputPane = () => {
			isInputPaneActive.value = true;
			isOutputPaneActive.value = false;
		};
		const activateOutputPane = () => {
			isInputPaneActive.value = false;
			isOutputPaneActive.value = true;
		};
		const onSearch = (search) => {
			isPairedItemHoveringEnabled.value = !search;
		};
		const registerKeyboardListener = () => {
			document.addEventListener("keydown", onKeyDown, true);
		};
		const unregisterKeyboardListener = () => {
			document.removeEventListener("keydown", onKeyDown, true);
		};
		const onRename = (name) => {
			emit("renameNode", name);
		};
		const handleChangeDisplayMode = (pane, mode) => {
			ndvStore.value.setPanelDisplayMode({
				pane,
				mode
			});
		};
		watch(activeNode, (node, oldNode) => {
			if (node && !oldNode) {
				registerKeyboardListener();
				dialogRef.value?.show();
			} else if (!node) unregisterKeyboardListener();
			if (node && node.name !== oldNode?.name && !isActiveStickyNode.value) {
				runInputIndex.value = -1;
				ndvStore.value.setOutputRunIndex(-1);
				isLinkingEnabled.value = true;
				selectedInput.value = void 0;
				triggerWaitingWarningEnabled.value = false;
				avgOutputRowHeight.value = 0;
				avgInputRowHeight.value = 0;
				setTimeout(() => ndvStore.value.setNDVPushRef(), 0);
				if (!activeNodeType.value || !workflowObject.value) return;
				externalHooks.run("dataDisplay.nodeTypeChanged", { nodeSubtitle: nodeHelpers.getNodeSubtitle(node, activeNodeType.value, workflowObject.value) });
				setTimeout(() => {
					if (activeNode.value) {
						const outgoingConnections = workflowDocumentStore?.value?.outgoingConnectionsByNodeName(activeNode.value?.name);
						telemetry.track("User opened node modal", {
							node_id: activeNode.value?.id,
							node_type: activeNodeType.value ? activeNodeType.value?.name : "",
							workflow_id: workflowId.value,
							push_ref: pushRef.value,
							is_editable: !hasForeignCredential.value,
							parameters_pane_position: mainPanelPosition.value,
							input_first_connector_runs: maxInputRun.value,
							output_first_connector_runs: maxOutputRun.value,
							selected_view_inputs: isTriggerNode.value ? "trigger" : ndvStore.value.inputPanelDisplayMode,
							selected_view_outputs: ndvStore.value.outputPanelDisplayMode,
							input_connectors: parentNodes.value.length,
							output_connectors: outgoingConnections?.main?.length,
							input_displayed_run_index: inputRun.value,
							output_displayed_run_index: outputRun.value,
							data_pinning_tooltip_presented: pinDataDiscoveryTooltipVisible.value,
							input_displayed_row_height_avg: avgInputRowHeight.value,
							output_displayed_row_height_avg: avgOutputRowHeight.value,
							source: telemetryContext.ndv_source?.value ?? "other"
						});
					}
				}, 2e3);
			}
			if (window.top && !isActiveStickyNode.value) window.top.postMessage(JSON.stringify({ command: node ? "openNDV" : "closeNDV" }), "*");
		}, { immediate: true });
		watch(maxOutputRun, () => {
			ndvStore.value.setOutputRunIndex(-1);
		});
		watch(maxInputRun, () => {
			runInputIndex.value = -1;
		});
		watch(inputNodeName, (nodeName) => {
			setTimeout(() => {
				ndvStore.value.setInputNodeName(nodeName);
			}, 0);
		});
		watch(inputRun, (run) => {
			setTimeout(() => {
				ndvStore.value.setInputRunIndex(run);
			}, 0);
		});
		watch(mainPanelRef, (mainPanel) => {
			if (!mainPanel) return;
			function getTabbableCandidates(element) {
				const nodes = [];
				const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, { acceptNode: (node) => {
					const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
					if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
					return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
				} });
				while (walker.nextNode()) nodes.push(walker.currentNode);
				return nodes;
			}
			const firstFocusableElement = getTabbableCandidates(mainPanel)[0];
			if (firstFocusableElement) firstFocusableElement.focus();
		});
		onMounted(() => {
			dialogRef.value?.show();
			dataPinningEventBus.on("data-pinning-discovery", setIsTooltipVisible);
			ndvEventBus.on("updateInputNodeName", setSelectedInput);
		});
		onBeforeUnmount(() => {
			dataPinningEventBus.off("data-pinning-discovery", setIsTooltipVisible);
			ndvEventBus.off("updateInputNodeName", setSelectedInput);
			unregisterKeyboardListener();
		});
		return (_ctx, _cache) => {
			return activeNode.value && !isActiveStickyNode.value ? (openBlock(), createBlock(Teleport, {
				key: 0,
				to: `#${unref(APP_MODALS_ELEMENT_ID)}`
			}, [createBaseVNode("div", {
				"data-test-id": "ndv-backdrop",
				class: normalizeClass(_ctx.$style.backdrop),
				style: normalizeStyle({ zIndex: unref(APP_Z_INDEXES).NDV }),
				onClick: close
			}, null, 6), createBaseVNode("dialog", {
				ref_key: "dialogRef",
				ref: dialogRef,
				open: "",
				"aria-modal": "true",
				"data-test-id": "ndv",
				class: normalizeClass(_ctx.$style.dialog),
				style: normalizeStyle({ zIndex: unref(APP_Z_INDEXES).NDV })
			}, [createVNode(NDVFloatingNodes_default, {
				"root-node": activeNode.value,
				onSwitchSelectedNode
			}, null, 8, ["root-node"]), createBaseVNode("div", {
				ref_key: "containerRef",
				ref: containerRef,
				class: normalizeClass({
					[_ctx.$style.container]: true,
					[_ctx.$style.webhookWaiting]: isExecutionWaitingForWebhook.value
				})
			}, [createVNode(NDVHeader_default, {
				class: normalizeClass(_ctx.$style.header),
				"read-only": __props.readOnly || isDeprecatedNode.value,
				"node-name": activeNode.value.name,
				"node-type-name": activeNodeType.value?.defaults.name ?? activeNodeType.value?.displayName ?? activeNode.value.name,
				icon: unref(icon),
				"docs-url": unref(docsUrl),
				onClose: close,
				onRename
			}, null, 8, [
				"class",
				"read-only",
				"node-name",
				"node-type-name",
				"icon",
				"docs-url"
			]), createBaseVNode("main", { class: normalizeClass(_ctx.$style.main) }, [
				hasInputPanel.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.column, _ctx.$style.dataColumn]),
					style: normalizeStyle({ width: `${unref(panelWidthPercentage).left}%` })
				}, [showTriggerPanel.value ? (openBlock(), createBlock(TriggerPanel_default, {
					key: 0,
					"node-name": activeNode.value.name,
					"push-ref": pushRef.value,
					class: normalizeClass(_ctx.$style.input),
					onExecute: onNodeExecute,
					onActivate: onWorkflowActivate
				}, null, 8, [
					"node-name",
					"push-ref",
					"class"
				])) : !isTriggerNode.value && workflowObject.value ? (openBlock(), createBlock(InputPanel_default, {
					key: 1,
					"can-link-runs": canLinkRuns.value,
					"run-index": inputRun.value,
					"linked-runs": linked.value,
					"active-node-name": activeNode.value.name,
					"current-node-name": inputNodeName.value,
					"push-ref": pushRef.value,
					"read-only": __props.readOnly || hasForeignCredential.value || unref(isRestricted),
					"is-production-execution-preview": __props.isProductionExecutionPreview,
					"search-shortcut": isInputPaneActive.value ? "/" : void 0,
					"display-mode": inputPanelDisplayMode.value,
					class: normalizeClass(_ctx.$style.input),
					"is-mapping-onboarded": unref(ndvStore).isMappingOnboarded,
					"focused-mappable-input": unref(ndvStore).focusedMappableInput,
					onActivatePane: activateInputPane,
					onLinkRun: onLinkRunToInput,
					onUnlinkRun: _cache[0] || (_cache[0] = () => onUnlinkRun("input")),
					onRunChange: onRunInputIndexChange,
					onOpenSettings: openSettings,
					onChangeInputNode: onInputNodeChange,
					onExecute: onNodeExecute,
					onTableMounted: onInputTableMounted,
					onItemHover: onInputItemHover,
					onSearch,
					onDisplayModeChange: _cache[1] || (_cache[1] = ($event) => handleChangeDisplayMode("input", $event))
				}, null, 8, [
					"can-link-runs",
					"run-index",
					"linked-runs",
					"active-node-name",
					"current-node-name",
					"push-ref",
					"read-only",
					"is-production-execution-preview",
					"search-shortcut",
					"display-mode",
					"class",
					"is-mapping-onboarded",
					"focused-mappable-input"
				])) : createCommentVNode("", true)], 6)) : createCommentVNode("", true),
				createVNode(unref(N8nResizeWrapper_default), {
					width: unref(panelWidthPixels).main,
					"min-width": 260,
					"supported-directions": supportedResizeDirections.value,
					"grid-size": 8,
					class: normalizeClass({
						[_ctx.$style.column]: !isExecutionWaitingForWebhook.value,
						[_ctx.$style.webhookWaiting]: isExecutionWaitingForWebhook.value
					}),
					style: normalizeStyle({ width: `${unref(panelWidthPercentage).main}%` }),
					onResize: unref(onResize),
					onResizestart: onDragStart,
					onResizeend: onDragEnd,
					onDblclick: onResizeHandleDblClick
				}, {
					default: withCtx(() => [createBaseVNode("div", {
						ref_key: "mainPanelRef",
						ref: mainPanelRef,
						class: normalizeClass(_ctx.$style.main)
					}, [hasInputPanel.value ? (openBlock(), createBlock(PanelDragButton_default, {
						key: 0,
						class: normalizeClass(_ctx.$style.draggable),
						onDrag: unref(onDrag),
						onDragstart: onDragStart,
						onDragend: onDragEnd
					}, null, 8, ["class", "onDrag"])) : createCommentVNode("", true), createVNode(NodeSettings_default, mergeProps(nodeSettingsProps.value, {
						class: _ctx.$style.settings,
						onExecute: onNodeExecute,
						onStopExecution,
						onActivate: onWorkflowActivate,
						onSwitchSelectedNode,
						onOpenConnectionNodeCreator,
						onReplaceNode
					}), null, 16, ["class"])], 2)]),
					_: 1
				}, 8, [
					"width",
					"supported-directions",
					"class",
					"style",
					"onResize"
				]),
				createBaseVNode("div", {
					class: normalizeClass([_ctx.$style.column, _ctx.$style.dataColumn]),
					style: normalizeStyle({ width: `${unref(panelWidthPercentage).right}%` })
				}, [createVNode(OutputPanel_default, {
					"data-test-id": "output-panel",
					"can-link-runs": canLinkRuns.value,
					"run-index": outputRun.value,
					"linked-runs": linked.value,
					"push-ref": pushRef.value,
					"is-read-only": __props.readOnly || hasForeignCredential.value || unref(isRestricted),
					"block-u-i": blockUi.value && isTriggerNode.value && !isExecutableTriggerNode.value,
					"is-production-execution-preview": __props.isProductionExecutionPreview,
					"is-pane-active": isOutputPaneActive.value,
					"display-mode": outputPanelDisplayMode.value,
					class: normalizeClass(_ctx.$style.output),
					onActivatePane: activateOutputPane,
					onLinkRun: onLinkRunToOutput,
					onUnlinkRun: _cache[2] || (_cache[2] = () => onUnlinkRun("output")),
					onRunChange: onRunOutputIndexChange,
					onOpenSettings: openSettings,
					onTableMounted: onOutputTableMounted,
					onItemHover: onOutputItemHover,
					onSearch,
					onExecute: onNodeExecute,
					onDisplayModeChange: _cache[3] || (_cache[3] = ($event) => handleChangeDisplayMode("output", $event))
				}, null, 8, [
					"can-link-runs",
					"run-index",
					"linked-runs",
					"push-ref",
					"is-read-only",
					"block-u-i",
					"is-production-execution-preview",
					"is-pane-active",
					"display-mode",
					"class"
				])], 6)
			], 2)], 2)], 6)], 8, ["to"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	backdrop: "_backdrop_1h3zx_1",
	dialog: "_dialog_1h3zx_11",
	container: "_container_1h3zx_26",
	main: "_main_1h3zx_37",
	column: "_column_1h3zx_47",
	input: "_input_1h3zx_61",
	output: "_output_1h3zx_62",
	dataColumn: "_dataColumn_1h3zx_77",
	header: "_header_1h3zx_81",
	settings: "_settings_1h3zx_88",
	draggable: "_draggable_1h3zx_93",
	webhookWaiting: "_webhookWaiting_1h3zx_102"
} }]]);
//#endregion
export { NodeDetailsView_default as default };
