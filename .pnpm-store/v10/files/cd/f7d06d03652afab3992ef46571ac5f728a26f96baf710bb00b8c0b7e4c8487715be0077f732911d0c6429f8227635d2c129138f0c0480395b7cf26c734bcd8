import { LanguageModelLike } from "@langchain/core/language_models/base";
import { BaseChatModel, BaseChatModelParams, BindToolsInput, ToolChoice } from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { Runnable, RunnableBinding, RunnableConfig, RunnableLambda } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatResult } from "@langchain/core/outputs";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod/v3";

//#region src/agents/tests/utils.d.ts
interface ToolCall$1 {
  name: string;
  args: Record<string, any>;
  id: string;
  type?: "tool_call";
}
interface FakeToolCallingModelFields {
  toolCalls?: ToolCall$1[][];
  toolStyle?: "openai" | "anthropic";
  index?: number;
  structuredResponse?: any;
}
/**
 * Fake chat model for testing tool calling functionality
 */
declare class FakeToolCallingModel extends BaseChatModel {
  toolCalls: ToolCall$1[][];
  toolStyle: "openai" | "anthropic";
  private indexRef;
  structuredResponse?: any;
  private tools;
  constructor({
    toolCalls,
    toolStyle,
    index,
    structuredResponse,
    indexRef,
    ...rest
  }?: FakeToolCallingModelFields & {
    indexRef?: {
      current: number;
    };
  });
  get index(): number;
  set index(value: number);
  _llmType(): string;
  _combineLLMOutput(): never[];
  bindTools(tools: StructuredTool[]): FakeToolCallingModel | RunnableBinding<any, any, any & {
    tool_choice?: ToolChoice | undefined;
  }>;
  withStructuredOutput(_schema: any): RunnableLambda<unknown, any, RunnableConfig<Record<string, any>>>;
  _generate(messages: BaseMessage[], _options?: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
}
//#endregion
export { FakeToolCallingModel };
//# sourceMappingURL=utils.d.cts.map