//#region src/shared/getActiveElement.ts
function getActiveElement() {
	let activeElement = document.activeElement;
	if (activeElement == null) return null;
	while (activeElement != null && activeElement.shadowRoot != null && activeElement.shadowRoot.activeElement != null) activeElement = activeElement.shadowRoot.activeElement;
	return activeElement;
}

//#endregion
export { getActiveElement };
//# sourceMappingURL=getActiveElement.js.map