import type { EndpointParams, EndpointV2 } from "@smithy/types";
/**
 * @internal
 *
 * Cache for endpoint ruleSet resolution.
 */
export declare class EndpointCache {
    private capacity;
    private data;
    private parameters;
    /**
     * @param [size] - desired average maximum capacity. A buffer of 10 additional keys will be allowed
     *                 before keys are dropped.
     * @param [params] - list of params to consider as part of the cache key.
     *
     * If the params list is not populated, no caching will happen.
     * This may be out of order depending on how the object is created and arrives to this class.
     */
    constructor({ size, params }: {
        size?: number;
        params?: string[];
    });
    /**
     * @param endpointParams - query for endpoint.
     * @param resolver - provider of the value if not present.
     * @returns endpoint corresponding to the query.
     */
    get(endpointParams: EndpointParams, resolver: () => EndpointV2): EndpointV2;
    size(): number;
    /**
     * @returns cache key or false if not cachable.
     */
    private hash;
}
