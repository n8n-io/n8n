const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');

//#region src/FocusScope/utils.ts
const AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
const AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
const EVENT_OPTIONS = {
	bubbles: false,
	cancelable: true
};
/**
* Attempts focusing the first element in a list of candidates.
* Stops when focus has actually moved.
*/
function focusFirst(candidates, { select = false } = {}) {
	const previouslyFocusedElement = require_shared_getActiveElement.getActiveElement();
	for (const candidate of candidates) {
		focus(candidate, { select });
		if (require_shared_getActiveElement.getActiveElement() !== previouslyFocusedElement) return true;
	}
}
/**
* Returns the first and last tabbable elements inside a container.
*/
function getTabbableEdges(container) {
	const candidates = getTabbableCandidates(container);
	const first = findVisible(candidates, container);
	const last = findVisible(candidates.reverse(), container);
	return [first, last];
}
/**
* Returns a list of potential tabbable candidates.
*
* NOTE: This is only a close approximation. For example it doesn't take into account cases like when
* elements are not visible. This cannot be worked out easily by just reading a property, but rather
* necessitate runtime knowledge (computed styles, etc). We deal with these cases separately.
*
* See: https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
* Credit: https://github.com/discord/focus-layers/blob/master/src/util/wrapFocus.tsx#L1
*/
function getTabbableCandidates(container) {
	const nodes = [];
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, { acceptNode: (node) => {
		const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
		if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
		return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	} });
	while (walker.nextNode()) nodes.push(walker.currentNode);
	return nodes;
}
/**
* Returns the first visible element in a list.
* NOTE: Only checks visibility up to the `container`.
*/
function findVisible(elements, container) {
	for (const element of elements) if (!isHidden(element, { upTo: container })) return element;
}
function isHidden(node, { upTo }) {
	if (getComputedStyle(node).visibility === "hidden") return true;
	while (node) {
		if (upTo !== void 0 && node === upTo) return false;
		if (getComputedStyle(node).display === "none") return true;
		node = node.parentElement;
	}
	return false;
}
function isSelectableInput(element) {
	return element instanceof HTMLInputElement && "select" in element;
}
function focus(element, { select = false } = {}) {
	if (element && element.focus) {
		const previouslyFocusedElement = require_shared_getActiveElement.getActiveElement();
		element.focus({ preventScroll: true });
		if (element !== previouslyFocusedElement && isSelectableInput(element) && select) element.select();
	}
}

//#endregion
Object.defineProperty(exports, 'AUTOFOCUS_ON_MOUNT', {
  enumerable: true,
  get: function () {
    return AUTOFOCUS_ON_MOUNT;
  }
});
Object.defineProperty(exports, 'AUTOFOCUS_ON_UNMOUNT', {
  enumerable: true,
  get: function () {
    return AUTOFOCUS_ON_UNMOUNT;
  }
});
Object.defineProperty(exports, 'EVENT_OPTIONS', {
  enumerable: true,
  get: function () {
    return EVENT_OPTIONS;
  }
});
Object.defineProperty(exports, 'focus', {
  enumerable: true,
  get: function () {
    return focus;
  }
});
Object.defineProperty(exports, 'focusFirst', {
  enumerable: true,
  get: function () {
    return focusFirst;
  }
});
Object.defineProperty(exports, 'getTabbableCandidates', {
  enumerable: true,
  get: function () {
    return getTabbableCandidates;
  }
});
Object.defineProperty(exports, 'getTabbableEdges', {
  enumerable: true,
  get: function () {
    return getTabbableEdges;
  }
});
//# sourceMappingURL=utils.cjs.map