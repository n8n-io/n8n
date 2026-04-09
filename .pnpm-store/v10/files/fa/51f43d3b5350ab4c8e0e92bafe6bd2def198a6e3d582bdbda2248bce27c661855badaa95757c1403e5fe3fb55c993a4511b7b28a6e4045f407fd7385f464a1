import { APIResource } from "../resource.js";
import * as Core from "../core.js";
export declare class Search extends APIResource {
    /**
     * Perform a web search and return structured results.
     */
    web(body: SearchWebParams, options?: Core.RequestOptions): Core.APIPromise<SearchWebResponse>;
}
/**
 * Response body for web search
 */
export interface SearchWebResponse {
    /**
     * The search query that was executed
     */
    query: string;
    /**
     * Unique identifier for the request
     */
    requestId: string;
    /**
     * List of search results
     */
    results: Array<SearchWebResponse.Result>;
}
export declare namespace SearchWebResponse {
    interface Result {
        /**
         * Unique identifier for the result
         */
        id: string;
        /**
         * The title of the search result
         */
        title: string;
        /**
         * The URL of the search result
         */
        url: string;
        /**
         * Author of the content if available
         */
        author?: string;
        /**
         * Favicon URL
         */
        favicon?: string;
        /**
         * Image URL if available
         */
        image?: string;
        /**
         * Publication date in ISO 8601 format
         */
        publishedDate?: string;
    }
}
export interface SearchWebParams {
    /**
     * The search query string
     */
    query: string;
    /**
     * Number of results to return (1-25)
     */
    numResults?: number;
}
export declare namespace Search {
    export { type SearchWebResponse as SearchWebResponse, type SearchWebParams as SearchWebParams };
}
//# sourceMappingURL=search.d.ts.map