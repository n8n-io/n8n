import { CheckpointMetadata } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";

//#region src/pregel/utils/index.d.ts

type RetryPolicy = {
  /**
   * Amount of time that must elapse before the first retry occurs in milliseconds.
   * @default 500
   */
  initialInterval?: number;
  /**
   * Multiplier by which the interval increases after each retry.
   * @default 2
   */
  backoffFactor?: number;
  /**
   * Maximum amount of time that may elapse between retries in milliseconds.
   * @default 128000
   */
  maxInterval?: number;
  /**
   * Maximum amount of time that may elapse between retries.
   * @default 3
   */
  maxAttempts?: number;
  /** Whether to add random jitter to the interval between retries. */
  jitter?: boolean;
  /** A function that returns True for exceptions that should trigger a retry. */
  retryOn?: (e: any) => boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Whether to log a warning when a retry is attempted. Defaults to true. */
  logWarning?: boolean;
};
/**
 * Configuration for caching nodes.
 */
type CachePolicy = {
  /**
   * A function used to generate a cache key from node's input.
   * @returns A key for the cache.
   */
  keyFunc?: (args: unknown[]) => string;
  /**
   * The time to live for the cache in seconds.
   * If not defined, the entry will never expire.
   */
  ttl?: number;
};
//#endregion
export { CachePolicy, RetryPolicy };
//# sourceMappingURL=index.d.cts.map