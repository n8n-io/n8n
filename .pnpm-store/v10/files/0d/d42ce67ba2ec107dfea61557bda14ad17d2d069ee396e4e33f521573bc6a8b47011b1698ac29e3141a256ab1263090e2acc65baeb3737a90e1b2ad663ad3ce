import { TypedFetch } from '@qdrant/openapi-typescript-fetch';
import { components } from '../openapi/generated_schema.js';
export type ClientApi = {
    /** Create shard key */
    createShardKey: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CreateShardingKey"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /** Delete shard key */
    deleteShardKey: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["DropShardingKey"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Returns information about the running Qdrant instance
         * @description Returns information about the running Qdrant instance like version and commit id
         */
    root: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": components["schemas"]["VersionInfo"];
                };
            };
            "4XX": never;
        };
    }>;
    /**
         * Collect telemetry data
         * @description Collect telemetry data including app info, system info, collections info, cluster info, configs and statistics
         */
    telemetry: TypedFetch<{
        parameters: {
            query?: {
                anonymize?: boolean;
                details_level?: number;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["TelemetryData"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Collect Prometheus metrics data
         * @description Collect metrics data including app info, collections info, cluster info and statistics
         */
    metrics: TypedFetch<{
        parameters: {
            query?: {
                anonymize?: boolean;
            };
        };
        responses: {
            200: {
                content: {
                    "text/plain": string;
                };
            };
            "4XX": never;
        };
    }>;
    /**
         * Kubernetes healthz endpoint
         * @description An endpoint for health checking used in Kubernetes.
         */
    healthz: TypedFetch<{
        responses: {
            200: {
                content: {
                    "text/plain": string;
                };
            };
            "4XX": never;
        };
    }>;
    /**
         * Kubernetes livez endpoint
         * @description An endpoint for health checking used in Kubernetes.
         */
    livez: TypedFetch<{
        responses: {
            200: {
                content: {
                    "text/plain": string;
                };
            };
            "4XX": never;
        };
    }>;
    /**
         * Kubernetes readyz endpoint
         * @description An endpoint for health checking used in Kubernetes.
         */
    readyz: TypedFetch<{
        responses: {
            200: {
                content: {
                    "text/plain": string;
                };
            };
            "4XX": never;
        };
    }>;
    /**
         * Get issues
         * @description Get a report of performance issues and configuration suggestions
         */
    getIssues: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": Record<string, never>;
                };
            };
            "4XX": never;
        };
    }>;
    /**
         * Clear issues
         * @description Removes all issues reported so far
         */
    clearIssues: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": boolean;
                };
            };
            "4XX": never;
        };
    }>;
    /**
         * Get cluster status info
         * @description Get information about the current state and composition of the cluster
         */
    clusterStatus: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["ClusterStatus"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /** Tries to recover current peer Raft state. */
    recoverCurrentPeer: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Remove peer from the cluster
         * @description Tries to remove peer from the cluster. Will return an error if peer has shards on it.
         */
    removePeer: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
                force?: boolean;
            };
            path: {
                peer_id: number;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * List collections
         * @description Get list name of all existing collections
         */
    getCollections: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["CollectionsResponse"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Collection info
         * @description Get detailed information about specified existing collection
         */
    getCollection: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["CollectionInfo"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Create collection
         * @description Create new collection with given parameters
         */
    createCollection: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CreateCollection"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete collection
         * @description Drop collection and all associated data
         */
    deleteCollection: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Update collection parameters
         * @description Update parameters of the existing collection
         */
    updateCollection: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["UpdateCollection"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /** Update aliases of the collections */
    updateAliases: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ChangeAliasesOperation"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Create index for field in collection
         * @description Create index for field in collection
         */
    createFieldIndex: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CreateFieldIndex"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Check the existence of a collection
         * @description Returns "true" if the given collection name exists, and "false" otherwise
         */
    collectionExists: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["CollectionExistence"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete index for field in collection
         * @description Delete field index for collection
         */
    deleteFieldIndex: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
                field_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Collection cluster info
         * @description Get cluster information for a collection
         */
    collectionClusterInfo: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["CollectionClusterInfo"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /** Update collection cluster setup */
    updateCollectionCluster: TypedFetch<{
        parameters: {
            query?: {
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ClusterOperations"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * List aliases for collection
         * @description Get list of all aliases for a collection
         */
    getCollectionAliases: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["CollectionsAliasesResponse"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * List collections aliases
         * @description Get list of all existing collections aliases
         */
    getCollectionsAliases: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["CollectionsAliasesResponse"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Recover from an uploaded snapshot
         * @description Recover local collection data from an uploaded snapshot. This will overwrite any data, stored on this node, for the collection. If collection does not exist - it will be created.
         */
    recoverFromUploadedSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                priority?: components["schemas"]["SnapshotPriority"];
                checksum?: string;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    snapshot?: string;
                };
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Recover from a snapshot
         * @description Recover local collection data from a snapshot. This will overwrite any data, stored on this node, for the collection. If collection does not exist - it will be created.
         */
    recoverFromSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SnapshotRecover"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * List collection snapshots
         * @description Get list of snapshots for a collection
         */
    listSnapshots: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["SnapshotDescription"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Create collection snapshot
         * @description Create new snapshot for a collection
         */
    createSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
            path: {
                collection_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["SnapshotDescription"];
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Download collection snapshot
         * @description Download specified snapshot from a collection as a file
         */
    getSnapshot: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
                snapshot_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/octet-stream": string;
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete collection snapshot
         * @description Delete snapshot for a collection
         */
    deleteSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
            path: {
                collection_name: string;
                snapshot_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * List of storage snapshots
         * @description Get list of snapshots of the whole storage
         */
    listFullSnapshots: TypedFetch<{
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["SnapshotDescription"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Create storage snapshot
         * @description Create new snapshot of the whole storage
         */
    createFullSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["SnapshotDescription"];
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Download storage snapshot
         * @description Download specified snapshot of the whole storage as a file
         */
    getFullSnapshot: TypedFetch<{
        parameters: {
            path: {
                snapshot_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/octet-stream": string;
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete storage snapshot
         * @description Delete snapshot of the whole storage
         */
    deleteFullSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
            path: {
                snapshot_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Recover shard from an uploaded snapshot
         * @description Recover shard of a local collection from an uploaded snapshot. This will overwrite any data, stored on this node, for the collection shard.
         */
    recoverShardFromUploadedSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                priority?: components["schemas"]["SnapshotPriority"];
                checksum?: string;
            };
            path: {
                collection_name: string;
                shard_id: number;
            };
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    snapshot?: string;
                };
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Recover from a snapshot
         * @description Recover shard of a local collection data from a snapshot. This will overwrite any data, stored in this shard, for the collection.
         */
    recoverShardFromSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
            path: {
                collection_name: string;
                shard_id: number;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ShardSnapshotRecover"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * List shards snapshots for a collection
         * @description Get list of snapshots for a shard of a collection
         */
    listShardSnapshots: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
                shard_id: number;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["SnapshotDescription"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Create shard snapshot
         * @description Create new snapshot of a shard for a collection
         */
    createShardSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
            path: {
                collection_name: string;
                shard_id: number;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["SnapshotDescription"];
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Download collection snapshot
         * @description Download specified snapshot of a shard from a collection as a file
         */
    getShardSnapshot: TypedFetch<{
        parameters: {
            path: {
                collection_name: string;
                shard_id: number;
                snapshot_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/octet-stream": string;
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete shard snapshot
         * @description Delete snapshot of a shard for a collection
         */
    deleteShardSnapshot: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
            };
            path: {
                collection_name: string;
                shard_id: number;
                snapshot_name: string;
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                        result?: boolean;
                    };
                };
            };
            202: {
                content: {
                    "application/json": {
                        time?: number;
                        status?: string;
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Get point
         * @description Retrieve full information of single point by id
         */
    getPoint: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
            };
            path: {
                collection_name: string;
                id: components["schemas"]["ExtendedPointId"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["Record"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Upsert points
         * @description Perform insert + updates on points. If point with given ID already exists - it will be overwritten.
         */
    upsertPoints: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PointInsertOperations"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Get points
         * @description Retrieve multiple points by specified IDs
         */
    getPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PointRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["Record"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete points
         * @description Delete points
         */
    deletePoints: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PointsSelector"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Update vectors
         * @description Update specified named vectors on points, keep unspecified vectors intact.
         */
    updateVectors: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["UpdateVectors"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete vectors
         * @description Delete named vectors from the given points.
         */
    deleteVectors: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["DeleteVectors"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Overwrite payload
         * @description Replace full payload of points with new one
         */
    overwritePayload: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SetPayload"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Set payload
         * @description Set payload values for points
         */
    setPayload: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SetPayload"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Delete payload
         * @description Delete specified key payload for points
         */
    deletePayload: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["DeletePayload"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Clear payload
         * @description Remove all payload for specified points
         */
    clearPayload: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PointsSelector"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["UpdateResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Batch update points
         * @description Apply a series of update operations for points, vectors and payloads
         */
    batchUpdate: TypedFetch<{
        parameters: {
            query?: {
                wait?: boolean;
                ordering?: components["schemas"]["WriteOrdering"];
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["UpdateOperations"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["UpdateResult"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Scroll points
         * @description Scroll request - paginate over all points which matches given filtering condition
         */
    scrollPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ScrollRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["ScrollResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Search points
         * @deprecated
         * @description Retrieve closest points based on vector similarity and given filtering conditions
         */
    searchPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SearchRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["ScoredPoint"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Search batch points
         * @deprecated
         * @description Retrieve by batch the closest points based on vector similarity and given filtering conditions
         */
    searchBatchPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SearchRequestBatch"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: ((components["schemas"]["ScoredPoint"])[])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Search point groups
         * @deprecated
         * @description Retrieve closest points based on vector similarity and given filtering conditions, grouped by a given payload field
         */
    searchPointGroups: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SearchGroupsRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["GroupsResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Recommend points
         * @deprecated
         * @description Look for the points which are closer to stored positive examples and at the same time further to negative examples.
         */
    recommendPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["RecommendRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["ScoredPoint"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Recommend batch points
         * @deprecated
         * @description Look for the points which are closer to stored positive examples and at the same time further to negative examples.
         */
    recommendBatchPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["RecommendRequestBatch"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: ((components["schemas"]["ScoredPoint"])[])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Recommend point groups
         * @deprecated
         * @description Look for the points which are closer to stored positive examples and at the same time further to negative examples, grouped by a given payload field.
         */
    recommendPointGroups: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["RecommendGroupsRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["GroupsResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Discover points
         * @deprecated
         * @description Use context and a target to find the most similar points to the target, constrained by the context.
         * When using only the context (without a target), a special search - called context search - is performed where pairs of points are used to generate a loss that guides the search towards the zone where most positive examples overlap. This means that the score minimizes the scenario of finding a point closer to a negative than to a positive part of a pair.
         * Since the score of a context relates to loss, the maximum score a point can get is 0.0, and it becomes normal that many points can have a score of 0.0.
         * When using target (with or without context), the score behaves a little different: The integer part of the score represents the rank with respect to the context, while the decimal part of the score relates to the distance to the target. The context part of the score for each pair is calculated +1 if the point is closer to a positive than to a negative part of a pair, and -1 otherwise.
         */
    discoverPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["DiscoverRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["ScoredPoint"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Discover batch points
         * @deprecated
         * @description Look for points based on target and/or positive and negative example pairs, in batch.
         */
    discoverBatchPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["DiscoverRequestBatch"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: ((components["schemas"]["ScoredPoint"])[])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Count points
         * @description Count points which matches given filtering condition
         */
    countPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["CountRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["CountResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Facet a payload key with a given filter.
         * @description Count points that satisfy the given filter for each unique value of a payload key.
         */
    facet: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["FacetRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["FacetResponse"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Query points
         * @description Universally query points. This endpoint covers all capabilities of search, recommend, discover, filters. But also enables hybrid and multi-stage queries.
         */
    queryPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["QueryRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["QueryResponse"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Query points in batch
         * @description Universally query points in batch. This endpoint covers all capabilities of search, recommend, discover, filters. But also enables hybrid and multi-stage queries.
         */
    queryBatchPoints: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["QueryRequestBatch"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: (components["schemas"]["QueryResponse"])[];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Query points, grouped by a given payload field
         * @description Universally query points, grouped by a given payload field
         */
    queryPointsGroups: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["QueryGroupsRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["GroupsResult"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Search points matrix distance pairs
         * @description Compute distance matrix for sampled points with a pair based output format
         */
    searchMatrixPairs: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SearchMatrixRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["SearchMatrixPairsResponse"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
    /**
         * Search points matrix distance offsets
         * @description Compute distance matrix for sampled points with an offset based output format
         */
    searchMatrixOffsets: TypedFetch<{
        parameters: {
            query?: {
                consistency?: components["schemas"]["ReadConsistency"];
                timeout?: number;
            };
            path: {
                collection_name: string;
            };
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SearchMatrixRequest"];
            };
        };
        responses: {
            200: {
                content: {
                    "application/json": {
                        usage?: components["schemas"]["Usage"] | (Record<string, unknown> | null);
                        time?: number;
                        status?: string;
                        result?: components["schemas"]["SearchMatrixOffsetsResponse"];
                    };
                };
            };
            default: {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            "4XX": {
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    }>;
};
