import { __exportAll } from "../_virtual/_rolldown/runtime.js";
//#region src/utils/chunk_array.ts
var chunk_array_exports = /* @__PURE__ */ __exportAll({ chunkArray: () => chunkArray });
const chunkArray = (arr, chunkSize) => arr.reduce((chunks, elem, index) => {
	const chunkIndex = Math.floor(index / chunkSize);
	chunks[chunkIndex] = (chunks[chunkIndex] || []).concat([elem]);
	return chunks;
}, []);
//#endregion
export { chunkArray, chunk_array_exports };

//# sourceMappingURL=chunk_array.js.map