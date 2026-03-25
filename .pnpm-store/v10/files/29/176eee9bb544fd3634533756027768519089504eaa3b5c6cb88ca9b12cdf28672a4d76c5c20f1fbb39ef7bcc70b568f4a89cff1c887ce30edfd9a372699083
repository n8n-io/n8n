//#region src/Splitter/utils/storage.ts
function initializeDefaultStorage(storageObject) {
	try {
		if (typeof localStorage !== "undefined") {
			storageObject.getItem = (name) => {
				return localStorage.getItem(name);
			};
			storageObject.setItem = (name, value) => {
				localStorage.setItem(name, value);
			};
		} else throw new TypeError("localStorage not supported in this environment");
	} catch (error) {
		console.error(error);
		storageObject.getItem = () => null;
		storageObject.setItem = () => {};
	}
}
function getPanelGroupKey(autoSaveId) {
	return `reka:${autoSaveId}`;
}
function getPanelKey(panels) {
	return panels.map((panel) => {
		const { constraints, id, idIsFromProps, order } = panel;
		if (idIsFromProps) return id;
		else return order ? `${order}:${JSON.stringify(constraints)}` : JSON.stringify(constraints);
	}).sort((a, b) => a.localeCompare(b)).join(",");
}
function loadSerializedPanelGroupState(autoSaveId, storage) {
	try {
		const panelGroupKey = getPanelGroupKey(autoSaveId);
		const serialized = storage.getItem(panelGroupKey);
		if (serialized) {
			const parsed = JSON.parse(serialized);
			if (typeof parsed === "object" && parsed != null) return parsed;
		}
	} catch (error) {}
	return null;
}
function loadPanelGroupState(autoSaveId, panels, storage) {
	const state = loadSerializedPanelGroupState(autoSaveId, storage) ?? {};
	const panelKey = getPanelKey(panels);
	return state[panelKey] ?? null;
}
function savePanelGroupState(autoSaveId, panels, panelSizesBeforeCollapse, sizes, storage) {
	const panelGroupKey = getPanelGroupKey(autoSaveId);
	const panelKey = getPanelKey(panels);
	const state = loadSerializedPanelGroupState(autoSaveId, storage) ?? {};
	state[panelKey] = {
		expandToSizes: Object.fromEntries(panelSizesBeforeCollapse.entries()),
		layout: sizes
	};
	try {
		storage.setItem(panelGroupKey, JSON.stringify(state));
	} catch (error) {
		console.error(error);
	}
}

//#endregion
export { initializeDefaultStorage, loadPanelGroupState, savePanelGroupState };
//# sourceMappingURL=storage.js.map