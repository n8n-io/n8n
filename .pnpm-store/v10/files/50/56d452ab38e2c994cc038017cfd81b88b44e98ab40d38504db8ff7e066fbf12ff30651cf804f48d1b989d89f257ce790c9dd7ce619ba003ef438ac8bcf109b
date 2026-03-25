
//#region src/chains/router/utils.ts
function zipEntries(...arrays) {
	if (arrays.length === 0) return [];
	const firstArrayLength = arrays[0].length;
	for (const array of arrays) if (array.length !== firstArrayLength) throw new Error("All input arrays must have the same length.");
	const zipped = [];
	for (let i = 0; i < firstArrayLength; i += 1) {
		const zippedElement = [];
		for (const array of arrays) zippedElement.push(array[i]);
		zipped.push(zippedElement);
	}
	return zipped;
}

//#endregion
exports.zipEntries = zipEntries;
//# sourceMappingURL=utils.cjs.map