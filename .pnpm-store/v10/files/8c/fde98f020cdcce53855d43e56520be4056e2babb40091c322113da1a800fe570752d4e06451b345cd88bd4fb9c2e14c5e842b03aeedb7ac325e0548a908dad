import { ThreadState } from "../schema.cjs";
import { Message } from "../types.messages.cjs";
import { StreamMode, ToolProgress } from "../types.stream.cjs";
import { StreamEvent } from "../types.cjs";
import { Client } from "../client.cjs";
import { BagTemplate } from "../types.template.cjs";
import { BaseSubagentState, CompiledSubAgentLike, CustomSubmitOptions, DeepAgentTypeConfigLike, DefaultSubagentStates, ExtractDeepAgentConfig, ExtractSubAgentMiddleware, GetConfigurableType, GetInterruptType, GetToolCallsType, GetUpdateType, InferDeepAgentSubagents, InferSubagentByName, InferSubagentNames, InferSubagentState, IsDeepAgentLike, MessageMetadata, RunCallbackMeta, StreamBase, SubAgentLike, SubagentStateMap, SubagentStream, SubagentStreamInterface, SubmitOptions, UseStreamCustomOptions, UseStreamOptions, UseStreamThread, UseStreamTransport } from "../ui/types.cjs";
import { Sequence } from "../ui/branching.cjs";

//#region src/react/types.d.ts
interface UseStream<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate, SubagentStates extends Record<string, unknown> = DefaultSubagentStates> extends StreamBase<StateType, GetToolCallsType<StateType>, GetInterruptType<Bag>, SubagentStates> {
  /**
   * Whether the thread is currently being loaded.
   */
  isThreadLoading: boolean;
  /**
   * Stops the stream.
   */
  stop: () => Promise<void>;
  /**
   * Create and stream a run to the thread.
   */
  submit: (values: GetUpdateType<Bag, StateType> | null | undefined, options?: SubmitOptions<StateType, GetConfigurableType<Bag>>) => Promise<void>;
  /**
   * The current branch of the thread.
   */
  branch: string;
  /**
   * Set the branch of the thread.
   */
  setBranch: (branch: string) => void;
  /**
   * Flattened history of thread states of a thread.
   */
  history: ThreadState<StateType>[];
  /**
   * Tree of all branches for the thread.
   * @experimental
   */
  experimental_branchTree: Sequence<StateType>;
  /**
   * Get the metadata for a message, such as first thread state the message
   * was seen in and branch information.
   *
   * @param message - The message to get the metadata for.
   * @param index - The index of the message in the thread.
   * @returns The metadata for the message.
   */
  getMessagesMetadata: (message: Message<GetToolCallsType<StateType>>, index?: number) => MessageMetadata<StateType> | undefined;
  /**
   * Progress of tool executions during streaming.
   */
  toolProgress: ToolProgress[];
  /**
   * LangGraph SDK client used to send request and receive responses.
   */
  client: Client;
  /**
   * The ID of the assistant to use.
   */
  assistantId: string;
  /**
   * Join an active stream.
   */
  joinStream: (runId: string, lastEventId?: string, options?: {
    streamMode?: StreamMode | StreamMode[];
    filter?: (event: {
      id?: string;
      event: StreamEvent;
      data: unknown;
    }) => boolean;
  }) => Promise<void>;
}
type UseStreamCustom<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate, SubagentStates extends Record<string, unknown> = DefaultSubagentStates> = Pick<UseStream<StateType, Bag, SubagentStates>, "values" | "error" | "isLoading" | "stop" | "interrupt" | "interrupts" | "messages" | "toolCalls" | "getToolCalls" | "subagents" | "activeSubagents" | "getSubagent" | "getSubagentsByType" | "getSubagentsByMessage"> & {
  submit: (values: GetUpdateType<Bag, StateType> | null | undefined, options?: CustomSubmitOptions<StateType, GetConfigurableType<Bag>>) => Promise<void>;
};
//#endregion
export { UseStream, UseStreamCustom };
//# sourceMappingURL=types.d.cts.map