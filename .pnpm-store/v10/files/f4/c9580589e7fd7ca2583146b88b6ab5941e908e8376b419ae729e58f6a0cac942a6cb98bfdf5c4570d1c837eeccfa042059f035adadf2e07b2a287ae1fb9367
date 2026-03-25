import { State, ToolHooks } from "./hooks.js";
import { z } from "zod/v3";
import * as _langchain_core_messages0 from "@langchain/core/messages";
import { ContentBlock as ContentBlock$1, MessageStructure, ToolMessage as ToolMessage$1 } from "@langchain/core/messages";
import { Command as Command$1 } from "@langchain/langgraph";
import { RunnableConfig as RunnableConfig$1 } from "@langchain/core/runnables";
import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";

//#region src/types.d.ts

declare const outputHandlingSchema: z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
  audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
}, "strip", z.ZodTypeAny, {
  audio?: "artifact" | "content" | undefined;
  image?: "artifact" | "content" | undefined;
  resource?: "artifact" | "content" | undefined;
  resource_link?: "artifact" | "content" | undefined;
  text?: "artifact" | "content" | undefined;
}, {
  audio?: "artifact" | "content" | undefined;
  image?: "artifact" | "content" | undefined;
  resource?: "artifact" | "content" | undefined;
  resource_link?: "artifact" | "content" | undefined;
  text?: "artifact" | "content" | undefined;
}>]>;
/**
 * Defines where to place each tool output type in the LangChain ToolMessage.
 *
 * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
 * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
 * to `content` or `artifact`.
 *
 * @default {
 *   "text": "content",
 *   "image": "content",
 *   "audio": "content",
 *   "resource": "artifact"
 * }
 *
 * Items in the `content` field will be used as input context for the LLM, while the artifact field is
 * used for capturing tool output that won't be shown to the model, to be used in some later workflow
 * step.
 *
 * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
 * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
 * the output in a code execution environment. In this case, you would set the output handling for the
 * `resource` type to `artifact` (its default value), and then upon initialization of your code
 * execution environment, you would look through your message history for `ToolMessage`s with the
 * `artifact` field set to `resource`, and use the `content` field during initialization of the
 * environment.
 */
type OutputHandling = z.output<typeof outputHandlingSchema>;
/**
 * Stdio transport connection
 */
declare const stdioConnectionSchema: z.ZodIntersection<z.ZodObject<{
  /**
   * Optional transport type, inferred from the structure of the config if not provided. Included
   * for compatibility with common MCP client config file formats.
   */
  transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
  /**
   * Optional transport type, inferred from the structure of the config if not provided. Included
   * for compatibility with common MCP client config file formats.
   */
  type: z.ZodOptional<z.ZodLiteral<"stdio">>;
  /**
   * The executable to run the server (e.g. `node`, `npx`, etc)
   */
  command: z.ZodString;
  /**
   * Array of command line arguments to pass to the executable
   */
  args: z.ZodArray<z.ZodString, "many">;
  /**
   * Environment variables to set when spawning the process.
   */
  env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
  /**
   * The encoding to use when reading from the process
   */
  encoding: z.ZodOptional<z.ZodString>;
  /**
   * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
   *
   * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
   *
   * @default "inherit"
   */
  stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
  /**
   * The working directory to use when spawning the process.
   */
  cwd: z.ZodOptional<z.ZodString>;
  /**
   * Additional restart settings
   */
  restart: z.ZodOptional<z.ZodObject<{
    /**
     * Whether to automatically restart the process if it exits
     */
    enabled: z.ZodOptional<z.ZodBoolean>;
    /**
     * Maximum number of restart attempts
     */
    maxAttempts: z.ZodOptional<z.ZodNumber>;
    /**
     * Delay in milliseconds between restart attempts
     */
    delayMs: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }>>;
}, "strip", z.ZodTypeAny, {
  transport?: "stdio" | undefined;
  type?: "stdio" | undefined;
  command: string;
  args: string[];
  env?: Record<string, string> | undefined;
  encoding?: string | undefined;
  stderr: "ignore" | "inherit" | "overlapped" | "pipe";
  cwd?: string | undefined;
  restart?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
}, {
  transport?: "stdio" | undefined;
  type?: "stdio" | undefined;
  command: string;
  args: string[];
  env?: Record<string, string> | undefined;
  encoding?: string | undefined;
  stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
  cwd?: string | undefined;
  restart?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
}>, z.ZodObject<{
  /**
   * Defines where to place each tool output type in the LangChain ToolMessage.
   *
   * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
   * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
   * to `content` or `artifact`.
   *
   * @default {
   *   "text": "content",
   *   "image": "content",
   *   "audio": "content",
   *   "resource": "artifact"
   * }
   *
   * Items in the `content` field will be used as input context for the LLM, while the artifact field is
   * used for capturing tool output that won't be shown to the model, to be used in some later workflow
   * step.
   *
   * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
   * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
   * the output in a code execution environment. In this case, you would set the output handling for the
   * `resource` type to `artifact` (its default value), and then upon initialization of your code
   * execution environment, you would look through your message history for `ToolMessage`s with the
   * `artifact` field set to `resource`, and use the `content` field during initialization of the
   * environment.
   */
  outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
    audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  }, "strip", z.ZodTypeAny, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }>]>>;
  /**
   * Default timeout in milliseconds for tool execution. Must be greater than 0.
   * If not specified, tools will use their own configured timeout values.
   */
  defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}>>;
/**
 * Streamable HTTP transport connection
 */
