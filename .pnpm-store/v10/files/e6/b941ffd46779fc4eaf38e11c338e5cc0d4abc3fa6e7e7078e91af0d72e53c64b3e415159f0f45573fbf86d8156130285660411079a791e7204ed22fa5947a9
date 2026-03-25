import Anthropic from "@anthropic-ai/sdk";
import { BindToolsInput } from "@langchain/core/language_models/chat_models";

//#region src/types.d.ts

type AnthropicMessageCreateParams = Anthropic.MessageCreateParamsNonStreaming;
type AnthropicStreamingMessageCreateParams = Anthropic.MessageCreateParamsStreaming;
type AnthropicThinkingConfigParam = Anthropic.ThinkingConfigParam;
type AnthropicContextManagementConfigParam = Anthropic.Beta.BetaContextManagementConfig;
type AnthropicMessageStreamEvent = Anthropic.MessageStreamEvent;
type AnthropicRequestOptions = Anthropic.RequestOptions;
type AnthropicToolChoice = {
  type: "tool";
  name: string;
} | "any" | "auto" | "none" | string;
type ChatAnthropicToolType = Anthropic.Messages.Tool | BindToolsInput;
type ChatAnthropicOutputFormat = Anthropic.Beta.BetaJSONOutputFormat;
type AnthropicTextBlockParam = Anthropic.Messages.TextBlockParam;
type AnthropicImageBlockParam = Anthropic.Messages.ImageBlockParam;
type AnthropicToolUseBlockParam = Anthropic.Messages.ToolUseBlockParam;
type AnthropicToolResultBlockParam = Anthropic.Messages.ToolResultBlockParam;
type AnthropicDocumentBlockParam = Anthropic.Messages.DocumentBlockParam;
type AnthropicThinkingBlockParam = Anthropic.Messages.ThinkingBlockParam;
type AnthropicRedactedThinkingBlockParam = Anthropic.Messages.RedactedThinkingBlockParam;
type AnthropicServerToolUseBlockParam = Anthropic.Messages.ServerToolUseBlockParam;
type AnthropicWebSearchToolResultBlockParam = Anthropic.Messages.WebSearchToolResultBlockParam;
type AnthropicWebSearchResultBlockParam = Anthropic.Messages.WebSearchResultBlockParam;
type AnthropicSearchResultBlockParam = Anthropic.SearchResultBlockParam;
type AnthropicContainerUploadBlockParam = Anthropic.Beta.BetaContainerUploadBlockParam;
// Union of all possible content block types including server tool use
type ChatAnthropicContentBlock = AnthropicTextBlockParam | AnthropicImageBlockParam | AnthropicToolUseBlockParam | AnthropicToolResultBlockParam | AnthropicDocumentBlockParam | AnthropicThinkingBlockParam | AnthropicRedactedThinkingBlockParam | AnthropicServerToolUseBlockParam | AnthropicWebSearchToolResultBlockParam | AnthropicWebSearchResultBlockParam | AnthropicSearchResultBlockParam | AnthropicContainerUploadBlockParam;
//#endregion
export { AnthropicContextManagementConfigParam, AnthropicMessageCreateParams, AnthropicMessageStreamEvent, AnthropicRequestOptions, AnthropicStreamingMessageCreateParams, AnthropicThinkingConfigParam, AnthropicToolChoice, ChatAnthropicContentBlock, ChatAnthropicOutputFormat, ChatAnthropicToolType };
//# sourceMappingURL=types.d.cts.map