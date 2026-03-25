import { ReadableStreamLike } from '../types';
import { isFunction } from './isFunction';

export async function* readableStreamLikeToAsyncGenerator<T>(readableStream: ReadableStreamLike<T>): AsyncGenerator<T> {
  const reader = readableStream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        return;
      }
      yield value!;
    }
  } finally {
    reader.releaseLock();
  }
}

export function isReadableStreamLike<T>(obj: any): obj is ReadableStreamLike<T> {
  // We don't want to use instanceof checks because they would return
  // false for instances from another Realm, like an <iframe>.
  return isFunction(obj?.getReader);
}
