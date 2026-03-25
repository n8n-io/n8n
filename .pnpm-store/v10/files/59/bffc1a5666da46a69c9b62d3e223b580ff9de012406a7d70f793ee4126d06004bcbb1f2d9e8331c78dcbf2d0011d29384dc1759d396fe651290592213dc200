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
export interface PagedAsyncIterableIterator<T, PageT = T[], PageSettingsT = PageSettings> {
    /**
     * The next method, part of the iteration protocol
     */
    next(): Promise<IteratorResult<T>>;
    /**
     * The connection to the async iterator, part of the iteration protocol
     */
    [Symbol.asyncIterator](): PagedAsyncIterableIterator<T, PageT, PageSettingsT>;
    /**
     * Return an AsyncIterableIterator that works a page at a time
     */
    byPage: (settings?: PageSettingsT) => AsyncIterableIterator<PageT>;
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
    }>;
    /**
     * a function to implement the `byPage` method on the paged async iterator. The default is
     * one that sets the `maxPageSizeParam` from `settings.maxPageSize`.
     */
    byPage?: (settings?: TPageSettings) => AsyncIterableIterator<TPage>;
}
//# sourceMappingURL=models.d.ts.map
