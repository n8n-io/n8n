import type { ReadableStreamIteratorOptions } from "../core/asyncIterator.js";
/**
 * augment global readable stream interface
 */
declare global {
  // biome-ignore lint/suspicious/noExplicitAny: to be compatible with lib.dom.d.ts
  interface ReadableStream<R = any> {
    [Symbol.asyncIterator](): AsyncIterableIterator<R>;
    values(options?: ReadableStreamIteratorOptions): AsyncIterableIterator<R>;
  }
}
