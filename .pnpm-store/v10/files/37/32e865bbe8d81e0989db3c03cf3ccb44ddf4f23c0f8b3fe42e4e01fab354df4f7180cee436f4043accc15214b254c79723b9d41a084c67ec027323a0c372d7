const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const zod_v4_core = require_rolldown_runtime.__toESM(require("zod/v4/core"));
const openai_helpers_zod = require_rolldown_runtime.__toESM(require("openai/helpers/zod"));

//#region src/utils/output.ts
const SUPPORTED_METHODS = [
	"jsonSchema",
	"functionCalling",
	"jsonMode"
];
/**
* Get the structured output method for a given model. By default, it uses
* `jsonSchema` if the model supports it, otherwise it uses `functionCalling`.
*
* @throws if the method is invalid, e.g. is not a string or invalid method is provided.
* @param model - The model name.
* @param config - The structured output method options.
* @returns The structured output method.
*/
function getStructuredOutputMethod(model, method) {
	/**
	* If a method is provided, validate it.
	*/
	if (typeof method !== "undefined" && !SUPPORTED_METHODS.includes(method)) throw new Error(`Invalid method: ${method}. Supported methods are: ${SUPPORTED_METHODS.join(", ")}`);
	const hasSupportForJsonSchema = !model.startsWith("gpt-3") && !model.startsWith("gpt-4-") && model !== "gpt-4";
	/**
	* If the model supports JSON Schema, use it by default.
	*/
	if (hasSupportForJsonSchema && !method) return "jsonSchema";
	if (!hasSupportForJsonSchema && method === "jsonSchema") throw new Error(`JSON Schema is not supported for model "${model}". Please use a different method, e.g. "functionCalling" or "jsonMode".`);
	/**
	* If the model does not support JSON Schema, use function calling by default.
	*/
	return method ?? "functionCalling";
}
function makeParseableResponseFormat(response_format, parser) {
	const obj = { ...response_format };
	Object.defineProperties(obj, {
		$brand: {
			value: "auto-parseable-response-format",
			enumerable: false
		},
		$parseRaw: {
			value: parser,
			enumerable: false
		}
	});
	return obj;
}
function interopZodResponseFormat(zodSchema, name, props) {
	if ((0, __langchain_core_utils_types.isZodSchemaV3)(zodSchema)) return (0, openai_helpers_zod.zodResponseFormat)(zodSchema, name, props);
	if ((0, __langchain_core_utils_types.isZodSchemaV4)(zodSchema)) return makeParseableResponseFormat({
		type: "json_schema",
		json_schema: {
			...props,
			name,
			strict: true,
			schema: (0, zod_v4_core.toJSONSchema)(zodSchema, {
				cycles: "ref",
				reused: "ref",
				override(ctx) {
					ctx.jsonSchema.title = name;
				}
			})
		}
	}, (content) => (0, zod_v4_core.parse)(zodSchema, JSON.parse(content)));
	throw new Error("Unsupported schema response format");
}
/**
* Handle multi modal response content.
*
* @param content The content of the message.
* @param messages The messages of the response.
* @returns The new content of the message.
*/
function handleMultiModalOutput(content, messages) {
	/**
	* Handle OpenRouter image responses
	* @see https://openrouter.ai/docs/features/multimodal/image-generation#api-usage
	*/
	if (messages && typeof messages === "object" && "images" in messages && Array.isArray(messages.images)) {
		const images = messages.images.filter((image) => typeof image?.image_url?.url === "string").map((image) => ({
			type: "image",
			url: image.image_url.url
		}));
		return [{
			type: "text",
			text: content
		}, ...images];
	}
	return content;
}

//#endregion
exports.getStructuredOutputMethod = getStructuredOutputMethod;
exports.handleMultiModalOutput = handleMultiModalOutput;
exports.interopZodResponseFormat = interopZodResponseFormat;
//# sourceMappingURL=output.cjs.map