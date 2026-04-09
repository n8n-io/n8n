export function convertArrayToReadableStream<T>(
  values: T[],
): ReadableStream<T> {
  return new ReadableStream({
    start(controller) {
      try {
        for (const value of values) {
          controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    },
  });
}
