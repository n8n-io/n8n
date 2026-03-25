Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
let uuid = require("uuid");
let _langchain_core_stores = require("@langchain/core/stores");
let _langchain_core_load_serializable = require("@langchain/core/load/serializable");

//#region src/experimental/utils/media_core.ts
function bytesToString(dataArray) {
	let ret = "";
	const chunkSize = 102400;
	for (let i = 0; i < dataArray.length; i += chunkSize) {
		const chunk = dataArray.subarray(i, i + chunkSize);
		ret += String.fromCharCode(...chunk);
	}
	return ret;
}
/**
* Represents a chunk of data that can be identified by the path where the
* data is (or will be) located, along with optional metadata about the data.
*/
var MediaBlob = class MediaBlob extends _langchain_core_load_serializable.Serializable {
	lc_serializable = true;
	lc_namespace = [
		"langchain",
		"google_common",
		"experimental",
		"utils",
		"media_core"
	];
	data = {
		value: "",
		type: "text/plain"
	};
	metadata;
	path;
	constructor(params) {
		super(params);
		this.data = params.data ?? this.data;
		this.metadata = params.metadata;
		this.path = params.path;
	}
	get size() {
		return this.asBytes.length;
	}
	get dataType() {
		return this.data?.type ?? "";
	}
	get encoding() {
		const charsetEquals = this.dataType.indexOf("charset=");
		return charsetEquals === -1 ? "utf-8" : this.dataType.substring(charsetEquals + 8);
	}
	get mimetype() {
		const semicolon = this.dataType.indexOf(";");
		return semicolon === -1 ? this.dataType : this.dataType.substring(0, semicolon);
	}
	get asBytes() {
		if (!this.data) return Uint8Array.from([]);
		const binString = atob(this.data?.value);
		const ret = new Uint8Array(binString.length);
		for (let co = 0; co < binString.length; co += 1) ret[co] = binString.charCodeAt(co);
		return ret;
	}
	async asString() {
		return bytesToString(this.asBytes);
	}
	async asBase64() {
		return this.data?.value ?? "";
	}
	async asDataUrl() {
		return `data:${this.mimetype};base64,${await this.asBase64()}`;
	}
	async asUri() {
		return this.path ?? await this.asDataUrl();
	}
	async encode() {
		const dataUrl = await this.asDataUrl();
		const comma = dataUrl.indexOf(",");
		return {
			encoded: dataUrl.substring(comma + 1),
			encoding: dataUrl.indexOf("base64") > -1 ? "base64" : "8bit"
		};
	}
	static fromDataUrl(url) {
		if (!url.startsWith("data:")) throw new Error("Not a data: URL");
		const colon = url.indexOf(":");
		const semicolon = url.indexOf(";");
		const mimeType = url.substring(colon + 1, semicolon);
		const comma = url.indexOf(",");
		return new MediaBlob({
			data: {
				type: mimeType,
				value: url.substring(comma + 1)
			},
			path: url
		});
	}
	static async fromBlob(blob, other) {
		const valueBuffer = await blob.arrayBuffer();
		const valueStr = bytesToString(new Uint8Array(valueBuffer));
		const value = btoa(valueStr);
		return new MediaBlob({
			...other,
			data: {
				value,
				type: blob.type
			}
		});
	}
};
/**
* A specialized Store that is designed to handle MediaBlobs and use the
* key that is included in the blob to determine exactly how it is stored.
*
* The full details of a MediaBlob may be changed when it is stored.
* For example, it may get additional or different Metadata. This should be
* what is returned when the store() method is called.
*
* Although BlobStore extends BaseStore, not all of the methods from
* BaseStore may be implemented (or even possible). Those that are not
* implemented should be documented and throw an Error if called.
*/
var BlobStore = class extends _langchain_core_stores.BaseStore {
	lc_namespace = ["langchain", "google-common"];
	defaultStoreOptions;
	defaultFetchOptions;
	constructor(opts) {
		super(opts);
		this.defaultStoreOptions = opts?.defaultStoreOptions ?? {};
		this.defaultFetchOptions = opts?.defaultFetchOptions ?? {};
	}
	async _realKey(key) {
		return typeof key === "string" ? key : await key.asUri();
	}
	/**
	* Is the path supported by this BlobStore?
	*
	* Although this is async, this is expected to be a relatively fast operation
	* (ie - you shouldn't make network calls).
	*
	* @param path The path to check
	* @param opts Any options (if needed) that may be used to determine if it is valid
	* @return If the path is supported
	*/
	hasValidPath(path, opts) {
		const prefix = opts?.pathPrefix ?? "";
		const isPrefixed = typeof path !== "undefined" && path.startsWith(prefix);
		return Promise.resolve(isPrefixed);
	}
	_blobPathSuffix(blob) {
		const blobPath = `${blob.path}`;
		let pathStart = blobPath.indexOf("/") + 1;
		while (blobPath.charAt(pathStart) === "/") pathStart += 1;
		return blobPath.substring(pathStart);
	}
	async _newBlob(oldBlob, newPath) {
		const oldPath = oldBlob.path;
		const metadata = oldBlob?.metadata ?? {};
		metadata.langchainOldPath = oldPath;
		const newBlob = new MediaBlob({
			...oldBlob,
			metadata
		});
		if (newPath) newBlob.path = newPath;
		else if (newBlob.path) delete newBlob.path;
		return newBlob;
	}
	async _validBlobPrefixPath(blob, opts) {
		const newPath = `${opts?.pathPrefix ?? ""}${this._blobPathSuffix(blob)}`;
		return this._newBlob(blob, newPath);
	}
	_validBlobPrefixUuidFunction(name) {
		switch (name) {
			case "prefixUuid1": return (0, uuid.v1)();
			case "prefixUuid4": return (0, uuid.v4)();
			default: throw new Error(`Unknown uuid function: ${name}`);
		}
	}
	async _validBlobPrefixUuid(blob, opts) {
		const newPath = `${opts?.pathPrefix ?? ""}${this._validBlobPrefixUuidFunction(opts?.actionIfInvalid ?? "prefixUuid4")}`;
		return this._newBlob(blob, newPath);
	}
	async _validBlobRemovePath(blob, _opts) {
		return this._newBlob(blob, void 0);
	}
	/**
	* Based on the blob and options, return a blob that has a valid path
	* that can be saved.
	* @param blob
	* @param opts
	*/
	async _validStoreBlob(blob, opts) {
		if (await this.hasValidPath(blob.path, opts)) return blob;
		switch (opts?.actionIfInvalid) {
			case "ignore": return blob;
			case "prefixPath": return this._validBlobPrefixPath(blob, opts);
			case "prefixUuid1":
			case "prefixUuid4":
			case "prefixUuid6":
			case "prefixUuid7": return this._validBlobPrefixUuid(blob, opts);
			case "removePath": return this._validBlobRemovePath(blob, opts);
			default: return;
		}
	}
	async store(blob, opts = {}) {
		const allOpts = {
			...this.defaultStoreOptions,
			...opts
		};
		const validBlob = await this._validStoreBlob(blob, allOpts);
		if (typeof validBlob !== "undefined") {
			const validKey = await validBlob.asUri();
			await this.mset([[validKey, validBlob]]);
			const savedKey = await validBlob.asUri();
			return await this.fetch(savedKey);
		}
	}
	async _missingFetchBlobEmpty(path, _opts) {
		return new MediaBlob({ path });
	}
	async _missingFetchBlob(path, opts) {
		switch (opts?.actionIfBlobMissing) {
			case "emptyBlob": return this._missingFetchBlobEmpty(path, opts);
			default: return;
		}
	}
	async fetch(key, opts = {}) {
		const allOpts = {
			...this.defaultFetchOptions,
			...opts
		};
		const realKey = await this._realKey(key);
		return (await this.mget([realKey]))?.[0] ?? await this._missingFetchBlob(realKey, allOpts);
	}
};
var BackedBlobStore = class extends BlobStore {
	backingStore;
	constructor(opts) {
		super(opts);
		this.backingStore = opts.backingStore;
	}
	mdelete(keys) {
		return this.backingStore.mdelete(keys);
	}
	mget(keys) {
		return this.backingStore.mget(keys);
	}
	mset(keyValuePairs) {
		return this.backingStore.mset(keyValuePairs);
	}
	yieldKeys(prefix) {
		return this.backingStore.yieldKeys(prefix);
	}
};
var ReadThroughBlobStore = class extends BlobStore {
	baseStore;
	backingStore;
	constructor(opts) {
		super(opts);
		this.baseStore = opts.baseStore;
		this.backingStore = opts.backingStore;
	}
	async store(blob, opts = {}) {
		const originalUri = await blob.asUri();
		const newBlob = await this.backingStore.store(blob, opts);
		if (newBlob) await this.baseStore.mset([[originalUri, newBlob]]);
		return newBlob;
	}
	mdelete(keys) {
		return this.baseStore.mdelete(keys);
	}
	mget(keys) {
		return this.baseStore.mget(keys);
	}
	mset(_keyValuePairs) {
		throw new Error("Do not call ReadThroughBlobStore.mset directly");
	}
	yieldKeys(prefix) {
		return this.baseStore.yieldKeys(prefix);
	}
};
var SimpleWebBlobStore = class extends BlobStore {
	_notImplementedException() {
		throw new Error("Not implemented for SimpleWebBlobStore");
	}
	async hasValidPath(path, _opts) {
		return await super.hasValidPath(path, { pathPrefix: "https://" }) || await super.hasValidPath(path, { pathPrefix: "http://" });
	}
	async _fetch(url) {
		const ret = new MediaBlob({ path: url });
		const metadata = {};
		const res = await fetch(url, { method: "GET" });
		metadata.status = res.status;
		const headers = {};
		for (const [key, value] of res.headers.entries()) headers[key] = value;
		metadata.headers = headers;
		metadata.ok = res.ok;
		if (res.ok) ret.data = (await MediaBlob.fromBlob(await res.blob())).data;
		ret.metadata = metadata;
		return ret;
	}
	async mget(keys) {
		const blobMap = keys.map(this._fetch);
		return await Promise.all(blobMap);
	}
	async mdelete(_keys) {
		this._notImplementedException();
	}
	async mset(_keyValuePairs) {
		this._notImplementedException();
	}
	async *yieldKeys(_prefix) {
		this._notImplementedException();
		yield "";
	}
};
/**
* A blob "store" that works with data: URLs that will turn the URL into
* a blob.
*/
var DataBlobStore = class extends BlobStore {
	_notImplementedException() {
		throw new Error("Not implemented for DataBlobStore");
	}
	hasValidPath(path, _opts) {
		return super.hasValidPath(path, { pathPrefix: "data:" });
	}
	_fetch(url) {
		return MediaBlob.fromDataUrl(url);
	}
	async mget(keys) {
		return keys.map(this._fetch);
	}
	async mdelete(_keys) {
		this._notImplementedException();
	}
	async mset(_keyValuePairs) {
		this._notImplementedException();
	}
	async *yieldKeys(_prefix) {
		this._notImplementedException();
		yield "";
	}
};
/**
* Responsible for converting a URI (typically a web URL) into a MediaBlob.
* Allows for aliasing / caching of the requested URI and what it resolves to.
* This MediaBlob is expected to be usable to provide to an LLM, either
* through the Base64 of the media or through a canonical URI that the LLM
* supports.
*/
var MediaManager = class {
	store;
	resolvers;
	constructor(config) {
		this.store = config.store;
		this.resolvers = config.resolvers;
	}
	defaultResolvers() {
		return [new DataBlobStore({}), new SimpleWebBlobStore({})];
	}
	async _isInvalid(blob) {
		return typeof blob === "undefined";
	}
	/**
	* Given the public URI, load what is at this URI and save it
	* in the store.
	* @param uri The URI to resolve using the resolver
	* @return A canonical MediaBlob for this URI
	*/
	async _resolveAndSave(uri) {
		let resolvedBlob;
		const resolvers = this.resolvers || this.defaultResolvers();
		for (let co = 0; co < resolvers.length; co += 1) {
			const resolver = resolvers[co];
			if (await resolver.hasValidPath(uri)) resolvedBlob = await resolver.fetch(uri);
		}
		if (resolvedBlob) return await this.store.store(resolvedBlob);
		else return new MediaBlob({});
	}
	async getMediaBlob(uri) {
		const aliasBlob = await this.store.fetch(uri);
		return await this._isInvalid(aliasBlob) ? await this._resolveAndSave(uri) : aliasBlob;
	}
};

//#endregion
exports.BackedBlobStore = BackedBlobStore;
exports.BlobStore = BlobStore;
exports.DataBlobStore = DataBlobStore;
exports.MediaBlob = MediaBlob;
exports.MediaManager = MediaManager;
exports.ReadThroughBlobStore = ReadThroughBlobStore;
exports.SimpleWebBlobStore = SimpleWebBlobStore;
//# sourceMappingURL=media_core.cjs.map