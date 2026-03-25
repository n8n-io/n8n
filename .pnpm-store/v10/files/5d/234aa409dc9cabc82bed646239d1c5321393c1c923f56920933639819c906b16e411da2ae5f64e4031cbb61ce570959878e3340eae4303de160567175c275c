import { IterableReadableStreamInterface } from "../types/_internal.cjs";

//#region src/utils/stream.d.ts
declare class IterableReadableStream<T> extends ReadableStream<T> implements IterableReadableStreamInterface<T> {
  reader: ReadableStreamDefaultReader<T>;
  ensureReader(): void;
  next(): Promise<IteratorResult<T>>;
  return(): Promise<IteratorResult<T>>;
  throw(e: any): Promise<IteratorResult<T>>;
  [Symbol.asyncIterator](): this;
  [Symbol.asyncDispose](): Promise<void>;
  static fromReadableStream<T>(stream: ReadableStream<T>): IterableReadableStream<T>;
  static fromAsyncGenerator<T>(generator: AsyncGenerator<T>): IterableReadableStream<T>;
}
declare function atee<T>(iter: AsyncGenerator<T>, length?: number): AsyncGenerator<T>[];
declare function concat<T extends Array<any> | string | number | Record<string, any> | any>(first: T, second: T): T;
declare class AsyncGeneratorWithSetup<S = unknown, T = unknown, TReturn = unknown, TNext = unknown> implements AsyncGenerator<T, TReturn, TNext> {
  private generator;
  setup: Promise<S>;
  config?: unknown;
  signal?: AbortSignal;
  private firstResult;
  private firstResultUsed;
  constructor(params: {
    generator: AsyncGenerator<T>;
    startSetup?: () => Promise<S>;
    config?: unknown;
    signal?: AbortSignal;
  });
  next(...args: [] | [TNext]): Promise<IteratorResult<T>>;
  return(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T>>;
  throw(e: Error): Promise<IteratorResult<T>>;
  [Symbol.asyncIterator](): this;
  [Symbol.asyncDispose](): Promise<void>;
}
declare function pipeGeneratorWithSetup<S, A extends unknown[], T, TReturn, TNext, U, UReturn, UNext>(to: (g: AsyncGenerator<T, TReturn, TNext>, s: S, ...args: A) => AsyncGenerator<U, UReturn, UNext>, generator: AsyncGenerator<T, TReturn, TNext>, startSetup: () => Promise<S>, signal: AbortSignal | undefined, ...args: A): Promise<{
  output: AsyncGenerator<U, UReturn, UNext>;
  setup: Awaited<S>;
}>;
//#endregion
export { AsyncGeneratorWithSetup, IterableReadableStream, type IterableReadableStreamInterface, atee, concat, pipeGeneratorWithSetup };
//# sourceMappingURL=stream.d.cts.map