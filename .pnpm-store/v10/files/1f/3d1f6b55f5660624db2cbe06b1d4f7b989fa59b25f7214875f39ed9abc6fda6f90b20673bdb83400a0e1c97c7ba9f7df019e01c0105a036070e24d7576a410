/**
 * the implementer that does all the heavy works
 */
declare class ReadableStreamAsyncIterableIteratorImpl<R, TReturn> implements AsyncIterator<R> {
    #private;
    constructor(reader: ReadableStreamDefaultReader<R>, preventCancel: boolean);
    next(): Promise<IteratorResult<R, undefined>>;
    return(value?: TReturn): Promise<IteratorReturnResult<TReturn>>;
}
declare const implementSymbol: unique symbol;
/**
 * declare `ReadableStreamAsyncIterableIterator` interaface
 */
interface ReadableStreamAsyncIterableIterator<R, TReturn> extends AsyncIterableIterator<R> {
    [implementSymbol]: ReadableStreamAsyncIterableIteratorImpl<R, TReturn>;
}
export interface ReadableStreamIteratorOptions {
    preventCancel?: boolean;
}
/**
 * Get an async iterable iterator from a readable stream
 * @param this
 * @param readableStreamIteratorOptions
 * @returns
 */
export declare function asyncIterator<R, TReturn>(this: ReadableStream<R>, { preventCancel }?: ReadableStreamIteratorOptions): ReadableStreamAsyncIterableIterator<R, TReturn>;
export {};
