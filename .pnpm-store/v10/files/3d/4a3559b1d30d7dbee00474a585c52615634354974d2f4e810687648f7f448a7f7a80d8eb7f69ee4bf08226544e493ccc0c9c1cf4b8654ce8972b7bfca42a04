const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');

//#region src/NavigationMenu/utils.ts
function getOpenState(open) {
	return open ? "open" : "closed";
}
function makeTriggerId(baseId, value) {
	return `${baseId}-trigger-${value}`;
}
function makeContentId(baseId, value) {
	return `${baseId}-content-${value}`;
}
const LINK_SELECT = "navigationMenu.linkSelect";
const EVENT_ROOT_CONTENT_DISMISS = "navigationMenu.rootContentDismiss";
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
function focusFirst(candidates) {
	const previouslyFocusedElement = require_shared_getActiveElement.getActiveElement();
	return candidates.some((candidate) => {
		if (candidate === previouslyFocusedElement) return true;
		candidate.focus();
		return require_shared_getActiveElement.getActiveElement() !== previouslyFocusedElement;
	});
}
function removeFromTabOrder(candidates) {
	candidates.forEach((candidate) => {
		candidate.dataset.tabindex = candidate.getAttribute("tabindex") || "";
		candidate.setAttribute("tabindex", "-1");
	});
	return () => {
		candidates.forEach((candidate) => {
			const prevTabIndex = candidate.dataset.tabindex;
			candidate.setAttribute("tabindex", prevTabIndex);
		});
	};
}
function whenMouse(handler) {
	return (event) => event.pointerType === "mouse" ? handler(event) : void 0;
}

//#endregion
Object.defineProperty(exports, 'EVENT_ROOT_CONTENT_DISMISS', {
  enumerable: true,
  get: function () {
    return EVENT_ROOT_CONTENT_DISMISS;
  }
});
Object.defineProperty(exports, 'LINK_SELECT', {
  enumerable: true,
  get: function () {
    return LINK_SELECT;
  }
});
Object.defineProperty(exports, 'focusFirst', {
  enumerable: true,
  get: function () {
    return focusFirst;
  }
});
Object.defineProperty(exports, 'getOpenState', {
  enumerable: true,
  get: function () {
    return getOpenState;
  }
});
Object.defineProperty(exports, 'getTabbableCandidates', {
  enumerable: true,
  get: function () {
    return getTabbableCandidates;
  }
});
Object.defineProperty(exports, 'makeContentId', {
  enumerable: true,
  get: function () {
    return makeContentId;
  }
});
Object.defineProperty(exports, 'makeTriggerId', {
  enumerable: true,
  get: function () {
    return makeTriggerId;
  }
});
Object.defineProperty(exports, 'removeFromTabOrder', {
  enumerable: true,
  get: function () {
    return removeFromTabOrder;
  }
});
Object.defineProperty(exports, 'whenMouse', {
  enumerable: true,
  get: function () {
    return whenMouse;
  }
});
//# sourceMappingURL=utils.cjs.map