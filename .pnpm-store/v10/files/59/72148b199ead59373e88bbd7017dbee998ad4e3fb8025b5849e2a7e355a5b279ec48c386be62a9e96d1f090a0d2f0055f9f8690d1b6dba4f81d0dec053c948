import { START } from "../constants.js";
import { CompiledStateGraph } from "../graph/state.js";
import { ToolExecutor } from "./tool_executor.js";
import { RunnableToolLike } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";
import { StructuredToolInterface } from "@langchain/core/tools";

//#region src/prebuilt/chat_agent_executor.d.ts
/** @deprecated Use {@link createReactAgent} instead with tool calling. */
type FunctionCallingExecutorState = {
  messages: Array<BaseMessage>;
};
/** @deprecated Use {@link createReactAgent} instead with tool calling. */
declare function createFunctionCallingExecutor<Model extends object>({
  model,
  tools
}: {
  model: Model;
  tools: Array<StructuredToolInterface | RunnableToolLike> | ToolExecutor;
}): CompiledStateGraph<FunctionCallingExecutorState, Partial<FunctionCallingExecutorState>, typeof START | "agent" | "action">;
//#endregion
export { FunctionCallingExecutorState, createFunctionCallingExecutor };
//# sourceMappingURL=chat_agent_executor.d.ts.map