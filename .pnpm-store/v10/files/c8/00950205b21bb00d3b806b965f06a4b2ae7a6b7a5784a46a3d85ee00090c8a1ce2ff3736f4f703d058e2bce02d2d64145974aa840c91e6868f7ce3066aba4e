import "./responses.js";
import { BaseMessage } from "@langchain/core/messages";
import { PregelOptions, Runtime, StreamMode } from "@langchain/langgraph";
import { InteropZodDefault, InteropZodOptional } from "@langchain/core/utils/types";
import { BaseCallbackConfig } from "@langchain/core/callbacks/manager";

//#region src/agents/runtime.d.ts
/**
 * Type for the agent's built-in state properties.
 */
type AgentBuiltInState = {
  /**
   * Array of messages representing the conversation history.
   *
   * This includes all messages exchanged during the agent's execution:
   * - Human messages: Input from the user
   * - AI messages: Responses from the language model
   * - Tool messages: Results from tool executions
   * - System messages: System-level instructions or information
   *
   * Messages are accumulated throughout the agent's lifecycle and can be
   * accessed or modified by middleware hooks during execution.
   */
  messages: BaseMessage[];
  /**
   * Structured response data returned by the agent when a `responseFormat` is configured.
   *
   * This property is only populated when you provide a `responseFormat` schema
   * (as Zod or JSON schema) to the agent configuration. The agent will format
   * its final output to match the specified schema and store it in this property.
   *
   * Note: The type is specified as `Record<string, unknown>` because TypeScript cannot
   * infer the actual response format type in contexts like middleware, where the agent's
   * generic type parameters are not accessible. You may need to cast this to your specific
   * response type when accessing it.
   */
  structuredResponse?: Record<string, unknown>;
};
/**
 * Type helper to check if TContext is an optional Zod schema
 */
type IsOptionalZodObject<T> = T extends InteropZodOptional<any> ? true : false;
type IsDefaultZodObject<T> = T extends InteropZodDefault<any> ? true : false;
type WithMaybeContext<TContext> = undefined extends TContext ? {
  readonly context?: TContext;
} : IsOptionalZodObject<TContext> extends true ? {
  readonly context?: TContext;
} : IsDefaultZodObject<TContext> extends true ? {
  readonly context?: TContext;
} : {
  readonly context: TContext;
};
/**
 * Runtime information available to middleware (readonly).
 */
type Runtime$1<TContext = unknown> = Partial<Omit<Runtime<TContext>, "context" | "configurable">> & WithMaybeContext<TContext> & {
  configurable?: {
    thread_id?: string;
    [key: string]: unknown;
  };
};
/**
 * Helper type to check if a type is optional (includes undefined)
 */
type IsOptionalType<T> = undefined extends T ? true : false;
/**
 * Extract non-undefined part of a union that includes undefined
 */
type ExtractNonUndefined<T> = T extends undefined ? never : T;
/**
 * Helper type to check if all properties of a type are optional
 */
type IsAllOptional<T> = undefined extends T ? true : IsOptionalType<T> extends true ? true : ExtractNonUndefined<T> extends Record<string, any> ? {} extends ExtractNonUndefined<T> ? true : false : IsOptionalType<T>;
/**
 * Pregel options that are propagated to the agent
 */
type CreateAgentPregelOptions = "configurable" | "durability" | "store" | "cache" | "signal" | "recursionLimit" | "maxConcurrency" | "timeout" | "callbacks" | "subgraphs";
/**
 * Pregel stream options that are propagated to the agent
 */
type CreateAgentPregelStreamOptions = "encoding" | "streamMode";
/**
 * Decide whether provided configuration requires a context
 */
type InvokeConfiguration<ContextSchema extends Record<string, any>> =
/**
 * If the context schema is a default object, `context` can be optional
 */
ContextSchema extends InteropZodDefault<any> ? BaseCallbackConfig & Partial<Pick<PregelOptions<any, any, any>, CreateAgentPregelOptions>> & {
  context?: Partial<ContextSchema>;
} : IsAllOptional<ContextSchema> extends true ? BaseCallbackConfig & Partial<Pick<PregelOptions<any, any, any>, CreateAgentPregelOptions>> & {
  context?: Partial<ContextSchema>;
} : BaseCallbackConfig & Partial<Pick<PregelOptions<any, any, any>, CreateAgentPregelOptions>> & WithMaybeContext<ContextSchema>;
type StreamConfiguration<ContextSchema extends Record<string, any>, TStreamMode extends StreamMode | StreamMode[] | undefined, TSubgraphs extends boolean, TEncoding extends "text/event-stream" | undefined> =
/**
 * If the context schema is a default object, `context` can be optional
 */
ContextSchema extends InteropZodDefault<any> ? Partial<Pick<PregelOptions<any, any, any, TStreamMode, TSubgraphs, TEncoding>, CreateAgentPregelOptions | CreateAgentPregelStreamOptions>> & {
  context?: Partial<ContextSchema>;
} : IsAllOptional<ContextSchema> extends true ? Partial<Pick<PregelOptions<any, any, any, TStreamMode, TSubgraphs, TEncoding>, CreateAgentPregelOptions | CreateAgentPregelStreamOptions>> & {
  context?: Partial<ContextSchema>;
} : Partial<Pick<PregelOptions<any, any, any, TStreamMode, TSubgraphs, TEncoding>, CreateAgentPregelOptions | CreateAgentPregelStreamOptions>> & WithMaybeContext<ContextSchema>;
//#endregion
export { AgentBuiltInState, InvokeConfiguration, Runtime$1 as Runtime, StreamConfiguration };
//# sourceMappingURL=runtime.d.ts.map