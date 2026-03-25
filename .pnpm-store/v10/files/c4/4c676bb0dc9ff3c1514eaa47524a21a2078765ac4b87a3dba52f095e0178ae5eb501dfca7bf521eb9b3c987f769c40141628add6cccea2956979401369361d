import type { ClientOptions } from "openai";
import { LogLine } from "../../types/log";
import { AvailableModel } from "../../types/model";
import { LLMCache } from "../cache/LLMCache";
import { CreateChatCompletionOptions, LLMClient, LLMResponse } from "./LLMClient";
export declare class CerebrasClient extends LLMClient {
    type: "cerebras";
    private client;
    private cache;
    private enableCaching;
    clientOptions: ClientOptions;
    hasVision: boolean;
    constructor({ enableCaching, cache, modelName, clientOptions, userProvidedInstructions, }: {
        logger: (message: LogLine) => void;
        enableCaching?: boolean;
        cache?: LLMCache;
        modelName: AvailableModel;
        clientOptions?: ClientOptions;
        userProvidedInstructions?: string;
    });
    createChatCompletion<T = LLMResponse>({ options, retries, logger, }: CreateChatCompletionOptions): Promise<T>;
}
