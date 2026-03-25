import { isBrowser } from "../shared/browser.js";

//#region src/Splitter/utils/dom.ts
function getPanelGroupElement(id, rootElement = document) {
	if (!isBrowser) return null;
	if (rootElement instanceof HTMLElement && rootElement?.dataset?.panelGroupId === id) return rootElement;
	const element = rootElement.querySelector(`[data-panel-group][data-panel-group-id="${id}"]`);
	if (element) return element;
	return null;
}
function getResizeHandleElement(id, scope = document) {
	if (!isBrowser) return null;
	const element = scope.querySelector(`[data-panel-resize-handle-id="${id}"]`);
	if (element) return element;
	return null;
}
function getResizeHandleElementIndex(groupId, id, scope = document) {
	if (!isBrowser) return null;
	const handles = getResizeHandleElementsForGroup(groupId, scope);
	const index = handles.findIndex((handle) => handle.getAttribute("data-panel-resize-handle-id") === id);
	return index ?? null;
}
function getResizeHandleElementsForGroup(groupId, scope = document) {
	if (!isBrowser) return [];
	return Array.from(scope.querySelectorAll(`[data-panel-resize-handle-id][data-panel-group-id="${groupId}"]`));
}
function getResizeHandlePanelIds(groupId, handleId, panelsArray, scope = document) {
	const handle = getResizeHandleElement(handleId, scope);
	const handles = getResizeHandleElementsForGroup(groupId, scope);
	const index = handle ? handles.indexOf(handle) : -1;
	const idBefore = panelsArray[index]?.id ?? null;
	const idAfter = panelsArray[index + 1]?.id ?? null;
	return [idBefore, idAfter];
}

//#endregion
export { getPanelGroupElement, getResizeHandleElement, getResizeHandleElementIndex, getResizeHandleElementsForGroup, getResizeHandlePanelIds };
//# sourceMappingURL=dom.js.map