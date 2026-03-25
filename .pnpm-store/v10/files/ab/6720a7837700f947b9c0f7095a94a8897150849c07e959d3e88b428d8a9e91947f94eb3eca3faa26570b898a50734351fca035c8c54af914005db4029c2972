import { IterableReadableStreamInterface } from "../types/_internal.js";

//#region ../../langchain-core/dist/utils/stream.d.ts

//#region src/utils/stream.d.ts
/*
 * Support async iterator syntax for ReadableStreams in all environments.
 * Source: https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
declare class IterableReadableStream<T> extends ReadableStream<T> implements IterableReadableStreamInterface<T> {
  reader: ReadableStreamDefaultReader<T>;
  ensureReader(): void;
  next(): Promise<IteratorResult<T>>;
  return(): Promise<IteratorResult<T>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  throw(e: any): Promise<IteratorResult<T>>;
  [Symbol.asyncIterator](): this;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Not present in Node 18 types, required in latest Node 22
  [Symbol.asyncDispose](): Promise<void>;
  static fromReadableStream<T>(stream: ReadableStream<T>): IterableReadableStream<T>;
  static fromAsyncGenerator<T>(generator: AsyncGenerator<T>): IterableReadableStream<T>;
}
//#endregion
export { IterableReadableStream };
//# sourceMappingURL=stream.d.ts.map