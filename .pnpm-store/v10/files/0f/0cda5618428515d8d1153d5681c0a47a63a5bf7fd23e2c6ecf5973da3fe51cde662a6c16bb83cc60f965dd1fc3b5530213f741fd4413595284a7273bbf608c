//#region src/utils/async_caller.d.ts
type ResponseCallback = (response?: Response) => Promise<boolean>;
interface AsyncCallerParams {
  /**
   * The maximum number of concurrent calls that can be made.
   * Defaults to `Infinity`, which means no limit.
   */
  maxConcurrency?: number;
  /**
   * The maximum number of retries that can be made for a single call,
   * with an exponential backoff between each attempt. Defaults to 6.
   */
  maxRetries?: number;
  onFailedResponseHook?: ResponseCallback;
  /**
   * Specify a custom fetch implementation.
   *
   * By default we expect the `fetch` is available in the global scope.
   */
  fetch?: typeof fetch | ((...args: any[]) => any);
}
interface AsyncCallerCallOptions {
  signal?: AbortSignal;
}
/**
 * A class that can be used to make async calls with concurrency and retry logic.
 *
 * This is useful for making calls to any kind of "expensive" external resource,
 * be it because it's rate-limited, subject to network issues, etc.
 *
 * Concurrent calls are limited by the `maxConcurrency` parameter, which defaults
 * to `Infinity`. This means that by default, all calls will be made in parallel.
 *
 * Retries are limited by the `maxRetries` parameter, which defaults to 5. This
 * means that by default, each call will be retried up to 5 times, with an
 * exponential backoff between each attempt.
 */
declare class AsyncCaller {
  protected maxConcurrency: AsyncCallerParams["maxConcurrency"];
  protected maxRetries: AsyncCallerParams["maxRetries"];
  private queue;
  private onFailedResponseHook?;
  private customFetch?;
  constructor(params: AsyncCallerParams);
  call<A extends any[], T extends (...args: A) => Promise<any>>(callable: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;
  callWithOptions<A extends any[], T extends (...args: A) => Promise<any>>(options: AsyncCallerCallOptions, callable: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;
  fetch(...args: Parameters<typeof fetch>): ReturnType<typeof fetch>;
}
//#endregion
export { AsyncCaller, AsyncCallerParams };
//# sourceMappingURL=async_caller.d.cts.map