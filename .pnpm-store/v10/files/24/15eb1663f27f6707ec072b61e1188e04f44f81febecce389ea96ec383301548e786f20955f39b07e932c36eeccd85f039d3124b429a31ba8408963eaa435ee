import { LLMResult } from "@langchain/core/outputs";
import { ChainValues } from "@langchain/core/utils/types";
import { Serialized } from "@langchain/core/load/serializable";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Ratelimit } from "@upstash/ratelimit";

//#region src/callbacks/handlers/upstash_ratelimit.d.ts

/**
 * Upstash Ratelimit Error
 *
 * Raised when the rate limit is reached in `UpstashRatelimitHandler`.
 */
declare class UpstashRatelimitError extends Error {
  type: "token" | "request";
  limit?: number;
  reset?: number;
  /**
   * @param message - Error message
   * @param type - The kind of limit which was reached. One of "token" or "request"
   * @param limit - The limit which was reached. Passed when type is request
   * @param reset - Unix timestamp in milliseconds when the limits are reset. Passed when type is request
   */
  constructor(message: string, type: "token" | "request", limit?: number, reset?: number);
}
interface UpstashRatelimitHandlerOptions {
  tokenRatelimit?: Ratelimit;
  requestRatelimit?: Ratelimit;
  includeOutputTokens?: boolean;
  llmOutputTokenUsageField?: string;
  llmOutputTotalTokenField?: string;
  llmOutputPromptTokenField?: string;
}
/**
 * Callback to handle rate limiting based on the number of requests
 * or the number of tokens in the input.
 *
 * It uses Upstash Ratelimit to track the rate limit which utilizes
 * Upstash Redis to track the state.
 *
 * Should not be passed to the chain when initializing the chain.
 * This is because the handler has a state which should be fresh
 * every time invoke is called. Instead, initialize and pass a handler
 * every time you invoke.
 */
declare class UpstashRatelimitHandler extends BaseCallbackHandler {
  name: string;
  raiseError: boolean;
  private _checked;
  identifier: string;
  tokenRatelimit?: Ratelimit;
  requestRatelimit?: Ratelimit;
  includeOutputTokens: boolean;
  llmOutputTokenUsageField: string;
  llmOutputTotalTokenField: string;
  llmOutputPromptTokenField: string;
  /**
   * @param identifier - The identifier to rate limit, like a user ID or an IP address
   * @param options - Ratelimit options
   */
  constructor(identifier: string, options: UpstashRatelimitHandlerOptions);
  /**
   * Run when the chain starts running.
   *
   * This method is called multiple times during a chain execution.
   * To ensure it only runs once, it checks and updates a `_checked` state.
   *
   * @param _chain - Serialized chain
   * @param _inputs - Chain input values
   * @throws UpstashRatelimitError - If the request rate limit is reached
   */
  handleChainStart(_chain: Serialized, _inputs: ChainValues): Promise<void>;
  /**
   * Run when the LLM starts running.
   *
   * @param _llm - Serialized LLM
   * @param _prompts - Prompts passed to the LLM
   * @throws UpstashRatelimitError - If the token rate limit is reached
   */
  handleLLMStart(_llm: Serialized, _prompts: string[], _runId: string, _parentRunId?: string, _extraParams?: Record<string, unknown>, _tags?: string[], _metadata?: Record<string, unknown>, _name?: string): Promise<void>;
  /**
   * Run when the LLM ends running.
   *
   * If the `includeOutputTokens` is set to true, the number of tokens
   * in the LLM completion are counted for rate limiting.
   *
   * @param output - LLM result output
   * @throws Error - If the LLM response does not include required token usage information
   */
  handleLLMEnd(output: LLMResult, _runId: string, _parentRunId?: string, _tags?: string[]): Promise<void>;
  /**
   * Creates a new UpstashRatelimitHandler object with the same
   * ratelimit configurations but with a new identifier if it's
   * provided.
   *
   * Also resets the state of the handler.
   *
   * @param identifier - Optional new identifier to use for the new handler instance
   * @returns New UpstashRatelimitHandler instance
   */
  reset(identifier?: string): UpstashRatelimitHandler;
}
//#endregion
export { UpstashRatelimitError, UpstashRatelimitHandler, UpstashRatelimitHandlerOptions };
//# sourceMappingURL=upstash_ratelimit.d.ts.map