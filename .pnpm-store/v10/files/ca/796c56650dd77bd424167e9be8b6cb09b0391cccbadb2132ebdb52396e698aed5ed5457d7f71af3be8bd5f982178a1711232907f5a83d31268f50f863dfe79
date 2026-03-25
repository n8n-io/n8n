import "../types.js";
import { ChatGeneration } from "@langchain/core/outputs";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { AgentAction, AgentFinish, AgentStep } from "@langchain/core/agents";

//#region src/agents/tool_calling/output_parser.d.ts

/**
 * Type that represents an agent action with an optional message log.
 */
type ToolsAgentAction = AgentAction & {
  toolCallId: string;
  messageLog?: BaseMessage[];
};
type ToolsAgentStep = AgentStep & {
  action: ToolsAgentAction;
};
//#endregion
export { ToolsAgentAction, ToolsAgentStep };
//# sourceMappingURL=output_parser.d.ts.map