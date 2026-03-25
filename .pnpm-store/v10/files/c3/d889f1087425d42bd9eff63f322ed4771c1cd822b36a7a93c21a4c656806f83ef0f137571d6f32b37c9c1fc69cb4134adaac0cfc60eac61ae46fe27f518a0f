import { FinalRequestOptions } from "../internal/request-options.mjs";
import { type BaseAnthropic } from "../client.mjs";
import { APIPromise } from "./api-promise.mjs";
import { type APIResponseProps } from "../internal/parse.mjs";
export type PageRequestOptions = Pick<FinalRequestOptions, 'query' | 'headers' | 'body' | 'path' | 'method'>;
export declare abstract class AbstractPage<Item> implements AsyncIterable<Item> {
    #private;
    protected options: FinalRequestOptions;
    protected response: Response;
    protected body: unknown;
    constructor(client: BaseAnthropic, response: Response, body: unknown, options: FinalRequestOptions);
    abstract nextPageRequestOptions(): PageRequestOptions | null;
    abstract getPaginatedItems(): Item[];
    hasNextPage(): boolean;
    getNextPage(): Promise<this>;
    iterPages(): AsyncGenerator<this>;
    [Symbol.asyncIterator](): AsyncGenerator<Item>;
}
/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
export declare class PagePromise<PageClass extends AbstractPage<Item>, Item = ReturnType<PageClass['getPaginatedItems']>[number]> extends APIPromise<PageClass> implements AsyncIterable<Item> {
    constructor(client: BaseAnthropic, request: Promise<APIResponseProps>, Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass);
    /**
     * Allow auto-paginating iteration on an unawaited list call, eg:
     *
     *    for await (const item of client.items.list()) {
     *      console.log(item)
     *    }
     */
    [Symbol.asyncIterator](): AsyncGenerator<Item>;
}
export interface PageResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
    first_id: string | null;
    last_id: string | null;
}
export interface PageParams {
    /**
     * Number of items per page.
     */
    limit?: number;
    before_id?: string;
    after_id?: string;
}
export declare class Page<Item> extends AbstractPage<Item> implements PageResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
    first_id: string | null;
    last_id: string | null;
    constructor(client: BaseAnthropic, response: Response, body: PageResponse<Item>, options: FinalRequestOptions);
    getPaginatedItems(): Item[];
    hasNextPage(): boolean;
    nextPageRequestOptions(): PageRequestOptions | null;
}
export interface TokenPageResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
    next_page: string | null;
}
export interface TokenPageParams {
    /**
     * Number of items per page.
     */
    limit?: number;
    page_token?: string;
}
export declare class TokenPage<Item> extends AbstractPage<Item> implements TokenPageResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
    next_page: string | null;
    constructor(client: BaseAnthropic, response: Response, body: TokenPageResponse<Item>, options: FinalRequestOptions);
    getPaginatedItems(): Item[];
    hasNextPage(): boolean;
    nextPageRequestOptions(): PageRequestOptions | null;
}
export interface PageCursorResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
    next_page: string | null;
}
export interface PageCursorParams {
    /**
     * Number of items per page.
     */
    limit?: number;
    page?: string | null;
}
export declare class PageCursor<Item> extends AbstractPage<Item> implements PageCursorResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
    next_page: string | null;
    constructor(client: BaseAnthropic, response: Response, body: PageCursorResponse<Item>, options: FinalRequestOptions);
    getPaginatedItems(): Item[];
    hasNextPage(): boolean;
    nextPageRequestOptions(): PageRequestOptions | null;
}
//# sourceMappingURL=pagination.d.mts.map