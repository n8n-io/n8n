const require_utils_dom = require('./dom.cjs');

//#region src/Splitter/utils/pivot.ts
function determinePivotIndices(groupId, dragHandleId, panelGroupElement) {
	const index = require_utils_dom.getResizeHandleElementIndex(groupId, dragHandleId, panelGroupElement);
	return index != null ? [index, index + 1] : [-1, -1];
}

//#endregion
Object.defineProperty(exports, 'determinePivotIndices', {
  enumerable: true,
  get: function () {
    return determinePivotIndices;
  }
});
//# sourceMappingURL=pivot.cjs.map