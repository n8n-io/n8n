import { BaseMessage } from "../messages/base.cjs";
import { RunnableConfig } from "./types.cjs";
import { Run } from "../tracers/base.cjs";
import { Runnable, RunnableBinding, RunnableBindingArgs } from "./base.cjs";
import { BaseChatMessageHistory, BaseListChatMessageHistory } from "../chat_history.cjs";

//#region src/runnables/history.d.ts
type GetSessionHistoryCallable = (...args: Array<any>) => Promise<BaseChatMessageHistory | BaseListChatMessageHistory> | BaseChatMessageHistory | BaseListChatMessageHistory;
interface RunnableWithMessageHistoryInputs<RunInput, RunOutput> extends Omit<RunnableBindingArgs<RunInput, RunOutput>, "bound" | "config"> {
  runnable: Runnable<RunInput, RunOutput>;
  getMessageHistory: GetSessionHistoryCallable;
  inputMessagesKey?: string;
  outputMessagesKey?: string;
  historyMessagesKey?: string;
  config?: RunnableConfig;
}
/**
 * Wraps a LCEL chain and manages history. It appends input messages
 * and chain outputs as history, and adds the current history messages to
 * the chain input.
 * @example
 * ```typescript
 * // pnpm install @langchain/anthropic @langchain/community @upstash/redis
 *
 * import {
 *   ChatPromptTemplate,
 *   MessagesPlaceholder,
 * } from "@langchain/core/prompts";
 * import { ChatAnthropic } from "@langchain/anthropic";
 * import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
 * // For demos, you can also use an in-memory store:
 * // import { ChatMessageHistory } from "@langchain/classic/stores/message/in_memory";
 *
 * const prompt = ChatPromptTemplate.fromMessages([
 *   ["system", "You're an assistant who's good at {ability}"],
 *   new MessagesPlaceholder("history"),
 *   ["human", "{question}"],
 * ]);
 *
 * const chain = prompt.pipe(new ChatAnthropic({}));
 *
 * const chainWithHistory = new RunnableWithMessageHistory({
 *   runnable: chain,
 *   getMessageHistory: (sessionId) =>
 *     new UpstashRedisChatMessageHistory({
 *       sessionId,
 *       config: {
 *         url: process.env.UPSTASH_REDIS_REST_URL!,
 *         token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 *       },
 *     }),
 *   inputMessagesKey: "question",
 *   historyMessagesKey: "history",
 * });
 *
 * const result = await chainWithHistory.invoke(
 *   {
 *     ability: "math",
 *     question: "What does cosine mean?",
 *   },
 *   {
 *     configurable: {
 *       sessionId: "some_string_identifying_a_user",
 *     },
 *   }
 * );
 *
 * const result2 = await chainWithHistory.invoke(
 *   {
 *     ability: "math",
 *     question: "What's its inverse?",
 *   },
 *   {
 *     configurable: {
 *       sessionId: "some_string_identifying_a_user",
 *     },
 *   }
 * );
 * ```
 */
declare class RunnableWithMessageHistory<RunInput, RunOutput> extends RunnableBinding<RunInput, RunOutput> {
  runnable: Runnable<RunInput, RunOutput>;
  inputMessagesKey?: string;
  outputMessagesKey?: string;
  historyMessagesKey?: string;
  getMessageHistory: GetSessionHistoryCallable;
  constructor(fields: RunnableWithMessageHistoryInputs<RunInput, RunOutput>);
  _getInputMessages(inputValue: string | BaseMessage | Array<BaseMessage> | Record<string, any>): Array<BaseMessage>;
  _getOutputMessages(outputValue: string | BaseMessage | Array<BaseMessage> | Record<string, any>): Array<BaseMessage>;
  _enterHistory(input: any, kwargs?: RunnableConfig): Promise<BaseMessage[]>;
  _exitHistory(run: Run, config: RunnableConfig): Promise<void>;
  _mergeConfig(...configs: Array<RunnableConfig | undefined>): Promise<Partial<RunnableConfig<Record<string, any>>>>;
}
//#endregion
export { RunnableWithMessageHistory, RunnableWithMessageHistoryInputs };
//# sourceMappingURL=history.d.cts.map