//#region src/Tree/utils.ts
function flatten(items) {
	return items.reduce((acc, item) => {
		acc.push(item);
		if (item.children) acc.push(...flatten(item.children));
		return acc;
	}, []);
}

//#endregion
export { flatten };
//# sourceMappingURL=utils.js.map