const require_gemini = require('./utils/gemini.cjs');
const require_anthropic = require('./utils/anthropic.cjs');
const require_common = require('./utils/common.cjs');
require('./utils/index.cjs');
let _langchain_core_utils_env = require("@langchain/core/utils/env");
let _langchain_core_callbacks_base = require("@langchain/core/callbacks/base");

//#region src/connection.ts
var GoogleConnection = class {
	caller;
	client;
	streaming;
	constructor(caller, client, streaming) {
		this.caller = caller;
		this.client = client;
		this.streaming = streaming ?? false;
	}
	async _clientInfoHeaders() {
		const { userAgent, clientLibraryVersion } = await this._getClientInfo();
		return {
			"User-Agent": userAgent,
			"Client-Info": clientLibraryVersion
		};
	}
	async _getClientInfo() {
		const langchain = (await (0, _langchain_core_utils_env.getRuntimeEnvironment)())?.library ?? "langchain-js";
		const langchainVersion = "0";
		const moduleName = await this._moduleName();
		let clientLibraryVersion = `${langchain}/${langchainVersion}`;
		if (moduleName && moduleName.length) clientLibraryVersion = `${clientLibraryVersion}-${moduleName}`;
		return {
			userAgent: clientLibraryVersion,
			clientLibraryVersion: `${langchainVersion}-${moduleName}`
		};
	}
	async _moduleName() {
		return this.constructor.name;
	}
	async additionalHeaders() {
		return {};
	}
	async _buildOpts(data, options, requestHeaders = {}) {
		const url = await this.buildUrl();
		const method = this.buildMethod();
		const infoHeaders = await this._clientInfoHeaders() ?? {};
		const additionalHeaders = await this.additionalHeaders() ?? {};
		const opts = {
			url,
			method,
			headers: {
				...infoHeaders,
				...additionalHeaders,
				...requestHeaders
			},
			signal: options?.signal
		};
		if (data && method === "POST") opts.data = data;
		if (this.streaming) opts.responseType = "stream";
		else opts.responseType = "json";
		return opts;
	}
	async _request(data, options, requestHeaders = {}) {
		const opts = await this._buildOpts(data, options, requestHeaders);
		return await this.caller.callWithOptions({ signal: options?.signal }, async () => this.client.request(opts));
	}
};
var GoogleHostConnection = class extends GoogleConnection {
	platformType;
	_endpoint;
	_location;
	_apiVersion;
	constructor(fields, caller, client, streaming) {
		super(caller, client, streaming);
		this.caller = caller;
		this.platformType = this.fieldPlatformType(fields);
		this._endpoint = fields?.endpoint;
		this._location = fields?.location;
		this._apiVersion = fields?.apiVersion;
		this.client = client;
	}
	fieldPlatformType(fields) {
		if (typeof fields === "undefined") return;
		if (typeof fields.platformType !== "undefined") return fields.platformType;
		if (fields.vertexai === true) return "gcp";
	}
	get platform() {
		return this.platformType ?? this.computedPlatformType;
	}
	get computedPlatformType() {
		return "gcp";
	}
	get computedApiVersion() {
		return "v1";
	}
	get apiVersion() {
		return this._apiVersion ?? this.computedApiVersion;
	}
	get location() {
		return this._location ?? this.computedLocation;
	}
	get computedLocation() {
		return "us-central1";
	}
	get endpoint() {
		return this._endpoint ?? this.computedEndpoint;
	}
	get computedEndpoint() {
		if (this.location === "global") return "aiplatform.googleapis.com";
		else return `${this.location}-aiplatform.googleapis.com`;
	}
	buildMethod() {
		return "POST";
	}
};
var GoogleRawConnection = class extends GoogleHostConnection {
	async _buildOpts(data, _options, requestHeaders = {}) {
		const opts = await super._buildOpts(data, _options, requestHeaders);
		opts.responseType = "blob";
		return opts;
	}
};
var GoogleAIConnection = class extends GoogleHostConnection {
	model;
	modelName;
	client;
	_apiName;
	apiConfig;
	constructor(fields, caller, client, streaming) {
		super(fields, caller, client, streaming);
		this.client = client;
		this.modelName = fields?.model ?? fields?.modelName ?? this.model;
		this.model = this.modelName;
		this._apiName = fields?.apiName;
		this.apiConfig = {
			safetyHandler: fields?.safetyHandler,
			...fields?.apiConfig
		};
	}
	get modelFamily() {
		return require_common.modelToFamily(this.model);
	}
	get modelPublisher() {
		return require_common.modelToPublisher(this.model);
	}
	get computedAPIName() {
		return this.modelPublisher;
	}
	get apiName() {
		return this._apiName ?? this.computedAPIName;
	}
	get api() {
		switch (this.apiName) {
			case "google":
			case "gemma": return require_gemini.getGeminiAPI(this.apiConfig);
			case "anthropic": return require_anthropic.getAnthropicAPI(this.apiConfig);
			default: throw new Error(`Unknown API: ${this.apiName}`);
		}
	}
	get isApiKey() {
		return this.client.clientType === "apiKey";
	}
	fieldPlatformType(fields) {
		const ret = super.fieldPlatformType(fields);
		if (typeof ret !== "undefined") return ret;
		if (fields?.vertexai === false) return "gai";
	}
	get computedPlatformType() {
		if (this.isApiKey) return "gai";
		else return "gcp";
	}
	get computedApiVersion() {
		switch (this.platform) {
			case "gai": return "v1beta";
			default: return "v1";
		}
	}
	get computedLocation() {
		switch (this.apiName) {
			case "google": return super.computedLocation;
			case "anthropic": return "us-east5";
			default: throw new Error(`Unknown apiName: ${this.apiName}. Can't get location.`);
		}
	}
	async buildUrlGenerativeLanguage() {
		const method = await this.buildUrlMethod();
		return `https://generativelanguage.googleapis.com/${this.apiVersion}/models/${this.model}:${method}`;
	}
	async buildUrlVertexExpress() {
		const method = await this.buildUrlMethod();
		const publisher = this.modelPublisher;
		return `https://aiplatform.googleapis.com/${this.apiVersion}/publishers/${publisher}/models/${this.model}:${method}`;
	}
	async buildUrlVertexLocation() {
		const projectId = await this.client.getProjectId();
		const method = await this.buildUrlMethod();
		const publisher = this.modelPublisher;
		return `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/publishers/${publisher}/models/${this.model}:${method}`;
	}
	async buildUrlVertex() {
		if (this.isApiKey) return this.buildUrlVertexExpress();
		else return this.buildUrlVertexLocation();
	}
	async buildUrl() {
		switch (this.platform) {
			case "gai": return this.buildUrlGenerativeLanguage();
			default: return this.buildUrlVertex();
		}
	}
	async request(input, parameters, options, runManager) {
		const moduleName = this.constructor.name;
		const streamingParameters = {
			...parameters,
			streaming: this.streaming
		};
		const data = await this.formatData(input, streamingParameters);
		await runManager?.handleCustomEvent(`google-request-${moduleName}`, {
			data,
			parameters: streamingParameters,
			options,
			connection: {
				...this,
				url: await this.buildUrl(),
				urlMethod: await this.buildUrlMethod(),
				modelFamily: this.modelFamily,
				modelPublisher: this.modelPublisher,
				computedPlatformType: this.computedPlatformType
			}
		});
		const response = await this._request(data, options);
		await runManager?.handleCustomEvent(`google-response-${moduleName}`, { response });
		return response;
	}
};
var AbstractGoogleLLMConnection = class extends GoogleAIConnection {
	async buildUrlMethodGemini() {
		return this.streaming ? "streamGenerateContent" : "generateContent";
	}
	async buildUrlMethodClaude() {
		return this.streaming ? "streamRawPredict" : "rawPredict";
	}
	async buildUrlMethod() {
		switch (this.modelFamily) {
			case "gemini":
			case "gemma": return this.buildUrlMethodGemini();
			case "claude": return this.buildUrlMethodClaude();
			default: throw new Error(`Unknown model family: ${this.modelFamily}`);
		}
	}
	async formatData(input, parameters) {
		let filteredParameters = parameters;
		if (parameters.labels && this.platform !== "gcp") {
			const { labels, ...paramsWithoutLabels } = parameters;
			filteredParameters = paramsWithoutLabels;
		}
		return this.api.formatData(input, filteredParameters);
	}
};
var GoogleRequestCallbackHandler = class extends _langchain_core_callbacks_base.BaseCallbackHandler {
	customEventInfo(eventName) {
		const names = eventName.split("-");
		return {
			subEvent: names[1],
			module: names[2]
		};
	}
	handleCustomEvent(eventName, data, runId, tags, metadata) {
		if (!eventName) return;
		const eventInfo = this.customEventInfo(eventName);
		switch (eventInfo.subEvent) {
			case "request": return this.handleCustomRequestEvent(eventName, eventInfo, data, runId, tags, metadata);
			case "response": return this.handleCustomResponseEvent(eventName, eventInfo, data, runId, tags, metadata);
			case "chunk": return this.handleCustomChunkEvent(eventName, eventInfo, data, runId, tags, metadata);
			default: console.error(`Unexpected eventInfo for ${eventName} ${JSON.stringify(eventInfo, null, 1)}`);
		}
	}
};
var GoogleRequestLogger = class extends GoogleRequestCallbackHandler {
	name = "GoogleRequestLogger";
	log(eventName, data, tags) {
		const tagStr = tags ? `[${tags}]` : "[]";
		console.log(`${eventName} ${tagStr} ${JSON.stringify(data, null, 1)}`);
	}
	handleCustomRequestEvent(eventName, _eventInfo, data, _runId, tags, _metadata) {
		this.log(eventName, data, tags);
	}
	handleCustomResponseEvent(eventName, _eventInfo, data, _runId, tags, _metadata) {
		this.log(eventName, data, tags);
	}
	handleCustomChunkEvent(eventName, _eventInfo, data, _runId, tags, _metadata) {
		this.log(eventName, data, tags);
	}
};
var GoogleRequestRecorder = class extends GoogleRequestCallbackHandler {
	name = "GoogleRequestRecorder";
	request = {};
	response = {};
	chunk = [];
	handleCustomRequestEvent(_eventName, _eventInfo, data, _runId, _tags, _metadata) {
		this.request = data;
	}
	handleCustomResponseEvent(_eventName, _eventInfo, data, _runId, _tags, _metadata) {
		this.response = data;
	}
	handleCustomChunkEvent(_eventName, _eventInfo, data, _runId, _tags, _metadata) {
		this.chunk.push(data);
	}
};

//#endregion
exports.AbstractGoogleLLMConnection = AbstractGoogleLLMConnection;
exports.GoogleAIConnection = GoogleAIConnection;
exports.GoogleConnection = GoogleConnection;
exports.GoogleHostConnection = GoogleHostConnection;
exports.GoogleRawConnection = GoogleRawConnection;
exports.GoogleRequestCallbackHandler = GoogleRequestCallbackHandler;
exports.GoogleRequestLogger = GoogleRequestLogger;
exports.GoogleRequestRecorder = GoogleRequestRecorder;
//# sourceMappingURL=connection.cjs.map