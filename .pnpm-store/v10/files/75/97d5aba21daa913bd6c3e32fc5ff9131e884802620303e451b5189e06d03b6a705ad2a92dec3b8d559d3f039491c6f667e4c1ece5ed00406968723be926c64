/**
 * Welcome to the Stagehand Ollama client!
 *
 * This is a client for the Ollama API. It is a wrapper around the OpenAI API
 * that allows you to create chat completions with Ollama.
 *
 * To use this client, you need to have an Ollama instance running. You can
 * start an Ollama instance by running the following command:
 *
 * ```bash
 * ollama run llama3.2
 * ```
 */
import { CreateChatCompletionOptions, LLMClient } from "@/dist";
import { type ClientOptions } from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
export declare class OllamaClient extends LLMClient {
    type: "ollama";
    private client;
    constructor({ modelName, clientOptions, enableCaching, }: {
        modelName?: string;
        clientOptions?: ClientOptions;
        enableCaching?: boolean;
    });
    createChatCompletion<T = ChatCompletion>({ options, retries, logger, }: CreateChatCompletionOptions): Promise<T>;
}
