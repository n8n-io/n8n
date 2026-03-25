import type Anthropic from "@anthropic-ai/sdk";
import type { Stream } from "@anthropic-ai/sdk/streaming";
import type { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import type { RunTreeConfig } from "../index.js";
type ExtraRunTreeConfig = Pick<Partial<RunTreeConfig>, "name" | "metadata" | "tags">;
type MessagesNamespace = {
    create: (...args: any[]) => any;
    stream: (...args: any[]) => any;
};
type AnthropicType = {
    messages: MessagesNamespace;
    beta?: {
        messages?: MessagesNamespace;
    };
};
type PatchedAnthropicClient<T extends AnthropicType> = T & {
    messages: T["messages"] & {
        create: {
            (arg: Anthropic.MessageCreateParamsStreaming, arg2?: Anthropic.RequestOptions & {
                langsmithExtra?: ExtraRunTreeConfig;
            }): Promise<Stream<Anthropic.MessageStreamEvent>>;
        } & {
            (arg: Anthropic.MessageCreateParamsNonStreaming, arg2?: Anthropic.RequestOptions & {
                langsmithExtra?: ExtraRunTreeConfig;
            }): Promise<Anthropic.Message>;
        };
        stream: {
            (arg: Anthropic.MessageStreamParams, arg2?: Anthropic.RequestOptions & {
                langsmithExtra?: ExtraRunTreeConfig;
            }): MessageStream;
        };
    };
};
/**
 * Wraps an Anthropic client's completion methods, enabling automatic LangSmith
 * tracing. Method signatures are unchanged, with the exception that you can pass
 * an additional and optional "langsmithExtra" field within the second parameter.
 *
 * @param anthropic An Anthropic client instance.
 * @param options LangSmith options.
 * @returns The wrapped client.
 *
 * @example
 * ```ts
 * import Anthropic from "@anthropic-ai/sdk";
 * import { wrapAnthropic } from "langsmith/wrappers/anthropic";
 *
 * const anthropic = wrapAnthropic(new Anthropic());
 *
 * // Non-streaming
 * const message = await anthropic.messages.create({
 *   model: "claude-sonnet-4-20250514",
 *   max_tokens: 1024,
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 *
 * // Streaming
 * const messageStream = anthropic.messages.stream({
 *   model: "claude-sonnet-4-20250514",
 *   max_tokens: 1024,
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * const finalMessage = await messageStream.finalMessage();
 * ```
 */
export declare const wrapAnthropic: <T extends AnthropicType>(anthropic: T, options?: Partial<RunTreeConfig>) => PatchedAnthropicClient<T>;
export {};
