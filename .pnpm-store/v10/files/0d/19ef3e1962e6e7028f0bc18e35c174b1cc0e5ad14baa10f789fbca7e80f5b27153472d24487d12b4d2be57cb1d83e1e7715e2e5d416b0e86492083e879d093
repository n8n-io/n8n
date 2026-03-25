//#region src/utils/stream.d.ts
type IterableReadableStreamInterface<T> = ReadableStream<T> & AsyncIterable<T>;
/**
 * Options for streaming with automatic retry logic.
 */
declare class IterableReadableStream<T> extends ReadableStream<T> implements IterableReadableStreamInterface<T> {
  reader: ReadableStreamDefaultReader<T>;
  ensureReader(): void;
  next(): Promise<IteratorResult<T>>;
  return(): Promise<IteratorResult<T>>;
  throw(e: any): Promise<IteratorResult<T>>;
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.asyncIterator](): this;
  static fromReadableStream<T>(stream: ReadableStream<T>): IterableReadableStream<T>;
  static fromAsyncGenerator<T>(generator: AsyncGenerator<T>): IterableReadableStream<T>;
}
//#endregion
export { IterableReadableStream };
//# sourceMappingURL=stream.d.cts.map