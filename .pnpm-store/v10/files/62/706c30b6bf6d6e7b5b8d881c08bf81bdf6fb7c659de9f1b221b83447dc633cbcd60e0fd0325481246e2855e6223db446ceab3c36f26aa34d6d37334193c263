const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');

//#region src/RovingFocus/utils.ts
const ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
const EVENT_OPTIONS = {
	bubbles: false,
	cancelable: true
};
const MAP_KEY_TO_FOCUS_INTENT = {
	ArrowLeft: "prev",
	ArrowUp: "prev",
	ArrowRight: "next",
	ArrowDown: "next",
	PageUp: "first",
	Home: "first",
	PageDown: "last",
	End: "last"
};
function getDirectionAwareKey(key, dir) {
	if (dir !== "rtl") return key;
	return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
function getFocusIntent(event, orientation, dir) {
	const key = getDirectionAwareKey(event.key, dir);
	if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
	if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
	return MAP_KEY_TO_FOCUS_INTENT[key];
}
function focusFirst(candidates, preventScroll = false) {
	const PREVIOUSLY_FOCUSED_ELEMENT = require_shared_getActiveElement.getActiveElement();
	for (const candidate of candidates) {
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
		candidate.focus({ preventScroll });
		if (require_shared_getActiveElement.getActiveElement() !== PREVIOUSLY_FOCUSED_ELEMENT) return;
	}
}
/**
* Wraps an array around itself at a given start index
* Example: `wrapArray(['a', 'b', 'c', 'd'], 2) === ['c', 'd', 'a', 'b']`
*/
function wrapArray(array, startIndex) {
	return array.map((_, index) => array[(startIndex + index) % array.length]);
}

//#endregion
Object.defineProperty(exports, 'ENTRY_FOCUS', {
  enumerable: true,
  get: function () {
    return ENTRY_FOCUS;
  }
});
Object.defineProperty(exports, 'EVENT_OPTIONS', {
  enumerable: true,
  get: function () {
    return EVENT_OPTIONS;
  }
});
Object.defineProperty(exports, 'MAP_KEY_TO_FOCUS_INTENT', {
  enumerable: true,
  get: function () {
    return MAP_KEY_TO_FOCUS_INTENT;
  }
});
Object.defineProperty(exports, 'focusFirst', {
  enumerable: true,
  get: function () {
    return focusFirst;
  }
});
Object.defineProperty(exports, 'getFocusIntent', {
  enumerable: true,
  get: function () {
    return getFocusIntent;
  }
});
Object.defineProperty(exports, 'wrapArray', {
  enumerable: true,
  get: function () {
    return wrapArray;
  }
});
//# sourceMappingURL=utils.cjs.map