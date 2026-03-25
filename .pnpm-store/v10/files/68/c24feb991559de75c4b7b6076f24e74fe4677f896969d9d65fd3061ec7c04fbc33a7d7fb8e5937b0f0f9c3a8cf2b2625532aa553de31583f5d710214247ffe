import { BaseCache } from "@langchain/core/caches";
import { Generation } from "@langchain/core/outputs";
import { ICacheClient } from "@gomomento/sdk-core";

//#region src/caches/momento.d.ts

/**
 * The settings to instantiate the Momento standard cache.
 */
interface MomentoCacheProps {
  /**
   * The Momento cache client.
   */
  client: ICacheClient;
  /**
   * The name of the cache to use to store the data.
   */
  cacheName: string;
  /**
   * The time to live for the cache items. If not specified,
   * the cache client default is used.
   */
  ttlSeconds?: number;
  /**
   * If true, ensure that the cache exists before returning.
   * If false, the cache is not checked for existence.
   * Defaults to true.
   */
  ensureCacheExists?: true;
}
/**
 * A cache that uses Momento as the backing store.
 * See https://gomomento.com.
 * @example
 * ```typescript
 * const cache = new MomentoCache({
 *   client: new CacheClient({
 *     configuration: Configurations.Laptop.v1(),
 *     credentialProvider: CredentialProvider.fromEnvironmentVariable({
 *       environmentVariableName: "MOMENTO_API_KEY",
 *     }),
 *     defaultTtlSeconds: 60 * 60 * 24, // Cache TTL set to 24 hours.
 *   }),
 *   cacheName: "langchain",
 * });
 * // Initialize the OpenAI model with Momento cache for caching responses
 * const model = new ChatOpenAI({
 *   model: "gpt-4o-mini",
 *   cache,
 * });
 * await model.invoke("How are you today?");
 * const cachedValues = await cache.lookup("How are you today?", "llmKey");
 * ```
 */
declare class MomentoCache extends BaseCache {
  private client;
  private readonly cacheName;
  private readonly ttlSeconds?;
  private constructor();
  /**
   * Create a new standard cache backed by Momento.
   *
   * @param {MomentoCacheProps} props The settings to instantiate the cache.
   * @param {ICacheClient} props.client The Momento cache client.
   * @param {string} props.cacheName The name of the cache to use to store the data.
   * @param {number} props.ttlSeconds The time to live for the cache items. If not specified,
   * the cache client default is used.
   * @param {boolean} props.ensureCacheExists If true, ensure that the cache exists before returning.
   * If false, the cache is not checked for existence. Defaults to true.
   * @throws {@link InvalidArgumentError} if {@link props.ttlSeconds} is not strictly positive.
   * @returns The Momento-backed cache.
   */
  static fromProps(props: MomentoCacheProps): Promise<MomentoCache>;
  /**
   * Validate the user-specified TTL, if provided, is strictly positive.
   * @param ttlSeconds The TTL to validate.
   */
  private validateTtlSeconds;
  /**
   * Lookup LLM generations in cache by prompt and associated LLM key.
   * @param prompt The prompt to lookup.
   * @param llmKey The LLM key to lookup.
   * @returns The generations associated with the prompt and LLM key, or null if not found.
   */
  lookup(prompt: string, llmKey: string): Promise<Generation[] | null>;
  /**
   * Update the cache with the given generations.
   *
   * Note this overwrites any existing generations for the given prompt and LLM key.
   *
   * @param prompt The prompt to update.
   * @param llmKey The LLM key to update.
   * @param value The generations to store.
   */
  update(prompt: string, llmKey: string, value: Generation[]): Promise<void>;
}
//#endregion
export { MomentoCache, MomentoCacheProps };
//# sourceMappingURL=momento.d.cts.map