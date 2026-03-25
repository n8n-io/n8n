import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGeneration } from "@langchain/core/outputs";
import { CreateChatCompletionOptions, LLMClient } from "@/dist";
export declare class LangchainClient extends LLMClient {
    type: "langchainClient";
    private model;
    constructor(model: BaseChatModel);
    createChatCompletion<T = ChatGeneration>({ options, }: CreateChatCompletionOptions): Promise<T>;
}
