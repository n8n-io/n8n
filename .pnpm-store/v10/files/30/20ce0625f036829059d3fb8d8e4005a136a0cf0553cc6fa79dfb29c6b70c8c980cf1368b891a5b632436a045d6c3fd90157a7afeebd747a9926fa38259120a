import { assert } from "./assert.js";
import { getPanelGroupElement, getResizeHandleElement } from "./dom.js";
import { getResizeEventCursorPosition, isKeyDown } from "./events.js";

//#region src/Splitter/utils/calculate.ts
function calculateDragOffsetPercentage(event, dragHandleId, direction, initialDragState, panelGroupElement) {
	const isHorizontal = direction === "horizontal";
	const handleElement = getResizeHandleElement(dragHandleId, panelGroupElement);
	assert(handleElement);
	const groupId = handleElement.getAttribute("data-panel-group-id");
	assert(groupId);
	const { initialCursorPosition } = initialDragState;
	const cursorPosition = getResizeEventCursorPosition(direction, event);
	const groupElement = getPanelGroupElement(groupId, panelGroupElement);
	assert(groupElement);
	const groupRect = groupElement.getBoundingClientRect();
	const groupSizeInPixels = isHorizontal ? groupRect.width : groupRect.height;
	const offsetPixels = cursorPosition - initialCursorPosition;
	const offsetPercentage = offsetPixels / groupSizeInPixels * 100;
	return offsetPercentage;
}
function calculateDeltaPercentage(event, dragHandleId, direction, initialDragState, keyboardResizeBy, panelGroupElement) {
	if (isKeyDown(event)) {
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
	assert(firstIndex != null);
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
		assert(panelConstraints);
		const { defaultSize } = panelConstraints;
		if (defaultSize != null) {
			numPanelsWithSizes++;
			layout[index] = defaultSize;
			remainingSize -= defaultSize;
		}
	}
	for (let index = 0; index < panelDataArray.length; index++) {
		const panelConstraints = panelConstraintsArray[index];
		assert(panelConstraints);
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
export { calculateAriaValues, calculateDeltaPercentage, calculateUnsafeDefaultLayout };
//# sourceMappingURL=calculate.js.map