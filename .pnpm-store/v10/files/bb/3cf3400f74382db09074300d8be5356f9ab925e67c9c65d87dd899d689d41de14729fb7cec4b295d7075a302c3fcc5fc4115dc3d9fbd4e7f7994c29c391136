const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_arrays = require('../shared/arrays.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_utils_assert = require('../utils/assert.cjs');
const require_utils_dom = require('../utils/dom.cjs');
const require_utils_events = require('../utils/events.cjs');
const require_utils_calculate = require('../utils/calculate.cjs');
const require_utils_callPanelCallbacks = require('../utils/callPanelCallbacks.cjs');
const require_utils_debounce = require('../utils/debounce.cjs');
const require_utils_layout = require('../utils/layout.cjs');
const require_utils_pivot = require('../utils/pivot.cjs');
const require_utils_style = require('../utils/style.cjs');
const require_utils_registry = require('../utils/registry.cjs');
const require_utils_validation = require('../utils/validation.cjs');
const require_composables_useWindowSplitterPanelGroupBehavior = require('../composables/useWindowSplitterPanelGroupBehavior.cjs');
const require_utils_storage = require('../utils/storage.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Splitter/SplitterGroup.vue?vue&type=script&setup=true&lang.ts
const LOCAL_STORAGE_DEBOUNCE_INTERVAL = 100;
const defaultStorage = {
	getItem: (name) => {
		require_utils_storage.initializeDefaultStorage(defaultStorage);
		return defaultStorage.getItem(name);
	},
	setItem: (name, value) => {
		require_utils_storage.initializeDefaultStorage(defaultStorage);
		defaultStorage.setItem(name, value);
	}
};
const [injectPanelGroupContext, providePanelGroupContext] = require_shared_createContext.createContext("PanelGroup");
var SplitterGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SplitterGroup",
	props: {
		id: {
			type: [String, null],
			required: false
		},
		autoSaveId: {
			type: [String, null],
			required: false,
			default: null
		},
		direction: {
			type: String,
			required: true
		},
		keyboardResizeBy: {
			type: [Number, null],
			required: false,
			default: 10
		},
		storage: {
			type: Object,
			required: false,
			default: () => defaultStorage
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: ["layout"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const debounceMap = {};
		const { direction } = (0, vue.toRefs)(props);
		const groupId = require_shared_useId.useId(props.id, "reka-splitter-group");
		const dir = require_shared_useDirection.useDirection();
		const { forwardRef, currentElement: panelGroupElementRef } = require_shared_useForwardExpose.useForwardExpose();
		const dragState = (0, vue.ref)(null);
		const layout = (0, vue.ref)([]);
		const panelIdToLastNotifiedSizeMapRef = (0, vue.ref)({});
		const panelSizeBeforeCollapseRef = (0, vue.ref)(/* @__PURE__ */ new Map());
		const prevDeltaRef = (0, vue.ref)(0);
		const committedValuesRef = (0, vue.computed)(() => ({
			autoSaveId: props.autoSaveId,
			direction: props.direction,
			dragState: dragState.value,
			id: groupId,
			keyboardResizeBy: props.keyboardResizeBy,
			storage: props.storage
		}));
		const eagerValuesRef = (0, vue.ref)({
			layout: layout.value,
			panelDataArray: [],
			panelDataArrayChanged: false
		});
		const setLayout = (val) => layout.value = val;
		require_composables_useWindowSplitterPanelGroupBehavior.useWindowSplitterPanelGroupBehavior({
			eagerValuesRef,
			groupId,
			layout,
			panelDataArray: eagerValuesRef.value.panelDataArray,
			setLayout,
			panelGroupElement: panelGroupElementRef
		});
		(0, vue.watchEffect)(() => {
			const { panelDataArray } = eagerValuesRef.value;
			const { autoSaveId } = props;
			if (autoSaveId) {
				if (layout.value.length === 0 || layout.value.length !== panelDataArray.length) return;
				let debouncedSave = debounceMap[autoSaveId];
				if (!debouncedSave) {
					debouncedSave = require_utils_debounce.debounce(require_utils_storage.savePanelGroupState, LOCAL_STORAGE_DEBOUNCE_INTERVAL);
					debounceMap[autoSaveId] = debouncedSave;
				}
				const clonedPanelDataArray = [...panelDataArray];
				const clonedPanelSizesBeforeCollapse = new Map(panelSizeBeforeCollapseRef.value);
				debouncedSave(autoSaveId, clonedPanelDataArray, clonedPanelSizesBeforeCollapse, layout.value, props.storage);
			}
		});
		function getPanelStyle(panelData, defaultSize) {
			const { panelDataArray } = eagerValuesRef.value;
			const panelIndex = findPanelDataIndex(panelDataArray, panelData);
			return require_utils_style.computePanelFlexBoxStyle({
				defaultSize,
				dragState: dragState.value,
				layout: layout.value,
				panelData: panelDataArray,
				panelIndex
			});
		}
		function registerPanel(panelData) {
			const { panelDataArray } = eagerValuesRef.value;
			panelDataArray.push(panelData);
			panelDataArray.sort((panelA, panelB) => {
				const orderA = panelA.order;
				const orderB = panelB.order;
				if (orderA == null && orderB == null) return 0;
				else if (orderA == null) return -1;
				else if (orderB == null) return 1;
				else return orderA - orderB;
			});
			eagerValuesRef.value.panelDataArrayChanged = true;
		}
		(0, vue.watch)(() => eagerValuesRef.value.panelDataArrayChanged, () => {
			if (eagerValuesRef.value.panelDataArrayChanged) {
				eagerValuesRef.value.panelDataArrayChanged = false;
				const { autoSaveId, storage } = committedValuesRef.value;
				const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
				let unsafeLayout = null;
				if (autoSaveId) {
					const state = require_utils_storage.loadPanelGroupState(autoSaveId, panelDataArray, storage);
					if (state) {
						panelSizeBeforeCollapseRef.value = new Map(Object.entries(state.expandToSizes));
						unsafeLayout = state.layout;
					}
				}
				if (unsafeLayout === null) unsafeLayout = require_utils_calculate.calculateUnsafeDefaultLayout({ panelDataArray });
				const nextLayout = require_utils_validation.validatePanelGroupLayout({
					layout: unsafeLayout,
					panelConstraints: panelDataArray.map((panelData) => panelData.constraints)
				});
				if (!require_shared_arrays.areEqual(prevLayout, nextLayout)) {
					setLayout(nextLayout);
					eagerValuesRef.value.layout = nextLayout;
					emits("layout", nextLayout);
					require_utils_callPanelCallbacks.callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
				}
			}
		});
		function registerResizeHandle(dragHandleId) {
			return function resizeHandler(event) {
				event.preventDefault();
				const panelGroupElement = panelGroupElementRef.value;
				if (!panelGroupElement) return () => null;
				const { direction: direction$1, dragState: dragState$1, id: groupId$1, keyboardResizeBy } = committedValuesRef.value;
				const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
				const { initialLayout } = dragState$1 ?? {};
				const pivotIndices = require_utils_pivot.determinePivotIndices(groupId$1, dragHandleId, panelGroupElement);
				let delta = require_utils_calculate.calculateDeltaPercentage(event, dragHandleId, direction$1, dragState$1, keyboardResizeBy, panelGroupElement);
				if (delta === 0) return;
				const isHorizontal = direction$1 === "horizontal";
				if (dir.value === "rtl" && isHorizontal) delta = -delta;
				const panelConstraints = panelDataArray.map((panelData) => panelData.constraints);
				const nextLayout = require_utils_layout.adjustLayoutByDelta({
					delta,
					layout: initialLayout ?? prevLayout,
					panelConstraints,
					pivotIndices,
					trigger: require_utils_events.isKeyDown(event) ? "keyboard" : "mouse-or-touch"
				});
				const layoutChanged = !require_utils_layout.compareLayouts(prevLayout, nextLayout);
				if (require_utils_events.isMouseEvent(event) || require_utils_events.isTouchEvent(event)) {
					if (prevDeltaRef.value !== delta) {
						prevDeltaRef.value = delta;
						if (!layoutChanged) if (isHorizontal) require_utils_registry.reportConstraintsViolation(dragHandleId, delta < 0 ? require_utils_registry.EXCEEDED_HORIZONTAL_MIN : require_utils_registry.EXCEEDED_HORIZONTAL_MAX);
						else require_utils_registry.reportConstraintsViolation(dragHandleId, delta < 0 ? require_utils_registry.EXCEEDED_VERTICAL_MIN : require_utils_registry.EXCEEDED_VERTICAL_MAX);
						else require_utils_registry.reportConstraintsViolation(dragHandleId, 0);
					}
				}
				if (layoutChanged) {
					setLayout(nextLayout);
					eagerValuesRef.value.layout = nextLayout;
					emits("layout", nextLayout);
					require_utils_callPanelCallbacks.callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
				}
			};
		}
		function resizePanel(panelData, unsafePanelSize) {
			const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
			const panelConstraintsArray = panelDataArray.map((panelData$1) => panelData$1.constraints);
			const { panelSize, pivotIndices } = panelDataHelper(panelDataArray, panelData, prevLayout);
			require_utils_assert.assert(panelSize != null);
			const isLastPanel = findPanelDataIndex(panelDataArray, panelData) === panelDataArray.length - 1;
			const delta = isLastPanel ? panelSize - unsafePanelSize : unsafePanelSize - panelSize;
			const nextLayout = require_utils_layout.adjustLayoutByDelta({
				delta,
				layout: prevLayout,
				panelConstraints: panelConstraintsArray,
				pivotIndices,
				trigger: "imperative-api"
			});
			if (!require_utils_layout.compareLayouts(prevLayout, nextLayout)) {
				setLayout(nextLayout);
				eagerValuesRef.value.layout = nextLayout;
				emits("layout", nextLayout);
				require_utils_callPanelCallbacks.callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
			}
		}
		function reevaluatePanelConstraints(panelData, prevConstraints) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const index = findPanelDataIndex(panelDataArray, panelData);
			panelDataArray[index] = panelData;
			eagerValuesRef.value.panelDataArrayChanged = true;
			const { collapsedSize: prevCollapsedSize = 0, collapsible: prevCollapsible } = prevConstraints;
			const { collapsedSize: nextCollapsedSize = 0, collapsible: nextCollapsible, maxSize: nextMaxSize = 100, minSize: nextMinSize = 0 } = panelData.constraints;
			const { panelSize: prevPanelSize } = panelDataHelper(panelDataArray, panelData, layout$1);
			if (prevPanelSize === null) return;
			if (prevCollapsible && nextCollapsible && prevPanelSize === prevCollapsedSize) {
				if (prevCollapsedSize !== nextCollapsedSize) resizePanel(panelData, nextCollapsedSize);
			} else if (prevPanelSize < nextMinSize) resizePanel(panelData, nextMinSize);
			else if (prevPanelSize > nextMaxSize) resizePanel(panelData, nextMaxSize);
		}
		function startDragging(dragHandleId, event) {
			const { direction: direction$1 } = committedValuesRef.value;
			const { layout: layout$1 } = eagerValuesRef.value;
			if (!panelGroupElementRef.value) return;
			const handleElement = require_utils_dom.getResizeHandleElement(dragHandleId, panelGroupElementRef.value);
			require_utils_assert.assert(handleElement);
			const initialCursorPosition = require_utils_events.getResizeEventCursorPosition(direction$1, event);
			dragState.value = {
				dragHandleId,
				dragHandleRect: handleElement.getBoundingClientRect(),
				initialCursorPosition,
				initialLayout: layout$1
			};
		}
		function stopDragging() {
			dragState.value = null;
		}
		function unregisterPanel(panelData) {
			const { panelDataArray } = eagerValuesRef.value;
			const index = findPanelDataIndex(panelDataArray, panelData);
			if (index >= 0) {
				panelDataArray.splice(index, 1);
				delete panelIdToLastNotifiedSizeMapRef.value[panelData.id];
				eagerValuesRef.value.panelDataArrayChanged = true;
			}
		}
		function collapsePanel(panelData) {
			const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
			if (panelData.constraints.collapsible) {
				const panelConstraintsArray = panelDataArray.map((panelData$1) => panelData$1.constraints);
				const { collapsedSize = 0, panelSize, pivotIndices } = panelDataHelper(panelDataArray, panelData, prevLayout);
				require_utils_assert.assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
				if (panelSize !== collapsedSize) {
					panelSizeBeforeCollapseRef.value.set(panelData.id, panelSize);
					const isLastPanel = findPanelDataIndex(panelDataArray, panelData) === panelDataArray.length - 1;
					const delta = isLastPanel ? panelSize - collapsedSize : collapsedSize - panelSize;
					const nextLayout = require_utils_layout.adjustLayoutByDelta({
						delta,
						layout: prevLayout,
						panelConstraints: panelConstraintsArray,
						pivotIndices,
						trigger: "imperative-api"
					});
					if (!require_utils_layout.compareLayouts(prevLayout, nextLayout)) {
						setLayout(nextLayout);
						eagerValuesRef.value.layout = nextLayout;
						emits("layout", nextLayout);
						require_utils_callPanelCallbacks.callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
					}
				}
			}
		}
		function expandPanel(panelData) {
			const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
			if (panelData.constraints.collapsible) {
				const panelConstraintsArray = panelDataArray.map((panelData$1) => panelData$1.constraints);
				const { collapsedSize = 0, panelSize, minSize = 0, pivotIndices } = panelDataHelper(panelDataArray, panelData, prevLayout);
				if (panelSize === collapsedSize) {
					const prevPanelSize = panelSizeBeforeCollapseRef.value.get(panelData.id);
					const baseSize = prevPanelSize != null && prevPanelSize >= minSize ? prevPanelSize : minSize;
					const isLastPanel = findPanelDataIndex(panelDataArray, panelData) === panelDataArray.length - 1;
					const delta = isLastPanel ? panelSize - baseSize : baseSize - panelSize;
					const nextLayout = require_utils_layout.adjustLayoutByDelta({
						delta,
						layout: prevLayout,
						panelConstraints: panelConstraintsArray,
						pivotIndices,
						trigger: "imperative-api"
					});
					if (!require_utils_layout.compareLayouts(prevLayout, nextLayout)) {
						setLayout(nextLayout);
						eagerValuesRef.value.layout = nextLayout;
						emits("layout", nextLayout);
						require_utils_callPanelCallbacks.callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
					}
				}
			}
		}
		function getPanelSize(panelData) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const { panelSize } = panelDataHelper(panelDataArray, panelData, layout$1);
			require_utils_assert.assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
			return panelSize;
		}
		function isPanelCollapsed(panelData) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const { collapsedSize = 0, collapsible, panelSize } = panelDataHelper(panelDataArray, panelData, layout$1);
			if (!collapsible) return false;
			if (panelSize === void 0) return panelData.constraints.defaultSize === panelData.constraints.collapsedSize;
			else return panelSize === collapsedSize;
		}
		function isPanelExpanded(panelData) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const { collapsedSize = 0, collapsible, panelSize } = panelDataHelper(panelDataArray, panelData, layout$1);
			require_utils_assert.assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
			return !collapsible || panelSize > collapsedSize;
		}
		providePanelGroupContext({
			direction,
			dragState: dragState.value,
			groupId,
			reevaluatePanelConstraints,
			registerPanel,
			registerResizeHandle,
			resizePanel,
			startDragging,
			stopDragging,
			unregisterPanel,
			panelGroupElement: panelGroupElementRef,
			collapsePanel,
			expandPanel,
			isPanelCollapsed,
			isPanelExpanded,
			getPanelSize,
			getPanelStyle
		});
		function findPanelDataIndex(panelDataArray, panelData) {
			return panelDataArray.findIndex((prevPanelData) => prevPanelData === panelData || prevPanelData.id === panelData.id);
		}
		function panelDataHelper(panelDataArray, panelData, layout$1) {
			const panelIndex = findPanelDataIndex(panelDataArray, panelData);
			const isLastPanel = panelIndex === panelDataArray.length - 1;
			const pivotIndices = isLastPanel ? [panelIndex - 1, panelIndex] : [panelIndex, panelIndex + 1];
			const panelSize = layout$1[panelIndex];
			return {
				...panelData.constraints,
				panelSize,
				pivotIndices
			};
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				style: (0, vue.normalizeStyle)({
					display: "flex",
					flexDirection: (0, vue.unref)(direction) === "horizontal" ? "row" : "column",
					height: "100%",
					overflow: "hidden",
					width: "100%"
				}),
				"data-panel-group": "",
				"data-orientation": (0, vue.unref)(direction),
				"data-panel-group-id": (0, vue.unref)(groupId)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { layout: layout.value })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"style",
				"data-orientation",
				"data-panel-group-id"
			]);
		};
	}
});

//#endregion
//#region src/Splitter/SplitterGroup.vue
var SplitterGroup_default = SplitterGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SplitterGroup_default', {
  enumerable: true,
  get: function () {
    return SplitterGroup_default;
  }
});
Object.defineProperty(exports, 'injectPanelGroupContext', {
  enumerable: true,
  get: function () {
    return injectPanelGroupContext;
  }
});
//# sourceMappingURL=SplitterGroup.cjs.map