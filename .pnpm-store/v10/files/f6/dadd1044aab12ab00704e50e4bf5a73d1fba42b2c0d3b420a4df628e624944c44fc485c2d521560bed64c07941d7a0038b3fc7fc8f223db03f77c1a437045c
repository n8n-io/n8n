const require_utils_assert = require('./assert.cjs');
const require_utils_compare = require('./compare.cjs');

//#region src/Splitter/utils/callPanelCallbacks.ts
function callPanelCallbacks(panelsArray, layout, panelIdToLastNotifiedSizeMap, groupSizeInPixels) {
	layout.forEach((size, index) => {
		const panelData = panelsArray[index];
		require_utils_assert.assert(panelData);
		const { callbacks, constraints, id: panelId } = panelData;
		const { collapsedSize = 0, collapsible, sizeUnit } = constraints;
		let displaySize = size;
		if (sizeUnit === "px" && groupSizeInPixels != null) displaySize = size / 100 * groupSizeInPixels;
		const lastNotifiedSize = panelIdToLastNotifiedSizeMap[panelId];
		if (lastNotifiedSize == null || !require_utils_compare.fuzzyNumbersEqual(displaySize, lastNotifiedSize)) {
			panelIdToLastNotifiedSizeMap[panelId] = displaySize;
			const { onCollapse, onExpand, onResize } = callbacks;
			if (onResize) onResize(displaySize, lastNotifiedSize);
			if (collapsible && (onCollapse || onExpand)) {
				if (onExpand && (lastNotifiedSize == null || require_utils_compare.fuzzyNumbersEqual(lastNotifiedSize, collapsedSize)) && !require_utils_compare.fuzzyNumbersEqual(displaySize, collapsedSize)) onExpand();
				if (onCollapse && (lastNotifiedSize == null || !require_utils_compare.fuzzyNumbersEqual(lastNotifiedSize, collapsedSize)) && require_utils_compare.fuzzyNumbersEqual(displaySize, collapsedSize)) onCollapse();
			}
		}
	});
}

//#endregion
Object.defineProperty(exports, 'callPanelCallbacks', {
  enumerable: true,
  get: function () {
    return callPanelCallbacks;
  }
});
//# sourceMappingURL=callPanelCallbacks.cjs.map