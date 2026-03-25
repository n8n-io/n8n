
//#region src/Splitter/utils/events.ts
function isKeyDown(event) {
	return event.type === "keydown";
}
function isMouseEvent(event) {
	return event.type.startsWith("mouse");
}
function isTouchEvent(event) {
	return event.type.startsWith("touch");
}
function getResizeEventCoordinates(event) {
	if (isMouseEvent(event)) return {
		x: event.clientX,
		y: event.clientY
	};
	else if (isTouchEvent(event)) {
		const touch = event.touches[0];
		if (touch && touch.clientX && touch.clientY) return {
			x: touch.clientX,
			y: touch.clientY
		};
	}
	return {
		x: Number.POSITIVE_INFINITY,
		y: Number.POSITIVE_INFINITY
	};
}
function getResizeEventCursorPosition(direction, event) {
	const isHorizontal = direction === "horizontal";
	const { x, y } = getResizeEventCoordinates(event);
	return isHorizontal ? x : y;
}

//#endregion
Object.defineProperty(exports, 'getResizeEventCoordinates', {
  enumerable: true,
  get: function () {
    return getResizeEventCoordinates;
  }
});
Object.defineProperty(exports, 'getResizeEventCursorPosition', {
  enumerable: true,
  get: function () {
    return getResizeEventCursorPosition;
  }
});
Object.defineProperty(exports, 'isKeyDown', {
  enumerable: true,
  get: function () {
    return isKeyDown;
  }
});
Object.defineProperty(exports, 'isMouseEvent', {
  enumerable: true,
  get: function () {
    return isMouseEvent;
  }
});
Object.defineProperty(exports, 'isTouchEvent', {
  enumerable: true,
  get: function () {
    return isTouchEvent;
  }
});
//# sourceMappingURL=events.cjs.map