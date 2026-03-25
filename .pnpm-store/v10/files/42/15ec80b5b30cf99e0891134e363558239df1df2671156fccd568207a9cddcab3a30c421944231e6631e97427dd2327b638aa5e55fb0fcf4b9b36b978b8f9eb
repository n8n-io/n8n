
//#region src/Toast/utils.ts
const TOAST_SWIPE_START = "toast.swipeStart";
const TOAST_SWIPE_MOVE = "toast.swipeMove";
const TOAST_SWIPE_CANCEL = "toast.swipeCancel";
const TOAST_SWIPE_END = "toast.swipeEnd";
const VIEWPORT_PAUSE = "toast.viewportPause";
const VIEWPORT_RESUME = "toast.viewportResume";
function handleAndDispatchCustomEvent(name, handler, detail) {
	const currentTarget = detail.originalEvent.currentTarget;
	const event = new CustomEvent(name, {
		bubbles: false,
		cancelable: true,
		detail
	});
	if (handler) currentTarget.addEventListener(name, handler, { once: true });
	currentTarget.dispatchEvent(event);
}
function isDeltaInDirection(delta, direction, threshold = 0) {
	const deltaX = Math.abs(delta.x);
	const deltaY = Math.abs(delta.y);
	const isDeltaX = deltaX > deltaY;
	if (direction === "left" || direction === "right") return isDeltaX && deltaX > threshold;
	else return !isDeltaX && deltaY > threshold;
}
function isHTMLElement(node) {
	return node.nodeType === node.ELEMENT_NODE;
}
function getAnnounceTextContent(container) {
	const textContent = [];
	const childNodes = Array.from(container.childNodes);
	childNodes.forEach((node) => {
		if (node.nodeType === node.TEXT_NODE && node.textContent) textContent.push(node.textContent);
		if (isHTMLElement(node)) {
			const isHidden = node.ariaHidden || node.hidden || node.style.display === "none";
			const isExcluded = node.dataset.rekaToastAnnounceExclude === "";
			if (!isHidden) if (isExcluded) {
				const altText = node.dataset.rekaToastAnnounceAlt;
				if (altText) textContent.push(altText);
			} else textContent.push(...getAnnounceTextContent(node));
		}
	});
	return textContent;
}

//#endregion
Object.defineProperty(exports, 'TOAST_SWIPE_CANCEL', {
  enumerable: true,
  get: function () {
    return TOAST_SWIPE_CANCEL;
  }
});
Object.defineProperty(exports, 'TOAST_SWIPE_END', {
  enumerable: true,
  get: function () {
    return TOAST_SWIPE_END;
  }
});
Object.defineProperty(exports, 'TOAST_SWIPE_MOVE', {
  enumerable: true,
  get: function () {
    return TOAST_SWIPE_MOVE;
  }
});
Object.defineProperty(exports, 'TOAST_SWIPE_START', {
  enumerable: true,
  get: function () {
    return TOAST_SWIPE_START;
  }
});
Object.defineProperty(exports, 'VIEWPORT_PAUSE', {
  enumerable: true,
  get: function () {
    return VIEWPORT_PAUSE;
  }
});
Object.defineProperty(exports, 'VIEWPORT_RESUME', {
  enumerable: true,
  get: function () {
    return VIEWPORT_RESUME;
  }
});
Object.defineProperty(exports, 'getAnnounceTextContent', {
  enumerable: true,
  get: function () {
    return getAnnounceTextContent;
  }
});
Object.defineProperty(exports, 'handleAndDispatchCustomEvent', {
  enumerable: true,
  get: function () {
    return handleAndDispatchCustomEvent;
  }
});
Object.defineProperty(exports, 'isDeltaInDirection', {
  enumerable: true,
  get: function () {
    return isDeltaInDirection;
  }
});
//# sourceMappingURL=utils.cjs.map