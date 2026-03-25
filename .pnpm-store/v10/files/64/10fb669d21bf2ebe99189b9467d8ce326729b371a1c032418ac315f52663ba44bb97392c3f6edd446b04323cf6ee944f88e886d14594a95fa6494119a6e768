Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/utils/chunk_array.ts
var chunk_array_exports = /* @__PURE__ */ require("../_virtual/_rolldown/runtime.cjs").__exportAll({ chunkArray: () => chunkArray });
const chunkArray = (arr, chunkSize) => arr.reduce((chunks, elem, index) => {
	const chunkIndex = Math.floor(index / chunkSize);
	chunks[chunkIndex] = (chunks[chunkIndex] || []).concat([elem]);
	return chunks;
}, []);
//#endregion
exports.chunkArray = chunkArray;
Object.defineProperty(exports, "chunk_array_exports", {
	enumerable: true,
	get: function() {
		return chunk_array_exports;
	}
});

//# sourceMappingURL=chunk_array.cjs.map