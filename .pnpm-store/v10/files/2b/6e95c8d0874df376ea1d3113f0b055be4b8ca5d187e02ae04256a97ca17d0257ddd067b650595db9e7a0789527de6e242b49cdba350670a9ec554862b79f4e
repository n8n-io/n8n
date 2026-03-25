//#region src/HoverCard/utils.ts
function excludeTouch(eventHandler) {
	return (event) => event.pointerType === "touch" ? void 0 : eventHandler();
}
/**
* Returns a list of nodes that can be in the tab sequence.
* @see: https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
*/
function getTabbableNodes(container) {
	const nodes = [];
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, { acceptNode: (node) => {
		return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	} });
	while (walker.nextNode()) nodes.push(walker.currentNode);
	return nodes;
}

//#endregion
export { excludeTouch, getTabbableNodes };
//# sourceMappingURL=utils.js.map