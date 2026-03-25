import { getActiveElement } from "../shared/getActiveElement.js";

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
	const previouslyFocusedElement = getActiveElement();
	return candidates.some((candidate) => {
		if (candidate === previouslyFocusedElement) return true;
		candidate.focus();
		return getActiveElement() !== previouslyFocusedElement;
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
export { EVENT_ROOT_CONTENT_DISMISS, LINK_SELECT, focusFirst, getOpenState, getTabbableCandidates, makeContentId, makeTriggerId, removeFromTabOrder, whenMouse };
//# sourceMappingURL=utils.js.map