import { __export } from "../_virtual/rolldown_runtime.js";
import { authenticateAndSetGatewayInstance, authenticateAndSetInstance, checkValidProps, expectOneOf } from "../utils/ibm.js";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Embeddings } from "@langchain/core/embeddings";

//#region src/embeddings/ibm.ts
var ibm_exports = {};
__export(ibm_exports, { WatsonxEmbeddings: () => WatsonxEmbeddings });
var WatsonxEmbeddings = class extends Embeddings {
	model;
	serviceUrl;
	version;
	spaceId;
	projectId;
	truncateInputTokens;
	returnOptions;
	maxRetries;
	maxConcurrency = 1;
	modelGatewayKwargs;
	modelGateway = false;
	service;
	gateway;
	checkValidProperties(fields, includeCommonProps = true) {
		const alwaysAllowedProps = [
			"headers",
			"signal",
			"promptIndex"
		];
		const authProps = [
			"serviceUrl",
			"watsonxAIApikey",
			"watsonxAIBearerToken",
			"watsonxAIUsername",
			"watsonxAIPassword",
			"watsonxAIUrl",
			"watsonxAIAuthType",
			"disableSSL"
		];
		const sharedProps = [
			"maxRetries",
			"watsonxCallbacks",
			"authenticator",
			"serviceUrl",
			"version",
			"streaming",
			"callbackManager",
			"callbacks",
			"maxConcurrency",
			"cache",
			"metadata",
			"concurrency",
			"onFailedAttempt",
			"concurrency",
			"verbose",
			"tags",
			"headers",
			"signal",
			"disableStreaming"
		];
		const projectOrSpaceProps = [
			"truncateInputTokens",
			"returnOptions",
			"model",
			"projectId",
			"spaceId"
		];
		const gatewayProps = [
			"model",
			"modelGatewayKwargs",
			"modelGateway"
		];
		const validProps = [...alwaysAllowedProps];
		if (includeCommonProps) validProps.push(...authProps, ...sharedProps);
		if (this.modelGateway) validProps.push(...gatewayProps);
		else if (this.spaceId || this.projectId) validProps.push(...projectOrSpaceProps);
		checkValidProps(fields, validProps);
	}
	constructor(fields) {
		super(fields);
		expectOneOf(fields, [
			"projectId",
			"spaceId",
			"modelGateway"
		], true);
		this.projectId = fields?.projectId;
		this.spaceId = fields?.spaceId;
		this.modelGateway = fields.modelGateway ?? this.modelGateway;
		this.checkValidProperties(fields);
		this.model = fields.model;
		this.version = fields.version;
		this.serviceUrl = fields.serviceUrl;
		this.truncateInputTokens = fields.truncateInputTokens;
		this.returnOptions = fields.returnOptions;
		this.maxConcurrency = fields.maxConcurrency ?? this.maxConcurrency;
		this.maxRetries = fields.maxRetries ?? 0;
		this.serviceUrl = fields?.serviceUrl;
		this.modelGatewayKwargs = fields.modelGatewayKwargs;
		const { watsonxAIApikey, watsonxAIAuthType, watsonxAIBearerToken, watsonxAIUsername, watsonxAIPassword, watsonxAIUrl, disableSSL, version, serviceUrl } = fields;
		const authData = {
			watsonxAIApikey,
			watsonxAIAuthType,
			watsonxAIBearerToken,
			watsonxAIUsername,
			watsonxAIPassword,
			watsonxAIUrl,
			disableSSL,
			version,
			serviceUrl
		};
		if (this.modelGateway) {
			const auth = authenticateAndSetGatewayInstance(authData);
			if (auth) this.gateway = auth;
			else throw new Error("You have not provided one type of authentication");
		} else {
			const auth = authenticateAndSetInstance(authData);
			if (auth) this.service = auth;
			else throw new Error("You have not provided one type of authentication");
		}
	}
	scopeId() {
		if (this.projectId) return {
			projectId: this.projectId,
			modelId: this.model
		};
		else if (this.spaceId) return {
			spaceId: this.spaceId,
			modelId: this.model
		};
		else return { model: this.model };
	}
	invocationParams() {
		return {
			truncate_input_tokens: this.truncateInputTokens,
			return_options: this.returnOptions
		};
	}
	async listModels() {
		if (this.service) {
			const { service } = this;
			const listModelParams = { filters: "function_embedding" };
			const caller = new AsyncCaller({
				maxConcurrency: this.maxConcurrency,
				maxRetries: this.maxRetries
			});
			const listModels = await caller.call(() => service.listFoundationModelSpecs(listModelParams));
			return listModels.result.resources?.map((item) => item.model_id);
		} else throw new Error("This method is not supported in model gateway");
	}
	async embedSingleText(inputs) {
		const scopeId = this.scopeId();
		if ("modelId" in scopeId && this.service) {
			const { service } = this;
			const caller = new AsyncCaller({
				maxConcurrency: this.maxConcurrency,
				maxRetries: this.maxRetries
			});
			const embeddings = await caller.call(() => service.embedText({
				inputs,
				...scopeId,
				parameters: this.invocationParams()
			}));
			return embeddings.result.results.map((item) => item.embedding);
		} else if (this.gateway && "model" in scopeId) {
			const { gateway } = this;
			const caller = new AsyncCaller({
				maxConcurrency: this.maxConcurrency,
				maxRetries: this.maxRetries
			});
			const embeddings = await caller.call(() => gateway.embeddings.completion.create({
				input: inputs,
				...scopeId
			}));
			const res = embeddings.result.data.map((item) => item.embedding);
			return res;
		}
		throw new Error("Invalid parameters provided. Please check passed properties to class instance");
	}
	async embedDocuments(documents) {
		const data = await this.embedSingleText(documents);
		return data;
	}
	async embedQuery(document) {
		const data = await this.embedSingleText([document]);
		return data[0];
	}
};

//#endregion
export { WatsonxEmbeddings, ibm_exports };
//# sourceMappingURL=ibm.js.map