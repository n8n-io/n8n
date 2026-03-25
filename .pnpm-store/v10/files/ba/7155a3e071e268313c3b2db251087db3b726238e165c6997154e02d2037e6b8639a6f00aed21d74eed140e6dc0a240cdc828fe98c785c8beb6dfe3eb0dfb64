import { __export } from "../../_virtual/rolldown_runtime.js";
import { BaseFileStore } from "./base.js";
import { join } from "node:path";
import * as fs$1 from "node:fs/promises";
import { mkdtempSync } from "node:fs";

//#region src/stores/file/node.ts
var node_exports = {};
__export(node_exports, { NodeFileStore: () => NodeFileStore });
/**
* Specific implementation of the `BaseFileStore` class for Node.js.
* Provides methods to read and write files in a specific base path.
*/
var NodeFileStore = class extends BaseFileStore {
	lc_namespace = [
		"langchain",
		"stores",
		"file",
		"node"
	];
	constructor(basePath = mkdtempSync("langchain-")) {
		super();
		this.basePath = basePath;
	}
	/**
	* Reads the contents of a file at the given path.
	* @param path Path of the file to read.
	* @returns The contents of the file as a string.
	*/
	async readFile(path$1) {
		return await fs$1.readFile(join(this.basePath, path$1), "utf8");
	}
	/**
	* Writes the given contents to a file at the specified path.
	* @param path Path of the file to write to.
	* @param contents Contents to write to the file.
	* @returns Promise that resolves when the file has been written.
	*/
	async writeFile(path$1, contents) {
		await fs$1.writeFile(join(this.basePath, path$1), contents, "utf8");
	}
};

//#endregion
export { NodeFileStore, node_exports };
//# sourceMappingURL=node.js.map