/**
 * Converts an AsyncIterator to a ReadableStream.
 *
 * @template T - The type of elements produced by the AsyncIterator.
 * @param { <T>} iterator - The AsyncIterator to convert.
 * @returns {ReadableStream<T>} - A ReadableStream that provides the same data as the AsyncIterator.
 */
export function convertAsyncIteratorToReadableStream<T>(
  iterator: AsyncIterator<T>,
): ReadableStream<T> {
  let cancelled = false;

  return new ReadableStream<T>({
    /**
     * Called when the consumer wants to pull more data from the stream.
     *
     * @param {ReadableStreamDefaultController<T>} controller - The controller to enqueue data into the stream.
     * @returns {Promise<void>}
     */
    async pull(controller) {
      if (cancelled) return;
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    /**
     * Called when the consumer cancels the stream.
     */
    async cancel(reason?: unknown) {
      cancelled = true;
      if (iterator.return) {
        try {
          await iterator.return(reason);
        } catch {
          // intentionally ignore errors during cancellation
        }
      }
    },
  });
}
