import { BindToolsInput } from "@langchain/core/language_models/chat_models";
import { ConverseCommand, Tool, ToolChoice } from "@aws-sdk/client-bedrock-runtime";
import { AwsCredentialIdentity, Provider } from "@aws-sdk/types";

//#region src/types.d.ts
type CredentialType = AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
type ConverseCommandParams = ConstructorParameters<typeof ConverseCommand>[0];
type BedrockToolChoice = ToolChoice.AnyMember | ToolChoice.AutoMember | ToolChoice.ToolMember;
type ChatBedrockConverseToolType = BindToolsInput | Tool;
type MessageContentReasoningBlockReasoningText = {
  type: "reasoning_content";
  reasoningText: {
    text: string;
    signature: string;
  };
};
type MessageContentReasoningBlockRedacted = {
  type: "reasoning_content";
  redactedContent: string;
};
type MessageContentReasoningBlockReasoningTextPartial = {
  type: "reasoning_content";
  reasoningText: {
    text: string;
  } | {
    signature: string;
  };
};
type MessageContentReasoningBlock = MessageContentReasoningBlockReasoningText | MessageContentReasoningBlockRedacted | MessageContentReasoningBlockReasoningTextPartial;
//#endregion
export { BedrockToolChoice, ChatBedrockConverseToolType, ConverseCommandParams, CredentialType, MessageContentReasoningBlock, MessageContentReasoningBlockReasoningText, MessageContentReasoningBlockReasoningTextPartial, MessageContentReasoningBlockRedacted };
//# sourceMappingURL=types.d.cts.map