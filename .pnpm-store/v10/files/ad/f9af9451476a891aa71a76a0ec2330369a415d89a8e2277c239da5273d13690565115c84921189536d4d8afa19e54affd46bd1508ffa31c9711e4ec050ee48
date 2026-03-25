const require_utils_events = require('./events.cjs');
const require_utils_rects = require('./rects.cjs');
const require_utils_stackingOrder = require('./stackingOrder.cjs');
const require_utils_style = require('./style.cjs');

//#region src/Splitter/utils/registry.ts
const EXCEEDED_HORIZONTAL_MIN = 1;
const EXCEEDED_HORIZONTAL_MAX = 2;
const EXCEEDED_VERTICAL_MIN = 4;
const EXCEEDED_VERTICAL_MAX = 8;
function getInputType() {
	if (typeof matchMedia === "function") return matchMedia("(pointer:coarse)").matches ? "coarse" : "fine";
}
const isCoarsePointer = getInputType() === "coarse";
const intersectingHandles = [];
let isPointerDown = false;
const ownerDocumentCounts = /* @__PURE__ */ new Map();
const panelConstraintFlags = /* @__PURE__ */ new Map();
const registeredResizeHandlers = /* @__PURE__ */ new Set();
function registerResizeHandle(resizeHandleId, element, direction, hitAreaMargins, nonce, setResizeHandlerState) {
	const { ownerDocument } = element;
	const data = {
		direction,
		element,
		hitAreaMargins,
		nonce,
		setResizeHandlerState
	};
	const count = ownerDocumentCounts.get(ownerDocument) ?? 0;
	ownerDocumentCounts.set(ownerDocument, count + 1);
	registeredResizeHandlers.add(data);
	updateListeners();
	return function unregisterResizeHandle() {
		panelConstraintFlags.delete(resizeHandleId);
		registeredResizeHandlers.delete(data);
		const count$1 = ownerDocumentCounts.get(ownerDocument) ?? 1;
		ownerDocumentCounts.set(ownerDocument, count$1 - 1);
		updateListeners();
		require_utils_style.resetGlobalCursorStyle();
		if (count$1 === 1) ownerDocumentCounts.delete(ownerDocument);
	};
}
function handlePointerDown(event) {
	const { target } = event;
	const { x, y } = require_utils_events.getResizeEventCoordinates(event);
	isPointerDown = true;
	recalculateIntersectingHandles({
		target,
		x,
		y
	});
	updateListeners();
	if (intersectingHandles.length > 0) {
		updateResizeHandlerStates("down", event);
		event.preventDefault();
	}
}
function handlePointerMove(event) {
	const { x, y } = require_utils_events.getResizeEventCoordinates(event);
	if (!isPointerDown) {
		const { target } = event;
		recalculateIntersectingHandles({
			target,
			x,
			y
		});
	}
	updateResizeHandlerStates("move", event);
	updateCursor();
	if (intersectingHandles.length > 0) event.preventDefault();
}
function handlePointerUp(event) {
	const { target } = event;
	const { x, y } = require_utils_events.getResizeEventCoordinates(event);
	panelConstraintFlags.clear();
	isPointerDown = false;
	if (intersectingHandles.length > 0) event.preventDefault();
	updateResizeHandlerStates("up", event);
	recalculateIntersectingHandles({
		target,
		x,
		y
	});
	updateCursor();
	updateListeners();
}
function recalculateIntersectingHandles({ target, x, y }) {
	intersectingHandles.splice(0);
	let targetElement = null;
	if (target instanceof HTMLElement) targetElement = target;
	registeredResizeHandlers.forEach((data) => {
		const { element: dragHandleElement, hitAreaMargins } = data;
		const dragHandleRect = dragHandleElement.getBoundingClientRect();
		const { bottom, left, right, top } = dragHandleRect;
		const margin = isCoarsePointer ? hitAreaMargins.coarse : hitAreaMargins.fine;
		const eventIntersects = x >= left - margin && x <= right + margin && y >= top - margin && y <= bottom + margin;
		if (eventIntersects) {
			if (targetElement !== null && dragHandleElement !== targetElement && !dragHandleElement.contains(targetElement) && !targetElement.contains(dragHandleElement) && require_utils_stackingOrder.compare(targetElement, dragHandleElement) > 0) {
				let currentElement = targetElement;
				let didIntersect = false;
				while (currentElement) {
					if (currentElement.contains(dragHandleElement)) break;
					else if (require_utils_rects.intersects(currentElement.getBoundingClientRect(), dragHandleRect, true)) {
						didIntersect = true;
						break;
					}
					currentElement = currentElement.parentElement;
				}
				if (didIntersect) return;
			}
			intersectingHandles.push(data);
		}
	});
}
function reportConstraintsViolation(resizeHandleId, flag) {
	panelConstraintFlags.set(resizeHandleId, flag);
}
function updateCursor() {
	let intersectsHorizontal = false;
	let intersectsVertical = false;
	let nonce;
	intersectingHandles.forEach((data) => {
		const { direction, nonce: _nonce } = data;
		if (direction.value === "horizontal") intersectsHorizontal = true;
		else intersectsVertical = true;
		nonce = _nonce.value;
	});
	let constraintFlags = 0;
	panelConstraintFlags.forEach((flag) => {
		constraintFlags |= flag;
	});
	if (intersectsHorizontal && intersectsVertical) require_utils_style.setGlobalCursorStyle("intersection", constraintFlags, nonce);
	else if (intersectsHorizontal) require_utils_style.setGlobalCursorStyle("horizontal", constraintFlags, nonce);
	else if (intersectsVertical) require_utils_style.setGlobalCursorStyle("vertical", constraintFlags, nonce);
	else require_utils_style.resetGlobalCursorStyle();
}
function updateListeners() {
	ownerDocumentCounts.forEach((_, ownerDocument) => {
		const { body } = ownerDocument;
		body.removeEventListener("contextmenu", handlePointerUp);
		body.removeEventListener("mousedown", handlePointerDown);
		body.removeEventListener("mouseleave", handlePointerMove);
		body.removeEventListener("mousemove", handlePointerMove);
		body.removeEventListener("touchmove", handlePointerMove);
		body.removeEventListener("touchstart", handlePointerDown);
	});
	window.removeEventListener("mouseup", handlePointerUp);
	window.removeEventListener("touchcancel", handlePointerUp);
	window.removeEventListener("touchend", handlePointerUp);
	if (registeredResizeHandlers.size > 0) if (isPointerDown) {
		if (intersectingHandles.length > 0) ownerDocumentCounts.forEach((count, ownerDocument) => {
			const { body } = ownerDocument;
			if (count > 0) {
				body.addEventListener("contextmenu", handlePointerUp);
				body.addEventListener("mouseleave", handlePointerMove);
				body.addEventListener("mousemove", handlePointerMove);
				body.addEventListener("touchmove", handlePointerMove, { passive: false });
			}
		});
		window.addEventListener("mouseup", handlePointerUp);
		window.addEventListener("touchcancel", handlePointerUp);
		window.addEventListener("touchend", handlePointerUp);
	} else ownerDocumentCounts.forEach((count, ownerDocument) => {
		const { body } = ownerDocument;
		if (count > 0) {
			body.addEventListener("mousedown", handlePointerDown);
			body.addEventListener("mousemove", handlePointerMove);
			body.addEventListener("touchmove", handlePointerMove, { passive: false });
			body.addEventListener("touchstart", handlePointerDown);
		}
	});
}
function updateResizeHandlerStates(action, event) {
	registeredResizeHandlers.forEach((data) => {
		const { setResizeHandlerState } = data;
		const isActive = intersectingHandles.includes(data);
		setResizeHandlerState(action, isActive, event);
	});
}

//#endregion
Object.defineProperty(exports, 'EXCEEDED_HORIZONTAL_MAX', {
  enumerable: true,
  get: function () {
    return EXCEEDED_HORIZONTAL_MAX;
  }
});
Object.defineProperty(exports, 'EXCEEDED_HORIZONTAL_MIN', {
  enumerable: true,
  get: function () {
    return EXCEEDED_HORIZONTAL_MIN;
  }
});
Object.defineProperty(exports, 'EXCEEDED_VERTICAL_MAX', {
  enumerable: true,
  get: function () {
    return EXCEEDED_VERTICAL_MAX;
  }
});
Object.defineProperty(exports, 'EXCEEDED_VERTICAL_MIN', {
  enumerable: true,
  get: function () {
    return EXCEEDED_VERTICAL_MIN;
  }
});
Object.defineProperty(exports, 'registerResizeHandle', {
  enumerable: true,
  get: function () {
    return registerResizeHandle;
  }
});
Object.defineProperty(exports, 'reportConstraintsViolation', {
  enumerable: true,
  get: function () {
    return reportConstraintsViolation;
  }
});
//# sourceMappingURL=registry.cjs.map