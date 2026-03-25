import { LLMChain } from "../llm_chain.cjs";
import { FunctionParameters } from "../../output_parsers/openai_functions.cjs";
import { AIMessageChunk } from "@langchain/core/messages";
import { InteropZodObject } from "@langchain/core/utils/types";
import { BaseFunctionCallOptions } from "@langchain/core/language_models/base";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

//#region src/chains/openai_functions/extraction.d.ts

/**
 * Function that creates an extraction chain using the provided JSON schema.
 * It sets up the necessary components, such as the prompt, output parser, and tags.
 * @param schema JSON schema of the function parameters.
 * @param llm Must be a ChatOpenAI or AnthropicFunctions model that supports function calling.
 * @returns A LLMChain instance configured to return data matching the schema.
 */
declare function createExtractionChain(schema: FunctionParameters, llm: BaseChatModel<BaseFunctionCallOptions>): LLMChain<object, BaseChatModel<BaseFunctionCallOptions, AIMessageChunk>>;
/**
 * Function that creates an extraction chain from a Zod schema. It
 * converts the Zod schema to a JSON schema using before creating
 * the extraction chain.
 * @param schema The Zod schema which extracted data should match
 * @param llm Must be a ChatOpenAI or AnthropicFunctions model that supports function calling.
 * @returns A LLMChain instance configured to return data matching the schema.
 */
declare function createExtractionChainFromZod(schema: InteropZodObject, llm: BaseChatModel<BaseFunctionCallOptions>): LLMChain<object, BaseChatModel<BaseFunctionCallOptions, AIMessageChunk>>;
//#endregion
export { createExtractionChain, createExtractionChainFromZod };
//# sourceMappingURL=extraction.d.cts.map