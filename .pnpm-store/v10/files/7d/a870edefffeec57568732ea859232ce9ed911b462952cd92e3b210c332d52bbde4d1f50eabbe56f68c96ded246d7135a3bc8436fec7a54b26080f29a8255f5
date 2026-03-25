const require_utils_assert = require('./assert.cjs');
const require_utils_dom = require('./dom.cjs');
const require_utils_events = require('./events.cjs');

//#region src/Splitter/utils/calculate.ts
function calculateDragOffsetPercentage(event, dragHandleId, direction, initialDragState, panelGroupElement) {
	const isHorizontal = direction === "horizontal";
	const handleElement = require_utils_dom.getResizeHandleElement(dragHandleId, panelGroupElement);
	require_utils_assert.assert(handleElement);
	const groupId = handleElement.getAttribute("data-panel-group-id");
	require_utils_assert.assert(groupId);
	const { initialCursorPosition } = initialDragState;
	const cursorPosition = require_utils_events.getResizeEventCursorPosition(direction, event);
	const groupElement = require_utils_dom.getPanelGroupElement(groupId, panelGroupElement);
	require_utils_assert.assert(groupElement);
	const groupRect = groupElement.getBoundingClientRect();
	const groupSizeInPixels = isHorizontal ? groupRect.width : groupRect.height;
	const offsetPixels = cursorPosition - initialCursorPosition;
	const offsetPercentage = offsetPixels / groupSizeInPixels * 100;
	return offsetPercentage;
}
function calculateDeltaPercentage(event, dragHandleId, direction, initialDragState, keyboardResizeBy, panelGroupElement) {
	if (require_utils_events.isKeyDown(event)) {
		const isHorizontal = direction === "horizontal";
		let delta = 0;
		if (event.shiftKey) delta = 100;
		else delta = keyboardResizeBy ?? 10;
		let movement = 0;
		switch (event.key) {
			case "ArrowDown":
				movement = isHorizontal ? 0 : delta;
				break;
			case "ArrowLeft":
				movement = isHorizontal ? -delta : 0;
				break;
			case "ArrowRight":
				movement = isHorizontal ? delta : 0;
				break;
			case "ArrowUp":
				movement = isHorizontal ? 0 : -delta;
				break;
			case "End":
				movement = 100;
				break;
			case "Home":
				movement = -100;
				break;
		}
		return movement;
	} else {
		if (initialDragState == null) return 0;
		return calculateDragOffsetPercentage(event, dragHandleId, direction, initialDragState, panelGroupElement);
	}
}
function calculateAriaValues({ layout, panelsArray, pivotIndices }) {
	let currentMinSize = 0;
	let currentMaxSize = 100;
	let totalMinSize = 0;
	let totalMaxSize = 0;
	const firstIndex = pivotIndices[0];
	require_utils_assert.assert(firstIndex != null);
	panelsArray.forEach((panelData, index) => {
		const { constraints } = panelData;
		const { maxSize = 100, minSize = 0 } = constraints;
		if (index === firstIndex) {
			currentMinSize = minSize;
			currentMaxSize = maxSize;
		} else {
			totalMinSize += minSize;
			totalMaxSize += maxSize;
		}
	});
	const valueMax = Math.min(currentMaxSize, 100 - totalMinSize);
	const valueMin = Math.max(currentMinSize, 100 - totalMaxSize);
	const valueNow = layout[firstIndex];
	return {
		valueMax,
		valueMin,
		valueNow
	};
}
function calculateUnsafeDefaultLayout({ panelDataArray }) {
	const layout = Array.from({ length: panelDataArray.length });
	const panelConstraintsArray = panelDataArray.map((panelData) => panelData.constraints);
	let numPanelsWithSizes = 0;
	let remainingSize = 100;
	for (let index = 0; index < panelDataArray.length; index++) {
		const panelConstraints = panelConstraintsArray[index];
		require_utils_assert.assert(panelConstraints);
		const { defaultSize } = panelConstraints;
		if (defaultSize != null) {
			numPanelsWithSizes++;
			layout[index] = defaultSize;
			remainingSize -= defaultSize;
		}
	}
	for (let index = 0; index < panelDataArray.length; index++) {
		const panelConstraints = panelConstraintsArray[index];
		require_utils_assert.assert(panelConstraints);
		const { defaultSize } = panelConstraints;
		if (defaultSize != null) continue;
		const numRemainingPanels = panelDataArray.length - numPanelsWithSizes;
		const size = remainingSize / numRemainingPanels;
		numPanelsWithSizes++;
		layout[index] = size;
		remainingSize -= size;
	}
	return layout;
}

//#endregion
Object.defineProperty(exports, 'calculateAriaValues', {
  enumerable: true,
  get: function () {
    return calculateAriaValues;
  }
});
Object.defineProperty(exports, 'calculateDeltaPercentage', {
  enumerable: true,
  get: function () {
    return calculateDeltaPercentage;
  }
});
Object.defineProperty(exports, 'calculateUnsafeDefaultLayout', {
  enumerable: true,
  get: function () {
    return calculateUnsafeDefaultLayout;
  }
});
//# sourceMappingURL=calculate.cjs.map