import { LLMChain, LLMChainInput } from "../llm_chain.js";
import { FunctionParameters } from "../../output_parsers/openai_functions.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { BaseFunctionCallOptions } from "@langchain/core/language_models/base";
import { AIMessageChunk } from "@langchain/core/messages";
import { InteropZodObject } from "@langchain/core/utils/types";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

//#region src/chains/openai_functions/tagging.d.ts

/**
 * Type representing the options for creating a tagging chain.
 */
type TaggingChainOptions = {
  prompt?: PromptTemplate;
} & Omit<LLMChainInput<object>, "prompt" | "llm">;
/**
 * Function that creates a tagging chain using the provided schema,
 * LLM, and options. It constructs the LLM with the necessary
 * functions, prompt, output parser, and tags.
 * @param schema The schema defining the structure of function parameters.
 * @param llm LLM to use in the chain. Must support function calling.
 * @param options Options for creating the tagging chain.
 * @returns A new instance of LLMChain configured for tagging.
 *
 * @deprecated
 * Switch to expression language: https://js.langchain.com/docs/expression_language/
 * Will be removed in 0.2.0
 */
declare function createTaggingChain(schema: FunctionParameters, llm: BaseChatModel<BaseFunctionCallOptions>, options?: TaggingChainOptions): LLMChain<object, BaseChatModel<BaseFunctionCallOptions, AIMessageChunk>>;
/**
 * Function that creates a tagging chain from a Zod schema. It converts
 * the Zod schema to a JSON schema using the zodToJsonSchema function and
 * then calls createTaggingChain with the converted schema.
 * @param schema The Zod schema which extracted data should match.
 * @param llm LLM to use in the chain. Must support function calling.
 * @param options Options for creating the tagging chain.
 * @returns A new instance of LLMChain configured for tagging.
 *
 * @deprecated
 * Switch to expression language: https://js.langchain.com/docs/expression_language/
 * Will be removed in 0.2.0
 */
declare function createTaggingChainFromZod(schema: InteropZodObject, llm: BaseChatModel<BaseFunctionCallOptions>, options?: TaggingChainOptions): LLMChain<object, BaseChatModel<BaseFunctionCallOptions, AIMessageChunk>>;
//#endregion
export { TaggingChainOptions, createTaggingChain, createTaggingChainFromZod };
//# sourceMappingURL=tagging.d.ts.map