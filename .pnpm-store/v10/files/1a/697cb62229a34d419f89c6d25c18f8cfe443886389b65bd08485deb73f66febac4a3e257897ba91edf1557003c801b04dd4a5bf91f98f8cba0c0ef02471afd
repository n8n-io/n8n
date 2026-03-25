
//#region src/Tree/utils.ts
function flatten(items) {
	return items.reduce((acc, item) => {
		acc.push(item);
		if (item.children) acc.push(...flatten(item.children));
		return acc;
	}, []);
}

//#endregion
Object.defineProperty(exports, 'flatten', {
  enumerable: true,
  get: function () {
    return flatten;
  }
});
//# sourceMappingURL=utils.cjs.map