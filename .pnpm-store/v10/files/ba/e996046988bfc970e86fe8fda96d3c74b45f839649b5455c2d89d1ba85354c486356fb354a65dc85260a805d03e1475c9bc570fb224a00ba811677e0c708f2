const require_shared_useKbd = require('../shared/useKbd.cjs');

//#region src/shared/date/segment.ts
function isSegmentNavigationKey(key) {
	const kbd = require_shared_useKbd.useKbd();
	if (key === kbd.ARROW_RIGHT || key === kbd.ARROW_LEFT) return true;
	return false;
}
function isNumberString(value) {
	if (Number.isNaN(Number.parseInt(value))) return false;
	return true;
}
function isAcceptableSegmentKey(key) {
	const kbd = require_shared_useKbd.useKbd();
	const acceptableSegmentKeys = [
		kbd.ENTER,
		kbd.ARROW_UP,
		kbd.ARROW_DOWN,
		kbd.ARROW_LEFT,
		kbd.ARROW_RIGHT,
		kbd.BACKSPACE,
		kbd.SPACE,
		"a",
		"A",
		"p",
		"P"
	];
	if (acceptableSegmentKeys.includes(key)) return true;
	if (isNumberString(key)) return true;
	return false;
}
function getSegmentElements(parentElement) {
	return Array.from(parentElement.querySelectorAll("[data-reka-date-field-segment]")).filter((item) => item.getAttribute("data-reka-date-field-segment") !== "literal");
}
function getTimeFieldSegmentElements(parentElement) {
	return Array.from(parentElement.querySelectorAll("[data-reka-time-field-segment]")).filter((item) => item.getAttribute("data-reka-time-field-segment") !== "literal");
}

//#endregion
Object.defineProperty(exports, 'getSegmentElements', {
  enumerable: true,
  get: function () {
    return getSegmentElements;
  }
});
Object.defineProperty(exports, 'getTimeFieldSegmentElements', {
  enumerable: true,
  get: function () {
    return getTimeFieldSegmentElements;
  }
});
Object.defineProperty(exports, 'isAcceptableSegmentKey', {
  enumerable: true,
  get: function () {
    return isAcceptableSegmentKey;
  }
});
Object.defineProperty(exports, 'isNumberString', {
  enumerable: true,
  get: function () {
    return isNumberString;
  }
});
Object.defineProperty(exports, 'isSegmentNavigationKey', {
  enumerable: true,
  get: function () {
    return isSegmentNavigationKey;
  }
});
//# sourceMappingURL=segment.cjs.map