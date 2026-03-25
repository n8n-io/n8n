const require_utils_registry = require('./registry.cjs');

//#region src/Splitter/utils/style.ts
let currentCursorStyle = null;
let styleElement = null;
function getCursorStyle(state, constraintFlags) {
	if (constraintFlags) {
		const horizontalMin = (constraintFlags & require_utils_registry.EXCEEDED_HORIZONTAL_MIN) !== 0;
		const horizontalMax = (constraintFlags & require_utils_registry.EXCEEDED_HORIZONTAL_MAX) !== 0;
		const verticalMin = (constraintFlags & require_utils_registry.EXCEEDED_VERTICAL_MIN) !== 0;
		const verticalMax = (constraintFlags & require_utils_registry.EXCEEDED_VERTICAL_MAX) !== 0;
		if (horizontalMin) if (verticalMin) return "se-resize";
		else if (verticalMax) return "ne-resize";
		else return "e-resize";
		else if (horizontalMax) if (verticalMin) return "sw-resize";
		else if (verticalMax) return "nw-resize";
		else return "w-resize";
		else if (verticalMin) return "s-resize";
		else if (verticalMax) return "n-resize";
	}
	switch (state) {
		case "horizontal": return "ew-resize";
		case "intersection": return "move";
		case "vertical": return "ns-resize";
	}
}
function resetGlobalCursorStyle() {
	if (styleElement !== null) {
		document.head.removeChild(styleElement);
		currentCursorStyle = null;
		styleElement = null;
	}
}
function setGlobalCursorStyle(state, constraintFlags, nonce) {
	const style = getCursorStyle(state, constraintFlags);
	if (currentCursorStyle === style) return;
	currentCursorStyle = style;
	if (styleElement === null) {
		styleElement = document.createElement("style");
		if (nonce) styleElement.nonce = nonce;
		document.head.appendChild(styleElement);
	}
	styleElement.innerHTML = `*{cursor: ${style}!important;}`;
}
function computePanelFlexBoxStyle({ defaultSize, dragState, layout, panelData, panelIndex, precision = 3 }) {
	const size = layout[panelIndex];
	let flexGrow;
	if (size == null) flexGrow = defaultSize !== void 0 ? defaultSize.toPrecision(precision) : "1";
	else if (panelData.length === 1) flexGrow = "1";
	else flexGrow = size.toPrecision(precision);
	return {
		flexBasis: 0,
		flexGrow,
		flexShrink: 1,
		overflow: "hidden",
		pointerEvents: dragState !== null ? "none" : void 0
	};
}

//#endregion
Object.defineProperty(exports, 'computePanelFlexBoxStyle', {
  enumerable: true,
  get: function () {
    return computePanelFlexBoxStyle;
  }
});
Object.defineProperty(exports, 'resetGlobalCursorStyle', {
  enumerable: true,
  get: function () {
    return resetGlobalCursorStyle;
  }
});
Object.defineProperty(exports, 'setGlobalCursorStyle', {
  enumerable: true,
  get: function () {
    return setGlobalCursorStyle;
  }
});
//# sourceMappingURL=style.cjs.map