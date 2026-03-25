import { ChatModelEnum, MessageModel } from '../../pinecone-generated-ts-fetch/assistant_data';
import type { ChatModel } from '../../pinecone-generated-ts-fetch/assistant_data';
import { AsstDataOperationsProvider } from './asstDataOperationsProvider';
import type { ChatOptions } from './types';
export declare const chat: (assistantName: string, apiProvider: AsstDataOperationsProvider) => (options: ChatOptions) => Promise<ChatModel>;
export declare const validateChatOptions: (options: ChatOptions) => void;
/**
 * Validates the messages passed to the Assistant.
 *
 * @param options - A {@link ChatRequest} object containing the messages to send to the Assistant.
 * @throws An Error `role` key is not one of `user` or `assistant`.
 * @throws An Error if the message object does not have exactly two keys: `role` and `content`.
 * @returns An array of {@link MessageModel} objects containing the messages to send to the Assistant.
 */
export declare const messagesValidation: (options: ChatOptions) => MessageModel[];
/**
 * Validates the model passed to the Assistant.
 *
 * @param options - A {@link ChatRequest} object containing the model to use for the Assistant.
 * @throws An Error if the model is not one of the available models as outlined in {@link ChatModelEnum}.
 */
export declare const modelValidation: (options: ChatOptions) => ChatModelEnum;
