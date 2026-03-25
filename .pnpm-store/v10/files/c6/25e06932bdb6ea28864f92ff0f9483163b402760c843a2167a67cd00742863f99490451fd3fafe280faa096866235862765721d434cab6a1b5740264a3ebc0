import type { OpenAI } from "openai";
import type { APIPromise } from "openai";
import type { RunTreeConfig } from "../index.js";
type OpenAIType = {
    beta?: any;
    chat: {
        completions: {
            create: (...args: any[]) => any;
            parse?: (...args: any[]) => any;
            stream?: (...args: any[]) => any;
        };
    };
    completions: {
        create: (...args: any[]) => any;
    };
    responses?: {
        create: (...args: any[]) => any;
        retrieve: (...args: any[]) => any;
        parse: (...args: any[]) => any;
        stream: (...args: any[]) => any;
    };
};
type ExtraRunTreeConfig = Pick<Partial<RunTreeConfig>, "name" | "metadata" | "tags">;
type PatchedOpenAIClient<T extends OpenAIType> = T & {
    chat: T["chat"] & {
        completions: T["chat"]["completions"] & {
            create: {
                (arg: OpenAI.ChatCompletionCreateParamsStreaming, arg2?: OpenAI.RequestOptions & {
                    langsmithExtra?: ExtraRunTreeConfig;
                }): APIPromise<AsyncGenerator<OpenAI.ChatCompletionChunk>>;
            } & {
                (arg: OpenAI.ChatCompletionCreateParamsNonStreaming, arg2?: OpenAI.RequestOptions & {
                    langsmithExtra?: ExtraRunTreeConfig;
                }): APIPromise<OpenAI.ChatCompletion>;
            };
        };
    };
    completions: T["completions"] & {
        create: {
            (arg: OpenAI.CompletionCreateParamsStreaming, arg2?: OpenAI.RequestOptions & {
                langsmithExtra?: ExtraRunTreeConfig;
            }): APIPromise<AsyncGenerator<OpenAI.Completion>>;
        } & {
            (arg: OpenAI.CompletionCreateParamsNonStreaming, arg2?: OpenAI.RequestOptions & {
                langsmithExtra?: ExtraRunTreeConfig;
            }): APIPromise<OpenAI.Completion>;
        };
    };
};
/**
 * Wraps an OpenAI client's completion methods, enabling automatic LangSmith
 * tracing. Method signatures are unchanged, with the exception that you can pass
 * an additional and optional "langsmithExtra" field within the second parameter.
 * @param openai An OpenAI client instance.
 * @param options LangSmith options.
 * @example
 * ```ts
 * import { OpenAI } from "openai";
 * import { wrapOpenAI } from "langsmith/wrappers/openai";
 *
 * const patchedClient = wrapOpenAI(new OpenAI());
 *
 * const patchedStream = await patchedClient.chat.completions.create(
 *   {
 *     messages: [{ role: "user", content: `Say 'foo'` }],
 *     model: "gpt-4.1-mini",
 *     stream: true,
 *   },
 *   {
 *     langsmithExtra: {
 *       metadata: {
 *         additional_data: "bar",
 *       },
 *     },
 *   },
 * );
 * ```
 */
export declare const wrapOpenAI: <T extends OpenAIType>(openai: T, options?: Partial<RunTreeConfig>) => PatchedOpenAIClient<T>;
export {};
