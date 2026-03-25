const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');

//#region src/Menu/utils.ts
const ITEM_SELECT = "menu.itemSelect";
const SELECTION_KEYS = ["Enter", " "];
const FIRST_KEYS = [
	"ArrowDown",
	"PageUp",
	"Home"
];
const LAST_KEYS = [
	"ArrowUp",
	"PageDown",
	"End"
];
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
const SUB_OPEN_KEYS = {
	ltr: [...SELECTION_KEYS, "ArrowRight"],
	rtl: [...SELECTION_KEYS, "ArrowLeft"]
};
const SUB_CLOSE_KEYS = {
	ltr: ["ArrowLeft"],
	rtl: ["ArrowRight"]
};
function getOpenState(open) {
	return open ? "open" : "closed";
}
function isIndeterminate(checked) {
	return checked === "indeterminate";
}
function getCheckedState(checked) {
	return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
function focusFirst(candidates) {
	const PREVIOUSLY_FOCUSED_ELEMENT = require_shared_getActiveElement.getActiveElement();
	for (const candidate of candidates) {
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
		candidate.focus();
		if (require_shared_getActiveElement.getActiveElement() !== PREVIOUSLY_FOCUSED_ELEMENT) return;
	}
}
function isPointInPolygon(point, polygon) {
	const { x, y } = point;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i].x;
		const yi = polygon[i].y;
		const xj = polygon[j].x;
		const yj = polygon[j].y;
		const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}
function isPointerInGraceArea(event, area) {
	if (!area) return false;
	const cursorPos = {
		x: event.clientX,
		y: event.clientY
	};
	return isPointInPolygon(cursorPos, area);
}
function isMouseEvent(event) {
	return event.pointerType === "mouse";
}

//#endregion
Object.defineProperty(exports, 'FIRST_LAST_KEYS', {
  enumerable: true,
  get: function () {
    return FIRST_LAST_KEYS;
  }
});
Object.defineProperty(exports, 'ITEM_SELECT', {
  enumerable: true,
  get: function () {
    return ITEM_SELECT;
  }
});
Object.defineProperty(exports, 'LAST_KEYS', {
  enumerable: true,
  get: function () {
    return LAST_KEYS;
  }
});
Object.defineProperty(exports, 'SELECTION_KEYS', {
  enumerable: true,
  get: function () {
    return SELECTION_KEYS;
  }
});
Object.defineProperty(exports, 'SUB_CLOSE_KEYS', {
  enumerable: true,
  get: function () {
    return SUB_CLOSE_KEYS;
  }
});
Object.defineProperty(exports, 'SUB_OPEN_KEYS', {
  enumerable: true,
  get: function () {
    return SUB_OPEN_KEYS;
  }
});
Object.defineProperty(exports, 'focusFirst', {
  enumerable: true,
  get: function () {
    return focusFirst;
  }
});
Object.defineProperty(exports, 'getCheckedState', {
  enumerable: true,
  get: function () {
    return getCheckedState;
  }
});
Object.defineProperty(exports, 'getOpenState', {
  enumerable: true,
  get: function () {
    return getOpenState;
  }
});
Object.defineProperty(exports, 'isIndeterminate', {
  enumerable: true,
  get: function () {
    return isIndeterminate;
  }
});
Object.defineProperty(exports, 'isMouseEvent', {
  enumerable: true,
  get: function () {
    return isMouseEvent;
  }
});
Object.defineProperty(exports, 'isPointerInGraceArea', {
  enumerable: true,
  get: function () {
    return isPointerInGraceArea;
  }
});
//# sourceMappingURL=utils.cjs.map