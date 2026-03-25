import { StoredGeneration } from "../messages/base.js";
import { ToolMessage } from "../messages/tool.js";
import { AIMessage } from "../messages/ai.js";
import { ChatMessage } from "../messages/chat.js";
import { FunctionMessage } from "../messages/function.js";
import { HumanMessage } from "../messages/human.js";
import { SystemMessage } from "../messages/system.js";
import { MessageStructure, MessageToolSet } from "../messages/message.js";
import { HashKeyEncoder } from "../utils/hash.js";
import { Generation } from "../outputs.js";

//#region src/caches/index.d.ts
declare const defaultHashKeyEncoder: HashKeyEncoder;
declare function deserializeStoredGeneration(storedGeneration: StoredGeneration): {
  text: string;
  message: AIMessage<MessageStructure<MessageToolSet>> | ChatMessage<MessageStructure<MessageToolSet>> | FunctionMessage<MessageStructure<MessageToolSet>> | HumanMessage<MessageStructure<MessageToolSet>> | SystemMessage<MessageStructure<MessageToolSet>> | ToolMessage<MessageStructure<MessageToolSet>>;
} | {
  message?: undefined;
  text: string;
};
declare function serializeGeneration(generation: Generation): StoredGeneration;
/**
 * Base class for all caches. All caches should extend this class.
 */
declare abstract class BaseCache<T = Generation[]> {
  protected keyEncoder: HashKeyEncoder;
  /**
   * Sets a custom key encoder function for the cache.
   * This function should take a prompt and an LLM key and return a string
   * that will be used as the cache key.
   * @param keyEncoderFn The custom key encoder function.
   */
  makeDefaultKeyEncoder(keyEncoderFn: HashKeyEncoder): void;
  abstract lookup(prompt: string, llmKey: string): Promise<T | null>;
  abstract update(prompt: string, llmKey: string, value: T): Promise<void>;
}
/**
 * A cache for storing LLM generations that stores data in memory.
 */
declare class InMemoryCache<T = Generation[]> extends BaseCache<T> {
  private cache;
  constructor(map?: Map<string, T>);
  /**
   * Retrieves data from the cache using a prompt and an LLM key. If the
   * data is not found, it returns null.
   * @param prompt The prompt used to find the data.
   * @param llmKey The LLM key used to find the data.
   * @returns The data corresponding to the prompt and LLM key, or null if not found.
   */
  lookup(prompt: string, llmKey: string): Promise<T | null>;
  /**
   * Updates the cache with new data using a prompt and an LLM key.
   * @param prompt The prompt used to store the data.
   * @param llmKey The LLM key used to store the data.
   * @param value The data to be stored.
   */
  update(prompt: string, llmKey: string, value: T): Promise<void>;
  /**
   * Returns a global instance of InMemoryCache using a predefined global
   * map as the initial cache.
   * @returns A global instance of InMemoryCache.
   */
  static global(): InMemoryCache;
}
//#endregion
export { BaseCache, InMemoryCache, defaultHashKeyEncoder, deserializeStoredGeneration, serializeGeneration };
//# sourceMappingURL=index.d.ts.map