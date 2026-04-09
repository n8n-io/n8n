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
import { fuzzyCompareNumbers } from "../utils/compare.js";
import { callPanelCallbacks } from "../utils/callPanelCallbacks.js";
import { debounce } from "../utils/debounce.js";
import { adjustLayoutByDelta, compareLayouts } from "../utils/layout.js";
import { determinePivotIndices } from "../utils/pivot.js";
import { computePanelFlexBoxStyle } from "../utils/style.js";
import { EXCEEDED_HORIZONTAL_MAX, EXCEEDED_HORIZONTAL_MIN, EXCEEDED_VERTICAL_MAX, EXCEEDED_VERTICAL_MIN, reportConstraintsViolation } from "../utils/registry.js";
import { convertPanelConstraintsToPercent, hasPixelSizedPanel, recalculateLayoutForPixelPanels } from "../utils/units.js";
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
		const groupSizeInPixels = ref(null);
		const groupSizeAtLastLayoutInit = ref(null);
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
		function getGroupSizeInPixels() {
			if (groupSizeInPixels.value != null) return groupSizeInPixels.value;
			const element = panelGroupElementRef.value;
			if (element && element instanceof HTMLElement) {
				const rect = element.getBoundingClientRect();
				const size = direction.value === "horizontal" ? rect.width : rect.height;
				if (!Number.isNaN(size)) {
					groupSizeInPixels.value = size;
					return size;
				}
			}
			return null;
		}
		function getPanelConstraintsInPercent(groupSizeOverride) {
			const groupSize = groupSizeOverride ?? getGroupSizeInPixels();
			return convertPanelConstraintsToPercent({
				panelDataArray: eagerValuesRef.value.panelDataArray,
				groupSizeInPixels: groupSize
			});
		}
		function getPanelDataWithPercentConstraints(groupSizeOverride) {
			const percentConstraints = getPanelConstraintsInPercent(groupSizeOverride);
			if (!percentConstraints) return null;
			return eagerValuesRef.value.panelDataArray.map((panelData, index) => ({
				...panelData,
				constraints: percentConstraints[index]
			}));
		}
		const setLayout = (val) => layout.value = val;
		/** Convert internal layout (always in %) to native units for each panel */
		function convertLayoutToNativeUnits(internalLayout) {
			const { panelDataArray } = eagerValuesRef.value;
			const groupSize = getGroupSizeInPixels();
			return internalLayout.map((size, index) => {
				const panelData = panelDataArray[index];
				if (panelData && (panelData.constraints.sizeUnit ?? "%") === "px" && groupSize != null) return size / 100 * groupSize;
				return size;
			});
		}
		useWindowSplitterPanelGroupBehavior({
			eagerValuesRef,
			groupId,
			layout,
			panelDataArray: eagerValuesRef.value.panelDataArray,
			setLayout,
			panelGroupElement: panelGroupElementRef,
			getPanelDataWithPercentConstraints
		});
		watchEffect((onCleanup) => {
			const element = panelGroupElementRef.value;
			if (!element) return;
			if (typeof ResizeObserver !== "function") return;
			const resizeObserver = new ResizeObserver((entries) => {
				const entry = entries[0];
				if (!entry) return;
				const { height, width } = entry.contentRect;
				const nextSize = direction.value === "horizontal" ? width : height;
				if (!Number.isNaN(nextSize)) groupSizeInPixels.value = nextSize;
			});
			if (element instanceof HTMLElement) resizeObserver.observe(element);
			onCleanup(() => resizeObserver.disconnect());
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
				if (unsafeLayout === null) {
					const panelDataArrayWithPercentConstraints = getPanelDataWithPercentConstraints();
					if (!panelDataArrayWithPercentConstraints) return;
					unsafeLayout = calculateUnsafeDefaultLayout({ panelDataArray: panelDataArrayWithPercentConstraints });
				}
				const panelConstraints = getPanelConstraintsInPercent();
				if (!panelConstraints) return;
				const nextLayout = validatePanelGroupLayout({
					layout: unsafeLayout,
					panelConstraints
				});
				groupSizeAtLastLayoutInit.value = getGroupSizeInPixels();
				if (!areEqual(prevLayout, nextLayout)) {
					setLayout(nextLayout);
					eagerValuesRef.value.layout = nextLayout;
					emits("layout", convertLayoutToNativeUnits(nextLayout));
					callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value, getGroupSizeInPixels());
				}
			}
		});
		watch(groupSizeInPixels, (nextSize, prevSize) => {
			if (prevSize == null || nextSize == null) return;
			const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
			if (prevLayout.length === 0) return;
			if (!hasPixelSizedPanel(panelDataArray)) return;
			const initSize = groupSizeAtLastLayoutInit.value;
			if (initSize != null && initSize > 0 && initSize < 50 && nextSize > initSize * 10) {
				eagerValuesRef.value.panelDataArrayChanged = true;
				return;
			}
			const recalculatedLayout = recalculateLayoutForPixelPanels({
				layout: prevLayout,
				panelDataArray,
				prevGroupSize: prevSize,
				nextGroupSize: nextSize
			});
			if (!recalculatedLayout) return;
			const panelConstraints = getPanelConstraintsInPercent(nextSize);
			if (!panelConstraints) return;
			const nextLayout = validatePanelGroupLayout({
				layout: recalculatedLayout,
				panelConstraints
			});
			if (!compareLayouts(prevLayout, nextLayout)) {
				setLayout(nextLayout);
				eagerValuesRef.value.layout = nextLayout;
				emits("layout", convertLayoutToNativeUnits(nextLayout));
				callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value, getGroupSizeInPixels());
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
				const panelConstraints = getPanelConstraintsInPercent();
				if (!panelConstraints) return;
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
					emits("layout", convertLayoutToNativeUnits(nextLayout));
					callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value, getGroupSizeInPixels());
				}
			};
		}
		function resizePanel(panelData, unsafePanelSize) {
			const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
			const panelConstraintsArray = getPanelConstraintsInPercent();
			if (!panelConstraintsArray) return;
			const panelIndex = findPanelDataIndex(panelDataArray, panelData);
			const panelUnit = panelData.constraints.sizeUnit ?? "%";
			let sizeInPercent = unsafePanelSize;
			if (panelUnit === "px") {
				const groupSize = getGroupSizeInPixels();
				if (groupSize != null) sizeInPercent = unsafePanelSize / groupSize * 100;
			}
			const { panelSize, pivotIndices } = panelDataHelper(panelDataArray, panelData, prevLayout, panelConstraintsArray);
			assert(panelSize != null);
			const isLastPanel = panelIndex === panelDataArray.length - 1;
			const delta = isLastPanel ? panelSize - sizeInPercent : sizeInPercent - panelSize;
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
				emits("layout", convertLayoutToNativeUnits(nextLayout));
				callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value, getGroupSizeInPixels());
			}
		}
		function reevaluatePanelConstraints(panelData, prevConstraints) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const index = findPanelDataIndex(panelDataArray, panelData);
			panelDataArray[index] = panelData;
			eagerValuesRef.value.panelDataArrayChanged = true;
			const panelConstraintsArray = getPanelConstraintsInPercent();
			if (!panelConstraintsArray) return;
			const nextConstraints = panelConstraintsArray[index];
			const { panelSize: prevPanelSize } = panelDataHelper(panelDataArray, panelData, layout$1, panelConstraintsArray);
			if (prevPanelSize === null) return;
			const nextCollapsedSize = nextConstraints?.collapsedSize ?? 0;
			const nextMaxSize = nextConstraints?.maxSize ?? 100;
			const nextMinSize = nextConstraints?.minSize ?? 0;
			if (nextConstraints?.collapsible && isPanelCollapsed(panelData)) {
				if (prevPanelSize !== nextCollapsedSize) resizePanel(panelData, nextCollapsedSize);
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
				const panelConstraintsArray = getPanelConstraintsInPercent();
				if (!panelConstraintsArray) return;
				const { collapsedSize = 0, panelSize, pivotIndices } = panelDataHelper(panelDataArray, panelData, prevLayout, panelConstraintsArray);
				assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
				if (panelSize !== collapsedSize) {
					const sizeUnit = panelData.constraints.sizeUnit ?? "%";
					const groupSize = groupSizeInPixels.value ?? getGroupSizeInPixels();
					const sizeBeforeCollapse = sizeUnit === "px" && groupSize ? panelSize / 100 * groupSize : panelSize;
					panelSizeBeforeCollapseRef.value.set(panelData.id, sizeBeforeCollapse);
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
						emits("layout", convertLayoutToNativeUnits(nextLayout));
						callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value, getGroupSizeInPixels());
					}
				}
			}
		}
		function expandPanel(panelData) {
			const { layout: prevLayout, panelDataArray } = eagerValuesRef.value;
			if (panelData.constraints.collapsible) {
				const panelConstraintsArray = getPanelConstraintsInPercent();
				if (!panelConstraintsArray) return;
				const { collapsedSize = 0, panelSize = 0, minSize = 0, pivotIndices } = panelDataHelper(panelDataArray, panelData, prevLayout, panelConstraintsArray);
				if (fuzzyCompareNumbers(panelSize, collapsedSize) <= 0) {
					const prevPanelSize = panelSizeBeforeCollapseRef.value.get(panelData.id);
					const sizeUnit = panelData.constraints.sizeUnit ?? "%";
					const groupSize = groupSizeInPixels.value ?? getGroupSizeInPixels();
					const restoredSize = sizeUnit === "px" && groupSize ? prevPanelSize != null ? prevPanelSize / groupSize * 100 : null : prevPanelSize;
					const baseSize = restoredSize != null && restoredSize >= minSize ? restoredSize : minSize;
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
						emits("layout", convertLayoutToNativeUnits(nextLayout));
						callPanelCallbacks(panelDataArray, nextLayout, panelIdToLastNotifiedSizeMapRef.value, getGroupSizeInPixels());
					}
				}
			}
		}
		function getPanelSize(panelData) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const { panelSize } = panelDataHelper(panelDataArray, panelData, layout$1);
			assert(panelSize != null, `Panel size not found for panel "${panelData.id}"`);
			const panelUnit = panelData.constraints.sizeUnit ?? "%";
			if (panelUnit === "px") {
				const groupSize = getGroupSizeInPixels();
				if (groupSize != null) return panelSize / 100 * groupSize;
			}
			return panelSize;
		}
		function isPanelCollapsed(panelData) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const panelConstraintsArray = getPanelConstraintsInPercent();
			const { collapsedSize = 0, collapsible, panelSize } = panelDataHelper(panelDataArray, panelData, layout$1, panelConstraintsArray ?? void 0);
			if (!collapsible) return false;
			if (panelSize === void 0) {
				const panelIndex = findPanelDataIndex(panelDataArray, panelData);
				const constraints = panelConstraintsArray?.[panelIndex] ?? panelData.constraints;
				return constraints.defaultSize === constraints.collapsedSize;
			} else return panelSize === collapsedSize;
		}
		function isPanelExpanded(panelData) {
			const { layout: layout$1, panelDataArray } = eagerValuesRef.value;
			const panelConstraintsArray = getPanelConstraintsInPercent();
			const { collapsedSize = 0, collapsible, panelSize } = panelDataHelper(panelDataArray, panelData, layout$1, panelConstraintsArray ?? void 0);
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
		function panelDataHelper(panelDataArray, panelData, layout$1, panelConstraints) {
			const panelIndex = findPanelDataIndex(panelDataArray, panelData);
			const isLastPanel = panelIndex === panelDataArray.length - 1;
			const pivotIndices = isLastPanel ? [panelIndex - 1, panelIndex] : [panelIndex, panelIndex + 1];
			const constraints = panelConstraints ?? getPanelConstraintsInPercent();
			const panelConstraintsFromGroup = constraints?.[panelIndex];
			const panelSize = layout$1[panelIndex];
			return {
				...panelConstraintsFromGroup ?? panelData.constraints,
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