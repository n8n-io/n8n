export type XaiChatPrompt = Array<XaiChatMessage>;

export type XaiChatMessage =
  | XaiSystemMessage
  | XaiUserMessage
  | XaiAssistantMessage
  | XaiToolMessage;

export interface XaiSystemMessage {
  role: 'system';
  content: string;
}

export interface XaiUserMessage {
  role: 'user';
  content: string | Array<XaiUserMessageContent>;
}

export type XaiUserMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface XaiAssistantMessage {
  role: 'assistant';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface XaiToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

// xai tool choice
export type XaiToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } };
