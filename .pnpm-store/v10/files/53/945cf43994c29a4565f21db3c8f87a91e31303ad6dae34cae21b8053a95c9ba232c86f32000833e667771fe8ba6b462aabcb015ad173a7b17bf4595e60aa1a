const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_utils_assert = require('../utils/assert.cjs');
const require_utils_dom = require('../utils/dom.cjs');
const require_utils_calculate = require('../utils/calculate.cjs');
const require_utils_compare = require('../utils/compare.cjs');
const require_utils_layout = require('../utils/layout.cjs');
const require_utils_pivot = require('../utils/pivot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Splitter/utils/composables/useWindowSplitterPanelGroupBehavior.ts
function useWindowSplitterPanelGroupBehavior({ eagerValuesRef, groupId, layout, panelDataArray, panelGroupElement, setLayout }) {
	(0, vue.watchEffect)((onCleanup) => {
		const _panelGroupElement = panelGroupElement.value;
		if (!_panelGroupElement) return;
		const resizeHandleElements = require_utils_dom.getResizeHandleElementsForGroup(groupId, _panelGroupElement);
		for (let index = 0; index < panelDataArray.length - 1; index++) {
			const { valueMax, valueMin, valueNow } = require_utils_calculate.calculateAriaValues({
				layout: layout.value,
				panelsArray: panelDataArray,
				pivotIndices: [index, index + 1]
			});
			const resizeHandleElement = resizeHandleElements[index];
			if (resizeHandleElement == null) {} else {
				const panelData = panelDataArray[index];
				require_utils_assert.assert(panelData);
				resizeHandleElement.setAttribute("aria-controls", panelData.id);
				resizeHandleElement.setAttribute("aria-valuemax", `${Math.round(valueMax)}`);
				resizeHandleElement.setAttribute("aria-valuemin", `${Math.round(valueMin)}`);
				resizeHandleElement.setAttribute("aria-valuenow", valueNow != null ? `${Math.round(valueNow)}` : "");
			}
		}
		onCleanup(() => {
			resizeHandleElements.forEach((resizeHandleElement) => {
				resizeHandleElement.removeAttribute("aria-controls");
				resizeHandleElement.removeAttribute("aria-valuemax");
				resizeHandleElement.removeAttribute("aria-valuemin");
				resizeHandleElement.removeAttribute("aria-valuenow");
			});
		});
	});
	(0, vue.watchEffect)((onCleanup) => {
		const _panelGroupElement = panelGroupElement.value;
		if (!_panelGroupElement) return;
		const eagerValues = eagerValuesRef.value;
		require_utils_assert.assert(eagerValues);
		const { panelDataArray: panelDataArray$1 } = eagerValues;
		const groupElement = require_utils_dom.getPanelGroupElement(groupId, _panelGroupElement);
		require_utils_assert.assert(groupElement != null, `No group found for id "${groupId}"`);
		const handles = require_utils_dom.getResizeHandleElementsForGroup(groupId, _panelGroupElement);
		require_utils_assert.assert(handles);
		const cleanupFunctions = handles.map((handle) => {
			const handleId = handle.getAttribute("data-panel-resize-handle-id");
			require_utils_assert.assert(handleId);
			const [idBefore, idAfter] = require_utils_dom.getResizeHandlePanelIds(groupId, handleId, panelDataArray$1, _panelGroupElement);
			if (idBefore == null || idAfter == null) return () => {};
			const onKeyDown = (event) => {
				if (event.defaultPrevented) return;
				switch (event.key) {
					case "Enter": {
						event.preventDefault();
						const index = panelDataArray$1.findIndex((panelData) => panelData.id === idBefore);
						if (index >= 0) {
							const panelData = panelDataArray$1[index];
							require_utils_assert.assert(panelData);
							const size = layout.value[index];
							const { collapsedSize = 0, collapsible, minSize = 0 } = panelData.constraints;
							if (size != null && collapsible) {
								const nextLayout = require_utils_layout.adjustLayoutByDelta({
									delta: require_utils_compare.fuzzyNumbersEqual(size, collapsedSize) ? minSize - collapsedSize : collapsedSize - size,
									layout: layout.value,
									panelConstraints: panelDataArray$1.map((panelData$1) => panelData$1.constraints),
									pivotIndices: require_utils_pivot.determinePivotIndices(groupId, handleId, _panelGroupElement),
									trigger: "keyboard"
								});
								if (layout.value !== nextLayout) setLayout(nextLayout);
							}
						}
						break;
					}
				}
			};
			handle.addEventListener("keydown", onKeyDown);
			return () => {
				handle.removeEventListener("keydown", onKeyDown);
			};
		});
		onCleanup(() => {
			cleanupFunctions.forEach((cleanupFunction) => cleanupFunction());
		});
	});
}

//#endregion
Object.defineProperty(exports, 'useWindowSplitterPanelGroupBehavior', {
  enumerable: true,
  get: function () {
    return useWindowSplitterPanelGroupBehavior;
  }
});
//# sourceMappingURL=useWindowSplitterPanelGroupBehavior.cjs.map