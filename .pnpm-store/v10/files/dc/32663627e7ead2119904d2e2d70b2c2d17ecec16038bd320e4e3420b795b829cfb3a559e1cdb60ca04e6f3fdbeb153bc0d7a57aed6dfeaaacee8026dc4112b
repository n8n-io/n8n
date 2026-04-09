/**
 * Consumes a ReadableStream until it's fully read.
 *
 * This function reads the stream chunk by chunk until the stream is exhausted.
 * It doesn't process or return the data from the stream; it simply ensures
 * that the entire stream is read.
 *
 * @param options - The options for consuming the stream.
 * @param options.stream - The ReadableStream to be consumed.
 * @param options.onError - Optional callback to handle errors that occur during consumption.
 * @returns A promise that resolves when the stream is fully consumed.
 */
export async function consumeStream({
  stream,
  onError,
}: {
  stream: ReadableStream;
  onError?: (error: unknown) => void;
}): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } catch (error) {
    onError?.(error);
  } finally {
    reader.releaseLock();
  }
}
