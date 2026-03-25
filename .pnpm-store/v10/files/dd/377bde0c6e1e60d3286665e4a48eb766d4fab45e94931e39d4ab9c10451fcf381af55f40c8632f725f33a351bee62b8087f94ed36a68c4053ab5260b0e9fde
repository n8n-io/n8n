import { OpenAIAssistantAction, OpenAIAssistantFinish, OpenAIToolType } from "./schema.js";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { StructuredTool, StructuredToolInterface } from "@langchain/core/tools";
import { ToolDefinition } from "@langchain/core/language_models/base";
import { ClientOptions, OpenAIChatModelId, OpenAIClient } from "@langchain/openai";

//#region src/experimental/openai_assistant/index.d.ts
type ThreadMessage = any;
type RequiredActionFunctionToolCall = any;
type ExtractRunOutput<AsAgent extends boolean | undefined> = AsAgent extends true ? OpenAIAssistantFinish | OpenAIAssistantAction[] : ThreadMessage[] | RequiredActionFunctionToolCall[];
type OpenAIAssistantRunnableInput<AsAgent extends boolean | undefined = undefined> = {
  client?: OpenAIClient;
  clientOptions?: ClientOptions;
  assistantId: string;
  pollIntervalMs?: number;
  asAgent?: AsAgent;
};
declare class OpenAIAssistantRunnable<AsAgent extends boolean | undefined, RunInput extends Record<string, any> = Record<string, any>> extends Runnable<RunInput, ExtractRunOutput<AsAgent>> {
  lc_namespace: string[];
  private client;
  assistantId: string;
  pollIntervalMs: number;
  asAgent?: AsAgent;
  constructor(fields: OpenAIAssistantRunnableInput<AsAgent>);
  static createAssistant<AsAgent extends boolean>({
    model,
    name,
    instructions,
    tools,
    client,
    clientOptions,
    asAgent,
    pollIntervalMs,
    fileIds
  }: Omit<OpenAIAssistantRunnableInput<AsAgent>, "assistantId"> & {
    model: OpenAIChatModelId;
    name?: string;
    instructions?: string;
    tools?: OpenAIToolType | Array<StructuredTool>;
    fileIds?: string[];
  }): Promise<OpenAIAssistantRunnable<AsAgent, Record<string, any>>>;
  invoke(input: RunInput, _options?: RunnableConfig): Promise<ExtractRunOutput<AsAgent>>;
  /**
   * Delete an assistant.
   *
   * @link {https://platform.openai.com/docs/api-reference/assistants/deleteAssistant}
   * @returns {Promise<AssistantDeleted>}
   */
  deleteAssistant(): Promise<OpenAIClient.Beta.AssistantDeleted & {
    _request_id?: string | null | undefined;
  }>;
  /**
   * Retrieves an assistant.
   *
   * @link {https://platform.openai.com/docs/api-reference/assistants/getAssistant}
   * @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
   */
  getAssistant(): Promise<OpenAIClient.Beta.Assistant & {
    _request_id?: string | null | undefined;
  }>;
  /**
   * Modifies an assistant.
   *
   * @link {https://platform.openai.com/docs/api-reference/assistants/modifyAssistant}
   * @returns {Promise<OpenAIClient.Beta.Assistants.Assistant>}
   */
  modifyAssistant<AsAgent extends boolean>({
    model,
    name,
    instructions,
    fileIds
  }: Omit<OpenAIAssistantRunnableInput<AsAgent>, "assistantId" | "tools"> & {
    model?: OpenAIChatModelId;
    name?: string;
    instructions?: string;
    fileIds?: string[];
  }): Promise<OpenAIClient.Beta.Assistant & {
    _request_id?: string | null | undefined;
  }>;
  private _parseStepsInput;
  private _createRun;
  private _createThreadAndRun;
  private _waitForRun;
  private _getResponse;
}
declare function formatToOpenAIAssistantTool(tool: StructuredToolInterface): ToolDefinition;
//#endregion
export { OpenAIAssistantRunnable, OpenAIAssistantRunnableInput, formatToOpenAIAssistantTool };
//# sourceMappingURL=index.d.ts.map