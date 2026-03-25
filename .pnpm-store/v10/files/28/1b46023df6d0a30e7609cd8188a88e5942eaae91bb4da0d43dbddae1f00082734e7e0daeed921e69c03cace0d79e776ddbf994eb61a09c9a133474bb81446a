import { __export } from "../../_virtual/rolldown_runtime.js";
import { Docstore } from "./base.js";

//#region src/stores/doc/in_memory.ts
var in_memory_exports = {};
__export(in_memory_exports, {
	InMemoryDocstore: () => InMemoryDocstore,
	SynchronousInMemoryDocstore: () => SynchronousInMemoryDocstore
});
/**
* Class for storing and retrieving documents in memory asynchronously.
* Extends the Docstore class.
*/
var InMemoryDocstore = class extends Docstore {
	_docs;
	constructor(docs) {
		super();
		this._docs = docs ?? /* @__PURE__ */ new Map();
	}
	/**
	* Searches for a document in the store based on its ID.
	* @param search The ID of the document to search for.
	* @returns The document with the given ID.
	*/
	async search(search) {
		const result = this._docs.get(search);
		if (!result) throw new Error(`ID ${search} not found.`);
		else return result;
	}
	/**
	* Adds new documents to the store.
	* @param texts An object where the keys are document IDs and the values are the documents themselves.
	* @returns Void
	*/
	async add(texts) {
		const keys = [...this._docs.keys()];
		const overlapping = Object.keys(texts).filter((x) => keys.includes(x));
		if (overlapping.length > 0) throw new Error(`Tried to add ids that already exist: ${overlapping}`);
		for (const [key, value] of Object.entries(texts)) this._docs.set(key, value);
	}
	async mget(keys) {
		return Promise.all(keys.map((key) => this.search(key)));
	}
	async mset(keyValuePairs) {
		await Promise.all(keyValuePairs.map(([key, value]) => this.add({ [key]: value })));
	}
	async mdelete(_keys) {
		throw new Error("Not implemented.");
	}
	async *yieldKeys(_prefix) {
		throw new Error("Not implemented");
	}
};
/**
* Class for storing and retrieving documents in memory synchronously.
*/
var SynchronousInMemoryDocstore = class {
	_docs;
	constructor(docs) {
		this._docs = docs ?? /* @__PURE__ */ new Map();
	}
	/**
	* Searches for a document in the store based on its ID.
	* @param search The ID of the document to search for.
	* @returns The document with the given ID.
	*/
	search(search) {
		const result = this._docs.get(search);
		if (!result) throw new Error(`ID ${search} not found.`);
		else return result;
	}
	/**
	* Adds new documents to the store.
	* @param texts An object where the keys are document IDs and the values are the documents themselves.
	* @returns Void
	*/
	add(texts) {
		const keys = [...this._docs.keys()];
		const overlapping = Object.keys(texts).filter((x) => keys.includes(x));
		if (overlapping.length > 0) throw new Error(`Tried to add ids that already exist: ${overlapping}`);
		for (const [key, value] of Object.entries(texts)) this._docs.set(key, value);
	}
};

//#endregion
export { InMemoryDocstore, SynchronousInMemoryDocstore, in_memory_exports };
//# sourceMappingURL=in_memory.js.map