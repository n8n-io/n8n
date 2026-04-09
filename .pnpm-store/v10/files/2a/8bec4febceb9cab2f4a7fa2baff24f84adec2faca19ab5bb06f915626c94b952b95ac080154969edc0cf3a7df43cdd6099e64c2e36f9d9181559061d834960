import { AbstractPage, Response, APIClient, FinalRequestOptions, PageInfo } from "./core.js";
export interface PageResponse<Item> {
    data: Array<Item>;
    object: string;
}
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
export declare class Page<Item> extends AbstractPage<Item> implements PageResponse<Item> {
    data: Array<Item>;
    object: string;
    constructor(client: APIClient, response: Response, body: PageResponse<Item>, options: FinalRequestOptions);
    getPaginatedItems(): Item[];
    /**
     * This page represents a response that isn't actually paginated at the API level
     * so there will never be any next page params.
     */
    nextPageParams(): null;
    nextPageInfo(): null;
}
export interface CursorPageResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
}
export interface CursorPageParams {
    after?: string;
    limit?: number;
}
export declare class CursorPage<Item extends {
    id: string;
}> extends AbstractPage<Item> implements CursorPageResponse<Item> {
    data: Array<Item>;
    has_more: boolean;
    constructor(client: APIClient, response: Response, body: CursorPageResponse<Item>, options: FinalRequestOptions);
    getPaginatedItems(): Item[];
    hasNextPage(): boolean;
    nextPageParams(): Partial<CursorPageParams> | null;
    nextPageInfo(): PageInfo | null;
}
//# sourceMappingURL=pagination.d.ts.map