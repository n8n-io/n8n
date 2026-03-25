import { areEqual } from "../shared/arrays.js";
import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { assert } from "../utils/assert.js";
import { getResizeHandleElement } from "../utils/dom.js";
import { getResizeEventCursorPosition, isKeyDown, isMouseEvent, isTouchEvent } from "../utils/events.js";
import { calculateDeltaPercentage, calculateUnsafeDefaultLayout } from "../utils/calculate.js";
import { callPanelCallbacks } from "../utils/callPanelCallbacks.js";
import { debounce } from "../utils/debounce.js";
import { adjustLayoutByDelta, compareLayouts } from "../utils/layout.js";
import { determinePivotIndices } from "../utils/pivot.js";
import { computePanelFlexBoxStyle } from "../utils/style.js";
import { EXCEEDED_HORIZONTAL_MAX, EXCEEDED_HORIZONTAL_MIN, EXCEEDED_VERTICAL_MAX, EXCEEDED_VERTICAL_MIN, reportConstraintsViolation } from "../utils/registry.js";
import { validatePanelGroupLayout } from "../utils/validation.js";
import { useWindowSplitterPanelGroupBehavior } from "../composables/useWindowSplitterPanelGroupBehavior.js";
import { initializeDefaultStorage, loadPanelGroupState, savePanelGroupState } from "../utils/storage.js";
import { computed, createBlock, defineComponent, normalizeStyle, openBlock, ref, renderSlot, toRefs, unref, watch, watchEffect, withCtx } from "vue";

