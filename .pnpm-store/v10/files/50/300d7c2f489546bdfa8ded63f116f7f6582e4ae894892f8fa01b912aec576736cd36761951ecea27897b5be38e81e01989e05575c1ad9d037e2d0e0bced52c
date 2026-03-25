const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');

//#region src/stores/file/in_memory.ts
var in_memory_exports = {};
require_rolldown_runtime.__export(in_memory_exports, { InMemoryFileStore: () => InMemoryFileStore });
/**
* Class that provides an in-memory file storage system. It extends the
* BaseFileStore class and implements its readFile and writeFile methods.
* This class is typically used in scenarios where temporary, in-memory
* file storage is needed, such as during testing or for caching files in
* memory for quick access.
*/
var InMemoryFileStore = class extends require_base.BaseFileStore {
	lc_namespace = [
		"langchain",
		"stores",
		"file",
		"in_memory"
	];
	files = /* @__PURE__ */ new Map();
	/**
	* Retrieves the contents of a file given its path. If the file does not
	* exist, it throws an error.
	* @param path The path of the file to read.
	* @returns The contents of the file as a string.
	*/
	async readFile(path) {
		const contents = this.files.get(path);
		if (contents === void 0) throw new Error(`File not found: ${path}`);
		return contents;
	}
	/**
	* Writes contents to a file at a given path. If the file already exists,
	* it overwrites the existing contents.
	* @param path The path of the file to write.
	* @param contents The contents to write to the file.
	* @returns Void
	*/
	async writeFile(path, contents) {
		this.files.set(path, contents);
	}
};

//#endregion
exports.InMemoryFileStore = InMemoryFileStore;
Object.defineProperty(exports, 'in_memory_exports', {
  enumerable: true,
  get: function () {
    return in_memory_exports;
  }
});
//# sourceMappingURL=in_memory.cjs.map