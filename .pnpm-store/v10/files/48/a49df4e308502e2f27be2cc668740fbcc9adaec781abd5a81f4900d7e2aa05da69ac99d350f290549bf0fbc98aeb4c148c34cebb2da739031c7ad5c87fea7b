import { __export } from "../_virtual/rolldown_runtime.js";
import { RunnableBinding, ensureConfig } from "@langchain/core/runnables";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AsyncGeneratorWithSetup, IterableReadableStream } from "@langchain/core/utils/stream";

//#region src/chat_models/universal.ts
var universal_exports = {};
__export(universal_exports, {
	ConfigurableModel: () => ConfigurableModel,
	MODEL_PROVIDER_CONFIG: () => MODEL_PROVIDER_CONFIG,
	_inferModelProvider: () => _inferModelProvider,
	getChatModelByClassName: () => getChatModelByClassName,
	initChatModel: () => initChatModel
});
const MODEL_PROVIDER_CONFIG = {
	openai: {
		package: "@langchain/openai",
		className: "ChatOpenAI"
	},
	anthropic: {
		package: "@langchain/anthropic",
		className: "ChatAnthropic"
	},
	azure_openai: {
		package: "@langchain/openai",
		className: "AzureChatOpenAI"
	},
	cohere: {
		package: "@langchain/cohere",
		className: "ChatCohere"
	},
	"google-vertexai": {
		package: "@langchain/google-vertexai",
		className: "ChatVertexAI"
	},
	"google-vertexai-web": {
		package: "@langchain/google-vertexai-web",
		className: "ChatVertexAI"
	},
	"google-genai": {
		package: "@langchain/google-genai",
		className: "ChatGoogleGenerativeAI"
	},
	ollama: {
		package: "@langchain/ollama",
		className: "ChatOllama"
	},
	mistralai: {
		package: "@langchain/mistralai",
		className: "ChatMistralAI"
	},
	groq: {
		package: "@langchain/groq",
		className: "ChatGroq"
	},
	cerebras: {
		package: "@langchain/cerebras",
		className: "ChatCerebras"
	},
	bedrock: {
		package: "@langchain/aws",
		className: "ChatBedrockConverse"
	},
	deepseek: {
		package: "@langchain/deepseek",
		className: "ChatDeepSeek"
	},
	xai: {
		package: "@langchain/xai",
		className: "ChatXAI"
	},
	fireworks: {
		package: "@langchain/community/chat_models/fireworks",
		className: "ChatFireworks",
		hasCircularDependency: true
	},
	together: {
		package: "@langchain/community/chat_models/togetherai",
		className: "ChatTogetherAI",
		hasCircularDependency: true
	},
	perplexity: {
		package: "@langchain/community/chat_models/perplexity",
		className: "ChatPerplexity",
		hasCircularDependency: true
	}
};
const SUPPORTED_PROVIDERS = Object.keys(MODEL_PROVIDER_CONFIG);
/**
* Helper function to get a chat model class by its class name
* @param className The class name (e.g., "ChatOpenAI", "ChatAnthropic")
* @returns The imported model class or undefined if not found
*/
async function getChatModelByClassName(className) {
	const providerEntry = Object.entries(MODEL_PROVIDER_CONFIG).find(([, config$1]) => config$1.className === className);
	if (!providerEntry) return void 0;
	const [, config] = providerEntry;
	try {
		const module = await import(config.package);
		return module[config.className];
	} catch (e) {
		const err = e;
		if ("code" in err && err.code?.toString().includes("ERR_MODULE_NOT_FOUND")) {
			const attemptedPackage = err.message.split("Error: Cannot find package '")[1].split("'")[0];
			throw new Error(`Unable to import ${attemptedPackage}. Please install with \`npm install ${attemptedPackage}\` or \`pnpm install ${attemptedPackage}\``);
		}
		throw e;
	}
}
async function _initChatModelHelper(model, modelProvider, params = {}) {
	const modelProviderCopy = modelProvider || _inferModelProvider(model);
	if (!modelProviderCopy) throw new Error(`Unable to infer model provider for { model: ${model} }, please specify modelProvider directly.`);
	const config = MODEL_PROVIDER_CONFIG[modelProviderCopy];
	if (!config) {
		const supported = SUPPORTED_PROVIDERS.join(", ");
		throw new Error(`Unsupported { modelProvider: ${modelProviderCopy} }.\n\nSupported model providers are: ${supported}`);
	}
	const { modelProvider: _unused,...passedParams } = params;
	const ProviderClass = await getChatModelByClassName(config.className);
	return new ProviderClass({
		model,
		...passedParams
	});
}
/**
* Attempts to infer the model provider based on the given model name.
*
* @param {string} modelName - The name of the model to infer the provider for.
* @returns {string | undefined} The inferred model provider name, or undefined if unable to infer.
*
* @example
* _inferModelProvider("gpt-4"); // returns "openai"
* _inferModelProvider("claude-2"); // returns "anthropic"
* _inferModelProvider("unknown-model"); // returns undefined
*/
function _inferModelProvider(modelName) {
	if (modelName.startsWith("gpt-3") || modelName.startsWith("gpt-4") || modelName.startsWith("gpt-5") || modelName.startsWith("o1") || modelName.startsWith("o3") || modelName.startsWith("o4")) return "openai";
	else if (modelName.startsWith("claude")) return "anthropic";
	else if (modelName.startsWith("command")) return "cohere";
	else if (modelName.startsWith("accounts/fireworks")) return "fireworks";
	else if (modelName.startsWith("gemini")) return "google-vertexai";
	else if (modelName.startsWith("amazon.")) return "bedrock";
	else if (modelName.startsWith("mistral")) return "mistralai";
	else if (modelName.startsWith("sonar") || modelName.startsWith("pplx")) return "perplexity";
	else return void 0;
}
/**
* Internal class used to create chat models.
*
* @internal
*/
var ConfigurableModel = class ConfigurableModel extends BaseChatModel {
	_llmType() {
		return "chat_model";
	}
	lc_namespace = ["langchain", "chat_models"];
	_defaultConfig = {};
	/**
	* @default "any"
	*/
	_configurableFields = "any";
	/**
	* @default ""
	*/
	_configPrefix;
	/**
	* Methods which should be called after the model is initialized.
	* The key will be the method name, and the value will be the arguments.
	*/
	_queuedMethodOperations = {};
	constructor(fields) {
		super(fields);
		this._defaultConfig = fields.defaultConfig ?? {};
		if (fields.configurableFields === "any") this._configurableFields = "any";
		else this._configurableFields = fields.configurableFields ?? ["model", "modelProvider"];
		if (fields.configPrefix) this._configPrefix = fields.configPrefix.endsWith("_") ? fields.configPrefix : `${fields.configPrefix}_`;
		else this._configPrefix = "";
		this._queuedMethodOperations = fields.queuedMethodOperations ?? this._queuedMethodOperations;
	}
	async _model(config) {
		const params = {
			...this._defaultConfig,
			...this._modelParams(config)
		};
		let initializedModel = await _initChatModelHelper(params.model, params.modelProvider, params);
		const queuedMethodOperationsEntries = Object.entries(this._queuedMethodOperations);
		if (queuedMethodOperationsEntries.length > 0) {
			for (const [method, args] of queuedMethodOperationsEntries) if (method in initializedModel && typeof initializedModel[method] === "function") initializedModel = await initializedModel[method](...args);
		}
		return initializedModel;
	}
	async _generate(messages, options, runManager) {
		const model = await this._model(options);
		return model._generate(messages, options ?? {}, runManager);
	}
	bindTools(tools, params) {
		const newQueuedOperations = { ...this._queuedMethodOperations };
		newQueuedOperations.bindTools = [tools, params];
		return new ConfigurableModel({
			defaultConfig: this._defaultConfig,
			configurableFields: this._configurableFields,
			configPrefix: this._configPrefix,
			queuedMethodOperations: newQueuedOperations
		});
	}
	withStructuredOutput = (schema, ...args) => {
		const newQueuedOperations = { ...this._queuedMethodOperations };
		newQueuedOperations.withStructuredOutput = [schema, ...args];
		return new ConfigurableModel({
			defaultConfig: this._defaultConfig,
			configurableFields: this._configurableFields,
			configPrefix: this._configPrefix,
			queuedMethodOperations: newQueuedOperations
		});
	};
	_modelParams(config) {
		const configurable = config?.configurable ?? {};
		let modelParams = {};
		for (const [key, value] of Object.entries(configurable)) if (key.startsWith(this._configPrefix)) {
			const strippedKey = this._removePrefix(key, this._configPrefix);
			modelParams[strippedKey] = value;
		}
		if (this._configurableFields !== "any") modelParams = Object.fromEntries(Object.entries(modelParams).filter(([key]) => this._configurableFields.includes(key)));
		return modelParams;
	}
	_removePrefix(str, prefix) {
		return str.startsWith(prefix) ? str.slice(prefix.length) : str;
	}
	/**
	* Bind config to a Runnable, returning a new Runnable.
	* @param {RunnableConfig | undefined} [config] - The config to bind.
	* @returns {RunnableBinding<RunInput, RunOutput, CallOptions>} A new RunnableBinding with the bound config.
	*/
	withConfig(config) {
		const mergedConfig = { ...config || {} };
		const modelParams = this._modelParams(mergedConfig);
		const remainingConfig = Object.fromEntries(Object.entries(mergedConfig).filter(([k]) => k !== "configurable"));
		remainingConfig.configurable = Object.fromEntries(Object.entries(mergedConfig.configurable || {}).filter(([k]) => this._configPrefix && !Object.keys(modelParams).includes(this._removePrefix(k, this._configPrefix))));
		const newConfigurableModel = new ConfigurableModel({
			defaultConfig: {
				...this._defaultConfig,
				...modelParams
			},
			configurableFields: Array.isArray(this._configurableFields) ? [...this._configurableFields] : this._configurableFields,
			configPrefix: this._configPrefix,
			queuedMethodOperations: this._queuedMethodOperations
		});
		return new RunnableBinding({
			config: mergedConfig,
			bound: newConfigurableModel
		});
	}
	async invoke(input, options) {
		const model = await this._model(options);
		const config = ensureConfig(options);
		return model.invoke(input, config);
	}
	async stream(input, options) {
		const model = await this._model(options);
		const wrappedGenerator = new AsyncGeneratorWithSetup({
			generator: await model.stream(input, options),
			config: options
		});
		await wrappedGenerator.setup;
		return IterableReadableStream.fromAsyncGenerator(wrappedGenerator);
	}
	async batch(inputs, options, batchOptions) {
		return super.batch(inputs, options, batchOptions);
	}
	async *transform(generator, options) {
		const model = await this._model(options);
		const config = ensureConfig(options);
		yield* model.transform(generator, config);
	}
	async *streamLog(input, options, streamOptions) {
		const model = await this._model(options);
		const config = ensureConfig(options);
		yield* model.streamLog(input, config, {
			...streamOptions,
			_schemaFormat: "original",
			includeNames: streamOptions?.includeNames,
			includeTypes: streamOptions?.includeTypes,
			includeTags: streamOptions?.includeTags,
			excludeNames: streamOptions?.excludeNames,
			excludeTypes: streamOptions?.excludeTypes,
			excludeTags: streamOptions?.excludeTags
		});
	}
	streamEvents(input, options, streamOptions) {
		const outerThis = this;
		async function* wrappedGenerator() {
			const model = await outerThis._model(options);
			const config = ensureConfig(options);
			const eventStream = model.streamEvents(input, config, streamOptions);
			for await (const chunk of eventStream) yield chunk;
		}
		return IterableReadableStream.fromAsyncGenerator(wrappedGenerator());
	}
};
/**
* Initialize a ChatModel from the model name and provider.
* Must have the integration package corresponding to the model provider installed.
*
* @template {extends BaseLanguageModelInput = BaseLanguageModelInput} RunInput - The input type for the model.
* @template {extends ConfigurableChatModelCallOptions = ConfigurableChatModelCallOptions} CallOptions - Call options for the model.
*
* @param {string | ChatModelProvider} [model] - The name of the model, e.g. "gpt-4", "claude-3-opus-20240229".
*   Can be prefixed with the model provider, e.g. "openai:gpt-4", "anthropic:claude-3-opus-20240229".
* @param {Object} [fields] - Additional configuration options.
* @param {string} [fields.modelProvider] - The model provider. Supported values include:
*   - openai (@langchain/openai)
*   - anthropic (@langchain/anthropic)
*   - azure_openai (@langchain/openai)
*   - google-vertexai (@langchain/google-vertexai)
*   - google-vertexai-web (@langchain/google-vertexai-web)
*   - google-genai (@langchain/google-genai)
*   - bedrock (@langchain/aws)
*   - cohere (@langchain/cohere)
*   - fireworks (@langchain/community/chat_models/fireworks)
*   - together (@langchain/community/chat_models/togetherai)
*   - mistralai (@langchain/mistralai)
*   - groq (@langchain/groq)
*   - ollama (@langchain/ollama)
*   - perplexity (@langchain/community/chat_models/perplexity)
*   - cerebras (@langchain/cerebras)
*   - deepseek (@langchain/deepseek)
*   - xai (@langchain/xai)
* @param {string[] | "any"} [fields.configurableFields] - Which model parameters are configurable:
*   - undefined: No configurable fields.
*   - "any": All fields are configurable. (See Security Note in description)
*   - string[]: Specified fields are configurable.
* @param {string} [fields.configPrefix] - Prefix for configurable fields at runtime.
* @param {Record<string, any>} [fields.params] - Additional keyword args to pass to the ChatModel constructor.
* @returns {Promise<ConfigurableModel<RunInput, CallOptions>>} A class which extends BaseChatModel.
* @throws {Error} If modelProvider cannot be inferred or isn't supported.
* @throws {Error} If the model provider integration package is not installed.
*
* @example Initialize non-configurable models
* ```typescript
* import { initChatModel } from "langchain/chat_models/universal";
*
* const gpt4 = await initChatModel("openai:gpt-4", {
*   temperature: 0.25,
* });
* const gpt4Result = await gpt4.invoke("what's your name");
*
* const claude = await initChatModel("anthropic:claude-3-opus-20240229", {
*   temperature: 0.25,
* });
* const claudeResult = await claude.invoke("what's your name");
*
* const gemini = await initChatModel("gemini-1.5-pro", {
*   modelProvider: "google-vertexai",
*   temperature: 0.25,
* });
* const geminiResult = await gemini.invoke("what's your name");
* ```
*
* @example Create a partially configurable model with no default model
* ```typescript
* import { initChatModel } from "langchain/chat_models/universal";
*
* const configurableModel = await initChatModel(undefined, {
*   temperature: 0,
*   configurableFields: ["model", "apiKey"],
* });
*
* const gpt4Result = await configurableModel.invoke("what's your name", {
*   configurable: {
*     model: "gpt-4",
*   },
* });
*
* const claudeResult = await configurableModel.invoke("what's your name", {
*   configurable: {
*     model: "claude-3-5-sonnet-20240620",
*   },
* });
* ```
*
* @example Create a fully configurable model with a default model and a config prefix
* ```typescript
* import { initChatModel } from "langchain/chat_models/universal";
*
* const configurableModelWithDefault = await initChatModel("gpt-4", {
*   modelProvider: "openai",
*   configurableFields: "any",
*   configPrefix: "foo",
*   temperature: 0,
* });
*
* const openaiResult = await configurableModelWithDefault.invoke(
*   "what's your name",
*   {
*     configurable: {
*       foo_apiKey: process.env.OPENAI_API_KEY,
*     },
*   }
* );
*
* const claudeResult = await configurableModelWithDefault.invoke(
*   "what's your name",
*   {
*     configurable: {
*       foo_model: "claude-3-5-sonnet-20240620",
*       foo_modelProvider: "anthropic",
*       foo_temperature: 0.6,
*       foo_apiKey: process.env.ANTHROPIC_API_KEY,
*     },
*   }
* );
* ```
*
* @example Bind tools to a configurable model:
* ```typescript
* import { initChatModel } from "langchain/chat_models/universal";
* import { z } from "zod/v3";
* import { tool } from "@langchain/core/tools";
*
* const getWeatherTool = tool(
*   (input) => {
*     // Do something with the input
*     return JSON.stringify(input);
*   },
*   {
*     schema: z
*       .object({
*         location: z
*           .string()
*           .describe("The city and state, e.g. San Francisco, CA"),
*       })
*       .describe("Get the current weather in a given location"),
*     name: "GetWeather",
*     description: "Get the current weather in a given location",
*   }
* );
*
* const getPopulationTool = tool(
*   (input) => {
*     // Do something with the input
*     return JSON.stringify(input);
*   },
*   {
*     schema: z
*       .object({
*         location: z
*           .string()
*           .describe("The city and state, e.g. San Francisco, CA"),
*       })
*       .describe("Get the current population in a given location"),
*     name: "GetPopulation",
*     description: "Get the current population in a given location",
*   }
* );
*
* const configurableModel = await initChatModel("gpt-4", {
*   configurableFields: ["model", "modelProvider", "apiKey"],
*   temperature: 0,
* });
*
* const configurableModelWithTools = configurableModel.bindTools([
*   getWeatherTool,
*   getPopulationTool,
* ]);
*
* const configurableToolResult = await configurableModelWithTools.invoke(
*   "Which city is hotter today and which is bigger: LA or NY?",
*   {
*     configurable: {
*       apiKey: process.env.OPENAI_API_KEY,
*     },
*   }
* );
*
* const configurableToolResult2 = await configurableModelWithTools.invoke(
*   "Which city is hotter today and which is bigger: LA or NY?",
*   {
*     configurable: {
*       model: "claude-3-5-sonnet-20240620",
*       apiKey: process.env.ANTHROPIC_API_KEY,
*     },
*   }
* );
* ```
*
* @description
* This function initializes a ChatModel based on the provided model name and provider.
* It supports various model providers and allows for runtime configuration of model parameters.
*
* Security Note: Setting `configurableFields` to "any" means fields like apiKey, baseUrl, etc.
* can be altered at runtime, potentially redirecting model requests to a different service/user.
* Make sure that if you're accepting untrusted configurations, you enumerate the
* `configurableFields` explicitly.
*
* The function will attempt to infer the model provider from the model name if not specified.
* Certain model name prefixes are associated with specific providers:
* - gpt-3... or gpt-4... -> openai
* - claude... -> anthropic
* - amazon.... -> bedrock
* - gemini... -> google-vertexai
* - command... -> cohere
* - accounts/fireworks... -> fireworks
*
* @since 0.2.11
* @version 0.2.11
*/
async function initChatModel(model, fields) {
	let { configurableFields, configPrefix, modelProvider,...params } = {
		configPrefix: "",
		...fields ?? {}
	};
	if (modelProvider === void 0 && model?.includes(":")) {
		const modelComponents = model.split(":", 2);
		if (SUPPORTED_PROVIDERS.includes(modelComponents[0])) [modelProvider, model] = modelComponents;
	}
	let configurableFieldsCopy = Array.isArray(configurableFields) ? [...configurableFields] : configurableFields;
	if (!model && configurableFieldsCopy === void 0) configurableFieldsCopy = ["model", "modelProvider"];
	if (configPrefix && configurableFieldsCopy === void 0) console.warn(`{ configPrefix: ${configPrefix} } has been set but no fields are configurable. Set { configurableFields: [...] } to specify the model params that are configurable.`);
	const paramsCopy = { ...params };
	if (configurableFieldsCopy === void 0) return new ConfigurableModel({
		defaultConfig: {
			...paramsCopy,
			model,
			modelProvider
		},
		configPrefix
	});
	else {
		if (model) paramsCopy.model = model;
		if (modelProvider) paramsCopy.modelProvider = modelProvider;
		return new ConfigurableModel({
			defaultConfig: paramsCopy,
			configPrefix,
			configurableFields: configurableFieldsCopy
		});
	}
}

//#endregion
export { ConfigurableModel, MODEL_PROVIDER_CONFIG, _inferModelProvider, getChatModelByClassName, initChatModel, universal_exports };
//# sourceMappingURL=universal.js.map