/** @internal */
export function isAsyncIterable(value: any): value is AsyncIterable<unknown> {
  return value != null && Symbol.asyncIterator in value;
}