//#region src/Splitter/SplitterGroup.vue?vue&type=script&setup=true&lang.ts
const LOCAL_STORAGE_DEBOUNCE_INTERVAL = 100;
const defaultStorage = {
	getItem: (name) => {
		initializeDefaultStorage(defaultStorage);
		return defaultStorage.getItem(name);
	},
	setItem: (name, value) => {
		initializeDefaultStorage(defaultStorage);
		defaultStorage.setItem(name, value);
	}
};
const [injectPanelGroupContext, providePanelGroupContext] = createContext("PanelGroup");
var SplitterGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { direction } = toRefs(props);
		const groupId = useId(props.id, "reka-splitter-group");
		const dir = useDirection();
		const { forwardRef, currentElement: panelGroupElementRef } = useForwardExpose();
		const dragState = ref(null);
		const layout = ref([]);
		const panelIdToLastNotifiedSizeMapRef = ref({});
		const panelSizeBeforeCollapseRef = ref(/* @__PURE__ */ new Map());
		const prevDeltaRef = ref(0);
		const committedValuesRef = computed(() => ({
			autoSaveId: props.autoSaveId,
			direction: props.direction,
			dragState: dragState.value,
			id: groupId,
			keyboardResizeBy: props.keyboardResizeBy,
			storage: props.storage
		}));
		const eagerValuesRef = ref({
			layout: layout.value,
			panelDataArray: [],
			panelDataArrayChanged: false
		});
		const setLayout = (val) => layout.value = val;
		useWindowSplitterPanelGroupBehavior({
			eagerValuesRef,
			groupId,
			layout,
			panelDataArray: eagerValuesRef.value.panelDataArray,
			setLayout,
			panelGroupElement: panelGroupElementRef
		});
		watchEffect(() => {
			const { panelDataArray } = eagerValuesRef.value;
			const { autoSaveId } = props;
			if (autoSaveId) {
				if (layout.value.length === 0 || layout.value.length !== panelDataArray.length) return;
				let debouncedSave = debounceMap[autoSaveId];
				if (!debouncedSave) {
					debouncedSave = debounce(savePanelGroupState, LOCAL_STORAGE_DEBOUNCE_INTERVAL);
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
			return computePanelFlexBoxStyle({
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
		watch(() => eagerValuesRef.value.panelDataArrayChanged, () => {
			if (eagerValuesRef.value.panelDataArrayChanged) {
				eagerValuesRef.value.panelDataArrayChanged = false;
				const { autoSaveId, storage } = committedValuesRef.value;
				const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
				let unsafeLayout = null;
				if (autoSaveId) {
					const state = loadPanelGroupState(autoSaveId, panelDataArray, storage);
					if (state) {
						panelSizeBeforeCollapseRef.value = new Map(Object.entries(state.expandToSizes));
						unsafeLayout = state.layout;
					}
				}
				if (unsafeLayout === null) unsafeLayout = calculateUnsafeDefaultLayout({ panelDataArray });
				const nextLayout = validatePanelGroupLayout({
					layout: unsafeLayout,
					panelConstraints: panelDataArray.map((panelData) => panelData.constraints)
				});
				if (!areEqual(prevLayout, nextLayout)) {
					setLayout(nextLayout);
					eagerValuesRef.value.layout = nextLayout;
					emits("layout", nextLayout);
					callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
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
				const pivotIndices = determinePivotIndices(groupId$1, dragHandleId, panelGroupElement);
				let delta = calculateDeltaPercentage(event, dragHandleId, direction$1, dragState$1, keyboardResizeBy, panelGroupElement);
				if (delta === 0) return;
				const isHorizontal = direction$1 === "horizontal";
				if (dir.value === "rtl" && isHorizontal) delta = -delta;
				const panelConstraints = panelDataArray.map((panelData) => panelData.constraints);
				const nextLayout = adjustLayoutByDelta({
					delta,
					layout: initialLayout ?? prevLayout,
					panelConstraints,
					pivotIndices,
					trigger: isKeyDown(event) ? "keyboard" : "mouse-or-touch"
				});
				const layoutChanged = !compareLayouts(prevLayout, nextLayout);
				if (isMouseEvent(event) || isTouchEvent(event)) {
					if (prevDeltaRef.value !== delta) {
						prevDeltaRef.value = delta;
						if (!layoutChanged) if (isHorizontal) reportConstraintsViolation(dragHandleId, delta < 0 ? EXCEEDED_HORIZONTAL_MIN : EXCEEDED_HORIZONTAL_MAX);
						else reportConstraintsViolation(dragHandleId, delta < 0 ? EXCEEDED_VERTICAL_MIN : EXCEEDED_VERTICAL_MAX);
						else reportConstraintsViolation(dragHandleId, 0);
					}
				}
				if (layoutChanged) {
					setLayout(nextLayout);
					eagerValuesRef.value.layout = nextLayout;
					emits("layout", nextLayout);
					callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
				}
			};
		}
		function resizePanel(panelData, unsafePanelSize) {
			const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
			const panelConstraintsArray = panelDataArray.map((panelData$1) => panelData$1.constraints);
			const { panelSize, pivotIndices } = panelDataHelper(panelDataArray, panelData, prevLayout);
			assert(panelSize != null);
			const isLastPanel = findPanelDataIndex(panelDataArray, panelData) === panelDataArray.length - 1;
			const delta = isLastPanel ? panelSize - unsafePanelSize : unsafePanelSize - panelSize;
			const nextLayout = adjustLayoutByDelta({
				delta,
				layout: prevLayout,
				panelConstraints: panelConstraintsArray,
				pivotIndices,
				trigger: "imperative-api"
			});
			if (!compareLayouts(prevLayout, nextLayout)) {
				setLayout(nextLayout);
				eagerValuesRef.value.layout = nextLayout;
				emits("layout", nextLayout);
				callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
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
			const handleElement = getResizeHandleElement(dragHandleId, panelGroupElementRef.value);
			assert(handleElement);
			const initialCursorPosition = getResizeEventCursorPosition(direction$1, event);
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
				assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
				if (panelSize !== collapsedSize) {
					panelSizeBeforeCollapseRef.value.set(panelData.id, panelSize);
					const isLastPanel = findPanelDataIndex(panelDataArray, panelData) === panelDataArray.length - 1;
					const delta = isLastPanel ? panelSize - collapsedSize : collapsedSize - panelSize;
					const nextLayout = adjustLayoutByDelta({
						delta,
						layout: prevLayout,
						panelConstraints: panelConstraintsArray,
						pivotIndices,
						trigger: "imperative-api"
					});
					if (!compareLayouts(prevLayout, nextLayout)) {
						setLayout(nextLayout);
						eagerValuesRef.value.layout = nextLayout;
						emits("layout", nextLayout);
						callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
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
					const nextLayout = adjustLayoutByDelta({
						delta,
						layout: prevLayout,
						panelConstraints: panelConstraintsArray,
						pivotIndices,
						trigger: "imperative-api"
					});
					if (!compareLayouts(prevLayout, nextLayout)) {
						setLayout(nextLayout);
						eagerValuesRef.value.layout = nextLayout;
						emits("layout", nextLayout);
						callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value);
					}
				}
			}
		}
		function getPanelSize(panelData) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const { panelSize } = panelDataHelper(panelDataArray, panelData, layout$1);
			assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
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
			assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
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
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				style: normalizeStyle({
					display: "flex",
					flexDirection: unref(direction) === "horizontal" ? "row" : "column",
					height: "100%",
					overflow: "hidden",
					width: "100%"
				}),
				"data-panel-group": "",
				"data-orientation": unref(direction),
				"data-panel-group-id": unref(groupId)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { layout: layout.value })]),
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
export { SplitterGroup_default, injectPanelGroupContext };
//# sourceMappingURL=SplitterGroup.js.map