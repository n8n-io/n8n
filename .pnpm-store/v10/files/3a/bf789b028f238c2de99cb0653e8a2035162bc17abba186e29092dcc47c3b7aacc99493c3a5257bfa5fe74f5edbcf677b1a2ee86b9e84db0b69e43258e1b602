import { BaseChannel } from "../channels/base.js";
import { StateDefinition } from "../graph/annotation.js";
import { CompiledStateGraph } from "../graph/state.js";
import { ToolExecutor } from "./tool_executor.js";
import { Runnable } from "@langchain/core/runnables";
import * as _langchain_core_messages1 from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import { AgentAction, AgentFinish } from "@langchain/core/agents";
import { Tool } from "@langchain/core/tools";

//#region src/prebuilt/agent_executor.d.ts
interface Step {
  action: AgentAction | AgentFinish;
  observation: unknown;
}
/** @ignore */
interface AgentExecutorState {
  agentOutcome?: AgentAction | AgentFinish;
  steps: Array<Step>;
  input: string;
  chatHistory?: BaseMessage[];
}
/** @ignore */
declare function createAgentExecutor({
  agentRunnable,
  tools
}: {
  agentRunnable: Runnable;
  tools: Array<Tool> | ToolExecutor;
}): CompiledStateGraph<{
  agentOutcome?: AgentAction | AgentFinish | undefined;
  steps: Step[];
  input: string;
  chatHistory?: BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[] | undefined;
}, {
  agentOutcome?: AgentAction | AgentFinish | undefined;
  steps?: Step[] | undefined;
  input?: string | undefined;
  chatHistory?: BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[] | undefined;
}, "__start__" | "action" | "agent", {
  agentOutcome?: BaseChannel<AgentAction | AgentFinish | undefined, AgentAction | AgentFinish | undefined, unknown> | undefined;
  steps: BaseChannel<Step[], Step[], unknown>;
  input: BaseChannel<string, string, unknown>;
  chatHistory?: BaseChannel<BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[] | undefined, BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[] | undefined, unknown> | undefined;
}, {
  agentOutcome?: BaseChannel<AgentAction | AgentFinish | undefined, AgentAction | AgentFinish | undefined, unknown> | undefined;
  steps: BaseChannel<Step[], Step[], unknown>;
  input: BaseChannel<string, string, unknown>;
  chatHistory?: BaseChannel<BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[] | undefined, BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[] | undefined, unknown> | undefined;
}, StateDefinition, {
  action: Partial<AgentExecutorState>;
  agent: {
    agentOutcome: any;
  };
}, unknown, unknown>;
//#endregion
export { AgentExecutorState, createAgentExecutor };
//# sourceMappingURL=agent_executor.d.ts.map