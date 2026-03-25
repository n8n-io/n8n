import { assert } from "./assert.js";

//#region src/Splitter/utils/callPanelCallbacks.ts
function callPanelCallbacks(panelsArray, layout, panelIdToLastNotifiedSizeMap) {
	layout.forEach((size, index) => {
		const panelData = panelsArray[index];
		assert(panelData);
		const { callbacks, constraints, id: panelId } = panelData;
		const { collapsedSize = 0, collapsible } = constraints;
		const lastNotifiedSize = panelIdToLastNotifiedSizeMap[panelId];
		if (lastNotifiedSize == null || size !== lastNotifiedSize) {
			panelIdToLastNotifiedSizeMap[panelId] = size;
			const { onCollapse, onExpand, onResize } = callbacks;
			if (onResize) onResize(size, lastNotifiedSize);
			if (collapsible && (onCollapse || onExpand)) {
				if (onExpand && (lastNotifiedSize == null || lastNotifiedSize === collapsedSize) && size !== collapsedSize) onExpand();
				if (onCollapse && (lastNotifiedSize == null || lastNotifiedSize !== collapsedSize) && size === collapsedSize) onCollapse();
			}
		}
	});
}

//#endregion
export { callPanelCallbacks };
//# sourceMappingURL=callPanelCallbacks.js.map