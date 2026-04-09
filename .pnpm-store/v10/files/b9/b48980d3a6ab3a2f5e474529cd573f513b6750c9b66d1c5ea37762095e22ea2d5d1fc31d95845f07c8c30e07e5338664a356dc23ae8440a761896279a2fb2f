import {
  type ChatCompletionAssistantMessageParam,
  type ChatCompletionFunctionMessageParam,
  type ChatCompletionMessageParam,
  type ChatCompletionToolMessageParam,
} from '../resources';

export const isAssistantMessage = (
  message: ChatCompletionMessageParam | null | undefined,
): message is ChatCompletionAssistantMessageParam => {
  return message?.role === 'assistant';
};

export const isFunctionMessage = (
  message: ChatCompletionMessageParam | null | undefined,
): message is ChatCompletionFunctionMessageParam => {
  return message?.role === 'function';
};

export const isToolMessage = (
  message: ChatCompletionMessageParam | null | undefined,
): message is ChatCompletionToolMessageParam => {
  return message?.role === 'tool';
};

export function isPresent<T>(obj: T | null | undefined): obj is T {
  return obj != null;
}
