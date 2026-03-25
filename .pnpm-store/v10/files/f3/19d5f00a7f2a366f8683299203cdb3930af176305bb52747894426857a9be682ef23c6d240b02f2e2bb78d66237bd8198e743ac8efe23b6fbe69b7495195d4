Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_utils = require("../messages/utils.cjs");
const require_caches_index = require("../caches/index.cjs");
const require_utils_async_caller = require("../utils/async_caller.cjs");
const require_base = require("../runnables/base.cjs");
const require_prompt_values = require("../prompt_values.cjs");
const require_utils_tiktoken = require("../utils/tiktoken.cjs");
//#region src/language_models/base.ts
var base_exports = /* @__PURE__ */ require_runtime.__exportAll({
	BaseLangChain: () => BaseLangChain,
	BaseLanguageModel: () => BaseLanguageModel,
	calculateMaxTokens: () => calculateMaxTokens,
	getEmbeddingContextSize: () => getEmbeddingContextSize,
	getModelContextSize: () => getModelContextSize,
	getModelNameForTiktoken: () => getModelNameForTiktoken,
	isOpenAITool: () => isOpenAITool
});
const getModelNameForTiktoken = (modelName) => {
	if (modelName.startsWith("gpt-5")) return "gpt-5";
	if (modelName.startsWith("gpt-3.5-turbo-16k")) return "gpt-3.5-turbo-16k";
	if (modelName.startsWith("gpt-3.5-turbo-")) return "gpt-3.5-turbo";
	if (modelName.startsWith("gpt-4-32k")) return "gpt-4-32k";
	if (modelName.startsWith("gpt-4-")) return "gpt-4";
	if (modelName.startsWith("gpt-4o")) return "gpt-4o";
	return modelName;
};
const getEmbeddingContextSize = (modelName) => {
	switch (modelName) {
		case "text-embedding-ada-002": return 8191;
		default: return 2046;
	}
};
/**
* Get the context window size (max input tokens) for a given model.
*
* Context window sizes are sourced from official model documentation:
* - OpenAI: https://platform.openai.com/docs/models
* - Anthropic: https://docs.anthropic.com/claude/docs/models-overview
* - Google: https://ai.google.dev/gemini/docs/models/gemini
*
* @param modelName - The name of the model
* @returns The context window size in tokens
*/
const getModelContextSize = (modelName) => {
	switch (getModelNameForTiktoken(modelName)) {
		case "gpt-5":
		case "gpt-5-turbo":
		case "gpt-5-turbo-preview": return 4e5;
		case "gpt-4o":
		case "gpt-4o-mini":
		case "gpt-4o-2024-05-13":
		case "gpt-4o-2024-08-06": return 128e3;
		case "gpt-4-turbo":
		case "gpt-4-turbo-preview":
		case "gpt-4-turbo-2024-04-09":
		case "gpt-4-0125-preview":
		case "gpt-4-1106-preview": return 128e3;
		case "gpt-4-32k":
		case "gpt-4-32k-0314":
		case "gpt-4-32k-0613": return 32768;
		case "gpt-4":
		case "gpt-4-0314":
		case "gpt-4-0613": return 8192;
		case "gpt-3.5-turbo-16k":
		case "gpt-3.5-turbo-16k-0613": return 16384;
		case "gpt-3.5-turbo":
		case "gpt-3.5-turbo-0301":
		case "gpt-3.5-turbo-0613":
		case "gpt-3.5-turbo-1106":
		case "gpt-3.5-turbo-0125": return 4096;
		case "text-davinci-003":
		case "text-davinci-002": return 4097;
		case "text-davinci-001": return 2049;
		case "text-curie-001":
		case "text-babbage-001":
		case "text-ada-001": return 2048;
		case "code-davinci-002":
		case "code-davinci-001": return 8e3;
		case "code-cushman-001": return 2048;
		case "claude-3-5-sonnet-20241022":
		case "claude-3-5-sonnet-20240620":
		case "claude-3-opus-20240229":
		case "claude-3-sonnet-20240229":
		case "claude-3-haiku-20240307":
		case "claude-2.1": return 2e5;
		case "claude-2.0":
		case "claude-instant-1.2": return 1e5;
		case "gemini-1.5-pro":
		case "gemini-1.5-pro-latest":
		case "gemini-1.5-flash":
		case "gemini-1.5-flash-latest": return 1e6;
		case "gemini-pro":
		case "gemini-pro-vision": return 32768;
		default: return 4097;
	}
};
/**
* Whether or not the input matches the OpenAI tool definition.
* @param {unknown} tool The input to check.
* @returns {boolean} Whether the input is an OpenAI tool definition.
*/
function isOpenAITool(tool) {
	if (typeof tool !== "object" || !tool) return false;
	if ("type" in tool && tool.type === "function" && "function" in tool && typeof tool.function === "object" && tool.function && "name" in tool.function && "parameters" in tool.function) return true;
	return false;
}
const calculateMaxTokens = async ({ prompt, modelName }) => {
	let numTokens;
	try {
		numTokens = (await require_utils_tiktoken.encodingForModel(getModelNameForTiktoken(modelName))).encode(prompt).length;
	} catch {
		console.warn("Failed to calculate number of tokens, falling back to approximate count");
		numTokens = Math.ceil(prompt.length / 4);
	}
	return getModelContextSize(modelName) - numTokens;
};
const getVerbosity = () => false;
/**
* Base class for language models, chains, tools.
*/
var BaseLangChain = class extends require_base.Runnable {
	/**
	* Whether to print out response text.
	*/
	verbose;
	callbacks;
	tags;
	metadata;
	get lc_attributes() {
		return {
			callbacks: void 0,
			verbose: void 0
		};
	}
	constructor(params) {
		super(params);
		this.verbose = params.verbose ?? getVerbosity();
		this.callbacks = params.callbacks;
		this.tags = params.tags ?? [];
		this.metadata = params.metadata ?? {};
		this._addVersion("@langchain/core", "1.1.34");
	}
	_addVersion(pkg, version) {
		const existing = this.metadata?.versions;
		this.metadata = {
			...this.metadata,
			versions: {
				...typeof existing === "object" && existing !== null ? existing : {},
				[pkg]: version
			}
		};
	}
};
/**
* Base class for language models.
*/
var BaseLanguageModel = class extends BaseLangChain {
	/**
	* Keys that the language model accepts as call options.
	*/
	get callKeys() {
		return [
			"stop",
			"timeout",
			"signal",
			"tags",
			"metadata",
			"callbacks"
		];
	}
	/**
	* The async caller should be used by subclasses to make any async calls,
	* which will thus benefit from the concurrency and retry logic.
	*/
	caller;
	cache;
	constructor({ callbacks, callbackManager, ...params }) {
		const { cache, ...rest } = params;
		super({
			callbacks: callbacks ?? callbackManager,
			...rest
		});
		if (typeof cache === "object") this.cache = cache;
		else if (cache) this.cache = require_caches_index.InMemoryCache.global();
		else this.cache = void 0;
		this.caller = new require_utils_async_caller.AsyncCaller(params ?? {});
	}
	_encoding;
	/**
	* Get the number of tokens in the content.
	* @param content The content to get the number of tokens for.
	* @returns The number of tokens in the content.
	*/
	async getNumTokens(content) {
		let textContent;
		if (typeof content === "string") textContent = content;
		else
 /**
		* Content is an array of ContentBlock
		*
		* ToDo(@christian-bromann): This is a temporary fix to get the number of tokens for the content.
		* We need to find a better way to do this.
		* @see https://github.com/langchain-ai/langchainjs/pull/8341#pullrequestreview-2933713116
		*/
		textContent = content.map((item) => {
			if (typeof item === "string") return item;
			if (item.type === "text" && "text" in item) return item.text;
			return "";
		}).join("");
		let numTokens = Math.ceil(textContent.length / 4);
		if (!this._encoding) try {
			this._encoding = await require_utils_tiktoken.encodingForModel("modelName" in this ? getModelNameForTiktoken(this.modelName) : "gpt2");
		} catch (error) {
			console.warn("Failed to calculate number of tokens, falling back to approximate count", error);
		}
		if (this._encoding) try {
			numTokens = this._encoding.encode(textContent).length;
		} catch (error) {
			console.warn("Failed to calculate number of tokens, falling back to approximate count", error);
		}
		return numTokens;
	}
	static _convertInputToPromptValue(input) {
		if (typeof input === "string") return new require_prompt_values.StringPromptValue(input);
		else if (Array.isArray(input)) return new require_prompt_values.ChatPromptValue(input.map(require_utils.coerceMessageLikeToMessage));
		else return input;
	}
	/**
	* Get the identifying parameters of the LLM.
	*/
	_identifyingParams() {
		return {};
	}
	/**
	* Create a unique cache key for a specific call to a specific language model.
	* @param callOptions Call options for the model
	* @returns A unique cache key.
	*/
	_getSerializedCacheKeyParametersForCall({ config, ...callOptions }) {
		const params = {
			...this._identifyingParams(),
			...callOptions,
			_type: this._llmType(),
			_model: this._modelType()
		};
		return Object.entries(params).filter(([_, value]) => value !== void 0).map(([key, value]) => `${key}:${JSON.stringify(value)}`).sort().join(",");
	}
	/**
	* @deprecated
	* Return a json-like object representing this LLM.
	*/
	serialize() {
		return {
			...this._identifyingParams(),
			_type: this._llmType(),
			_model: this._modelType()
		};
	}
	/**
	* @deprecated
	* Load an LLM from a json-like object describing it.
	*/
	static async deserialize(_data) {
		throw new Error("Use .toJSON() instead");
	}
	/**
	* Return profiling information for the model.
	*
	* @returns {ModelProfile} An object describing the model's capabilities and constraints
	*/
	get profile() {
		return {};
	}
};
//#endregion
exports.BaseLangChain = BaseLangChain;
exports.BaseLanguageModel = BaseLanguageModel;
Object.defineProperty(exports, "base_exports", {
	enumerable: true,
	get: function() {
		return base_exports;
	}
});
exports.calculateMaxTokens = calculateMaxTokens;
exports.getEmbeddingContextSize = getEmbeddingContextSize;
exports.getModelContextSize = getModelContextSize;
exports.getModelNameForTiktoken = getModelNameForTiktoken;
exports.isOpenAITool = isOpenAITool;

//# sourceMappingURL=base.cjs.map