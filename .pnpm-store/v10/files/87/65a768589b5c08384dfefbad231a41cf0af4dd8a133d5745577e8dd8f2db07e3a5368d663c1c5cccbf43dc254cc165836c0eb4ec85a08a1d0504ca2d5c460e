import { GoogleHostConnection, GoogleRawConnection } from "../connection.js";
import { ApiKeyGoogleAuth } from "../auth.js";
import { BlobStore, MediaBlob } from "./utils/media_core.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { AsyncCaller } from "@langchain/core/utils/async_caller";

//#region src/experimental/media.ts
var GoogleMultipartUploadConnection = class extends GoogleHostConnection {
	constructor(fields, caller, client) {
		super(fields, caller, client);
	}
	async _body(separator, data, metadata) {
		const contentType = data.mimetype;
		const { encoded, encoding } = await data.encode();
		return [
			`--${separator}`,
			"Content-Type: application/json; charset=UTF-8",
			"",
			JSON.stringify(metadata),
			"",
			`--${separator}`,
			`Content-Type: ${contentType}`,
			`Content-Transfer-Encoding: ${encoding}`,
			"",
			encoded,
			`--${separator}--`
		].join("\n");
	}
	async request(data, metadata, options) {
		const separator = `separator-${Date.now()}`;
		const body = await this._body(separator, data, metadata);
		const requestHeaders = {
			"Content-Type": `multipart/related; boundary=${separator}`,
			"X-Goog-Upload-Protocol": "multipart"
		};
		return this._request(body, options, requestHeaders);
	}
};
var GoogleDownloadConnection = class extends GoogleHostConnection {
	async request(options) {
		return this._request(void 0, options);
	}
};
var GoogleDownloadRawConnection = class extends GoogleRawConnection {
	buildMethod() {
		return "GET";
	}
	async request(options) {
		return this._request(void 0, options);
	}
};
var BlobStoreGoogle = class extends BlobStore {
	caller;
	client;
	constructor(fields) {
		super(fields);
		this.caller = new AsyncCaller(fields ?? {});
		this.client = this.buildClient(fields);
	}
	async _set(keyValuePair) {
		const [, blob] = keyValuePair;
		const metadata = this.buildSetMetadata(keyValuePair);
		return await this.buildSetConnection(keyValuePair).request(blob, metadata, {});
	}
	async mset(keyValuePairs) {
		const ret = keyValuePairs.map((keyValue) => this._set(keyValue));
		await Promise.all(ret);
	}
	async _getMetadata(key) {
		return (await this.buildGetMetadataConnection(key).request({})).data;
	}
	async _getData(key) {
		return (await this.buildGetDataConnection(key).request({})).data;
	}
	_getMimetypeFromMetadata(metadata) {
		return metadata.contentType;
	}
	async _get(key) {
		const metadata = await this._getMetadata(key);
		const data = await this._getData(key);
		if (data && metadata) return await MediaBlob.fromBlob(data, {
			metadata,
			path: key
		});
		else return;
	}
	async mget(keys) {
		const ret = keys.map((key) => this._get(key));
		return await Promise.all(ret);
	}
	async _del(key) {
		await this.buildDeleteConnection(key).request({});
	}
	async mdelete(keys) {
		const ret = keys.map((key) => this._del(key));
		await Promise.all(ret);
	}
	async *yieldKeys(_prefix) {
		throw new Error("yieldKeys is not implemented");
	}
};
var GoogleCloudStorageUri = class GoogleCloudStorageUri {
	static uriRegexp = /gs:\/\/([a-z0-9][a-z0-9._-]+[a-z0-9])\/(.*)/;
	bucket;
	path;
	constructor(uri) {
		const bucketAndPath = GoogleCloudStorageUri.uriToBucketAndPath(uri);
		this.bucket = bucketAndPath.bucket;
		this.path = bucketAndPath.path;
	}
	get uri() {
		return `gs://${this.bucket}/${this.path}`;
	}
	get isValid() {
		return typeof this.bucket !== "undefined" && typeof this.path !== "undefined";
	}
	static uriToBucketAndPath(uri) {
		const match = this.uriRegexp.exec(uri);
		if (!match) throw new Error(`Invalid gs:// URI: ${uri}`);
		return {
			bucket: match[1],
			path: match[2]
		};
	}
	static isValidUri(uri) {
		return this.uriRegexp.test(uri);
	}
};
var GoogleCloudStorageUploadConnection = class extends GoogleMultipartUploadConnection {
	uri;
	constructor(fields, caller, client) {
		super(fields, caller, client);
		this.uri = new GoogleCloudStorageUri(fields.uri);
	}
	async buildUrl() {
		return `https://storage.googleapis.com/upload/storage/${this.apiVersion}/b/${this.uri.bucket}/o?uploadType=multipart`;
	}
};
var GoogleCloudStorageDownloadConnection = class extends GoogleDownloadConnection {
	uri;
	method;
	alt;
	constructor(fields, caller, client) {
		super(fields, caller, client);
		this.uri = new GoogleCloudStorageUri(fields.uri);
		this.method = fields.method;
		this.alt = fields.alt;
	}
	buildMethod() {
		return this.method;
	}
	async buildUrl() {
		const path = encodeURIComponent(this.uri.path);
		const ret = `https://storage.googleapis.com/storage/${this.apiVersion}/b/${this.uri.bucket}/o/${path}`;
		return this.alt ? `${ret}?alt=${this.alt}` : ret;
	}
};
var GoogleCloudStorageRawConnection = class extends GoogleDownloadRawConnection {
	uri;
	constructor(fields, caller, client) {
		super(fields, caller, client);
		this.uri = new GoogleCloudStorageUri(fields.uri);
	}
	async buildUrl() {
		const path = encodeURIComponent(this.uri.path);
		return `https://storage.googleapis.com/storage/${this.apiVersion}/b/${this.uri.bucket}/o/${path}?alt=media`;
	}
};
var BlobStoreGoogleCloudStorageBase = class extends BlobStoreGoogle {
	params;
	constructor(fields) {
		super(fields);
		this.params = fields;
		this.defaultStoreOptions = {
			...this.defaultStoreOptions,
			pathPrefix: fields.uriPrefix.uri
		};
	}
	buildSetConnection([key, _blob]) {
		return new GoogleCloudStorageUploadConnection({
			...this.params,
			uri: key
		}, this.caller, this.client);
	}
	buildSetMetadata([key, blob]) {
		return {
			name: new GoogleCloudStorageUri(key).path,
			metadata: blob.metadata,
			contentType: blob.mimetype
		};
	}
	buildGetMetadataConnection(key) {
		return new GoogleCloudStorageDownloadConnection({
			uri: key,
			method: "GET",
			alt: void 0
		}, this.caller, this.client);
	}
	buildGetDataConnection(key) {
		return new GoogleCloudStorageRawConnection({ uri: key }, this.caller, this.client);
	}
	buildDeleteConnection(key) {
		return new GoogleCloudStorageDownloadConnection({
			uri: key,
			method: "DELETE",
			alt: void 0
		}, this.caller, this.client);
	}
};
var AIStudioMediaBlob = class extends MediaBlob {
	_valueAsDate(value) {
		if (!value) return /* @__PURE__ */ new Date(0);
		return new Date(value);
	}
	_metadataFieldAsDate(field) {
		return this._valueAsDate(this.metadata?.[field]);
	}
	get createDate() {
		return this._metadataFieldAsDate("createTime");
	}
	get updateDate() {
		return this._metadataFieldAsDate("updateTime");
	}
	get expirationDate() {
		return this._metadataFieldAsDate("expirationTime");
	}
	get isExpired() {
		const now = (/* @__PURE__ */ new Date()).toISOString();
		return (this.metadata?.expirationTime ?? now) <= now;
	}
};
var AIStudioFileUploadConnection = class extends GoogleMultipartUploadConnection {
	get computedApiVersion() {
		return "v1beta";
	}
	async buildUrl() {
		return `https://generativelanguage.googleapis.com/upload/${this.apiVersion}/files`;
	}
};
var AIStudioFileDownloadConnection = class extends GoogleDownloadConnection {
	method;
	name;
	constructor(fields, caller, client) {
		super(fields, caller, client);
		this.method = fields.method;
		this.name = fields.name;
	}
	get computedApiVersion() {
		return "v1beta";
	}
	buildMethod() {
		return this.method;
	}
	async buildUrl() {
		return `https://generativelanguage.googleapis.com/${this.apiVersion}/files/${this.name}`;
	}
};
var BlobStoreAIStudioFileBase = class extends BlobStoreGoogle {
	params;
	retryTime = 1e3;
	constructor(fields) {
		const params = {
			defaultStoreOptions: {
				pathPrefix: "https://generativelanguage.googleapis.com/v1beta/files/",
				actionIfInvalid: "removePath"
			},
			...fields
		};
		super(params);
		this.params = params;
		this.retryTime = params?.retryTime ?? this.retryTime ?? 1e3;
	}
	_pathToName(path) {
		return path.split("/").pop() ?? path;
	}
	buildApiKeyClient(apiKey) {
		return new ApiKeyGoogleAuth(apiKey);
	}
	buildApiKey(fields) {
		return fields?.apiKey ?? getEnvironmentVariable("GOOGLE_API_KEY");
	}
	buildClient(fields) {
		const apiKey = this.buildApiKey(fields);
		if (apiKey) return this.buildApiKeyClient(apiKey);
		else return this.buildAbstractedClient(fields);
	}
	async _regetMetadata(key) {
		await new Promise((resolve) => setTimeout(resolve, this.retryTime));
		return this._getMetadata(key);
	}
	async _set([key, blob]) {
		const response = await super._set([key, blob]);
		let file = response.data?.file ?? { state: "FAILED" };
		while (file.state === "PROCESSING" && file.uri && this.retryTime > 0) file = await this._regetMetadata(file.uri);
		blob.path = file.uri;
		blob.metadata = {
			...blob.metadata,
			...file
		};
		return response;
	}
	buildSetConnection([_key, _blob]) {
		return new AIStudioFileUploadConnection(this.params, this.caller, this.client);
	}
	buildSetMetadata([_key, _blob]) {
		return {};
	}
	buildGetMetadataConnection(key) {
		return new AIStudioFileDownloadConnection({
			...this.params,
			method: "GET",
			name: this._pathToName(key)
		}, this.caller, this.client);
	}
	buildGetDataConnection(_key) {
		throw new Error("AI Studio File API does not provide data");
	}
	async _get(key) {
		const metadata = await this._getMetadata(key);
		if (metadata) return new MediaBlob({
			path: key,
			data: {
				value: "",
				type: metadata?.mimeType ?? "application/octet-stream"
			},
			metadata
		});
		else return;
	}
	buildDeleteConnection(key) {
		return new AIStudioFileDownloadConnection({
			...this.params,
			method: "DELETE",
			name: this._pathToName(key)
		}, this.caller, this.client);
	}
};

//#endregion
export { AIStudioFileDownloadConnection, AIStudioFileUploadConnection, AIStudioMediaBlob, BlobStoreAIStudioFileBase, BlobStoreGoogle, BlobStoreGoogleCloudStorageBase, GoogleCloudStorageDownloadConnection, GoogleCloudStorageRawConnection, GoogleCloudStorageUploadConnection, GoogleCloudStorageUri, GoogleDownloadConnection, GoogleDownloadRawConnection, GoogleMultipartUploadConnection };
//# sourceMappingURL=media.js.map