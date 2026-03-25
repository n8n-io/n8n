const require_utils_assert = require('./assert.cjs');
const require_utils_constants = require('./constants.cjs');
const require_utils_compare = require('./compare.cjs');

//#region src/Splitter/utils/resizePanel.ts
function resizePanel({ panelConstraints: panelConstraintsArray, panelIndex, size }) {
	const panelConstraints = panelConstraintsArray[panelIndex];
	require_utils_assert.assert(panelConstraints != null);
	const { collapsedSize = 0, collapsible, maxSize = 100, minSize = 0 } = panelConstraints;
	if (require_utils_compare.fuzzyCompareNumbers(size, minSize) < 0) if (collapsible) {
		const halfwayPoint = (collapsedSize + minSize) / 2;
		if (require_utils_compare.fuzzyCompareNumbers(size, halfwayPoint) < 0) size = collapsedSize;
		else size = minSize;
	} else size = minSize;
	size = Math.min(maxSize, size);
	size = Number.parseFloat(size.toFixed(require_utils_constants.PRECISION));
	return size;
}

//#endregion
Object.defineProperty(exports, 'resizePanel', {
  enumerable: true,
  get: function () {
    return resizePanel;
  }
});
//# sourceMappingURL=resizePanel.cjs.map