// AUTOMATICALLY GENERATED FILE. DO NOT EDIT!
export function createClientApi(client) {
    return {
        /** Create shard key */
        createShardKey: client
            .path('/collections/{collection_name}/shards')
            .method('put')
            .create({
            timeout: true,
        }),
        /** Delete shard key */
        deleteShardKey: client
            .path('/collections/{collection_name}/shards/delete')
            .method('post')
            .create({
            timeout: true,
        }),
        /**
             * Returns information about the running Qdrant instance
             * @description Returns information about the running Qdrant instance like version and commit id
             */
        root: client
            .path('/')
            .method('get')
            .create(),
        /**
             * Collect telemetry data
             * @description Collect telemetry data including app info, system info, collections info, cluster info, configs and statistics
             */
        telemetry: client
            .path('/telemetry')
            .method('get')
            .create(),
        /**
             * Collect Prometheus metrics data
             * @description Collect metrics data including app info, collections info, cluster info and statistics
             */
        metrics: client
            .path('/metrics')
            .method('get')
            .create(),
        /**
             * Kubernetes healthz endpoint
             * @description An endpoint for health checking used in Kubernetes.
             */
        healthz: client
            .path('/healthz')
            .method('get')
            .create(),
        /**
             * Kubernetes livez endpoint
             * @description An endpoint for health checking used in Kubernetes.
             */
        livez: client
            .path('/livez')
            .method('get')
            .create(),
        /**
             * Kubernetes readyz endpoint
             * @description An endpoint for health checking used in Kubernetes.
             */
        readyz: client
            .path('/readyz')
            .method('get')
            .create(),
        /**
             * Get issues
             * @description Get a report of performance issues and configuration suggestions
             */
        getIssues: client
            .path('/issues')
            .method('get')
            .create(),
        /**
             * Clear issues
             * @description Removes all issues reported so far
             */
        clearIssues: client
            .path('/issues')
            .method('delete')
            .create(),
        /**
             * Get cluster status info
             * @description Get information about the current state and composition of the cluster
             */
        clusterStatus: client
            .path('/cluster')
            .method('get')
            .create(),
        /** Tries to recover current peer Raft state. */
        recoverCurrentPeer: client
            .path('/cluster/recover')
            .method('post')
            .create(),
        /**
             * Remove peer from the cluster
             * @description Tries to remove peer from the cluster. Will return an error if peer has shards on it.
             */
        removePeer: client
            .path('/cluster/peer/{peer_id}')
            .method('delete')
            .create({
            timeout: true,
            force: true,
        }),
        /**
             * List collections
             * @description Get list name of all existing collections
             */
        getCollections: client
            .path('/collections')
            .method('get')
            .create(),
        /**
             * Collection info
             * @description Get detailed information about specified existing collection
             */
        getCollection: client
            .path('/collections/{collection_name}')
            .method('get')
            .create(),
        /**
             * Create collection
             * @description Create new collection with given parameters
             */
        createCollection: client
            .path('/collections/{collection_name}')
            .method('put')
            .create({
            timeout: true,
        }),
        /**
             * Delete collection
             * @description Drop collection and all associated data
             */
        deleteCollection: client
            .path('/collections/{collection_name}')
            .method('delete')
            .create({
            timeout: true,
        }),
        /**
             * Update collection parameters
             * @description Update parameters of the existing collection
             */
        updateCollection: client
            .path('/collections/{collection_name}')
            .method('patch')
            .create({
            timeout: true,
        }),
        /** Update aliases of the collections */
        updateAliases: client
            .path('/collections/aliases')
            .method('post')
            .create({
            timeout: true,
        }),
        /**
             * Create index for field in collection
             * @description Create index for field in collection
             */
        createFieldIndex: client
            .path('/collections/{collection_name}/index')
            .method('put')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Check the existence of a collection
             * @description Returns "true" if the given collection name exists, and "false" otherwise
             */
        collectionExists: client
            .path('/collections/{collection_name}/exists')
            .method('get')
            .create(),
        /**
             * Delete index for field in collection
             * @description Delete field index for collection
             */
        deleteFieldIndex: client
            .path('/collections/{collection_name}/index/{field_name}')
            .method('delete')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Collection cluster info
             * @description Get cluster information for a collection
             */
        collectionClusterInfo: client
            .path('/collections/{collection_name}/cluster')
            .method('get')
            .create(),
        /** Update collection cluster setup */
        updateCollectionCluster: client
            .path('/collections/{collection_name}/cluster')
            .method('post')
            .create({
            timeout: true,
        }),
        /**
             * List aliases for collection
             * @description Get list of all aliases for a collection
             */
        getCollectionAliases: client
            .path('/collections/{collection_name}/aliases')
            .method('get')
            .create(),
        /**
             * List collections aliases
             * @description Get list of all existing collections aliases
             */
        getCollectionsAliases: client
            .path('/aliases')
            .method('get')
            .create(),
        /**
             * Recover from an uploaded snapshot
             * @description Recover local collection data from an uploaded snapshot. This will overwrite any data, stored on this node, for the collection. If collection does not exist - it will be created.
             */
        recoverFromUploadedSnapshot: client
            .path('/collections/{collection_name}/snapshots/upload')
            .method('post')
            .create({
            wait: true,
            priority: true,
            checksum: true,
        }),
        /**
             * Recover from a snapshot
             * @description Recover local collection data from a snapshot. This will overwrite any data, stored on this node, for the collection. If collection does not exist - it will be created.
             */
        recoverFromSnapshot: client
            .path('/collections/{collection_name}/snapshots/recover')
            .method('put')
            .create({
            wait: true,
        }),
        /**
             * List collection snapshots
             * @description Get list of snapshots for a collection
             */
        listSnapshots: client
            .path('/collections/{collection_name}/snapshots')
            .method('get')
            .create(),
        /**
             * Create collection snapshot
             * @description Create new snapshot for a collection
             */
        createSnapshot: client
            .path('/collections/{collection_name}/snapshots')
            .method('post')
            .create({
            wait: true,
        }),
        /**
             * Download collection snapshot
             * @description Download specified snapshot from a collection as a file
             */
        getSnapshot: client
            .path('/collections/{collection_name}/snapshots/{snapshot_name}')
            .method('get')
            .create(),
        /**
             * Delete collection snapshot
             * @description Delete snapshot for a collection
             */
        deleteSnapshot: client
            .path('/collections/{collection_name}/snapshots/{snapshot_name}')
            .method('delete')
            .create({
            wait: true,
        }),
        /**
             * List of storage snapshots
             * @description Get list of snapshots of the whole storage
             */
        listFullSnapshots: client
            .path('/snapshots')
            .method('get')
            .create(),
        /**
             * Create storage snapshot
             * @description Create new snapshot of the whole storage
             */
        createFullSnapshot: client
            .path('/snapshots')
            .method('post')
            .create({
            wait: true,
        }),
        /**
             * Download storage snapshot
             * @description Download specified snapshot of the whole storage as a file
             */
        getFullSnapshot: client
            .path('/snapshots/{snapshot_name}')
            .method('get')
            .create(),
        /**
             * Delete storage snapshot
             * @description Delete snapshot of the whole storage
             */
        deleteFullSnapshot: client
            .path('/snapshots/{snapshot_name}')
            .method('delete')
            .create({
            wait: true,
        }),
        /**
             * Recover shard from an uploaded snapshot
             * @description Recover shard of a local collection from an uploaded snapshot. This will overwrite any data, stored on this node, for the collection shard.
             */
        recoverShardFromUploadedSnapshot: client
            .path('/collections/{collection_name}/shards/{shard_id}/snapshots/upload')
            .method('post')
            .create({
            wait: true,
            priority: true,
            checksum: true,
        }),
        /**
             * Recover from a snapshot
             * @description Recover shard of a local collection data from a snapshot. This will overwrite any data, stored in this shard, for the collection.
             */
        recoverShardFromSnapshot: client
            .path('/collections/{collection_name}/shards/{shard_id}/snapshots/recover')
            .method('put')
            .create({
            wait: true,
        }),
        /**
             * List shards snapshots for a collection
             * @description Get list of snapshots for a shard of a collection
             */
        listShardSnapshots: client
            .path('/collections/{collection_name}/shards/{shard_id}/snapshots')
            .method('get')
            .create(),
        /**
             * Create shard snapshot
             * @description Create new snapshot of a shard for a collection
             */
        createShardSnapshot: client
            .path('/collections/{collection_name}/shards/{shard_id}/snapshots')
            .method('post')
            .create({
            wait: true,
        }),
        /**
             * Download collection snapshot
             * @description Download specified snapshot of a shard from a collection as a file
             */
        getShardSnapshot: client
            .path('/collections/{collection_name}/shards/{shard_id}/snapshots/{snapshot_name}')
            .method('get')
            .create(),
        /**
             * Delete shard snapshot
             * @description Delete snapshot of a shard for a collection
             */
        deleteShardSnapshot: client
            .path('/collections/{collection_name}/shards/{shard_id}/snapshots/{snapshot_name}')
            .method('delete')
            .create({
            wait: true,
        }),
        /**
             * Get point
             * @description Retrieve full information of single point by id
             */
        getPoint: client
            .path('/collections/{collection_name}/points/{id}')
            .method('get')
            .create(),
        /**
             * Upsert points
             * @description Perform insert + updates on points. If point with given ID already exists - it will be overwritten.
             */
        upsertPoints: client
            .path('/collections/{collection_name}/points')
            .method('put')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Get points
             * @description Retrieve multiple points by specified IDs
             */
        getPoints: client
            .path('/collections/{collection_name}/points')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Delete points
             * @description Delete points
             */
        deletePoints: client
            .path('/collections/{collection_name}/points/delete')
            .method('post')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Update vectors
             * @description Update specified named vectors on points, keep unspecified vectors intact.
             */
        updateVectors: client
            .path('/collections/{collection_name}/points/vectors')
            .method('put')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Delete vectors
             * @description Delete named vectors from the given points.
             */
        deleteVectors: client
            .path('/collections/{collection_name}/points/vectors/delete')
            .method('post')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Overwrite payload
             * @description Replace full payload of points with new one
             */
        overwritePayload: client
            .path('/collections/{collection_name}/points/payload')
            .method('put')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Set payload
             * @description Set payload values for points
             */
        setPayload: client
            .path('/collections/{collection_name}/points/payload')
            .method('post')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Delete payload
             * @description Delete specified key payload for points
             */
        deletePayload: client
            .path('/collections/{collection_name}/points/payload/delete')
            .method('post')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Clear payload
             * @description Remove all payload for specified points
             */
        clearPayload: client
            .path('/collections/{collection_name}/points/payload/clear')
            .method('post')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Batch update points
             * @description Apply a series of update operations for points, vectors and payloads
             */
        batchUpdate: client
            .path('/collections/{collection_name}/points/batch')
            .method('post')
            .create({
            wait: true,
            ordering: true,
        }),
        /**
             * Scroll points
             * @description Scroll request - paginate over all points which matches given filtering condition
             */
        scrollPoints: client
            .path('/collections/{collection_name}/points/scroll')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Search points
             * @deprecated
             * @description Retrieve closest points based on vector similarity and given filtering conditions
             */
        searchPoints: client
            .path('/collections/{collection_name}/points/search')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Search batch points
             * @deprecated
             * @description Retrieve by batch the closest points based on vector similarity and given filtering conditions
             */
        searchBatchPoints: client
            .path('/collections/{collection_name}/points/search/batch')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Search point groups
             * @deprecated
             * @description Retrieve closest points based on vector similarity and given filtering conditions, grouped by a given payload field
             */
        searchPointGroups: client
            .path('/collections/{collection_name}/points/search/groups')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Recommend points
             * @deprecated
             * @description Look for the points which are closer to stored positive examples and at the same time further to negative examples.
             */
        recommendPoints: client
            .path('/collections/{collection_name}/points/recommend')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Recommend batch points
             * @deprecated
             * @description Look for the points which are closer to stored positive examples and at the same time further to negative examples.
             */
        recommendBatchPoints: client
            .path('/collections/{collection_name}/points/recommend/batch')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Recommend point groups
             * @deprecated
             * @description Look for the points which are closer to stored positive examples and at the same time further to negative examples, grouped by a given payload field.
             */
        recommendPointGroups: client
            .path('/collections/{collection_name}/points/recommend/groups')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Discover points
             * @deprecated
             * @description Use context and a target to find the most similar points to the target, constrained by the context.
             * When using only the context (without a target), a special search - called context search - is performed where pairs of points are used to generate a loss that guides the search towards the zone where most positive examples overlap. This means that the score minimizes the scenario of finding a point closer to a negative than to a positive part of a pair.
             * Since the score of a context relates to loss, the maximum score a point can get is 0.0, and it becomes normal that many points can have a score of 0.0.
             * When using target (with or without context), the score behaves a little different: The integer part of the score represents the rank with respect to the context, while the decimal part of the score relates to the distance to the target. The context part of the score for each pair is calculated +1 if the point is closer to a positive than to a negative part of a pair, and -1 otherwise.
             */
        discoverPoints: client
            .path('/collections/{collection_name}/points/discover')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Discover batch points
             * @deprecated
             * @description Look for points based on target and/or positive and negative example pairs, in batch.
             */
        discoverBatchPoints: client
            .path('/collections/{collection_name}/points/discover/batch')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Count points
             * @description Count points which matches given filtering condition
             */
        countPoints: client
            .path('/collections/{collection_name}/points/count')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Facet a payload key with a given filter.
             * @description Count points that satisfy the given filter for each unique value of a payload key.
             */
        facet: client
            .path('/collections/{collection_name}/facet')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Query points
             * @description Universally query points. This endpoint covers all capabilities of search, recommend, discover, filters. But also enables hybrid and multi-stage queries.
             */
        queryPoints: client
            .path('/collections/{collection_name}/points/query')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Query points in batch
             * @description Universally query points in batch. This endpoint covers all capabilities of search, recommend, discover, filters. But also enables hybrid and multi-stage queries.
             */
        queryBatchPoints: client
            .path('/collections/{collection_name}/points/query/batch')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Query points, grouped by a given payload field
             * @description Universally query points, grouped by a given payload field
             */
        queryPointsGroups: client
            .path('/collections/{collection_name}/points/query/groups')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Search points matrix distance pairs
             * @description Compute distance matrix for sampled points with a pair based output format
             */
        searchMatrixPairs: client
            .path('/collections/{collection_name}/points/search/matrix/pairs')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
        /**
             * Search points matrix distance offsets
             * @description Compute distance matrix for sampled points with an offset based output format
             */
        searchMatrixOffsets: client
            .path('/collections/{collection_name}/points/search/matrix/offsets')
            .method('post')
            .create({
            consistency: true,
            timeout: true,
        }),
    };
}
