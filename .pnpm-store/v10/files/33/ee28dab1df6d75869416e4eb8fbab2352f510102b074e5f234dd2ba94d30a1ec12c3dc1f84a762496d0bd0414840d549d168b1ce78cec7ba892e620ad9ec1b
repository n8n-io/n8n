const require_runtime = require('../_virtual/_rolldown/runtime.cjs');
const require_model = require('./model.cjs');
const require_errors = require('./errors.cjs');
let _langchain_core_utils_types = require("@langchain/core/utils/types");
let _langchain_core_utils_json_schema = require("@langchain/core/utils/json_schema");
let _langchain_core_utils_standard_schema = require("@langchain/core/utils/standard_schema");

//#region src/agents/responses.ts
/**
* Default value for strict mode in providerStrategy.
*
* When using providerStrategy with json_schema response format, OpenAI's parse() method
* requires all function tools to have strict: true. This ensures the model's output
* exactly matches the provided JSON schema.
*
* @see https://platform.openai.com/docs/guides/structured-outputs
*/
const PROVIDER_STRATEGY_DEFAULT_STRICT = true;
/**
* This is a global counter for generating unique names for tools.
*/
let bindingIdentifier = 0;
/**
* Information for tracking structured output tool metadata.
* This contains all necessary information to handle structured responses generated
* via tool calls, including the original schema, its type classification, and the
* corresponding tool implementation used by the tools strategy.
*/
var ToolStrategy = class ToolStrategy {
	constructor(schema, tool, options) {
		this.schema = schema;
		this.tool = tool;
		this.options = options;
	}
	get name() {
		return this.tool.function.name;
	}
	static fromSchema(schema, outputOptions) {
		/**
		* It is required for tools to have a name so we can map the tool call to the correct tool
		* when parsing the response.
		*/
		function getFunctionName(name) {
			return name ?? `extract-${++bindingIdentifier}`;
		}
		if ((0, _langchain_core_utils_standard_schema.isSerializableSchema)(schema) || (0, _langchain_core_utils_types.isInteropZodSchema)(schema)) {
			const asJsonSchema = (0, _langchain_core_utils_json_schema.toJsonSchema)(schema);
			return new ToolStrategy(asJsonSchema, {
				type: "function",
				function: {
					name: getFunctionName(asJsonSchema.title),
					strict: false,
					description: asJsonSchema.description ?? "Tool for extracting structured output from the model's response.",
					parameters: asJsonSchema
				}
			}, outputOptions);
		}
		let functionDefinition;
		if (typeof schema.name === "string" && typeof schema.parameters === "object" && schema.parameters != null) functionDefinition = schema;
		else functionDefinition = {
			name: getFunctionName(schema.title),
			description: schema.description ?? "",
			parameters: schema.schema || schema
		};
		return new ToolStrategy((0, _langchain_core_utils_json_schema.toJsonSchema)(schema), {
			type: "function",
			function: functionDefinition
		}, outputOptions);
	}
	/**
	* Parse tool arguments according to the schema.
	*
	* @throws {StructuredOutputParsingError} if the response is not valid
	* @param toolArgs - The arguments from the tool call
	* @returns The parsed response according to the schema type
	*/
	parse(toolArgs) {
		const result = new _langchain_core_utils_json_schema.Validator(this.schema).validate(toolArgs);
		if (!result.valid) throw new require_errors.StructuredOutputParsingError(this.name, result.errors.map((e) => e.error));
		return toolArgs;
	}
};
var ProviderStrategy = class ProviderStrategy {
	_schemaType;
	/**
	* The schema to use for the provider strategy
	*/
	schema;
	/**
	* Whether to use strict mode for the provider strategy
	*/
	strict;
	constructor(schemaOrOptions, strict) {
		if ("schema" in schemaOrOptions && typeof schemaOrOptions.schema === "object" && schemaOrOptions.schema !== null && !("type" in schemaOrOptions)) {
			const options = schemaOrOptions;
			this.schema = options.schema;
			this.strict = options.strict ?? PROVIDER_STRATEGY_DEFAULT_STRICT;
		} else {
			this.schema = schemaOrOptions;
			this.strict = strict ?? PROVIDER_STRATEGY_DEFAULT_STRICT;
		}
	}
	static fromSchema(schema, strict) {
		return new ProviderStrategy((0, _langchain_core_utils_json_schema.toJsonSchema)(schema), strict);
	}
	/**
	* Parse tool arguments according to the schema. If the response is not valid, return undefined.
	*
	* @param response - The AI message response to parse
	* @returns The parsed response according to the schema type
	*/
	parse(response) {
		/**
		* Extract text content from the response.
		* Handles both string content and array content (e.g., from thinking models).
		*/
		let textContent;
		if (typeof response.content === "string") textContent = response.content;
		else if (Array.isArray(response.content)) {
			/**
			* For thinking models, content is an array with thinking blocks and text blocks.
			* Extract the text from text blocks.
			*/
			for (const block of response.content) if (typeof block === "object" && block !== null && "type" in block && block.type === "text" && "text" in block && typeof block.text === "string") {
				textContent = block.text;
				break;
			}
		}
		if (!textContent || textContent === "") return;
		try {
			const content = JSON.parse(textContent);
			if (!new _langchain_core_utils_json_schema.Validator(this.schema).validate(content).valid) return;
			return content;
		} catch {}
	}
};
/**
* Handle user input for `responseFormat` parameter of `CreateAgentParams`.
* This function defines the default behavior for the `responseFormat` parameter, which is:
*
* - if value is a Zod schema, default to structured output via tool calling
* - if value is a JSON schema, default to structured output via tool calling
* - if value is a custom response format, return it as is
* - if value is an array, ensure all array elements are instance of `ToolStrategy`
* @param responseFormat - The response format to transform, provided by the user
* @param options - The response format options for tool strategy
* @param model - The model to check if it supports JSON schema output
* @returns
*/
function transformResponseFormat(responseFormat, options, model) {
	if (!responseFormat) return [];
	if (typeof responseFormat === "object" && responseFormat !== null && "__responseFormatUndefined" in responseFormat) return [];
	/**
	* If users provide an array, it should only contain raw schemas (Zod, Standard Schema or JSON schema),
	* not ToolStrategy or ProviderStrategy instances.
	*/
	if (Array.isArray(responseFormat)) {
		/**
		* if every entry is a ToolStrategy or ProviderStrategy instance, return the array as is
		*/
		if (responseFormat.every((item) => item instanceof ToolStrategy || item instanceof ProviderStrategy)) return responseFormat;
		/**
		* Check if all items are Standard Schema
		*/
		if (responseFormat.every((item) => (0, _langchain_core_utils_standard_schema.isSerializableSchema)(item))) return responseFormat.map((item) => ToolStrategy.fromSchema(item, options));
		/**
		* Check if all items are Zod schemas
		*/
		if (responseFormat.every((item) => (0, _langchain_core_utils_types.isInteropZodObject)(item))) return responseFormat.map((item) => ToolStrategy.fromSchema(item, options));
		/**
		* Check if all items are plain objects (JSON schema)
		*/
		if (responseFormat.every((item) => typeof item === "object" && item !== null && !(0, _langchain_core_utils_types.isInteropZodObject)(item) && !(0, _langchain_core_utils_standard_schema.isSerializableSchema)(item))) return responseFormat.map((item) => ToolStrategy.fromSchema(item, options));
		throw new Error("Invalid response format: list contains mixed types.\nAll items must be either InteropZodObject, Standard Schema, or plain JSON schema objects.");
	}
	if (responseFormat instanceof ToolStrategy || responseFormat instanceof ProviderStrategy) return [responseFormat];
	const useProviderStrategy = hasSupportForJsonSchemaOutput(model);
	/**
	* `responseFormat` is a Standard Schema
	*/
	if ((0, _langchain_core_utils_standard_schema.isSerializableSchema)(responseFormat)) return useProviderStrategy ? [ProviderStrategy.fromSchema(responseFormat)] : [ToolStrategy.fromSchema(responseFormat, options)];
	/**
	* `responseFormat` is a Zod schema
	*/
	if ((0, _langchain_core_utils_types.isInteropZodObject)(responseFormat)) return useProviderStrategy ? [ProviderStrategy.fromSchema(responseFormat)] : [ToolStrategy.fromSchema(responseFormat, options)];
	/**
	* Handle plain object (JSON schema)
	*/
	if (typeof responseFormat === "object" && responseFormat !== null && "properties" in responseFormat) return useProviderStrategy ? [ProviderStrategy.fromSchema(responseFormat)] : [ToolStrategy.fromSchema(responseFormat, options)];
	throw new Error(`Invalid response format: ${String(responseFormat)}`);
}
/**
* Creates a tool strategy for structured output using function calling.
*
* This function configures structured output by converting schemas into function tools that
* the model calls. Unlike `providerStrategy`, which uses native JSON schema support,
* `toolStrategy` works with any model that supports function calling, making it more
* widely compatible across providers and model versions.
*
* The model will call a function with arguments matching your schema, and the agent will
* extract and validate the structured output from the tool call. This approach is automatically
* used when your model doesn't support native JSON schema output.
*
* @param responseFormat - The schema(s) to enforce. Can be a single Zod schema, a Standard Schema
*   (e.g., Valibot, ArkType, TypeBox), a JSON schema object, or arrays of any of these.
* @param options - Optional configuration for the tool strategy
* @param options.handleError - How to handle errors when the model calls multiple structured output tools
*   or when the output doesn't match the schema. Defaults to `true` (auto-retry). Can be `false` (throw),
*   a `string` (retry with message), or a `function` (custom handler).
* @param options.toolMessageContent - Custom message content to include in conversation history
*   when structured output is generated via tool call
* @returns A `TypedToolStrategy` instance that can be used as the `responseFormat` in `createAgent`
*
* @example
* ```ts
* import { toolStrategy, createAgent } from "langchain";
* import { z } from "zod";
*
* const agent = createAgent({
*   model: "claude-haiku-4-5",
*   responseFormat: toolStrategy(
*     z.object({
*       answer: z.string(),
*       confidence: z.number().min(0).max(1),
*     })
*   ),
* });
* ```
*
* @example
* ```ts
* // Multiple schemas - model can choose which one to use
* const agent = createAgent({
*   model: "claude-haiku-4-5",
*   responseFormat: toolStrategy([
*     z.object({ name: z.string(), age: z.number() }),
*     z.object({ email: z.string(), phone: z.string() }),
*   ]),
* });
* ```
*/
function toolStrategy(responseFormat, options) {
	return transformResponseFormat(responseFormat, options);
}
function providerStrategy(responseFormat) {
	/**
	* Handle options object format
	*/
	if (typeof responseFormat === "object" && responseFormat !== null && "schema" in responseFormat && !(0, _langchain_core_utils_types.isInteropZodSchema)(responseFormat) && !(0, _langchain_core_utils_standard_schema.isSerializableSchema)(responseFormat) && !("type" in responseFormat)) {
		const { schema, strict: strictFlag } = responseFormat;
		return ProviderStrategy.fromSchema(schema, strictFlag);
	}
	/**
	* Handle direct schema format
	*/
	return ProviderStrategy.fromSchema(responseFormat);
}
const CHAT_MODELS_THAT_SUPPORT_JSON_SCHEMA_OUTPUT = ["ChatOpenAI", "ChatXAI"];
const MODEL_NAMES_THAT_SUPPORT_JSON_SCHEMA_OUTPUT = [
	"grok",
	"gpt-5",
	"gpt-4.1",
	"gpt-4o",
	"gpt-oss",
	"o3-pro",
	"o3-mini"
];
/**
* Identifies the models that support JSON schema output
* @param model - The model to check
* @returns True if the model supports JSON schema output, false otherwise
*/
function hasSupportForJsonSchemaOutput(model) {
	if (!model) return false;
	if (typeof model === "string") {
		const modelName = model.split(":").pop();
		return MODEL_NAMES_THAT_SUPPORT_JSON_SCHEMA_OUTPUT.some((modelNameSnippet) => modelName.includes(modelNameSnippet));
	}
	if (require_model.isConfigurableModel(model)) return hasSupportForJsonSchemaOutput(model._defaultConfig.model);
	if (!require_model.isBaseChatModel(model)) return false;
	const chatModelClass = model.getName();
	/**
	* for testing purposes only
	*/
	if (chatModelClass === "FakeToolCallingChatModel") return true;
	if (CHAT_MODELS_THAT_SUPPORT_JSON_SCHEMA_OUTPUT.includes(chatModelClass) && ("model" in model && MODEL_NAMES_THAT_SUPPORT_JSON_SCHEMA_OUTPUT.some((modelNameSnippet) => typeof model.model === "string" && model.model.includes(modelNameSnippet)) || chatModelClass === "FakeToolCallingModel" && "structuredResponse" in model)) return true;
	return false;
}

//#endregion
exports.ProviderStrategy = ProviderStrategy;
exports.ToolStrategy = ToolStrategy;
exports.providerStrategy = providerStrategy;
exports.toolStrategy = toolStrategy;
exports.transformResponseFormat = transformResponseFormat;
//# sourceMappingURL=responses.cjs.map