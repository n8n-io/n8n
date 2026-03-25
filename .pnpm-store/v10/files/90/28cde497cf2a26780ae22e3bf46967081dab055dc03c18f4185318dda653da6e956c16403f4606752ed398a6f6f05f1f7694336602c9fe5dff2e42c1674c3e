import * as _langchain_core_messages11 from "@langchain/core/messages";
import { ContentBlock, ToolMessage } from "@langchain/core/messages";
import { z } from "zod/v3";
import { Command } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

//#region src/hooks.d.ts

/**
 * state messages
 *
 * Note: this may not be defined in cases you don't use LangGraph or a LangGraph implementation like `createAgent`.
 * Also state can be defined arbitrarily by the user.
 */
type State = Record<string, unknown>;
declare const toolHooksSchema: z.ZodObject<{
  /**
   * Called before a tool call is made.
   * Allows you to modify the tool call arguments or return a different tool call.
   *
   * @param toolCallRequest - The tool call request
   * @param toolCallRequest.name - The tool name
   * @param toolCallRequest.args - The tool call arguments
   * @param toolCallRequest.serverName - The server name
   * @param config - The runnable config
   * @returns The tool call modification
   *
   * @example
   * ```ts
   * const interceptor = {
   *   beforeToolCall: (toolCallRequest, state, runtime) => {
   *     return {
   *       args: {
   *         ...toolCallRequest.args,
   *         custom: "Custom Value"
   *       },
   *       header: { "X-Custom-Header": "Custom Value" }
   *     };
   *   },
   * };
   * ```
   */
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
  }>, z.ZodType<State, z.ZodTypeDef, State>, z.ZodType<RunnableConfig<Record<string, any>>, z.ZodTypeDef, RunnableConfig<Record<string, any>>>], z.ZodUnknown>, z.ZodUnion<[z.ZodPromise<z.ZodObject<{
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
  /**
   * Called after a tool call is made.
   * Allows you to modify the tool call result or return a different tool call result.
   *
   * @param toolCallResult - The tool call result
   * @param toolCallResult.args - The tool call arguments
   * @param toolCallResult.serverName - The server name
   * @param toolCallResult.name - The tool name
   * @param toolCallResult.result - The tool call result
   * @param config - The runnable config
   * @returns The tool call modification
   * @example
   * ```ts
   * const interceptor = {
   *   afterToolCall: (toolCallResult, state, runtime) => {
   *     if (toolCallResult.name === "calculator") {
   *       return ["Custom Value", []];
   *     }
   *     return toolCallResult.result;
   *   },
   * };
   * ```
   */
  afterToolCall: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    serverName: z.ZodString;
    name: z.ZodString;
    args: z.ZodUnknown;
    result: z.ZodTuple<[z.ZodType<string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], z.ZodTypeDef, string | (ContentBlock | ContentBlock.Data.DataContentBlock)[]>, z.ZodArray<z.ZodUnion<[z.ZodType<{
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
    }>, z.ZodType<ContentBlock.Multimodal.Standard, z.ZodTypeDef, ContentBlock.Multimodal.Standard>]>, "many">], null>;
  }, "strip", z.ZodTypeAny, {
    serverName: string;
    name: string;
    args?: unknown;
    result: [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }, {
    serverName: string;
    name: string;
    args?: unknown;
    result: [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }>, z.ZodType<State, z.ZodTypeDef, State>, z.ZodType<RunnableConfig<Record<string, any>>, z.ZodTypeDef, RunnableConfig<Record<string, any>>>], z.ZodUnknown>, z.ZodUnion<[z.ZodPromise<z.ZodObject<Pick<{
    serverName: z.ZodString;
    name: z.ZodString;
    args: z.ZodUnknown;
    result: z.ZodUnion<[z.ZodString, z.ZodType<Command<unknown, Record<string, unknown>, string>, z.ZodTypeDef, Command<unknown, Record<string, unknown>, string>>, z.ZodTuple<[z.ZodType<string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], z.ZodTypeDef, string | (ContentBlock | ContentBlock.Data.DataContentBlock)[]>, z.ZodArray<z.ZodUnion<[z.ZodType<{
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
    }>, z.ZodType<ContentBlock.Multimodal.Standard, z.ZodTypeDef, ContentBlock.Multimodal.Standard>]>, "many">], null>, z.ZodType<ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>>, z.ZodTypeDef, ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>>>]>;
  }, "result">, "strip", z.ZodTypeAny, {
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }, {
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }>>, z.ZodObject<Pick<{
    serverName: z.ZodString;
    name: z.ZodString;
    args: z.ZodUnknown;
    result: z.ZodUnion<[z.ZodString, z.ZodType<Command<unknown, Record<string, unknown>, string>, z.ZodTypeDef, Command<unknown, Record<string, unknown>, string>>, z.ZodTuple<[z.ZodType<string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], z.ZodTypeDef, string | (ContentBlock | ContentBlock.Data.DataContentBlock)[]>, z.ZodArray<z.ZodUnion<[z.ZodType<{
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
    }>, z.ZodType<ContentBlock.Multimodal.Standard, z.ZodTypeDef, ContentBlock.Multimodal.Standard>]>, "many">], null>, z.ZodType<ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>>, z.ZodTypeDef, ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>>>]>;
  }, "result">, "strip", z.ZodTypeAny, {
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }, {
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }>, z.ZodVoid, z.ZodPromise<z.ZodVoid>]>>>;
}, "strip", z.ZodTypeAny, {
  beforeToolCall?: ((args_0: {
    serverName: string;
    name: string;
    args?: unknown;
  }, args_1: State, args_2: RunnableConfig<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
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
    result: [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }, args_1: State, args_2: RunnableConfig<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }> | {
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }) | undefined;
}, {
  beforeToolCall?: ((args_0: {
    serverName: string;
    name: string;
    args?: unknown;
  }, args_1: State, args_2: RunnableConfig<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
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
    result: [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }, args_1: State, args_2: RunnableConfig<Record<string, any>>, ...args: unknown[]) => void | Promise<void> | Promise<{
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }> | {
    result: string | Command<unknown, Record<string, unknown>, string> | ToolMessage<_langchain_core_messages11.MessageStructure<_langchain_core_messages11.MessageToolSet>> | [string | (ContentBlock | ContentBlock.Data.DataContentBlock)[], ({
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
    } | ContentBlock.Multimodal.Standard)[]];
  }) | undefined;
}>;
type ToolHooks = z.input<typeof toolHooksSchema>;
//#endregion
export { State, ToolHooks };
//# sourceMappingURL=hooks.d.cts.map