import { createApis } from './api-client.js';
import { QdrantClientConfigError } from './errors.js';
import { PACKAGE_VERSION, ClientVersion } from './client-version.js';
const noResultError = () => {
    throw new Error('Result came uninitialized');
};
export class QdrantClient {
    constructor({ url, host, apiKey, https, prefix, port = 6333, timeout = 300000, checkCompatibility = true, ...args } = {}) {
        this._https = https ?? typeof apiKey === 'string';
        this._scheme = this._https ? 'https' : 'http';
        this._prefix = prefix ?? '';
        if (this._prefix.length > 0 && !this._prefix.startsWith('/')) {
            this._prefix = `/${this._prefix}`;
        }
        if (url && host) {
            throw new QdrantClientConfigError(`Only one of \`url\`, \`host\` params can be set. Url is ${url}, host is ${host}`);
        }
        if (host && (host.startsWith('http://') || host.startsWith('https://') || /:\d+$/.test(host))) {
            throw new QdrantClientConfigError('The `host` param is not expected to contain neither protocol (http:// or https://) nor port (:6333).\n' +
                'Try to use the `url` parameter instead.');
        }
        else if (url) {
            if (!(url.startsWith('http://') || url.startsWith('https://'))) {
                throw new QdrantClientConfigError('The `url` param expected to contain a valid URL starting with a protocol (http:// or https://).');
            }
            const parsedUrl = new URL(url);
            this._host = parsedUrl.hostname;
            this._port = parsedUrl.port ? Number(parsedUrl.port) : port;
            this._scheme = parsedUrl.protocol.replace(':', '');
            if (this._prefix.length > 0 && parsedUrl.pathname !== '/') {
                throw new QdrantClientConfigError('Prefix can be set either in `url` or in `prefix`.\n' +
                    `url is ${url}, prefix is ${parsedUrl.pathname}`);
            }
        }
        else {
            this._port = port;
            this._host = host ?? '127.0.0.1';
        }
        const headers = new Headers([['user-agent', 'qdrant-js/' + String(PACKAGE_VERSION)]]);
        const metadata = args.headers ?? {};
        Object.keys(metadata).forEach((field) => {
            if (metadata[field]) {
                headers.set(field, String(metadata[field]));
            }
        });
        if (typeof apiKey === 'string') {
            if (this._scheme === 'http') {
                console.warn('Api key is used with unsecure connection.');
            }
            headers.set('api-key', apiKey);
        }
        const address = this._port ? `${this._host}:${this._port}` : this._host;
        this._restUri = `${this._scheme}://${address}${this._prefix}`;
        const connections = args.maxConnections;
        const restArgs = { headers, timeout, connections };
        this._openApiClient = createApis(this._restUri, restArgs);
        if (checkCompatibility) {
            this._openApiClient
                .root({})
                .then((response) => {
                const serverVersion = response.data.version;
                if (!ClientVersion.isCompatible(PACKAGE_VERSION, serverVersion)) {
                    console.warn(`Client version ${PACKAGE_VERSION} is incompatible with server version ${serverVersion}. Major versions should match and minor version difference must not exceed 1. Set checkCompatibility=false to skip version check.`);
                }
            })
                .catch(() => {
                console.warn(`Failed to obtain server version. Unable to check client-server compatibility. Set checkCompatibility=false to skip version check.`);
            });
        }
    }
    /**
     * API getter
     *
     * @returns An instance of an API, generated from OpenAPI schema.
     */
    api() {
        return this._openApiClient;
    }
    /**
     * Search for points in multiple collections
     *
     * @param collectionName Name of the collection
     * @param {object} args -
     *     - searches: List of search requests
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     * @returns List of search responses
     */
    async searchBatch(collection_name, { searches, consistency, timeout, }) {
        const response = await this._openApiClient.searchBatchPoints({
            collection_name,
            consistency,
            timeout,
            searches,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Search for closest vectors in collection taking into account filtering conditions
     *
     * @param collection_name Collection to search in
     * @param {object} args -
     *      - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *      - vector:
     *          Search for vectors closest to this.
     *          Can be either a vector itself, or a named vector, or a tuple of vector name and vector itself
     *      - filter:
     *          - Exclude vectors which doesn't fit given conditions.
     *          - If `None` - search among all vectors
     *      - params: Additional search params
     *      - limit: How many results return
     *      - offset:
     *          Offset of the first result to return.
     *          May be used to paginate results.
     *          Note: large offset values may cause performance issues.
     *      - with_payload:
     *          - Specify which stored payload should be attached to the result.
     *          - If `True` - attach all payload
     *          - If `False` - do not attach any payload
     *          - If List of string - include only specified fields
     *          - If `PayloadSelector` - use explicit rules
     *      - with_vector:
     *          - If `True` - Attach stored vector to the search result.
     *          - If `False` - Do not attach vector.
     *          - If List of string - include only specified fields
     *          - Default: `False`
     *      - score_threshold:
     *          Define a minimal score threshold for the result.
     *          If defined, less similar results will not be returned.
     *          Score of the returned result might be higher or smaller than the threshold depending
     *          on the Distance function used.
     *          E.g. for cosine similarity only higher scores will be returned.
     *      - consistency:
     *          Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *          Values:
     *              - int - number of replicas to query, values should present in all queried replicas
     *              - 'majority' - query all replicas, but return values present in the majority of replicas
     *              - 'quorum' - query the majority of replicas, return values present in all of them
     *              - 'all' - query all replicas, and return values present in all replicas
     *      - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     * @example
     *     // Search with filter
     *     client.search(
     *         "test_collection",
     *         {
     *             vector: [1.0, 0.1, 0.2, 0.7],
     *             filter: {
     *                 must: [
     *                     {
     *                         key: 'color',
     *                         range: {
     *                             color: 'red'
     *                         }
     *                     }
     *                 ]
     *             )
     *         }
     *     )
     * @returns List of found close points with similarity scores.
     */
    async search(collection_name, { shard_key, vector, limit = 10, offset = 0, filter, params, with_payload = true, with_vector = false, score_threshold, consistency, timeout, }) {
        const response = await this._openApiClient.searchPoints({
            collection_name,
            consistency,
            timeout,
            shard_key,
            vector,
            limit,
            offset,
            filter,
            params,
            with_payload,
            with_vector,
            score_threshold,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Perform multiple recommend requests in batch mode
     * @param collection_name Name of the collection
     * @param {object} args
     *     - searches: List of recommend requests
     *     - consistency:
     *         Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             - number - number of replicas to query, values should present in all queried replicas
     *             - 'majority' - query all replicas, but return values present in the majority of replicas
     *             - 'quorum' - query the majority of replicas, return values present in all of them
     *             - 'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     * @returns List of recommend responses
     */
    async recommendBatch(collection_name, { searches, consistency, timeout, }) {
        const response = await this._openApiClient.recommendBatchPoints({
            collection_name,
            searches,
            consistency,
            timeout,
        });
        return response.data.result ?? [];
    }
    /**
     * @alias recommendBatch
     */
    async recommend_batch(collection_name, { searches, consistency, timeout, }) {
        const response = await this._openApiClient.recommendBatchPoints({
            collection_name,
            searches,
            consistency,
            timeout,
        });
        return response.data.result ?? [];
    }
    /**
     * Recommendation request. Provides positive and negative examples of the vectors,
     * which can be ids of points that are already stored in the collection, raw vectors, or even ids and vectors combined.
     * Service should look for the points which are closer to positive examples and at the same time further to negative examples.
     * The concrete way of how to compare negative and positive distances is up to the `strategy` chosen.
     * @param collection_name Collection to search in
     * @param {object} args
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - positive:
     *         List of stored point IDs, which should be used as reference for similarity search.
     *         If there is only one ID provided - this request is equivalent to the regular search with vector of that point.
     *         If there are more than one IDs, Qdrant will attempt to search for similar to all of them.
     *         Recommendation for multiple vectors is experimental. Its behaviour may change in the future.
     *     - negative:
     *         List of stored point IDs, which should be dissimilar to the search result.
     *         Negative examples is an experimental functionality. Its behaviour may change in the future.
     *     - strategy:
     *         How to use positive and negative examples to find the results.
     *     - query_filter:
     *         - Exclude vectors which doesn't fit given conditions.
     *         - If `None` - search among all vectors
     *     - search_params: Additional search params
     *     - limit: How many results return
     *         - Default: `10`
     *     - offset:
     *         Offset of the first result to return.
     *         May be used to paginate results.
     *         Note: large offset values may cause performance issues.
     *         - Default: `0`
     *     - with_payload:
     *         - Specify which stored payload should be attached to the result.
     *         - If `True` - attach all payload
     *         - If `False` - do not attach any payload
     *         - If List of string - include only specified fields
     *         - If `PayloadSelector` - use explicit rules
     *         - Default: `true`
     *     - with_vector:
     *         - If `True` - Attach stored vector to the search result.
     *         - If `False` - Do not attach vector.
     *         - If List of string - include only specified fields
     *         - Default: `false`
     *     - score_threshold:
     *         Define a minimal score threshold for the result.
     *         If defined, less similar results will not be returned.
     *         Score of the returned result might be higher or smaller than the threshold depending
     *         on the Distance function used.
     *         E.g. for cosine similarity only higher scores will be returned.
     *     - using:
     *         Name of the vectors to use for recommendations.
     *         If `None` - use default vectors.
     *     - lookupFrom:
     *         Defines a location (collection and vector field name), used to lookup vectors for recommendations.
     *         If `None` - use current collection will be used.
     *     - consistency:
     *         Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *         - int - number of replicas to query, values should present in all queried replicas
     *         - 'majority' - query all replicas, but return values present in the majority of replicas
     *         - 'quorum' - query the majority of replicas, return values present in all of them
     *         - 'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     * @returns List of recommended points with similarity scores.
     */
    async recommend(collection_name, { shard_key, positive, negative, strategy, filter, params, limit = 10, offset = 0, with_payload = true, with_vector = false, score_threshold, using, lookup_from, consistency, timeout, }) {
        const response = await this._openApiClient.recommendPoints({
            collection_name,
            limit,
            shard_key,
            positive,
            negative,
            strategy,
            filter,
            params,
            offset,
            with_payload,
            with_vector,
            score_threshold,
            using,
            lookup_from,
            consistency,
            timeout,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Scroll over all (matching) points in the collection.
     * @param collection_name Name of the collection
     * @param {object} args
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - filter: If provided - only returns points matching filtering conditions
     *     - limit: How many points to return
     *     - offset: If provided - skip points with ids less than given `offset`
     *     - with_payload:
     *         - Specify which stored payload should be attached to the result.
     *         - If `True` - attach all payload
     *         - If `False` - do not attach any payload
     *         - If List of string - include only specified fields
     *         - If `PayloadSelector` - use explicit rules
     *         - Default: `true`
     *     - with_vector:
     *         - If `True` - Attach stored vector to the search result.
     *         - If `False` - Do not attach vector.
     *         - If List of string - include only specified fields
     *         - Default: `false`
     *     - consistency:
     *         Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *         - int - number of replicas to query, values should present in all queried replicas
     *         - 'majority' - query all replicas, but return values present in the majority of replicas
     *         - 'quorum' - query the majority of replicas, return values present in all of them
     *         - 'all' - query all replicas, and return values present in all replicas
     *     - order_by:
     *         Order the records by a payload field.
     * @returns
     *     A pair of (List of points) and (optional offset for the next scroll request).
     *     If next page offset is `None` - there is no more points in the collection to scroll.
     */
    async scroll(collection_name, { shard_key, filter, consistency, timeout, limit = 10, offset, with_payload = true, with_vector = false, order_by, } = {}) {
        const response = await this._openApiClient.scrollPoints({
            collection_name,
            shard_key,
            limit,
            offset,
            filter,
            with_payload,
            with_vector,
            order_by,
            consistency,
            timeout,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Count points in the collection.
     * Count points in the collection matching the given filter.
     * @param collection_name
     * @param {object} args
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - filter: filtering conditions
     *     - exact:
     *         If `True` - provide the exact count of points matching the filter.
     *         If `False` - provide the approximate count of points matching the filter. Works faster.
     *         Default: `true`
     * @returns Amount of points in the collection matching the filter.
     */
    async count(collection_name, { shard_key, filter, exact = true, timeout } = {}) {
        const response = await this._openApiClient.countPoints({
            collection_name,
            shard_key,
            filter,
            exact,
            timeout,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Get cluster information for a collection.
     * @param collection_name
     * @returns Operation result
     */
    async collectionClusterInfo(collection_name) {
        const response = await this._openApiClient.collectionClusterInfo({ collection_name });
        return response.data.result ?? noResultError();
    }
    /**
     * Update collection cluster setup
     * @param collection_name Name of the collection
     * @param {object} args
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - operation: Cluster operation to perform. Can be one of:
     *         - move_shard: Move a shard from one peer to another
     *         - replicate_shard: Replicate a shard to another peer
     *         - abort_transfer: Abort an ongoing shard transfer
     *         - drop_replica: Drop a replica from a peer
     *         - create_sharding_key: Create a new sharding key
     *         - drop_sharding_key: Drop an existing sharding key
     *         - restart_transfer: Restart a failed shard transfer
     *         - start_resharding: Start resharding operation
     *         - abort_resharding: Abort an ongoing resharding operation
     * @returns Operation result
     */
    async updateCollectionCluster(collection_name, { timeout, ...operation }) {
        const response = await this._openApiClient.updateCollectionCluster({
            collection_name,
            timeout,
            ...operation,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Update vectors
     * @param collection_name
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *         - Default: `true`
     *     - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - points: Points with named vectors
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     * @returns Operation result
     */
    async updateVectors(collection_name, { wait = true, ordering, points, shard_key, }) {
        const response = await this._openApiClient.updateVectors({
            collection_name,
            wait,
            ordering,
            points,
            shard_key,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Delete vectors
     * @param collection_name
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *         - Default: `true`
     *     - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - points: Deletes values from each point in this list
     *     - filter: Deletes values from points that satisfy this filter condition
     *     - vector: Vector names
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     * @returns Operation result
     */
    async deleteVectors(collection_name, { wait = true, ordering, points, filter, vector, shard_key, }) {
        const response = await this._openApiClient.deleteVectors({
            collection_name,
            wait,
            ordering,
            points,
            filter,
            vector,
            shard_key,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Search point groups
     * @param collection_name
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - vector: query search vector
     *     - filter: Look only for points which satisfies this conditions
     *     - params: Additional search params
     *     - with_payload: Select which payload to return with the response
     *     - with_vector: Whether to return the point vector with the result?
     *     - score_threshold: Define a minimal score threshold for the result. If defined, less similar results will not be returned. Score of the returned result might be higher or smaller than the threshold depending on the Distance function used. E.g. for cosine similarity only higher scores will be returned.
     *     - group_by: Payload field to group by, must be a string or number field. If the field contains more than 1 value, all values will be used for grouping. One point can be in multiple groups.
     *     - group_size: Maximum amount of points to return per group
     *     - limit: Maximum amount of groups to return
     * @returns Operation result
     */
    async searchPointGroups(collection_name, { consistency, timeout, shard_key, vector, filter, params, with_payload = null, with_vector = null, score_threshold, group_by, group_size, limit, }) {
        const response = await this._openApiClient.searchPointGroups({
            collection_name,
            consistency,
            timeout,
            shard_key,
            vector,
            filter,
            params,
            with_payload,
            with_vector,
            score_threshold,
            group_by,
            group_size,
            limit,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Recommend point groups
     * @param collection_name
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - positive: Look for vectors closest to those
     *     - negative: Try to avoid vectors like this
     *     - strategy: How to use positive and negative examples to find the results
     *     - filter: Look only for points which satisfies this conditions
     *     - params: Additional search params
     *     - with_payload: Select which payload to return with the response
     *     - with_vector: Whether to return the point vector with the result?
     *     - score_threshold: Define a minimal score threshold for the result. If defined, less similar results will not be returned. Score of the returned result might be higher or smaller than the threshold depending on the Distance function used. E.g. for cosine similarity only higher scores will be returned.
     *     - using: Define which vector to use for recommendation, if not specified - try to use default vector
     *     - lookup_from: The location used to lookup vectors. If not specified - use current collection. Note: the other collection should have the same vector size as the current collection
     *     - group_by: Payload field to group by, must be a string or number field. If the field contains more than 1 value, all values will be used for grouping. One point can be in multiple groups.
     *     - group_size: Maximum amount of points to return per group
     *     - limit: Maximum amount of groups to return
     * @returns Operation result
     */
    async recommendPointGroups(collection_name, { consistency, timeout, shard_key, positive, strategy, negative = [], filter, params, with_payload = null, with_vector = null, score_threshold, using = null, lookup_from = null, group_by, group_size, limit, }) {
        const response = await this._openApiClient.recommendPointGroups({
            collection_name,
            consistency,
            timeout,
            shard_key,
            positive,
            negative,
            strategy,
            filter,
            params,
            with_payload,
            with_vector,
            score_threshold,
            using,
            lookup_from,
            group_by,
            group_size,
            limit,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Update or insert a new point into the collection.
     * @param collection_name
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *         - Default: `true`
     *     - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - points: Batch or list of points to insert
     * @returns Operation result
     */
    async upsert(collection_name, { wait = true, ordering, ...points_or_batch }) {
        const response = await this._openApiClient.upsertPoints({
            collection_name,
            wait,
            ordering,
            ...points_or_batch,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Retrieve stored points by IDs
     * @param collection_name
     * @param {object} args -
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - ids: list of IDs to lookup
     *     - with_payload:
     *         - Specify which stored payload should be attached to the result.
     *         - If `True` - attach all payload
     *         - If `False` - do not attach any payload
     *         - If List of string - include only specified fields
     *         - If `PayloadSelector` - use explicit rules
     *         - Default: `true`
     *     - with_vector:
     *         - If `True` - Attach stored vector to the search result.
     *         - If `False` - Do not attach vector.
     *         - If List of string - Attach only specified vectors.
     *         - Default: `false`
     *     - consistency:
     *         Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *             Values:
     *                 - number - number of replicas to query, values should present in all queried replicas
     *                 - 'majority' - query all replicas, but return values present in the majority of replicas
     *                 - 'quorum' - query the majority of replicas, return values present in all of them
     *                 - 'all' - query all replicas, and return values present in all replicas
     * @returns List of points
     */
    async retrieve(collection_name, { shard_key, ids, with_payload = true, with_vector, consistency, timeout, }) {
        const response = await this._openApiClient.getPoints({
            collection_name,
            shard_key,
            ids,
            with_payload,
            with_vector,
            consistency,
            timeout,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Deletes selected points from collection
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *      - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - points_selector: List of affected points, filter or points selector.
     *         Example:
     *             - `points: [
     *                   1, 2, 3, "cd3b53f0-11a7-449f-bc50-d06310e7ed90"
     *               ]`
     *             - `filter: {
     *                    must: [
     *                        {
     *                            key: 'rand_number',
     *                            range: {
     *                                gte: 0.7
     *                            }
     *                        }
     *                    ]
     *                }`
     * @returns Operation result
     */
    async delete(collection_name, { wait, ordering, ...points_selector }) {
        const response = await this._openApiClient.deletePoints({
            collection_name,
            wait,
            ordering,
            ...points_selector,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Sets payload values for specified points.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *      - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - payload: Key-value pairs of payload to assign
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - key: Assigns payload to each point that satisfy this path of property
     *     - points|filter: List of affected points, filter or points selector.
     *         Example:
     *             - `points: [
     *                   1, 2, 3, "cd3b53f0-11a7-449f-bc50-d06310e7ed90"
     *               ]`
     *             - `filter: {
     *                    must: [
     *                        {
     *                            key: 'rand_number',
     *                            range: {
     *                                gte: 0.7
     *                            }
     *                        }
     *                    ]
     *                }`
     * @returns Operation result
     */
    async setPayload(collection_name, { payload, points, filter, shard_key, key, ordering, wait = true, }) {
        const response = await this._openApiClient.setPayload({
            collection_name,
            payload,
            points,
            filter,
            shard_key,
            key,
            wait,
            ordering,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Overwrites payload of the specified points
     * After this operation is applied, only the specified payload will be present in the point.
     * The existing payload, even if the key is not specified in the payload, will be deleted.
     * @param collection_name Name of the collection
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *      - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - payload: Key-value pairs of payload to assign
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - key: Assigns payload to each point that satisfy this path of property
     *     - points|filter: List of affected points, filter or points selector.
     *         Example:
     *             - `points: [
     *                   1, 2, 3, "cd3b53f0-11a7-449f-bc50-d06310e7ed90"
     *               ]`
     *             - `filter: {
     *                    must: [
     *                        {
     *                            key: 'rand_number',
     *                            range: {
     *                                gte: 0.7
     *                            }
     *                        }
     *                    ]
     *                }`
     * @returns Operation result
     */
    async overwritePayload(collection_name, { ordering, payload, points, filter, shard_key, key, wait = true, }) {
        const response = await this._openApiClient.overwritePayload({
            collection_name,
            payload,
            points,
            filter,
            shard_key,
            key,
            wait,
            ordering,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Remove values from point's payload
     * @param collection_name Name of the collection
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *      - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - keys: List of payload keys to remove.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - points|filter: List of affected points, filter or points selector.
     *         Example:
     *             - `points: [
     *                   1, 2, 3, "cd3b53f0-11a7-449f-bc50-d06310e7ed90"
     *               ]`
     *             - `filter: {
     *                    must: [
     *                        {
     *                            key: 'rand_number',
     *                            range: {
     *                                gte: 0.7
     *                            }
     *                        }
     *                    ]
     *                }`
     * @returns Operation result
     */
    async deletePayload(collection_name, { ordering, keys, points, filter, shard_key, wait = true, }) {
        const response = await this._openApiClient.deletePayload({
            collection_name,
            keys,
            points,
            filter,
            shard_key,
            wait,
            ordering,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Delete all payload for selected points
     * @param collection_name Name of the collection
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *      - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *     - points_selector: List of affected points, filter or points selector.
     *         Example:
     *             - `points: [
     *                   1, 2, 3, "cd3b53f0-11a7-449f-bc50-d06310e7ed90"
     *               ]`
     *             - `filter: {
     *                    must: [
     *                        {
     *                            key: 'rand_number',
     *                            range: {
     *                                gte: 0.7
     *                            }
     *                        }
     *                    ]
     *                }`
     * @returns Operation result
     */
    async clearPayload(collection_name, { ordering, wait = true, ...points_selector }) {
        const response = await this._openApiClient.clearPayload({
            collection_name,
            wait,
            ordering,
            ...points_selector,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Operation for performing changes of collection aliases.
     * Alias changes are atomic, meaning that no collection modifications can happen between alias operations.
     * @param {object} args
     *     - actions: List of operations to perform
     *     - timeout: Wait for operation commit timeout in seconds. If timeout is reached, request will return with service error.
     * @returns Operation result
     */
    async updateCollectionAliases({ actions, timeout, }) {
        const response = await this._openApiClient.updateAliases({ actions, timeout });
        return response.data.result ?? noResultError();
    }
    /**
     * Get collection aliases
     * @param collection_name Name of the collection
     * @returns Collection aliases
     */
    async getCollectionAliases(collection_name) {
        const response = await this._openApiClient.getCollectionAliases({ collection_name });
        return response.data.result ?? noResultError();
    }
    /**
     * Get all aliases
     * @returns All aliases of all collections
     */
    async getAliases() {
        const response = await this._openApiClient.getCollectionsAliases({});
        return response.data.result ?? noResultError();
    }
    /**
     * Get list name of all existing collections
     * @returns List of the collections
     */
    async getCollections() {
        const response = await this._openApiClient.getCollections({});
        return response.data.result ?? noResultError();
    }
    /**
     * Get detailed information about specified existing collection
     *
     * @param collection_name Name of the collection
     * @returns Detailed information about the collection
     */
    async getCollection(collection_name) {
        const response = await this._openApiClient.getCollection({ collection_name });
        return response.data.result ?? noResultError();
    }
    /**
     * Update parameters of the collection
     *
     * @param collection_name Name of the collection
     * @param {object} args
     *     - optimizer_config: Override for optimizer configuration
     *     - collection_params: Override for collection parameters
     *     - timeout: Wait for operation commit timeout in seconds. If timeout is reached, request will return with service error.
     * @returns Operation result
     */
    async updateCollection(collection_name, args) {
        const response = await this._openApiClient.updateCollection({
            collection_name,
            ...args,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Removes collection and all it's data
     * @param collection_name Name of the collection to delete
     * @param {object} args
     *     - timeout:
     *         Wait for operation commit timeout in seconds.
     *         If timeout is reached, request will return with service error.
     * @returns Operation result
     */
    async deleteCollection(collection_name, args) {
        const response = await this._openApiClient.deleteCollection({ collection_name, ...args });
        return response.data.result ?? noResultError();
    }
    /**
     * Create empty collection with given parameters
     * @returns Operation result
     * @param collectionName Name of the collection to recreate
     * @param {object} args
     *     - vectors_config:
     *         Configuration of the vector storage. Vector params contains size and distance for the vector storage.
     *         If dict is passed, service will create a vector storage for each key in the dict.
     *         If single VectorParams is passed, service will create a single anonymous vector storage.
     *     - shard_number: Number of shards in collection. Default is 1, minimum is 1.
     *     - sharding_method: Sharding method Default is Auto - points are distributed across all available shards Custom - points are distributed across shards according to shard key
     *     - replication_factor:
     *         Replication factor for collection. Default is 1, minimum is 1.
     *         Defines how many copies of each shard will be created.
     *         Have effect only in distributed mode.
     *     - write_consistency_factor:
     *         Write consistency factor for collection. Default is 1, minimum is 1.
     *         Defines how many replicas should apply the operation for us to consider it successful.
     *         Increasing this number will make the collection more resilient to inconsistencies, but will
     *         also make it fail if not enough replicas are available.
     *         Does not have any performance impact.
     *         Have effect only in distributed mode.
     *     - on_disk_payload:
     *         If true - point`s payload will not be stored in memory.
     *         It will be read from the disk every time it is requested.
     *         This setting saves RAM by (slightly) increasing the response time.
     *         Note: those payload values that are involved in filtering and are indexed - remain in RAM.
     *     - hnsw_config: Params for HNSW index
     *     - optimizers_config: Params for optimizer
     *     - wal_config: Params for Write-Ahead-Log
     *     - quantization_config: Params for quantization, if None - quantization will be disabled
     *     - init_from: Use data stored in another collection to initialize this collection
     *     - sparse_vectors: Sparse vector data config
     *     - strict_mode_config: Strict mode configuration
     *     - timeout:
     *         Wait for operation commit timeout in seconds.
     *         If timeout is reached, request will return with service error.
     */
    async createCollection(collection_name, { timeout, vectors, hnsw_config, on_disk_payload, optimizers_config, quantization_config, replication_factor, shard_number, sharding_method, wal_config, write_consistency_factor, sparse_vectors, strict_mode_config, }) {
        const response = await this._openApiClient.createCollection({
            collection_name,
            timeout,
            vectors,
            hnsw_config,
            on_disk_payload,
            optimizers_config,
            quantization_config,
            replication_factor,
            shard_number,
            sharding_method,
            wal_config,
            write_consistency_factor,
            sparse_vectors,
            strict_mode_config,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Delete and create empty collection with given parameters
     * @returns Operation result
     * @param collectionName Name of the collection to recreate
     * @param {object} args
     *     - vectorsConfig:
     *         Configuration of the vector storage. Vector params contains size and distance for the vector storage.
     *         If dict is passed, service will create a vector storage for each key in the dict.
     *         If single VectorParams is passed, service will create a single anonymous vector storage.
     *     - shardNumber: Number of shards in collection. Default is 1, minimum is 1.
     *     - sharding_method: Sharding method Default is Auto - points are distributed across all available shards Custom - points are distributed across shards according to shard key
     *     - replicationFactor:
     *         Replication factor for collection. Default is 1, minimum is 1.
     *         Defines how many copies of each shard will be created.
     *         Have effect only in distributed mode.
     *     - writeConsistencyFactor:
     *         Write consistency factor for collection. Default is 1, minimum is 1.
     *         Defines how many replicas should apply the operation for us to consider it successful.
     *         Increasing this number will make the collection more resilient to inconsistencies, but will
     *         also make it fail if not enough replicas are available.
     *         Does not have any performance impact.
     *         Have effect only in distributed mode.
     *     - onDiskPayload:
     *         If true - point`s payload will not be stored in memory.
     *         It will be read from the disk every time it is requested.
     *         This setting saves RAM by (slightly) increasing the response time.
     *         Note: those payload values that are involved in filtering and are indexed - remain in RAM.
     *     - hnswConfig: Params for HNSW index
     *     - optimizersConfig: Params for optimizer
     *     - walConfig: Params for Write-Ahead-Log
     *     - quantizationConfig: Params for quantization, if None - quantization will be disabled
     *     - initFrom: Use data stored in another collection to initialize this collection
     *     - sparse_vectors: Sparse vector data config
     *     - strict_mode_config: Strict mode configuration
     *     - timeout:
     *         Wait for operation commit timeout in seconds.
     *         If timeout is reached, request will return with service error.
     */
    async recreateCollection(collection_name, { timeout, vectors, hnsw_config, on_disk_payload, optimizers_config, quantization_config, replication_factor, shard_number, sharding_method, wal_config, write_consistency_factor, sparse_vectors, strict_mode_config, }) {
        const deleteResponse = await this._openApiClient.deleteCollection({
            collection_name,
            timeout,
        });
        if (!deleteResponse.ok) {
            throw new Error('Delete collection returned failed');
        }
        const response = await this._openApiClient.createCollection({
            collection_name,
            timeout,
            vectors,
            hnsw_config,
            on_disk_payload,
            optimizers_config,
            quantization_config,
            replication_factor,
            shard_number,
            sharding_method,
            wal_config,
            write_consistency_factor,
            sparse_vectors,
            strict_mode_config,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Creates index for a given payload field.
     * Indexed fields allow to perform filtered search operations faster.
     * @param collectionName Name of the collection
     * @param {object} args
     *     - fieldName: Name of the payload field.
     *     - fieldSchema: Type of data to index.
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *     - ordering:
     *         Define strategy for ordering of the points. Possible values:
     *         - 'weak'   - write operations may be reordered, works faster, default
     *         - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *         - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     * @returns Operation Result
     */
    async createPayloadIndex(collection_name, { wait, ordering, field_name, field_schema, }) {
        const response = await this._openApiClient.createFieldIndex({
            collection_name,
            field_name,
            field_schema,
            wait,
            ordering,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Removes index for a given payload field.
     * @param collection_name Name of the collection
     * @param field_name Name of the payload field
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *     - ordering:
     *         Define strategy for ordering of the points. Possible values:
     *         - 'weak'   - write operations may be reordered, works faster, default
     *         - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *         - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     * @returns Operation Result
     */
    async deletePayloadIndex(collection_name, field_name, { wait = true, ordering } = {}) {
        const response = await this._openApiClient.deleteFieldIndex({
            collection_name,
            field_name,
            wait,
            ordering,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * List all snapshots for a given collection
     * @param collection_name Name of the collection
     * @returns List of snapshots
     */
    async listSnapshots(collection_name) {
        const response = await this._openApiClient.listSnapshots({ collection_name });
        return response.data.result ?? noResultError();
    }
    /**
     * Create snapshot for a given collection
     * @param collection_name Name of the collection
     * @returns Snapshot description
     */
    async createSnapshot(collection_name, args) {
        const response = await this._openApiClient.createSnapshot({ collection_name, ...args });
        return response.data.result ?? null;
    }
    /**
     * Delete snapshot for a given collection
     * @param collection_name Name of the collection
     * @param snapshot_name Snapshot id
     * @returns True if snapshot was deleted
     */
    async deleteSnapshot(collection_name, snapshot_name, args) {
        const response = await this._openApiClient.deleteSnapshot({ collection_name, snapshot_name, ...args });
        return response.data.result ?? noResultError();
    }
    /**
     * List all snapshots for a whole storage
     * @returns List of snapshots
     */
    async listFullSnapshots() {
        const response = await this._openApiClient.listFullSnapshots({});
        return response.data.result ?? noResultError();
    }
    /**
     * Create snapshot for a whole storage
     * @returns Snapshot description
     */
    async createFullSnapshot(args) {
        const response = await this._openApiClient.createFullSnapshot(args ?? {});
        return response.data.result ?? noResultError();
    }
    /**
     * Delete snapshot for a whole storage
     * @param snapshot_name Snapshot name
     * @returns True if the snapshot was deleted
     */
    async deleteFullSnapshot(snapshot_name, args) {
        const response = await this._openApiClient.deleteFullSnapshot({ snapshot_name, ...args });
        return response.data.result ?? noResultError();
    }
    /**
     * Recover collection from snapshot
     * @param collection_name Name of the collection
     * @param {object} args
     *     - location:
     *         URL of the snapshot.
     *         Example:
     *             - URL `http://localhost:8080/collections/my_collection/snapshots/my_snapshot`
     *             - Local path `file:///qdrant/snapshots/test_collection-2022-08-04-10-49-10.snapshot`
     *     - priority:
     *         Defines source of truth for snapshot recovery
     *             - `snapshot` means - prefer snapshot data over the current state
     *             - `replica` means - prefer existing data over the snapshot
     *         Default: `replica`
     *     - checksum:
     *         SHA256 checksum to verify snapshot integrity before recovery
     * @returns True if the snapshot was recovered
     */
    async recoverSnapshot(collection_name, { location, priority, checksum, api_key }) {
        const response = await this._openApiClient.recoverFromSnapshot({
            collection_name,
            location,
            priority,
            checksum,
            api_key,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Batch update points
     * Apply a series of update operations for points, vectors and payloads.
     * @param collection_name Name of the collection
     * @param {object} args
     *     - wait: Await for the results to be processed.
     *         - If `true`, result will be returned only when all changes are applied
     *         - If `false`, result will be returned immediately after the confirmation of receiving.
     *      - ordering: Define strategy for ordering of the points. Possible values:
     *          - 'weak'   - write operations may be reordered, works faster, default
     *          - 'medium' - write operations go through dynamically selected leader,
     *                      may be inconsistent for a short period of time in case of leader change
     *          - 'strong' - Write operations go through the permanent leader,
     *                      consistent, but may be unavailable if leader is down
     *      - operations: List of operations to perform
     * @returns Operation result
     */
    async batchUpdate(collection_name, { wait = true, ordering, ...operations }) {
        const response = await this._openApiClient.batchUpdate({
            collection_name,
            wait,
            ordering,
            ...operations,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Recover from a snapshot
     * @param collection_name Name of the collection
     * @param shard_id Shard ID
     * @returns Operation result
     */
    async recoverShardFromSnapshot(collection_name, shard_id, { wait = true, ...shard_snapshot_recover }) {
        const response = await this._openApiClient.recoverShardFromSnapshot({
            collection_name,
            shard_id,
            wait,
            ...shard_snapshot_recover,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Get list of snapshots for a shard of a collection
     * @param collection_name Name of the collection
     * @param shard_id Shard ID
     * @returns Operation result
     */
    async listShardSnapshots(collection_name, shard_id) {
        const response = await this._openApiClient.listShardSnapshots({
            collection_name,
            shard_id,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Create new snapshot of a shard for a collection
     * @param collection_name Name of the collection
     * @param shard_id Shard ID
     * @returns Operation result
     */
    async createShardSnapshot(collection_name, shard_id, { wait = true }) {
        const response = await this._openApiClient.createShardSnapshot({
            collection_name,
            shard_id,
            wait,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Delete snapshot of a shard for a collection
     * @param collection_name Name of the collection
     * @param shard_id Shard ID
     * @param snapshot_name Snapshot name
     * @returns Operation result
     */
    async deleteShardSnapshot(collection_name, shard_id, snapshot_name, { wait = true }) {
        const response = await this._openApiClient.deleteShardSnapshot({
            collection_name,
            shard_id,
            snapshot_name,
            wait,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Create shard key
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - shards_number: How many shards to create for this key If not specified, will use the default value from config
     *     - replication_factor: How many replicas to create for each shard If not specified, will use the default value from config
     *     - placement: Placement of shards for this key List of peer ids, that can be used to place shards for this key If not specified, will be randomly placed among all peers
     *     - initial_state: Initial state of the shards for this key If not specified, will be `Initializing` first and then `Active` Warning: do not change this unless you know what you are doing.
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     * @returns Operation result
     */
    async createShardKey(collection_name, { shard_key, shards_number, replication_factor, placement, initial_state, timeout, }) {
        const response = await this._openApiClient.createShardKey({
            collection_name,
            shard_key,
            shards_number,
            replication_factor,
            placement,
            initial_state,
            timeout,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Delete shard key
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     * @returns Operation result
     */
    async deleteShardKey(collection_name, { shard_key, timeout }) {
        const response = await this._openApiClient.deleteShardKey({
            collection_name,
            shard_key,
            timeout,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Discover points
     * @description Use context and a target to find the most similar points to the target, constrained by the context.
     * When using only the context (without a target), a special search - called context search - is performed where pairs of points are used to generate a loss that guides the search towards the zone where most positive examples overlap. This means that the score minimizes the scenario of finding a point closer to a negative than to a positive part of a pair.
     * Since the score of a context relates to loss, the maximum score a point can get is 0.0, and it becomes normal that many points can have a score of 0.0.
     * When using target (with or without context), the score behaves a little different: The  integer part of the score represents the rank with respect to the context, while the decimal part of the score relates to the distance to the target. The context part of the score for  each pair is calculated +1 if the point is closer to a positive than to a negative part of a pair,  and -1 otherwise.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards
     *     - target: Look for vectors closest to this. When using the target (with or without context), the integer part of the score represents the rank with respect to the context, while the decimal part of the score relates to the distance to the target.
     *     - context: Pairs of { positive, negative } examples to constrain the search. When using only the context (without a target), a special search - called context search - is performed where pairs of points are used to generate a loss that guides the search towards the zone where most positive examples overlap. This means that the score minimizes the scenario of finding a point closer to a negative than to a positive part of a pair. Since the score of a context relates to loss, the maximum score a point can get is 0.0, and it becomes normal that many points can have a score of 0.0. For discovery search (when including a target), the context part of the score for each pair is calculated +1 if the point is closer to a positive than to a negative part of a pair, and -1 otherwise.
     *     - filter: Look only for points which satisfies this conditions
     *     - params: Additional search params
     *     - limit: Max number of result to return
     *     - offset: Offset of the first result to return. May be used to paginate results. Note: large offset values may cause performance issues.
     *     - with_payload: Select which payload to return with the response
     *     - with_vector: Whether to return the point vector with the result?
     *     - using: Define which vector to use for recommendation, if not specified - try to use default vector
     *     - lookup_from The location used to lookup vectors. If not specified - use current collection. Note: the other collection should have the same vector size as the current collection
     * @returns Operation result
     */
    async discoverPoints(collection_name, { consistency, timeout, shard_key, target, context, params, limit, offset, with_payload, with_vector, using, lookup_from, }) {
        const response = await this._openApiClient.discoverPoints({
            collection_name,
            consistency,
            timeout,
            shard_key,
            target,
            context,
            params,
            limit,
            offset,
            with_payload,
            with_vector,
            using,
            lookup_from,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Discover batch points
     * @description Look for points based on target and/or positive and negative example pairs, in batch.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - searches: List of searches
     * @returns Operation result
     */
    async discoverBatchPoints(collection_name, { consistency, timeout, searches, }) {
        const response = await this._openApiClient.discoverBatchPoints({
            collection_name,
            consistency,
            timeout,
            searches,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Returns information about the running Qdrant instance
     * @description Returns information about the running Qdrant instance like version and commit id
     * @returns Operation result
     */
    async versionInfo() {
        const response = await this._openApiClient.root({});
        return response.data;
    }
    /**
     * Check the existence of a collection
     * @param collection_name Name of the collection
     * @description Returns "true" if the given collection name exists, and "false" otherwise
     * @returns Operation result
     */
    async collectionExists(collection_name) {
        const response = await this._openApiClient.collectionExists({ collection_name });
        return response.data.result ?? noResultError();
    }
    /**
     * Query points
     * @description Universally query points. This endpoint covers all capabilities of search, recommend, discover, filters. But also enables hybrid and multi-stage queries.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards.
     *     - prefetch: Sub-requests to perform first. If present, the query will be performed on the results of the prefetch(es).
     *     - query: Query to perform. If missing without prefetches, returns points ordered by their IDs.
     *     - using: Define which vector name to use for querying. If missing, the default vector is used.
     *     - filter: Filter conditions - return only those points that satisfy the specified conditions.
     *     - params: Search params for when there is no prefetch
     *     - score_threshold: Return points with scores better than this threshold.
     *     - limit: Max number of points to return. Default is 10.
     *     - offset: Offset of the result. Skip this many points. Default is 0
     *     - with_vector: Options for specifying which vectors to include into the response. Default is false.
     *     - with_payload: Options for specifying which payload to include or not. Default is false.
     *     - lookup_from: The location to use for IDs lookup, if not specified - use the current collection and the 'using' vector Note: the other collection vectors should have the same vector size as the 'using' vector in the current collection.
     * @returns Operation result
     */
    async query(collection_name, { consistency, timeout, shard_key, prefetch, query, using, filter, params, score_threshold, limit, offset, with_vector, with_payload, lookup_from, }) {
        const response = await this._openApiClient.queryPoints({
            collection_name,
            consistency,
            timeout,
            shard_key,
            prefetch,
            query,
            using,
            filter,
            params,
            score_threshold,
            limit,
            offset,
            with_vector,
            with_payload,
            lookup_from,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Query points in batch
     * @description Universally query points in batch. This endpoint covers all capabilities of search, recommend, discover, filters. But also enables hybrid and multi-stage queries.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - searches: List of queries
     * @returns Operation result
     */
    async queryBatch(collection_name, { consistency, timeout, searches, }) {
        const response = await this._openApiClient.queryBatchPoints({
            collection_name,
            consistency,
            timeout,
            searches,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Query points, grouped by a given payload field
     * @description Universally query points, grouped by a given payload field
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards.
     *     - prefetch: Sub-requests to perform first. If present, the query will be performed on the results of the prefetch(es).
     *     - query: Query to perform. If missing without prefetches, returns points ordered by their IDs.
     *     - using: Define which vector name to use for querying. If missing, the default vector is used.
     *     - filter: Filter conditions - return only those points that satisfy the specified conditions.
     *     - params: Search params for when there is no prefetch
     *     - score_threshold: Return points with scores better than this threshold.
     *     - with_vector: Options for specifying which vectors to include into the response. Default is false.
     *     - with_payload: Options for specifying which payload to include or not. Default is false.
     *     - group_by: Payload field to group by, must be a string or number field. If the field contains more than 1 value, all values will be used for grouping. One point can be in multiple groups.
     *     - group_size: Maximum amount of points to return per group. Default is 3.
     *     - limit: Maximum amount of groups to return. Default is 10.
     *     - with_lookup: Look for points in another collection using the group ids.
     * @returns Operation result
     */
    async queryGroups(collection_name, { consistency, timeout, shard_key, prefetch, query, using, filter, params, score_threshold, with_vector, with_payload, group_by, group_size, limit, with_lookup, }) {
        const response = await this._openApiClient.queryPointsGroups({
            collection_name,
            consistency,
            timeout,
            shard_key,
            prefetch,
            query,
            using,
            filter,
            params,
            score_threshold,
            with_vector,
            with_payload,
            group_by,
            group_size,
            limit,
            with_lookup,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Facet a payload key with a given filter.
     * @description Count points that satisfy the given filter for each unique value of a payload key.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards.
     *     - key: Payload key to use for faceting.
     *     - limit: Max number of hits to return. Default is 10.
     *     - filter: Filter conditions - only consider points that satisfy these conditions.
     *     - exact: Whether to do a more expensive exact count for each of the values in the facet. Default is false.
     * @returns Operation result
     */
    async facet(collection_name, { consistency, timeout, shard_key, key, limit, filter, exact, }) {
        const response = await this._openApiClient.facet({
            collection_name,
            consistency,
            timeout,
            shard_key,
            key,
            limit,
            filter,
            exact,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Search points matrix distance pairs.
     * @description Compute distance matrix for sampled points with a pair based output format.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards.
     *     - filter: Look only for points which satisfies this conditions.
     *     - sample: How many points to select and search within. Default is 10.
     *     - limit: How many neighbours per sample to find. Default is 3.
     *     - using: Define which vector name to use for querying. If missing, the default vector is used.
     * @returns Operation result
     */
    async searchMatrixPairs(collection_name, { consistency, timeout, shard_key, filter, sample, limit, using, }) {
        const response = await this._openApiClient.searchMatrixPairs({
            collection_name,
            consistency,
            timeout,
            shard_key,
            filter,
            sample,
            limit,
            using,
        });
        return response.data.result ?? noResultError();
    }
    /**
     * Search points matrix distance offsets.
     * @description Compute distance matrix for sampled points with an offset based output format.
     * @param collection_name Name of the collection
     * @param {object} args -
     *     - consistency: Read consistency of the search. Defines how many replicas should be queried before returning the result.
     *         Values:
     *             number - number of replicas to query, values should present in all queried replicas
     *             'majority' - query all replicas, but return values present in the majority of replicas
     *             'quorum' - query the majority of replicas, return values present in all of them
     *             'all' - query all replicas, and return values present in all replicas
     *     - timeout: If set, overrides global timeout setting for this request. Unit is seconds.
     *     - shard_key: Specify in which shards to look for the points, if not specified - look in all shards.
     *     - filter: Look only for points which satisfies this conditions.
     *     - sample: How many points to select and search within. Default is 10.
     *     - limit: How many neighbours per sample to find. Default is 3.
     *     - using: Define which vector name to use for querying. If missing, the default vector is used.
     * @returns Operation result
     */
    async searchMatrixOffsets(collection_name, { consistency, timeout, shard_key, filter, sample, limit, using, }) {
        const response = await this._openApiClient.searchMatrixOffsets({
            collection_name,
            consistency,
            timeout,
            shard_key,
            filter,
            sample,
            limit,
            using,
        });
        return response.data.result ?? noResultError();
    }
}
