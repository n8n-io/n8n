/**
 * Creates the TypeError to throw if an invalid object is passed to `from` or `scheduled`.
 * @param input The object that was passed.
 */
export function createInvalidObservableTypeError(input: any) {
  // TODO: We should create error codes that can be looked up, so this can be less verbose.
  return new TypeError(
    `You provided ${
      input !== null && typeof input === 'object' ? 'an invalid object' : `'${input}'`
    } where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.`
  );
}
