/**
 * A type that combines AsyncIterable and ReadableStream.
 * This allows a ReadableStream to be consumed using for-await-of syntax.
 */
export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

/**
 * Wraps a ReadableStream and returns an object that is both a ReadableStream and an AsyncIterable.
 * This enables consumption of the stream using for-await-of, with proper resource cleanup on early exit or error.
 *
 * @template T The type of the stream's chunks.
 * @param source The source ReadableStream to wrap.
 * @returns An AsyncIterableStream that can be used as both a ReadableStream and an AsyncIterable.
 */
export function createAsyncIterableStream<T>(
  source: ReadableStream<T>,
): AsyncIterableStream<T> {
  // Pipe through a TransformStream to ensure a fresh, unlocked stream.
  const stream = source.pipeThrough(new TransformStream<T, T>());

  /**
   * Implements the async iterator protocol for the stream.
   * Ensures proper cleanup (cancelling and releasing the reader) on completion, early exit, or error.
   */
  (stream as AsyncIterableStream<T>)[Symbol.asyncIterator] = function (
    this: ReadableStream<T>,
  ): AsyncIterator<T> {
    const reader = this.getReader();

    let finished = false;

    /**
     * Cleans up the reader by cancelling and releasing the lock.
     */
    async function cleanup(cancelStream: boolean) {
      if (finished) return;

      finished = true;
      try {
        if (cancelStream) {
          await reader.cancel?.();
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {}
      }
    }

    return {
      /**
       * Reads the next chunk from the stream.
       * @returns A promise resolving to the next IteratorResult.
       */
      async next(): Promise<IteratorResult<T>> {
        if (finished) {
          return { done: true, value: undefined };
        }

        const { done, value } = await reader.read();

        if (done) {
          await cleanup(true);
          return { done: true, value: undefined };
        }

        return { done: false, value };
      },

      /**
       * May be called on early exit (e.g., break from for-await) or after completion.
       * Ensures the stream is cancelled and resources are released.
       * @returns A promise resolving to a completed IteratorResult.
       */
      async return(): Promise<IteratorResult<T>> {
        await cleanup(true);
        return { done: true, value: undefined };
      },

      /**
       * Called on early exit with error.
       * Ensures the stream is cancelled and resources are released, then rethrows the error.
       * @param err The error to throw.
       * @returns A promise that rejects with the provided error.
       */
      async throw(err: unknown): Promise<IteratorResult<T>> {
        await cleanup(true);
        throw err;
      },
    };
  };

  return stream as AsyncIterableStream<T>;
}
