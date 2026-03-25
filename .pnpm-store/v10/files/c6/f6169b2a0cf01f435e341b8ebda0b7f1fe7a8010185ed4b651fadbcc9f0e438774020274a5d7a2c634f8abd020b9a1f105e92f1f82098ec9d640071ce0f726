import { RunnableBinding, RunnableConfig, RunnableToolLike } from "@langchain/core/runnables";
import { StructuredToolInterface } from "@langchain/core/tools";

//#region src/prebuilt/tool_executor.d.ts
/** @deprecated Use {@link ToolNode} instead. */
interface ToolExecutorArgs {
  tools: Array<StructuredToolInterface | RunnableToolLike>;
  /**
   * @default {INVALID_TOOL_MSG_TEMPLATE}
   */
  invalidToolMsgTemplate?: string;
}
/**
 * Interface for invoking a tool
 */
interface ToolInvocationInterface {
  tool: string;
  toolInput: string;
}
type ToolExecutorInputType = any;
type ToolExecutorOutputType = any;
/** @deprecated Use {@link ToolNode} instead. */
declare class ToolExecutor extends RunnableBinding<ToolExecutorInputType, ToolExecutorOutputType> {
  lc_graph_name: string;
  tools: Array<StructuredToolInterface | RunnableToolLike>;
  toolMap: Record<string, StructuredToolInterface | RunnableToolLike>;
  invalidToolMsgTemplate: string;
  constructor(fields: ToolExecutorArgs);
  /**
   * Execute a tool invocation
   *
   * @param {ToolInvocationInterface} toolInvocation The tool to invoke and the input to pass to it.
   * @param {RunnableConfig | undefined} config Optional configuration to pass to the tool when invoked.
   * @returns Either the result of the tool invocation (`string` or `ToolMessage`, set by the `ToolOutput` generic) or a string error message.
   */
  _execute(toolInvocation: ToolInvocationInterface, config?: RunnableConfig): Promise<ToolExecutorOutputType>;
}
//#endregion
export { ToolExecutor, ToolExecutorArgs, ToolInvocationInterface };
//# sourceMappingURL=tool_executor.d.cts.map