declare const streamableHttpConnectionSchema: z.ZodIntersection<z.ZodObject<{
  /**
   * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
   * to connect using streamable HTTP.
   */
  transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
  /**
   * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
   * to connect using streamable HTTP.
   */
  type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
  /**
   * The URL to connect to
   */
  url: z.ZodString;
  /**
   * Additional headers to send with the request, useful for authentication
   */
  headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
  /**
   * OAuth client provider for automatic authentication handling.
   * When provided, the transport will automatically handle token refresh,
   * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
   * This is the recommended approach for authentication instead of manual headers.
   */
  authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
  /**
   * Additional reconnection settings.
   */
  reconnect: z.ZodOptional<z.ZodObject<{
    /**
     * Whether to automatically reconnect if the connection is lost
     */
    enabled: z.ZodOptional<z.ZodBoolean>;
    /**
     * Maximum number of reconnection attempts
     */
    maxAttempts: z.ZodOptional<z.ZodNumber>;
    /**
     * Delay in milliseconds between reconnection attempts
     */
    delayMs: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }>>;
  /**
   * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
   *
   * @default true
   */
  automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
  transport?: "http" | "sse" | undefined;
  type?: "http" | "sse" | undefined;
  url: string;
  headers?: Record<string, string> | undefined;
  authProvider?: OAuthClientProvider | undefined;
  reconnect?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
  automaticSSEFallback: boolean;
}, {
  transport?: "http" | "sse" | undefined;
  type?: "http" | "sse" | undefined;
  url: string;
  headers?: Record<string, string> | undefined;
  authProvider?: OAuthClientProvider | undefined;
  reconnect?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
  automaticSSEFallback?: boolean | undefined;
}>, z.ZodObject<{
  /**
   * Defines where to place each tool output type in the LangChain ToolMessage.
   *
   * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
   * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
   * to `content` or `artifact`.
   *
   * @default {
   *   "text": "content",
   *   "image": "content",
   *   "audio": "content",
   *   "resource": "artifact"
   * }
   *
   * Items in the `content` field will be used as input context for the LLM, while the artifact field is
   * used for capturing tool output that won't be shown to the model, to be used in some later workflow
   * step.
   *
   * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
   * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
   * the output in a code execution environment. In this case, you would set the output handling for the
   * `resource` type to `artifact` (its default value), and then upon initialization of your code
   * execution environment, you would look through your message history for `ToolMessage`s with the
   * `artifact` field set to `resource`, and use the `content` field during initialization of the
   * environment.
   */
  outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
    audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  }, "strip", z.ZodTypeAny, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }>]>>;
  /**
   * Default timeout in milliseconds for tool execution. Must be greater than 0.
   * If not specified, tools will use their own configured timeout values.
   */
  defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}>>;
/**
 * Create combined schema for all transport connection types
 */
declare const connectionSchema: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
  /**
   * Optional transport type, inferred from the structure of the config if not provided. Included
   * for compatibility with common MCP client config file formats.
   */
  transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
  /**
   * Optional transport type, inferred from the structure of the config if not provided. Included
   * for compatibility with common MCP client config file formats.
   */
  type: z.ZodOptional<z.ZodLiteral<"stdio">>;
  /**
   * The executable to run the server (e.g. `node`, `npx`, etc)
   */
  command: z.ZodString;
  /**
   * Array of command line arguments to pass to the executable
   */
  args: z.ZodArray<z.ZodString, "many">;
  /**
   * Environment variables to set when spawning the process.
   */
  env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
  /**
   * The encoding to use when reading from the process
   */
  encoding: z.ZodOptional<z.ZodString>;
  /**
   * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
   *
   * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
   *
   * @default "inherit"
   */
  stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
  /**
   * The working directory to use when spawning the process.
   */
  cwd: z.ZodOptional<z.ZodString>;
  /**
   * Additional restart settings
   */
  restart: z.ZodOptional<z.ZodObject<{
    /**
     * Whether to automatically restart the process if it exits
     */
    enabled: z.ZodOptional<z.ZodBoolean>;
    /**
     * Maximum number of restart attempts
     */
    maxAttempts: z.ZodOptional<z.ZodNumber>;
    /**
     * Delay in milliseconds between restart attempts
     */
    delayMs: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }>>;
}, "strip", z.ZodTypeAny, {
  transport?: "stdio" | undefined;
  type?: "stdio" | undefined;
  command: string;
  args: string[];
  env?: Record<string, string> | undefined;
  encoding?: string | undefined;
  stderr: "ignore" | "inherit" | "overlapped" | "pipe";
  cwd?: string | undefined;
  restart?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
}, {
  transport?: "stdio" | undefined;
  type?: "stdio" | undefined;
  command: string;
  args: string[];
  env?: Record<string, string> | undefined;
  encoding?: string | undefined;
  stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
  cwd?: string | undefined;
  restart?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
}>, z.ZodObject<{
  /**
   * Defines where to place each tool output type in the LangChain ToolMessage.
   *
   * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
   * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
   * to `content` or `artifact`.
   *
   * @default {
   *   "text": "content",
   *   "image": "content",
   *   "audio": "content",
   *   "resource": "artifact"
   * }
   *
   * Items in the `content` field will be used as input context for the LLM, while the artifact field is
   * used for capturing tool output that won't be shown to the model, to be used in some later workflow
   * step.
   *
   * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
   * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
   * the output in a code execution environment. In this case, you would set the output handling for the
   * `resource` type to `artifact` (its default value), and then upon initialization of your code
   * execution environment, you would look through your message history for `ToolMessage`s with the
   * `artifact` field set to `resource`, and use the `content` field during initialization of the
   * environment.
   */
  outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
    audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  }, "strip", z.ZodTypeAny, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }>]>>;
  /**
   * Default timeout in milliseconds for tool execution. Must be greater than 0.
   * If not specified, tools will use their own configured timeout values.
   */
  defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}>>, z.ZodIntersection<z.ZodObject<{
  /**
   * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
   * to connect using streamable HTTP.
   */
  transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
  /**
   * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
   * to connect using streamable HTTP.
   */
  type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
  /**
   * The URL to connect to
   */
  url: z.ZodString;
  /**
   * Additional headers to send with the request, useful for authentication
   */
  headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
  /**
   * OAuth client provider for automatic authentication handling.
   * When provided, the transport will automatically handle token refresh,
   * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
   * This is the recommended approach for authentication instead of manual headers.
   */
  authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
  /**
   * Additional reconnection settings.
   */
  reconnect: z.ZodOptional<z.ZodObject<{
    /**
     * Whether to automatically reconnect if the connection is lost
     */
    enabled: z.ZodOptional<z.ZodBoolean>;
    /**
     * Maximum number of reconnection attempts
     */
    maxAttempts: z.ZodOptional<z.ZodNumber>;
    /**
     * Delay in milliseconds between reconnection attempts
     */
    delayMs: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  }>>;
  /**
   * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
   *
   * @default true
   */
  automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
  transport?: "http" | "sse" | undefined;
  type?: "http" | "sse" | undefined;
  url: string;
  headers?: Record<string, string> | undefined;
  authProvider?: OAuthClientProvider | undefined;
  reconnect?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
  automaticSSEFallback: boolean;
}, {
  transport?: "http" | "sse" | undefined;
  type?: "http" | "sse" | undefined;
  url: string;
  headers?: Record<string, string> | undefined;
  authProvider?: OAuthClientProvider | undefined;
  reconnect?: {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    delayMs?: number | undefined;
  } | undefined;
  automaticSSEFallback?: boolean | undefined;
}>, z.ZodObject<{
  /**
   * Defines where to place each tool output type in the LangChain ToolMessage.
   *
   * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
   * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
   * to `content` or `artifact`.
   *
   * @default {
   *   "text": "content",
   *   "image": "content",
   *   "audio": "content",
   *   "resource": "artifact"
   * }
   *
   * Items in the `content` field will be used as input context for the LLM, while the artifact field is
   * used for capturing tool output that won't be shown to the model, to be used in some later workflow
   * step.
   *
   * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
   * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
   * the output in a code execution environment. In this case, you would set the output handling for the
   * `resource` type to `artifact` (its default value), and then upon initialization of your code
   * execution environment, you would look through your message history for `ToolMessage`s with the
   * `artifact` field set to `resource`, and use the `content` field during initialization of the
   * environment.
   */
  outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
    audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  }, "strip", z.ZodTypeAny, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }>]>>;
  /**
   * Default timeout in milliseconds for tool execution. Must be greater than 0.
   * If not specified, tools will use their own configured timeout values.
   */
  defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}>>]>;
