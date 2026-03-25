import { ContentPattern } from '../model/content-pattern.model';
import { RequestPattern } from '../model/request-pattern.model';
import { LoggedRequest } from '../model/logged-request.model';
export declare class RequestService {
    baseUri: string;
    constructor(baseUri: string);
    /**
     * Get all requests in journal
     */
    getAllRequests(): Promise<any>;
    /**
     * Delete all requests in journal
     */
    deleteAllRequests(): Promise<void>;
    /**
     * Get request by ID
     * @param id The UUID of the logged request
     */
    getRequest(uuid: string): Promise<any>;
    /**
     * Delete request by ID
     * @param id The UUID of the logged request
     */
    deleteRequest(uuid: string): Promise<void>;
    /**
     * Empty the request journal
     */
    resetAllRequests(): Promise<void>;
    /**
     * Count requests by criteria
     * @param id The UUID of the logged request
     */
    getCount(requestPattern: RequestPattern): Promise<any>;
    /**
     * Remove requests by criteria
     * @param requestPattern Request pattern as filter criteria
     */
    removeRequests(requestPattern: RequestPattern): Promise<any>;
    /**
     * Delete requests mappings matching metadata
     * @param contentPattern Content pattern (metadata) as filter criteria
     */
    removeRequestsByMetadata(contentPattern: ContentPattern): Promise<any>;
    /**
     * Retrieve details of requests logged in the journal matching the specified criteria
     * @param requestPattern Request pattern as filter criteria
     */
    findRequests(requestPattern: RequestPattern): Promise<any>;
    /**
     * Get details of logged requests that were not matched by any stub mapping
     */
    getUnmatchedRequests(): Promise<any>;
    /**
     * Retrieve near-misses for all unmatched requests
     */
    getUnmatchedNearMisses(): Promise<LoggedRequest[]>;
    /**
     * Find at most 3 near misses for closest stub mappings to the specified request
     * @param loggedRequest Logged request as filter criteria
     */
    getNearMissesByRequest(loggedRequest: LoggedRequest): Promise<any>;
    /**
     * Find at most 3 near misses for closest logged requests to the specified request pattern
     * @param requestPattern Request pattern as filter criteria
     */
    getNearMissesByRequestPattern(requestPattern: RequestPattern): Promise<any>;
}
