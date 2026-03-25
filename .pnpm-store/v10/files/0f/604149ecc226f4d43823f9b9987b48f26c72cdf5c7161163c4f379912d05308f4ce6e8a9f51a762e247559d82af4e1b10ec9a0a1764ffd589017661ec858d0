//#region src/utils/googlevertexai-connection.ts
var GoogleConnection = class {
	caller;
	client;
	streaming;
	constructor(caller, client, streaming) {
		this.caller = caller;
		this.client = client;
		this.streaming = streaming ?? false;
	}
	async _request(data, options) {
		const url = await this.buildUrl();
		const method = this.buildMethod();
		const opts = {
			url,
			method
		};
		if (data && method === "POST") opts.data = data;
		if (this.streaming) opts.responseType = "stream";
		else opts.responseType = "json";
		const callResponse = await this.caller.callWithOptions({ signal: options?.signal }, async () => this.client.request(opts));
		const response = callResponse;
		return response;
	}
};
var GoogleVertexAIConnection = class extends GoogleConnection {
	endpoint = "us-central1-aiplatform.googleapis.com";
	location = "us-central1";
	apiVersion = "v1";
	constructor(fields, caller, client, streaming) {
		super(caller, client, streaming);
		this.caller = caller;
		this.endpoint = fields?.endpoint ?? this.endpoint;
		this.location = fields?.location ?? this.location;
		this.apiVersion = fields?.apiVersion ?? this.apiVersion;
		this.client = client;
	}
	buildMethod() {
		return "POST";
	}
};
function complexValue(value) {
	if (value === null || typeof value === "undefined") return void 0;
	else if (typeof value === "object") if (Array.isArray(value)) return { list_val: value.map((avalue) => complexValue(avalue)) };
	else {
		const ret = {};
		const v = value;
		Object.keys(v).forEach((key) => {
			ret[key] = complexValue(v[key]);
		});
		return { struct_val: ret };
	}
	else if (typeof value === "number") if (Number.isInteger(value)) return { int_val: value };
	else return { float_val: value };
	else return { string_val: [value] };
}
var GoogleVertexAILLMConnection = class extends GoogleVertexAIConnection {
	model;
	client;
	customModelURL;
	constructor(fields, caller, client, streaming) {
		super(fields, caller, client, streaming);
		this.client = client;
		this.model = fields?.model ?? this.model;
		this.customModelURL = fields?.customModelURL ?? "";
	}
	async buildUrl() {
		const method = this.streaming ? "serverStreamingPredict" : "predict";
		if (this.customModelURL.trim() !== "") return `${this.customModelURL}:${method}`;
		const projectId = await this.client.getProjectId();
		return `https://${this.endpoint}/v1/projects/${projectId}/locations/${this.location}/publishers/google/models/${this.model}:${method}`;
	}
	formatStreamingData(inputs, parameters) {
		return {
			inputs: [inputs.map((i) => complexValue(i))],
			parameters: complexValue(parameters)
		};
	}
	formatStandardData(instances, parameters) {
		return {
			instances,
			parameters
		};
	}
	formatData(instances, parameters) {
		return this.streaming ? this.formatStreamingData(instances, parameters) : this.formatStandardData(instances, parameters);
	}
	async request(instances, parameters, options) {
		const data = this.formatData(instances, parameters);
		const response = await this._request(data, options);
		return response;
	}
};

//#endregion
export { GoogleVertexAIConnection, GoogleVertexAILLMConnection };
//# sourceMappingURL=googlevertexai-connection.js.map