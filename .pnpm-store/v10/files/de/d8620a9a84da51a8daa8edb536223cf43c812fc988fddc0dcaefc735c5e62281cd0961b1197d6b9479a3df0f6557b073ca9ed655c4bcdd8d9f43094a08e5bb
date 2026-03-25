//#region src/types-anthropic.d.ts
interface AnthropicCacheControl {
  type: "ephemeral" | string;
}
interface AnthropicMessageContentBase {
  type: string;
  cache_control?: AnthropicCacheControl | null;
}
interface AnthropicMessageContentText extends AnthropicMessageContentBase {
  type: "text";
  text: string;
}
interface AnthropicMessageContentImage extends AnthropicMessageContentBase {
  type: "image";
  source: {
    type: "base64" | string;
    media_type?: string;
    data: string;
  } | {
    type: "url" | string;
    url: string;
  };
}
interface AnthropicMessageContentThinking extends AnthropicMessageContentBase {
  type: "thinking";
  thinking: string;
  signature: string;
}
interface AnthropicMessageContentDocument extends AnthropicMessageContentBase {
  type: "document";
  source: {
    type: "base64" | "text" | string;
    media_type?: "application/pdf" | "text/plain" | string;
    data: string;
  } | {
    type: "url" | string;
    url: string;
  } | {
    type: "content" | string;
    content: {
      type: "image" | string;
      source: {
        type: "base64" | string;
        data: string;
        media_type?: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | string;
      } | {
        type: "url" | string;
        url: string;
      } | {
        type: "text" | string;
        text: string;
      };
    }[];
  };
  citations?: {
    enabled?: boolean;
  };
  context?: string;
  title?: string;
}
interface AnthropicMessageContentRedactedThinking extends AnthropicMessageContentBase {
  type: "redacted_thinking";
  data: string;
}
type AnthropicMessageContentToolUseInput = object;
interface AnthropicMessageContentToolUse extends AnthropicMessageContentBase {
  type: "tool_use";
  id: string;
  name: string;
  input: AnthropicMessageContentToolUseInput;
}
type AnthropicMessageContentToolResultContent = AnthropicMessageContentText | AnthropicMessageContentImage;
interface AnthropicMessageContentToolResult extends AnthropicMessageContentBase {
  type: "tool_result";
  tool_use_id: string;
  is_error?: boolean;
  content: string | AnthropicMessageContentToolResultContent[];
}
type AnthropicMessageContent = AnthropicMessageContentText | AnthropicMessageContentImage | AnthropicMessageContentToolUse | AnthropicMessageContentToolResult | AnthropicMessageContentThinking | AnthropicMessageContentRedactedThinking;
interface AnthropicMessage {
  role: string;
  content: string | AnthropicMessageContent[];
}
interface AnthropicMetadata {
  user_id?: string | null;
}
interface AnthropicToolChoiceBase {
  type: string;
}
interface AnthropicToolChoiceAuto extends AnthropicToolChoiceBase {
  type: "auto";
}
interface AnthropicToolChoiceAny extends AnthropicToolChoiceBase {
  type: "any";
}
interface AnthropicToolChoiceTool extends AnthropicToolChoiceBase {
  type: "tool";
  name: string;
}
type AnthropicToolChoice = AnthropicToolChoiceAuto | AnthropicToolChoiceAny | AnthropicToolChoiceTool;
type AnthropicToolInputSchema = object;
interface AnthropicTool {
  type?: string;
  name: string;
  description?: string;
  cache_control?: AnthropicCacheControl;
  input_schema: AnthropicToolInputSchema;
}
interface AnthropicThinkingEnabled {
  type: "enabled";
  budget_tokens: number;
}
interface AnthropicThinkingDisabled {
  type: "disabled";
}
type AnthropicThinking = AnthropicThinkingEnabled | AnthropicThinkingDisabled;
interface AnthropicRequest {
  anthropic_version: string;
  messages: AnthropicMessage[];
  system?: string;
  stream?: boolean;
  max_tokens: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  stop_sequences?: string[];
  metadata?: AnthropicMetadata;
  tool_choice?: AnthropicToolChoice;
  tools?: AnthropicTool[];
  thinking?: AnthropicThinking;
}
type AnthropicRequestSettings = Pick<AnthropicRequest, "max_tokens" | "temperature" | "top_k" | "top_p" | "stop_sequences" | "stream">;
interface AnthropicContentText {
  type: "text";
  text: string;
}
interface AnthropicContentToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: object;
}
interface AnthropicContentThinking {
  type: "thinking";
  thinking: string;
  signature: string;
}
interface AnthropicContentRedactedThinking {
  type: "redacted_thinking";
  data: string;
}
type AnthropicContent = AnthropicContentText | AnthropicContentToolUse | AnthropicContentThinking | AnthropicContentRedactedThinking;
interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number | null;
  cache_creation_output_tokens: number | null;
  cache_read_input_tokens: number | null;
}
type AnthropicResponseData = AnthropicResponseMessage | AnthropicStreamBaseEvent;
interface AnthropicResponseMessage {
  id: string;
  type: string;
  role: string;
  content: AnthropicContent[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: AnthropicUsage;
}
interface AnthropicAPIConfig {
  version?: string;
  thinking?: AnthropicThinking;
}
type AnthropicStreamEventType = "message_start" | "content_block_start" | "content_block_delta" | "content_block_stop" | "message_delta" | "message_stop" | "ping" | "error";
type AnthropicStreamDeltaType = "text_delta" | "input_json_delta";
interface AnthropicStreamBaseEvent {
  type: AnthropicStreamEventType;
}
interface AnthropicStreamMessageStartEvent extends AnthropicStreamBaseEvent {
  type: "message_start";
  message: AnthropicResponseMessage;
}
interface AnthropicStreamContentBlockStartEvent extends AnthropicStreamBaseEvent {
  type: "content_block_start";
  index: number;
  content_block: AnthropicContent;
}
interface AnthropicStreamBaseDelta {
  type: AnthropicStreamDeltaType;
}
interface AnthropicStreamTextDelta extends AnthropicStreamBaseDelta {
  type: "text_delta";
  text: string;
}
interface AnthropicStreamInputJsonDelta extends AnthropicStreamBaseDelta {
  type: "input_json_delta";
  partial_json: string;
}
type AnthropicStreamDelta = AnthropicStreamTextDelta | AnthropicStreamInputJsonDelta;
interface AnthropicStreamContentBlockDeltaEvent extends AnthropicStreamBaseEvent {
  type: "content_block_delta";
  index: number;
  delta: AnthropicStreamDelta;
}
interface AnthropicStreamContentBlockStopEvent extends AnthropicStreamBaseEvent {
  type: "content_block_stop";
  index: number;
}
interface AnthropicStreamMessageDeltaEvent extends AnthropicStreamBaseEvent {
  type: "message_delta";
  delta: Partial<AnthropicResponseMessage>;
}
interface AnthropicStreamMessageStopEvent extends AnthropicStreamBaseEvent {
  type: "message_stop";
}
interface AnthropicStreamPingEvent extends AnthropicStreamBaseEvent {
  type: "ping";
}
interface AnthropicStreamErrorEvent extends AnthropicStreamBaseEvent {
  type: "error";
  error: any;
}
//#endregion
export { AnthropicAPIConfig, AnthropicCacheControl, AnthropicContent, AnthropicContentRedactedThinking, AnthropicContentText, AnthropicContentThinking, AnthropicContentToolUse, AnthropicMessage, AnthropicMessageContent, AnthropicMessageContentDocument, AnthropicMessageContentImage, AnthropicMessageContentRedactedThinking, AnthropicMessageContentText, AnthropicMessageContentThinking, AnthropicMessageContentToolResult, AnthropicMessageContentToolResultContent, AnthropicMessageContentToolUse, AnthropicMessageContentToolUseInput, AnthropicMetadata, AnthropicRequest, AnthropicRequestSettings, AnthropicResponseData, AnthropicResponseMessage, AnthropicStreamBaseDelta, AnthropicStreamBaseEvent, AnthropicStreamContentBlockDeltaEvent, AnthropicStreamContentBlockStartEvent, AnthropicStreamContentBlockStopEvent, AnthropicStreamDelta, AnthropicStreamDeltaType, AnthropicStreamErrorEvent, AnthropicStreamEventType, AnthropicStreamInputJsonDelta, AnthropicStreamMessageDeltaEvent, AnthropicStreamMessageStartEvent, AnthropicStreamMessageStopEvent, AnthropicStreamPingEvent, AnthropicStreamTextDelta, AnthropicThinking, AnthropicThinkingDisabled, AnthropicThinkingEnabled, AnthropicTool, AnthropicToolChoice, AnthropicToolChoiceAny, AnthropicToolChoiceAuto, AnthropicToolChoiceTool, AnthropicToolInputSchema, AnthropicUsage };
//# sourceMappingURL=types-anthropic.d.ts.map