export function isAsyncIterable<T = any>(obj: any): obj is AsyncIterable<T> {
  return obj != null && typeof obj[Symbol.asyncIterator] === 'function';
}
