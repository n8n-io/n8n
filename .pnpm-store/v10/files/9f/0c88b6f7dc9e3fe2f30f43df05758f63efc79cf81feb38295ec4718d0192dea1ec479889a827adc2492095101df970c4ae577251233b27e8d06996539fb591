//#region src/types.messages.d.ts
type ImageDetail = "auto" | "low" | "high";
type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | {
    url: string;
    detail?: ImageDetail | undefined;
  };
};
type MessageContentText = {
  type: "text";
  text: string;
};
type MessageContentComplex = MessageContentText | MessageContentImageUrl;
type MessageContent = string | MessageContentComplex[];
/**
 * Model-specific additional kwargs, which is passed back to the underlying LLM.
 */
type MessageAdditionalKwargs = Record<string, unknown>;
type BaseMessage = {
  additional_kwargs?: MessageAdditionalKwargs | undefined;
  content: MessageContent;
  id?: string | undefined;
  name?: string | undefined;
  response_metadata?: Record<string, unknown> | undefined;
};
type HumanMessage = BaseMessage & {
  type: "human";
  example?: boolean | undefined;
};
type AIMessage = BaseMessage & {
  type: "ai";
  example?: boolean | undefined;
  tool_calls?: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: {
      [x: string]: any;
    };
    id?: string | undefined;
    type?: "tool_call" | undefined;
  }[] | undefined;
  invalid_tool_calls?: {
    name?: string | undefined;
    args?: string | undefined;
    id?: string | undefined;
    error?: string | undefined;
    type?: "invalid_tool_call" | undefined;
  }[] | undefined;
  usage_metadata?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_token_details?: {
      audio?: number | undefined;
      cache_read?: number | undefined;
      cache_creation?: number | undefined;
    } | undefined;
    output_token_details?: {
      audio?: number | undefined;
      reasoning?: number | undefined;
    } | undefined;
  } | undefined;
};
type ToolMessage = BaseMessage & {
  type: "tool";
  status?: "error" | "success" | undefined;
  tool_call_id: string;
  /**
   * Artifact of the Tool execution which is not meant to be sent to the model.
   *
   * Should only be specified if it is different from the message content, e.g. if only
   * a subset of the full tool output is being passed as message content but the full
   * output is needed in other parts of the code.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifact?: any;
};
type SystemMessage = BaseMessage & {
  type: "system";
};
type FunctionMessage = BaseMessage & {
  type: "function";
};
type RemoveMessage = BaseMessage & {
  type: "remove";
};
type Message = HumanMessage | AIMessage | ToolMessage | SystemMessage | FunctionMessage | RemoveMessage;
//#endregion
export { AIMessage, FunctionMessage, HumanMessage, Message, RemoveMessage, SystemMessage, ToolMessage };
//# sourceMappingURL=types.messages.d.ts.map