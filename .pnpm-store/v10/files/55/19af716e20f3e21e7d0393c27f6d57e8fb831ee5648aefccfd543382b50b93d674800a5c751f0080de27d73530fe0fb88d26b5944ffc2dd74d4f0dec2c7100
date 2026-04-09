import { delay as delayFunction } from '@ai-sdk/provider-utils';

/**
 * Creates a ReadableStream that emits the provided values with an optional delay between each value.
 *
 * @param options - The configuration options
 * @param options.chunks - Array of values to be emitted by the stream
 * @param options.initialDelayInMs - Optional initial delay in milliseconds before emitting the first value (default: 0). Can be set to `null` to skip the initial delay. The difference between `initialDelayInMs: null` and `initialDelayInMs: 0` is that `initialDelayInMs: null` will emit the values without any delay, while `initialDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @param options.chunkDelayInMs - Optional delay in milliseconds between emitting each value (default: 0). Can be set to `null` to skip the delay. The difference between `chunkDelayInMs: null` and `chunkDelayInMs: 0` is that `chunkDelayInMs: null` will emit the values without any delay, while `chunkDelayInMs: 0` will emit the values with a delay of 0 milliseconds.
 * @returns A ReadableStream that emits the provided values
 */
export function simulateReadableStream<T>({
  chunks,
  initialDelayInMs = 0,
  chunkDelayInMs = 0,
  _internal,
}: {
  chunks: T[];
  initialDelayInMs?: number | null;
  chunkDelayInMs?: number | null;
  _internal?: {
    delay?: (ms: number | null) => Promise<void>;
  };
}): ReadableStream<T> {
  const delay = _internal?.delay ?? delayFunction;

  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        await delay(index === 0 ? initialDelayInMs : chunkDelayInMs);
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    },
  });
}
