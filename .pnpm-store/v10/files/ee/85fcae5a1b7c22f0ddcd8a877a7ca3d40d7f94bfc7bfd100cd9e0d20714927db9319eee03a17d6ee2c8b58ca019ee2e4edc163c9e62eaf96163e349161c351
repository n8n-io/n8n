/**
 * An interface that tracks the settings for paged iteration
 */
export interface PageSettings {
    /**
     * The token that keeps track of where to continue the iterator
     */
    continuationToken?: string;
    /**
     * The size of the page during paged iteration
     */
    maxPageSize?: number;
}
/**
 * An interface that allows async iterable iteration both to completion and by page.
 */
export interface PagedAsyncIterableIterator<TElement, TPage = TElement[], TPageSettings = PageSettings> {
    /**
     * The next method, part of the iteration protocol
     */
    next(): Promise<IteratorResult<TElement>>;
    /**
     * The connection to the async iterator, part of the iteration protocol
     */
    [Symbol.asyncIterator](): PagedAsyncIterableIterator<TElement, TPage, TPageSettings>;
    /**
     * Return an AsyncIterableIterator that works a page at a time
     */
    byPage: (settings?: TPageSettings) => AsyncIterableIterator<TPage>;
}
/**
 * An interface that describes how to communicate with the service.
 */
export interface PagedResult<TPage, TPageSettings = PageSettings, TLink = string> {
    /**
     * Link to the first page of results.
     */
    firstPageLink: TLink;
    /**
     * A method that returns a page of results.
     */
    getPage: (pageLink: TLink, maxPageSize?: number) => Promise<{
        page: TPage;
        nextPageLink?: TLink;
    } | undefined>;
    /**
     * a function to implement the `byPage` method on the paged async iterator. The default is
     * one that sets the `maxPageSizeParam` from `settings.maxPageSize`.
     */
    byPage?: (settings?: TPageSettings) => AsyncIterableIterator<TPage>;
    /**
     * A function to extract elements from a page.
     */
    toElements?: (page: TPage) => unknown[];
}
/**
 * Paged collection of T items
 */
export type Paged<T> = {
    /**
     * The T items on this page
     */
    value: T[];
    /**
     * The link to the next page of items
     */
    nextLink?: string;
};
//# sourceMappingURL=models.d.ts.map