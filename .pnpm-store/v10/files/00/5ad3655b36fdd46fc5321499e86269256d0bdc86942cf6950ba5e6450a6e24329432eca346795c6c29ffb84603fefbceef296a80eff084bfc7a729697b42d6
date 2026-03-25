import { LanguageModel } from "ai";
import { ChatCompletion } from "openai/resources/chat/completions";
import { CreateChatCompletionOptions, LLMClient } from "@/dist";
export declare class AISdkClient extends LLMClient {
    type: "aisdk";
    private model;
    constructor({ model }: {
        model: LanguageModel;
    });
    createChatCompletion<T = ChatCompletion>({ options, }: CreateChatCompletionOptions): Promise<T>;
}
