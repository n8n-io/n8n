declare function convertArrayToAsyncIterable<T>(values: T[]): AsyncIterable<T>;

declare function convertArrayToReadableStream<T>(values: T[]): ReadableStream<T>;

declare function convertAsyncIterableToArray<T>(iterable: AsyncIterable<T>): Promise<T[]>;

declare function convertReadableStreamToArray<T>(stream: ReadableStream<T>): Promise<T[]>;

declare function convertResponseStreamToArray(response: Response): Promise<string[]>;

declare function isNodeVersion(version: number): boolean;

declare function mockId({ prefix, }?: {
    prefix?: string;
}): () => string;

export { convertArrayToAsyncIterable, convertArrayToReadableStream, convertAsyncIterableToArray, convertReadableStreamToArray, convertResponseStreamToArray, isNodeVersion, mockId };
