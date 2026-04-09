import { assert } from "./assert.js";
import { fuzzyNumbersEqual } from "./compare.js";

//#region src/Splitter/utils/callPanelCallbacks.ts
function callPanelCallbacks(panelsArray, layout, panelIdToLastNotifiedSizeMap, groupSizeInPixels) {
	layout.forEach((size, index) => {
		const panelData = panelsArray[index];
		assert(panelData);
		const { callbacks, constraints, id: panelId } = panelData;
		const { collapsedSize = 0, collapsible, sizeUnit } = constraints;
		let displaySize = size;
		if (sizeUnit === "px" && groupSizeInPixels != null) displaySize = size / 100 * groupSizeInPixels;
		const lastNotifiedSize = panelIdToLastNotifiedSizeMap[panelId];
		if (lastNotifiedSize == null || !fuzzyNumbersEqual(displaySize, lastNotifiedSize)) {
			panelIdToLastNotifiedSizeMap[panelId] = displaySize;
			const { onCollapse, onExpand, onResize } = callbacks;
			if (onResize) onResize(displaySize, lastNotifiedSize);
			if (collapsible && (onCollapse || onExpand)) {
				if (onExpand && (lastNotifiedSize == null || fuzzyNumbersEqual(lastNotifiedSize, collapsedSize)) && !fuzzyNumbersEqual(displaySize, collapsedSize)) onExpand();
				if (onCollapse && (lastNotifiedSize == null || !fuzzyNumbersEqual(lastNotifiedSize, collapsedSize)) && fuzzyNumbersEqual(displaySize, collapsedSize)) onCollapse();
			}
		}
	});
}

//#endregion
export { callPanelCallbacks };
//# sourceMappingURL=callPanelCallbacks.js.map