import { BaseChain } from "../base.cjs";
import { LLMChainInput } from "../llm_chain.cjs";
import { SequentialChain } from "../sequential_chain.cjs";
import { OpenAPISpec } from "../../util/openapi.cjs";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseFunctionCallOptions } from "@langchain/core/language_models/base";
import { OpenAIClient } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonSchema7Type } from "@langchain/core/utils/json_schema";
import { OpenAPIV3_1 } from "openapi-types";

//#region src/chains/openai_functions/openapi.d.ts

/**
 * Type representing a function for executing OpenAPI requests.
 */
type OpenAPIExecutionMethod = (name: string, requestArgs: Record<string, any>, options?: {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}) => Promise<string>;
/**
 * Converts OpenAPI schemas to JSON schema format.
 * @param schema The OpenAPI schema to convert.
 * @param spec The OpenAPI specification that contains the schema.
 * @returns The JSON schema representation of the OpenAPI schema.
 */

/**
 * Converts an OpenAPI specification to OpenAI functions.
 * @param spec The OpenAPI specification to convert.
 * @returns An object containing the OpenAI functions derived from the OpenAPI specification and a default execution method.
 */
declare function convertOpenAPISpecToOpenAIFunctions(spec: OpenAPISpec): {
  openAIFunctions: OpenAIClient.Chat.ChatCompletionCreateParams.Function[];
  defaultExecutionMethod?: OpenAPIExecutionMethod;
};
/**
 * Type representing the options for creating an OpenAPI chain.
 */
type OpenAPIChainOptions = {
  llm?: BaseChatModel<BaseFunctionCallOptions>;
  prompt?: BasePromptTemplate;
  requestChain?: BaseChain;
  llmChainInputs?: LLMChainInput;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  verbose?: boolean;
};
/**
 * Create a chain for querying an API from a OpenAPI spec.
 * @param spec OpenAPISpec or url/file/text string corresponding to one.
 * @param options Custom options passed into the chain
 * @returns OpenAPIChain
 */
declare function createOpenAPIChain(spec: OpenAPIV3_1.Document | string, options?: OpenAPIChainOptions): Promise<SequentialChain>;
//#endregion
export { OpenAPIChainOptions, convertOpenAPISpecToOpenAIFunctions, createOpenAPIChain };
//# sourceMappingURL=openapi.d.cts.map