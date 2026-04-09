export type OpenAIChatPrompt = Array<ChatCompletionMessage>;

export type ChatCompletionMessage =
  | ChatCompletionSystemMessage
  | ChatCompletionDeveloperMessage
  | ChatCompletionUserMessage
  | ChatCompletionAssistantMessage
  | ChatCompletionToolMessage;

export interface ChatCompletionSystemMessage {
  role: 'system';
  content: string;
}

export interface ChatCompletionDeveloperMessage {
  role: 'developer';
  content: string;
}

export interface ChatCompletionUserMessage {
  role: 'user';
  content: string | Array<ChatCompletionContentPart>;
}

export type ChatCompletionContentPart =
  | ChatCompletionContentPartText
  | ChatCompletionContentPartImage
  | ChatCompletionContentPartInputAudio
  | ChatCompletionContentPartFile;

export interface ChatCompletionContentPartText {
  type: 'text';
  text: string;
}

export interface ChatCompletionContentPartImage {
  type: 'image_url';
  image_url: { url: string };
}

export interface ChatCompletionContentPartInputAudio {
  type: 'input_audio';
  input_audio: { data: string; format: 'wav' | 'mp3' };
}

export interface ChatCompletionContentPartFile {
  type: 'file';
  file: { filename: string; file_data: string } | { file_id: string };
}

export interface ChatCompletionAssistantMessage {
  role: 'assistant';
  content?: string | null;
  tool_calls?: Array<ChatCompletionMessageToolCall>;
}

export interface ChatCompletionMessageToolCall {
  type: 'function';
  id: string;
  function: {
    arguments: string;
    name: string;
  };
}

export interface ChatCompletionToolMessage {
  role: 'tool';
  content: string;
  tool_call_id: string;
}
