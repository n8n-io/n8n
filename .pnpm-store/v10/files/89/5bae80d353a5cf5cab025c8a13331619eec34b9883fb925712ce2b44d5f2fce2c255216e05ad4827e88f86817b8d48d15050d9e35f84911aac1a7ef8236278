import { z } from 'zod';
import { ResponseFormat } from "../models/components/responseformat.js";
import * as components from "../models/components/index.js";
export declare function transformToChatCompletionRequest<T extends z.ZodTypeAny>(parsedRequest: ParsedChatCompletionRequest<T>): components.ChatCompletionRequest;
export type ParsedChatCompletionRequest<T extends z.ZodTypeAny> = Omit<components.ChatCompletionRequest, 'responseFormat'> & {
    responseFormat: T;
};
export type ParsedAssistantMessage<T extends z.ZodTypeAny> = components.AssistantMessage & {
    parsed?: z.infer<T> | undefined;
};
export type ParsedChatCompletionChoice<T extends z.ZodTypeAny> = Omit<components.ChatCompletionChoice, 'message'> & {
    message?: ParsedAssistantMessage<T> | undefined;
};
export type ParsedChatCompletionResponse<T extends z.ZodTypeAny> = Omit<components.ChatCompletionResponse, 'choices'> & {
    choices?: Array<ParsedChatCompletionChoice<T>> | undefined;
};
export declare function convertToParsedChatCompletionResponse<T extends z.ZodTypeAny>(response: components.ChatCompletionResponse, responseFormat: T): ParsedChatCompletionResponse<T>;
export declare function responseFormatFromZodObject<T extends z.ZodTypeAny>(responseFormat: T): ResponseFormat;
//# sourceMappingURL=structChat.d.ts.map