declare const notifications: z.ZodObject<{
  /**
   * Called when a log message is received.
   *
   * @param logMessage - The log message
   * @param logMessage.message - The log message
   * @param logMessage.level - The log level
   * @param logMessage.timestamp - The log timestamp
   * @param source - The source of the log message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.option - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`
   * @returns The log message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onLog: (logMessage) => {
   *     console.log(logMessage);
   *   },
   * });
   * ```
   */
  onMessage: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The severity of this log message.
     */
    level: z.ZodEnum<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]>;
    /**
     * An optional name of the logger issuing this message.
     */
    logger: z.ZodOptional<z.ZodString>;
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: z.ZodUnknown;
  }, "strip", z.ZodTypeAny, {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }, {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }>, z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when a progress message is received.
   *
   * @param progress - The progress message
   * @param progress.message - The progress message
   * @param progress.percentage - The progress percentage
   * @param progress.timestamp - The progress timestamp
   * @param source - The source of the progress message
   * @param source.type - The type of the source, e.g. "tool"
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.name - The name of the source, e.g. "my-name"
   * @param source.args - The arguments of the source, e.g. { a: 1, b: 2 }
   * @returns The progress message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onProgress: (progress, source) => {
   *     if (source.type === "tool") {
   *     console.log(progress);
   *   },
   * });
   * ```
   */
  onProgress: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    progress: z.ZodNumber;
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: z.ZodOptional<z.ZodNumber>;
    /**
     * An optional message describing the current progress.
     */
    message: z.ZodOptional<z.ZodString>;
  }, "strip", z.ZodTypeAny, {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }, {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }>, z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"tool">;
    name: z.ZodString;
    args: z.ZodUnknown;
    server: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  }, {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  }>, z.ZodObject<{
    type: z.ZodLiteral<"unknown">;
  }, "strip", z.ZodTypeAny, {
    type: "unknown";
  }, {
    type: "unknown";
  }>]>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  onCancelled: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The ID of the request to cancel.
     *
     * This MUST correspond to the ID of a request previously issued in the same direction.
     */
    requestId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    /**
     * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
     */
    reason: z.ZodOptional<z.ZodString>;
  }, "strip", z.ZodTypeAny, {
    requestId: string | number;
    reason?: string | undefined;
  }, {
    requestId: string | number;
    reason?: string | undefined;
  }>, z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the server is initialized.
   *
   * @param source - The source of the initialized message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The initialized message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onInitialized: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onInitialized: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the prompts list is changed.
   *
   * @param source - The source of the prompts list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The prompts list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onPromptsListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onPromptsListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the resources list is changed.
   *
   * @param source - The source of the resources list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The resources list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onResourcesListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onResourcesListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the resources are updated.
   *
   * @param updatedResource - The updated resource
   * @param updatedResource.uri - The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   * @param source - The source of the resources updated message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The resources updated message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onResourcesUpdated: (updatedResource, source) => {
   *     console.log(`Resource ${updatedResource.uri} updated`);
   *   },
   * });
   * ```
   */
  onResourcesUpdated: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    uri: string;
  }, {
    uri: string;
  }>, z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the roots list is changed.
   *
   * @param source - The source of the roots list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The roots list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onRootsListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onRootsListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the tools list is changed.
   *
   * @param source - The source of the tools list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The tools list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onToolsListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onToolsListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
}, "strip", z.ZodTypeAny, {
  onMessage?: ((args_0: {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onProgress?: ((args_0: {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }, args_1: {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  } | {
    type: "unknown";
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onCancelled?: ((args_0: {
    requestId: string | number;
    reason?: string | undefined;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onInitialized?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onPromptsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesUpdated?: ((args_0: {
    uri: string;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onRootsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onToolsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
}, {
  onMessage?: ((args_0: {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onProgress?: ((args_0: {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }, args_1: {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  } | {
    type: "unknown";
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onCancelled?: ((args_0: {
    requestId: string | number;
    reason?: string | undefined;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onInitialized?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onPromptsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesUpdated?: ((args_0: {
    uri: string;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onRootsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onToolsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
}>;
type Notifications = z.output<typeof notifications>;
/**
 * {@link MultiServerMCPClient} configuration
 */
declare const clientConfigSchema: z.ZodIntersection<z.ZodIntersection<z.ZodIntersection<z.ZodObject<{
  /**
   * A map of server names to their configuration
   */
  mcpServers: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
    /**
     * Optional transport type, inferred from the structure of the config if not provided. Included
     * for compatibility with common MCP client config file formats.
     */
    transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
    /**
     * Optional transport type, inferred from the structure of the config if not provided. Included
     * for compatibility with common MCP client config file formats.
     */
    type: z.ZodOptional<z.ZodLiteral<"stdio">>;
    /**
     * The executable to run the server (e.g. `node`, `npx`, etc)
     */
    command: z.ZodString;
    /**
     * Array of command line arguments to pass to the executable
     */
    args: z.ZodArray<z.ZodString, "many">;
    /**
     * Environment variables to set when spawning the process.
     */
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * The encoding to use when reading from the process
     */
    encoding: z.ZodOptional<z.ZodString>;
    /**
     * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
     *
     * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
     *
     * @default "inherit"
     */
    stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
    /**
     * The working directory to use when spawning the process.
     */
    cwd: z.ZodOptional<z.ZodString>;
    /**
     * Additional restart settings
     */
    restart: z.ZodOptional<z.ZodObject<{
      /**
       * Whether to automatically restart the process if it exits
       */
      enabled: z.ZodOptional<z.ZodBoolean>;
      /**
       * Maximum number of restart attempts
       */
      maxAttempts: z.ZodOptional<z.ZodNumber>;
      /**
       * Delay in milliseconds between restart attempts
       */
      delayMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    }, {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    }>>;
  }, "strip", z.ZodTypeAny, {
    transport?: "stdio" | undefined;
    type?: "stdio" | undefined;
    command: string;
    args: string[];
    env?: Record<string, string> | undefined;
    encoding?: string | undefined;
    stderr: "ignore" | "inherit" | "overlapped" | "pipe";
    cwd?: string | undefined;
    restart?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
  }, {
    transport?: "stdio" | undefined;
    type?: "stdio" | undefined;
    command: string;
    args: string[];
    env?: Record<string, string> | undefined;
    encoding?: string | undefined;
    stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
    cwd?: string | undefined;
    restart?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
  }>, z.ZodObject<{
    /**
     * Defines where to place each tool output type in the LangChain ToolMessage.
     *
     * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
     * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
     * to `content` or `artifact`.
     *
     * @default {
     *   "text": "content",
     *   "image": "content",
     *   "audio": "content",
     *   "resource": "artifact"
     * }
     *
     * Items in the `content` field will be used as input context for the LLM, while the artifact field is
     * used for capturing tool output that won't be shown to the model, to be used in some later workflow
     * step.
     *
     * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
     * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
     * the output in a code execution environment. In this case, you would set the output handling for the
     * `resource` type to `artifact` (its default value), and then upon initialization of your code
     * execution environment, you would look through your message history for `ToolMessage`s with the
     * `artifact` field set to `resource`, and use the `content` field during initialization of the
     * environment.
     */
    outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
      audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    }, "strip", z.ZodTypeAny, {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    }, {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    }>]>>;
    /**
     * Default timeout in milliseconds for tool execution. Must be greater than 0.
     * If not specified, tools will use their own configured timeout values.
     */
    defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  }, {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  }>>, z.ZodIntersection<z.ZodObject<{
    /**
     * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
     * to connect using streamable HTTP.
     */
    transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
    /**
     * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
     * to connect using streamable HTTP.
     */
    type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
    /**
     * The URL to connect to
     */
    url: z.ZodString;
    /**
     * Additional headers to send with the request, useful for authentication
     */
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /**
     * OAuth client provider for automatic authentication handling.
     * When provided, the transport will automatically handle token refresh,
     * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
     * This is the recommended approach for authentication instead of manual headers.
     */
    authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
    /**
     * Additional reconnection settings.
     */
    reconnect: z.ZodOptional<z.ZodObject<{
      /**
       * Whether to automatically reconnect if the connection is lost
       */
      enabled: z.ZodOptional<z.ZodBoolean>;
      /**
       * Maximum number of reconnection attempts
       */
      maxAttempts: z.ZodOptional<z.ZodNumber>;
      /**
       * Delay in milliseconds between reconnection attempts
       */
      delayMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    }, {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    }>>;
    /**
     * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
     *
     * @default true
     */
    automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
  }, "strip", z.ZodTypeAny, {
    transport?: "http" | "sse" | undefined;
    type?: "http" | "sse" | undefined;
    url: string;
    headers?: Record<string, string> | undefined;
    authProvider?: OAuthClientProvider | undefined;
    reconnect?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
    automaticSSEFallback: boolean;
  }, {
    transport?: "http" | "sse" | undefined;
    type?: "http" | "sse" | undefined;
    url: string;
    headers?: Record<string, string> | undefined;
    authProvider?: OAuthClientProvider | undefined;
    reconnect?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
    automaticSSEFallback?: boolean | undefined;
  }>, z.ZodObject<{
    /**
     * Defines where to place each tool output type in the LangChain ToolMessage.
     *
     * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
     * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
     * to `content` or `artifact`.
     *
     * @default {
     *   "text": "content",
     *   "image": "content",
     *   "audio": "content",
     *   "resource": "artifact"
     * }
     *
     * Items in the `content` field will be used as input context for the LLM, while the artifact field is
     * used for capturing tool output that won't be shown to the model, to be used in some later workflow
     * step.
     *
     * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
     * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
     * the output in a code execution environment. In this case, you would set the output handling for the
     * `resource` type to `artifact` (its default value), and then upon initialization of your code
     * execution environment, you would look through your message history for `ToolMessage`s with the
     * `artifact` field set to `resource`, and use the `content` field during initialization of the
     * environment.
     */
    outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
      audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    }, "strip", z.ZodTypeAny, {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    }, {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    }>]>>;
    /**
     * Default timeout in milliseconds for tool execution. Must be greater than 0.
     * If not specified, tools will use their own configured timeout values.
     */
    defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
  }, "strip", z.ZodTypeAny, {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  }, {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  }>>]>>;
  /**
   * Whether to throw an error if a tool fails to load
   *
   * @default true
   */
  throwOnLoadError: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
  /**
   * Whether to prefix tool names with the server name. Prefixes are separated by double
   * underscores (example: `calculator_server_1__add`).
   *
   * @default true
   */
  prefixToolNameWithServerName: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
  /**
   * An additional prefix to add to the tool name Prefixes are separated by double underscores
   * (example: `mcp__add`).
   *
   * @default "mcp"
   */
  additionalToolNamePrefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
  /**
   * If true, the tool will use LangChain's standard multimodal content blocks for tools that output
   * image or audio content, and embedded resources will be converted to `StandardFileBlock` objects.
   * When `false`, all artifacts are left in their MCP format, but embedded resources will be
   * converted to `StandardFileBlock` objects if {@link ClientConfig#outputHandling} causes embedded resources to
   * be treated as content, as otherwise ChatModel providers will not be able to interpret them.
   *
   * @default false
   */
  useStandardContentBlocks: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
  /**
   * Behavior when a server fails to connect.
   * - "throw": Throw an error immediately if any server fails to connect (default)
   * - "ignore": Skip failed servers and continue with successfully connected ones
   * - Function: Custom error handler. If the function throws, the error is bubbled through.
   *   If it returns normally, the server is treated as ignored and skipped.
   *
   * @default "throw"
   */
  onConnectionError: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodEnum<["throw", "ignore"]>, z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    serverName: z.ZodString;
    error: z.ZodUnknown;
  }, "strip", z.ZodTypeAny, {
    serverName: string;
    error?: unknown;
  }, {
    serverName: string;
    error?: unknown;
  }>], z.ZodUnknown>, z.ZodVoid>]>>>;
}, "strip", z.ZodTypeAny, {
  mcpServers: Record<string, ({
    transport?: "stdio" | undefined;
    type?: "stdio" | undefined;
    command: string;
    args: string[];
    env?: Record<string, string> | undefined;
    encoding?: string | undefined;
    stderr: "ignore" | "inherit" | "overlapped" | "pipe";
    cwd?: string | undefined;
    restart?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
  } & {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  }) | ({
    transport?: "http" | "sse" | undefined;
    type?: "http" | "sse" | undefined;
    url: string;
    headers?: Record<string, string> | undefined;
    authProvider?: OAuthClientProvider | undefined;
    reconnect?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
    automaticSSEFallback: boolean;
  } & {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  })>;
  throwOnLoadError: boolean;
  prefixToolNameWithServerName: boolean;
  additionalToolNamePrefix: string;
  useStandardContentBlocks: boolean;
  onConnectionError: "ignore" | "throw" | ((args_0: {
    serverName: string;
    error?: unknown;
  }, ...args: unknown[]) => void);
}, {
  mcpServers: Record<string, ({
    transport?: "stdio" | undefined;
    type?: "stdio" | undefined;
    command: string;
    args: string[];
    env?: Record<string, string> | undefined;
    encoding?: string | undefined;
    stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
    cwd?: string | undefined;
    restart?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
  } & {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  }) | ({
    transport?: "http" | "sse" | undefined;
    type?: "http" | "sse" | undefined;
    url: string;
    headers?: Record<string, string> | undefined;
    authProvider?: OAuthClientProvider | undefined;
    reconnect?: {
      enabled?: boolean | undefined;
      maxAttempts?: number | undefined;
      delayMs?: number | undefined;
    } | undefined;
    automaticSSEFallback?: boolean | undefined;
  } & {
    outputHandling?: "artifact" | "content" | {
      audio?: "artifact" | "content" | undefined;
      image?: "artifact" | "content" | undefined;
      resource?: "artifact" | "content" | undefined;
      resource_link?: "artifact" | "content" | undefined;
      text?: "artifact" | "content" | undefined;
    } | undefined;
    defaultToolTimeout?: number | undefined;
  })>;
  throwOnLoadError?: boolean | undefined;
  prefixToolNameWithServerName?: boolean | undefined;
  additionalToolNamePrefix?: string | undefined;
  useStandardContentBlocks?: boolean | undefined;
  onConnectionError?: "ignore" | "throw" | ((args_0: {
    serverName: string;
    error?: unknown;
  }, ...args: unknown[]) => void) | undefined;
}>, z.ZodObject<{
  /**
   * Defines where to place each tool output type in the LangChain ToolMessage.
   *
   * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
   * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
   * to `content` or `artifact`.
   *
   * @default {
   *   "text": "content",
   *   "image": "content",
   *   "audio": "content",
   *   "resource": "artifact"
   * }
   *
   * Items in the `content` field will be used as input context for the LLM, while the artifact field is
   * used for capturing tool output that won't be shown to the model, to be used in some later workflow
   * step.
   *
   * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
   * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
   * the output in a code execution environment. In this case, you would set the output handling for the
   * `resource` type to `artifact` (its default value), and then upon initialization of your code
   * execution environment, you would look through your message history for `ToolMessage`s with the
   * `artifact` field set to `resource`, and use the `content` field during initialization of the
   * environment.
   */
  outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
    audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
    text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
  }, "strip", z.ZodTypeAny, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }, {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  }>]>>;
  /**
   * Default timeout in milliseconds for tool execution. Must be greater than 0.
   * If not specified, tools will use their own configured timeout values.
   */
  defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}, {
  outputHandling?: "artifact" | "content" | {
    audio?: "artifact" | "content" | undefined;
    image?: "artifact" | "content" | undefined;
    resource?: "artifact" | "content" | undefined;
    resource_link?: "artifact" | "content" | undefined;
    text?: "artifact" | "content" | undefined;
  } | undefined;
  defaultToolTimeout?: number | undefined;
}>>, z.ZodObject<{
  beforeToolCall: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    serverName: z.ZodString;
    name: z.ZodString;
    args: z.ZodUnknown;
  }, "strip", z.ZodTypeAny, {
    serverName: string;
    name: string;
    args?: unknown;
  }, {
    serverName: string;
    name: string;
    args?: unknown;
  }>, z.ZodType<State, z.ZodTypeDef, State>, z.ZodType<RunnableConfig$1<Record<string, any>>, z.ZodTypeDef, RunnableConfig$1<Record<string, any>>>], z.ZodUnknown>, z.ZodUnion<[z.ZodPromise<z.ZodObject<{
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    args: z.ZodOptional<z.ZodUnknown>;
  }, "strip", z.ZodTypeAny, {
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }, {
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }>>, z.ZodObject<{
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    args: z.ZodOptional<z.ZodUnknown>;
  }, "strip", z.ZodTypeAny, {
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }, {
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }>, z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  afterToolCall: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    serverName: z.ZodString;
    name: z.ZodString;
    args: z.ZodUnknown;
    result: z.ZodTuple<[z.ZodType<string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], z.ZodTypeDef, string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[]>, z.ZodArray<z.ZodUnion<[z.ZodType<{
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    }, z.ZodTypeDef, {
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    }>, z.ZodType<ContentBlock$1.Multimodal.Standard, z.ZodTypeDef, ContentBlock$1.Multimodal.Standard>]>, "many">], null>;
  }, "strip", z.ZodTypeAny, {
    serverName: string;
    name: string;
    args?: unknown;
    result: [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }, {
    serverName: string;
    name: string;
    args?: unknown;
    result: [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }>, z.ZodType<State, z.ZodTypeDef, State>, z.ZodType<RunnableConfig$1<Record<string, any>>, z.ZodTypeDef, RunnableConfig$1<Record<string, any>>>], z.ZodUnknown>, z.ZodUnion<[z.ZodPromise<z.ZodObject<Pick<{
    serverName: z.ZodString;
    name: z.ZodString;
    args: z.ZodUnknown;
    result: z.ZodUnion<[z.ZodString, z.ZodType<Command$1<unknown, Record<string, unknown>, string>, z.ZodTypeDef, Command$1<unknown, Record<string, unknown>, string>>, z.ZodTuple<[z.ZodType<string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], z.ZodTypeDef, string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[]>, z.ZodArray<z.ZodUnion<[z.ZodType<{
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    }, z.ZodTypeDef, {
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    }>, z.ZodType<ContentBlock$1.Multimodal.Standard, z.ZodTypeDef, ContentBlock$1.Multimodal.Standard>]>, "many">], null>, z.ZodType<ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>>, z.ZodTypeDef, ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>>>]>;
  }, "result">, "strip", z.ZodTypeAny, {
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }, {
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }>>, z.ZodObject<Pick<{
    serverName: z.ZodString;
    name: z.ZodString;
    args: z.ZodUnknown;
    result: z.ZodUnion<[z.ZodString, z.ZodType<Command$1<unknown, Record<string, unknown>, string>, z.ZodTypeDef, Command$1<unknown, Record<string, unknown>, string>>, z.ZodTuple<[z.ZodType<string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], z.ZodTypeDef, string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[]>, z.ZodArray<z.ZodUnion<[z.ZodType<{
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    }, z.ZodTypeDef, {
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    }>, z.ZodType<ContentBlock$1.Multimodal.Standard, z.ZodTypeDef, ContentBlock$1.Multimodal.Standard>]>, "many">], null>, z.ZodType<ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>>, z.ZodTypeDef, ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>>>]>;
  }, "result">, "strip", z.ZodTypeAny, {
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }, {
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }>, z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
}, "strip", z.ZodTypeAny, {
  beforeToolCall?: ((args_0: {
    serverName: string;
    name: string;
    args?: unknown;
  }, args_1: State, args_2: RunnableConfig$1<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }> | {
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }) | undefined;
  afterToolCall?: ((args_0: {
    serverName: string;
    name: string;
    args?: unknown;
    result: [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }, args_1: State, args_2: RunnableConfig$1<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }> | {
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }) | undefined;
}, {
  beforeToolCall?: ((args_0: {
    serverName: string;
    name: string;
    args?: unknown;
  }, args_1: State, args_2: RunnableConfig$1<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }> | {
    headers?: Record<string, string> | undefined;
    args?: unknown;
  }) | undefined;
  afterToolCall?: ((args_0: {
    serverName: string;
    name: string;
    args?: unknown;
    result: [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }, args_1: State, args_2: RunnableConfig$1<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }> | {
    result: string | Command$1<unknown, Record<string, unknown>, string> | ToolMessage$1<MessageStructure<_langchain_core_messages0.MessageToolSet>> | [string | (ContentBlock$1 | ContentBlock$1.Data.DataContentBlock)[], ({
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        text: string;
      } | {
        uri: string;
        mimeType?: string | undefined;
        _meta?: {
          [x: string]: unknown;
        } | undefined;
        blob: string;
      };
      annotations?: {
        audience?: ("assistant" | "user")[] | undefined;
        priority?: number | undefined;
        lastModified?: string | undefined;
      } | undefined;
      _meta?: {
        [x: string]: unknown;
      } | undefined;
    } | ContentBlock$1.Multimodal.Standard)[]];
  }) | undefined;
}>>, z.ZodObject<{
  /**
   * Called when a log message is received.
   *
   * @param logMessage - The log message
   * @param logMessage.message - The log message
   * @param logMessage.level - The log level
   * @param logMessage.timestamp - The log timestamp
   * @param source - The source of the log message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.option - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`
   * @returns The log message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onLog: (logMessage) => {
   *     console.log(logMessage);
   *   },
   * });
   * ```
   */
  onMessage: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The severity of this log message.
     */
    level: z.ZodEnum<["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]>;
    /**
     * An optional name of the logger issuing this message.
     */
    logger: z.ZodOptional<z.ZodString>;
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: z.ZodUnknown;
  }, "strip", z.ZodTypeAny, {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }, {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }>, z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when a progress message is received.
   *
   * @param progress - The progress message
   * @param progress.message - The progress message
   * @param progress.percentage - The progress percentage
   * @param progress.timestamp - The progress timestamp
   * @param source - The source of the progress message
   * @param source.type - The type of the source, e.g. "tool"
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.name - The name of the source, e.g. "my-name"
   * @param source.args - The arguments of the source, e.g. { a: 1, b: 2 }
   * @returns The progress message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onProgress: (progress, source) => {
   *     if (source.type === "tool") {
   *     console.log(progress);
   *   },
   * });
   * ```
   */
  onProgress: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    progress: z.ZodNumber;
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: z.ZodOptional<z.ZodNumber>;
    /**
     * An optional message describing the current progress.
     */
    message: z.ZodOptional<z.ZodString>;
  }, "strip", z.ZodTypeAny, {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }, {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }>, z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"tool">;
    name: z.ZodString;
    args: z.ZodUnknown;
    server: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  }, {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  }>, z.ZodObject<{
    type: z.ZodLiteral<"unknown">;
  }, "strip", z.ZodTypeAny, {
    type: "unknown";
  }, {
    type: "unknown";
  }>]>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  onCancelled: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The ID of the request to cancel.
     *
     * This MUST correspond to the ID of a request previously issued in the same direction.
     */
    requestId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    /**
     * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
     */
    reason: z.ZodOptional<z.ZodString>;
  }, "strip", z.ZodTypeAny, {
    requestId: string | number;
    reason?: string | undefined;
  }, {
    requestId: string | number;
    reason?: string | undefined;
  }>, z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the server is initialized.
   *
   * @param source - The source of the initialized message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The initialized message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onInitialized: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onInitialized: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the prompts list is changed.
   *
   * @param source - The source of the prompts list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The prompts list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onPromptsListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onPromptsListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the resources list is changed.
   *
   * @param source - The source of the resources list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The resources list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onResourcesListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onResourcesListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the resources are updated.
   *
   * @param updatedResource - The updated resource
   * @param updatedResource.uri - The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   * @param source - The source of the resources updated message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The resources updated message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onResourcesUpdated: (updatedResource, source) => {
   *     console.log(`Resource ${updatedResource.uri} updated`);
   *   },
   * });
   * ```
   */
  onResourcesUpdated: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    uri: string;
  }, {
    uri: string;
  }>, z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the roots list is changed.
   *
   * @param source - The source of the roots list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The roots list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onRootsListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onRootsListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
  /**
   * Called when the tools list is changed.
   *
   * @param source - The source of the tools list changed message
   * @param source.server - The server of the source, e.g. "my-server"
   * @param source.options - The connection options of the source, e.g. `{ transport: "stdio", command: "node", args: ["server.js"] }`, see {@link ServerMessageSource}
   * @returns The tools list changed message
   *
   * @example
   * ```ts
   * const client = new MultiServerMCPClient({
   *   // ...
   *   onToolsListChanged: (source) => {
   *     console.log(source);
   *   },
   * });
   * ```
   */
  onToolsListChanged: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    server: z.ZodString;
    options: z.ZodUnion<[z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      transport: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * Optional transport type, inferred from the structure of the config if not provided. Included
       * for compatibility with common MCP client config file formats.
       */
      type: z.ZodOptional<z.ZodLiteral<"stdio">>;
      /**
       * The executable to run the server (e.g. `node`, `npx`, etc)
       */
      command: z.ZodString;
      /**
       * Array of command line arguments to pass to the executable
       */
      args: z.ZodArray<z.ZodString, "many">;
      /**
       * Environment variables to set when spawning the process.
       */
      env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * The encoding to use when reading from the process
       */
      encoding: z.ZodOptional<z.ZodString>;
      /**
       * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`
       *
       * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
       *
       * @default "inherit"
       */
      stderr: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"overlapped">, z.ZodLiteral<"pipe">, z.ZodLiteral<"ignore">, z.ZodLiteral<"inherit">]>>>;
      /**
       * The working directory to use when spawning the process.
       */
      cwd: z.ZodOptional<z.ZodString>;
      /**
       * Additional restart settings
       */
      restart: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically restart the process if it exits
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of restart attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between restart attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }, {
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>, z.ZodIntersection<z.ZodObject<{
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      transport: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * Optional transport type, inferred from the structure of the config. If "sse", will not attempt
       * to connect using streamable HTTP.
       */
      type: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"http">, z.ZodLiteral<"sse">]>>;
      /**
       * The URL to connect to
       */
      url: z.ZodString;
      /**
       * Additional headers to send with the request, useful for authentication
       */
      headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
      /**
       * OAuth client provider for automatic authentication handling.
       * When provided, the transport will automatically handle token refresh,
       * 401 error retries, and OAuth 2.0 flows according to RFC 6750.
       * This is the recommended approach for authentication instead of manual headers.
       */
      authProvider: z.ZodOptional<z.ZodType<OAuthClientProvider, z.ZodTypeDef, OAuthClientProvider>>;
      /**
       * Additional reconnection settings.
       */
      reconnect: z.ZodOptional<z.ZodObject<{
        /**
         * Whether to automatically reconnect if the connection is lost
         */
        enabled: z.ZodOptional<z.ZodBoolean>;
        /**
         * Maximum number of reconnection attempts
         */
        maxAttempts: z.ZodOptional<z.ZodNumber>;
        /**
         * Delay in milliseconds between reconnection attempts
         */
        delayMs: z.ZodOptional<z.ZodNumber>;
      }, "strip", z.ZodTypeAny, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      }>>;
      /**
       * Whether to automatically fallback to SSE if Streamable HTTP is not available or not supported
       *
       * @default true
       */
      automaticSSEFallback: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    }, {
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    }>, z.ZodObject<{
      /**
       * Defines where to place each tool output type in the LangChain ToolMessage.
       *
       * Can be set to `content` or `artifact` to send all tool output into the ToolMessage.content or
       * ToolMessage.artifact array, respectively, or you can assign an object that maps each content type
       * to `content` or `artifact`.
       *
       * @default {
       *   "text": "content",
       *   "image": "content",
       *   "audio": "content",
       *   "resource": "artifact"
       * }
       *
       * Items in the `content` field will be used as input context for the LLM, while the artifact field is
       * used for capturing tool output that won't be shown to the model, to be used in some later workflow
       * step.
       *
       * For example, imagine that you have a SQL query tool that can return huge result sets. Rather than
       * sending these large outputs directly to the model, perhaps you want the model to be able to inspect
       * the output in a code execution environment. In this case, you would set the output handling for the
       * `resource` type to `artifact` (its default value), and then upon initialization of your code
       * execution environment, you would look through your message history for `ToolMessage`s with the
       * `artifact` field set to `resource`, and use the `content` field during initialization of the
       * environment.
       */
      outputHandling: z.ZodOptional<z.ZodUnion<[z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>, z.ZodObject<{
        audio: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        image: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        resource_link: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
        text: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"content">, z.ZodLiteral<"artifact">]>>;
      }, "strip", z.ZodTypeAny, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }, {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      }>]>>;
      /**
       * Default timeout in milliseconds for tool execution. Must be greater than 0.
       * If not specified, tools will use their own configured timeout values.
       */
      defaultToolTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }, {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }>>]>;
  }, "strip", z.ZodTypeAny, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }>], z.ZodUnknown>, z.ZodUnion<[z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
}, "strip", z.ZodTypeAny, {
  onMessage?: ((args_0: {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onProgress?: ((args_0: {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }, args_1: {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  } | {
    type: "unknown";
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onCancelled?: ((args_0: {
    requestId: string | number;
    reason?: string | undefined;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onInitialized?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onPromptsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesUpdated?: ((args_0: {
    uri: string;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onRootsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onToolsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr?: "ignore" | "inherit" | "overlapped" | "pipe" | undefined;
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback?: boolean | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
}, {
  onMessage?: ((args_0: {
    level: "alert" | "critical" | "debug" | "emergency" | "error" | "info" | "notice" | "warning";
    logger?: string | undefined;
    data?: unknown;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onProgress?: ((args_0: {
    progress: number;
    total?: number | undefined;
    message?: string | undefined;
  }, args_1: {
    type: "tool";
    name: string;
    args?: unknown;
    server: string;
  } | {
    type: "unknown";
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onCancelled?: ((args_0: {
    requestId: string | number;
    reason?: string | undefined;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onInitialized?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onPromptsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onResourcesUpdated?: ((args_0: {
    uri: string;
  }, args_1: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onRootsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
  onToolsListChanged?: ((args_0: {
    server: string;
    options: ({
      transport?: "stdio" | undefined;
      type?: "stdio" | undefined;
      command: string;
      args: string[];
      env?: Record<string, string> | undefined;
      encoding?: string | undefined;
      stderr: "ignore" | "inherit" | "overlapped" | "pipe";
      cwd?: string | undefined;
      restart?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    }) | ({
      transport?: "http" | "sse" | undefined;
      type?: "http" | "sse" | undefined;
      url: string;
      headers?: Record<string, string> | undefined;
      authProvider?: OAuthClientProvider | undefined;
      reconnect?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        delayMs?: number | undefined;
      } | undefined;
      automaticSSEFallback: boolean;
    } & {
      outputHandling?: "artifact" | "content" | {
        audio?: "artifact" | "content" | undefined;
        image?: "artifact" | "content" | undefined;
        resource?: "artifact" | "content" | undefined;
        resource_link?: "artifact" | "content" | undefined;
        text?: "artifact" | "content" | undefined;
      } | undefined;
      defaultToolTimeout?: number | undefined;
    });
  }, ...args: unknown[]) => void | Promise<void>) | undefined;
}>>;
/**
 * Configuration for stdio transport connection
 */
type StdioConnection = z.input<typeof stdioConnectionSchema>;
/**
 * Configuration for streamable HTTP transport connection
 */
type StreamableHTTPConnection = z.input<typeof streamableHttpConnectionSchema>;
/**
 * Union type for all transport connection types
 */
type Connection = z.input<typeof connectionSchema>;
/**
 * Type for {@link MultiServerMCPClient} configuration
 */
type ClientConfig = z.input<typeof clientConfigSchema>;
type LoadMcpToolsOptions = {
  /**
   * If true, throw an error if a tool fails to load.
   *
   * @default true
   */
  throwOnLoadError?: boolean;
  /**
   * If true, the tool name will be prefixed with the server name followed by a double underscore.
   * This is useful if you want to avoid tool name collisions across servers.
   *
   * @default false
   */
  prefixToolNameWithServerName?: boolean;
  /**
   * An additional prefix to add to the tool name. Will be added at the very beginning of the tool
   * name, separated by a double underscore.
   *
   * For example, if `additionalToolNamePrefix` is `"mcp"`, and `prefixToolNameWithServerName` is
   * `true`, the tool name `"my-tool"` provided by server `"my-server"` will become
   * `"mcp__my-server__my-tool"`.
   *
   * Similarly, if `additionalToolNamePrefix` is `mcp` and `prefixToolNameWithServerName` is false,
   * the tool name would be `"mcp__my-tool"`.
   *
   * @default ""
   */
  additionalToolNamePrefix?: string;
  /**
   * If true, the tool will use LangChain's standard multimodal content blocks for tools that output
   * image or audio content, and embedded resources will be converted to `StandardFileBlock` objects.
   * When `false`, all artifacts are left in their MCP format, but embedded resources will be
   * converted to `StandardFileBlock` objects if {@link outputHandling} causes embedded resources to
   * be treated as content, as otherwise ChatModel providers will not be able to interpret them.
   *
   * @default false
   */
  useStandardContentBlocks?: boolean;
  /**
   * Defines where to place each tool output type in the LangChain ToolMessage.
   *
   * @default {
   *   "text": "content",
   *   "image": "content",
   *   "audio": "content",
   *   "resource": "artifact"
   * }
   */
  outputHandling?: OutputHandling;
  /**
   * Default timeout in milliseconds for tool execution. Must be greater than 0.
   * If not specified, tools will use their own configured timeout values.
   */
  defaultToolTimeout?: number;
  /**
   * `onProgress` callbacks used for tool calls.
   */
  onProgress?: Notifications["onProgress"];
  /**
   * `beforeToolCall` callbacks used for tool calls.
   */
  beforeToolCall?: ToolHooks["beforeToolCall"];
  /**
   * `afterToolCall` callbacks used for tool calls.
   */
  afterToolCall?: ToolHooks["afterToolCall"];
};
interface CustomHTTPTransportOptions {
  authProvider?: OAuthClientProvider;
  headers?: Record<string, string>;
}
/**
 * Represents a resource provided by an MCP server.
 */
type MCPResource = {
  /**
   * The URI of the resource
   */
  uri: string;
  /**
   * Human-readable name of the resource
   */
  name: string;
  /**
   * Optional description of what the resource represents
   */
  description?: string;
  /**
   * Optional MIME type of the resource content
   */
  mimeType?: string;
};
/**
 * Represents a resource template provided by an MCP server.
 * Resource templates are used for dynamic resources with parameterized URIs.
 */
type MCPResourceTemplate = {
  /**
   * The URI template with parameter placeholders (e.g., "users://{userId}/profile")
   */
  uriTemplate: string;
  /**
   * Human-readable name of the resource template
   */
  name: string;
  /**
   * Optional description of what the resource template represents
   */
  description?: string;
  /**
   * Optional MIME type of the resource content
   */
  mimeType?: string;
};
/**
 * Represents the content of a resource retrieved from an MCP server.
 */
type MCPResourceContent = {
  /**
   * The URI of the resource
   */
  uri: string;
  /**
   * Optional MIME type of the content
   */
  mimeType?: string;
  /**
   * Optional text content of the resource
   */
  text?: string;
  /**
   * Optional base64-encoded binary content of the resource
   */
  blob?: string;
};
//#endregion
export { ClientConfig, Connection, CustomHTTPTransportOptions, LoadMcpToolsOptions, MCPResource, MCPResourceContent, MCPResourceTemplate, OutputHandling, StdioConnection, StreamableHTTPConnection };
//# sourceMappingURL=types.d.ts.map