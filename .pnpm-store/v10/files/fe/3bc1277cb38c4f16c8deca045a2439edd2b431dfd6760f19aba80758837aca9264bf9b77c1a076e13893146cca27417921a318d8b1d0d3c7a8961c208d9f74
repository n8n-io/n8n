import { Client, PathUncheckedResponse } from "@azure-rest/core-client";
/**
 * Options for the byPage method
 */
export interface PageSettings {
    /**
     * A reference to a specific page to start iterating from.
     */
    continuationToken?: string;
}
/**
 * An interface that describes a page of results.
 */
export type ContinuablePage<TElement, TPage = TElement[]> = TPage & {
    /**
     * The token that keeps track of where to continue the iterator
     */
    continuationToken?: string;
};
/**
 * An interface that allows async iterable iteration both to completion and by page.
 */
export interface PagedAsyncIterableIterator<TElement, TPage = TElement[], TPageSettings extends PageSettings = PageSettings> {
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
    byPage: (settings?: TPageSettings) => AsyncIterableIterator<ContinuablePage<TElement, TPage>>;
}
/**
 * An interface that describes how to communicate with the service.
 */
export interface PagedResult<TElement, TPage = TElement[], TPageSettings extends PageSettings = PageSettings> {
    /**
     * Link to the first page of results.
     */
    firstPageLink?: string;
    /**
     * A method that returns a page of results.
     */
    getPage: (pageLink?: string) => Promise<{
        page: TPage;
        nextPageLink?: string;
    } | undefined>;
    /**
     * a function to implement the `byPage` method on the paged async iterator.
     */
    byPage?: (settings?: TPageSettings) => AsyncIterableIterator<ContinuablePage<TElement, TPage>>;
    /**
     * A function to extract elements from a page.
     */
    toElements?: (page: TPage) => TElement[];
}
/**
 * Options for the paging helper
 */
export interface BuildPagedAsyncIteratorOptions {
    itemName?: string;
    nextLinkName?: string;
}
/**
 * Helper to paginate results in a generic way and return a PagedAsyncIterableIterator
 */
export declare function buildPagedAsyncIterator<TElement, TPage = TElement[], TPageSettings extends PageSettings = PageSettings, TResponse extends PathUncheckedResponse = PathUncheckedResponse>(client: Client, getInitialResponse: () => PromiseLike<TResponse>, processResponseBody: (result: TResponse) => PromiseLike<unknown>, expectedStatuses: string[], options?: BuildPagedAsyncIteratorOptions): PagedAsyncIterableIterator<TElement, TPage, TPageSettings>;
//# sourceMappingURL=pagingHelpers.d.ts.map