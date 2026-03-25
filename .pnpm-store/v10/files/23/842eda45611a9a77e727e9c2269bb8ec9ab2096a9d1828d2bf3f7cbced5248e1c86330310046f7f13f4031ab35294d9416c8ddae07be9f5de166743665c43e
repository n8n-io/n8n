const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../llm_chain.cjs');
const require_openai_functions = require('../../output_parsers/openai_functions.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));

//#region src/chains/openai_functions/extraction.ts
/**
* Function that returns an array of extraction functions. These functions
* are used to extract relevant information from a passage.
* @param schema The schema of the function parameters.
* @returns An array of extraction functions.
*/
function getExtractionFunctions(schema) {
	return [{
		name: "information_extraction",
		description: "Extracts the relevant information from the passage.",
		parameters: {
			type: "object",
			properties: { info: {
				type: "array",
				items: {
					type: schema.type,
					properties: schema.properties,
					required: schema.required
				}
			} },
			required: ["info"]
		}
	}];
}
const _EXTRACTION_TEMPLATE = `Extract and save the relevant entities mentioned in the following passage together with their properties.

Passage:
{input}
`;
/**
* Function that creates an extraction chain using the provided JSON schema.
* It sets up the necessary components, such as the prompt, output parser, and tags.
* @param schema JSON schema of the function parameters.
* @param llm Must be a ChatOpenAI or AnthropicFunctions model that supports function calling.
* @returns A LLMChain instance configured to return data matching the schema.
*/
function createExtractionChain(schema, llm) {
	const functions = getExtractionFunctions(schema);
	const prompt = __langchain_core_prompts.PromptTemplate.fromTemplate(_EXTRACTION_TEMPLATE);
	const outputParser = new require_openai_functions.JsonKeyOutputFunctionsParser({ attrName: "info" });
	return new require_llm_chain.LLMChain({
		llm,
		prompt,
		llmKwargs: { functions },
		outputParser,
		tags: ["openai_functions", "extraction"]
	});
}
/**
* Function that creates an extraction chain from a Zod schema. It
* converts the Zod schema to a JSON schema using before creating
* the extraction chain.
* @param schema The Zod schema which extracted data should match
* @param llm Must be a ChatOpenAI or AnthropicFunctions model that supports function calling.
* @returns A LLMChain instance configured to return data matching the schema.
*/
function createExtractionChainFromZod(schema, llm) {
	return createExtractionChain((0, __langchain_core_utils_json_schema.toJsonSchema)(schema), llm);
}

//#endregion
exports.createExtractionChain = createExtractionChain;
exports.createExtractionChainFromZod = createExtractionChainFromZod;
//# sourceMappingURL=extraction.cjs.map