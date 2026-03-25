import { AgentAction, AgentFinish } from "@langchain/core/agents";

//#region src/experimental/openai_assistant/schema.d.ts
type OpenAIAssistantFinish = AgentFinish & {
  runId: string;
  threadId: string;
};
type OpenAIAssistantAction = AgentAction & {
  toolCallId: string;
  runId: string;
  threadId: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenAIToolType = Array<any>;
//#endregion
export { OpenAIAssistantAction, OpenAIAssistantFinish, OpenAIToolType };
//# sourceMappingURL=schema.d.ts.map