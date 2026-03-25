declare module 'retry-request' {
  import * as request from 'request';
  import * as teenyRequest from 'teeny-request';

  type teenyRequestFunction = typeof teenyRequest extends Function
    ? typeof teenyRequest
    : never;

  namespace retryRequest {
    /**
     * Set the defaults for `retryRequest`.
     */
    const defaults: retryRequest.Options;
    /**
     * Determines the next retry based on the provided configuration.
     */
    function getNextRetryDelay(config: Options): number;
    interface Options {
      objectMode?: boolean;
      request: typeof request | teenyRequestFunction;
      retries?: number;
      noResponseRetries?: number;
      currentRetryAttempt?: number;
      maxRetryDelay?: number;
      retryDelayMultiplier?: number;
      totalTimeout?: number;
      shouldRetryFn?: (response: request.RequestResponse) => boolean;
    }
  }

  function retryRequest(
    requestOpts: request.Options,
    opts: retryRequest.Options,
    callback?: request.RequestCallback
  ): {abort: () => void};
  function retryRequest(
    requestOpts: request.Options,
    callback?: request.RequestCallback
  ): {abort: () => void};

  export = retryRequest;
}
