import { IConnection } from '../../connection/index.js';
import { BatchStats, NodeShardStatus, NodeStats, WeaviateReplicationResponse, WeaviateReplicationType, WeaviateShardingState } from '../../openapi/types.js';
import { DeepRequired } from '../../utils/types.js';
export type Output = 'minimal' | 'verbose' | undefined;
export type NodesOptions<O extends Output> = {
    /** The name of the collection to get the status of. */
    collection?: string;
    /** Set the desired output verbosity level. Can be `minimal | verbose | undefined` with `undefined` defaulting to `minimal`. */
    output: O;
};
export type QueryShardingStateOptions = {
    /** The name of the shard to query. If not provided, all shards will be queried. */
    shard?: string;
};
export type ReplicateArgs = {
    /** The name of the collection in which to replicate a shard. */
    collection: string;
    /** The name of the shard to replicate. */
    shard: string;
    /** The name of the node from which to replicate the shard. */
    sourceNode: string;
    /** The name of the node to which to replicate the shard. */
    targetNode: string;
    /** The type of replication to perform. */
    replicationType: WeaviateReplicationType;
};
export type ShardingState = DeepRequired<WeaviateShardingState>;
export type ReplicationOperation = DeepRequired<WeaviateReplicationResponse>;
export type QueryReplicationOpsOptions = {
    /** The name of the collection to query. */
    collection?: string;
    /** The name of the shard to query. */
    shard?: string;
    /** The target node of the op to query. */
    targetNode?: string;
    /** Whether to include the status history in the response. */
    includeHistory?: boolean;
};
export type GetReplicationOpOptions = {
    /** Whether to include the status history in the response. Defaults to false. */
    includeHistory?: boolean;
};
export type Node<O extends Output> = {
    name: string;
    status: 'HEALTHY' | 'UNHEALTHY' | 'UNAVAILABLE';
    version: string;
    gitHash: string;
    stats: O extends 'minimal' | undefined ? undefined : Required<NodeStats>;
    batchStats: Required<BatchStats>;
    shards: O extends 'minimal' | undefined ? null : Required<NodeShardStatus>[];
};
declare const cluster: (connection: IConnection) => {
    nodes: <O extends Output = undefined>(opts?: NodesOptions<O> | undefined) => Promise<Node<O>[]>;
    queryShardingState: (collection: string, opts?: QueryShardingStateOptions) => Promise<{
        collection: string;
        shards: {
            shard: string;
            replicas: string[];
        }[];
    }>;
    replicate: (args: ReplicateArgs) => Promise<string>;
    replications: {
        cancel: (id: string) => Promise<void>;
        delete: (id: string) => Promise<any>;
        deleteAll: () => Promise<any>;
        get: (id: string, opts?: GetReplicationOpOptions) => Promise<ReplicationOperation | null>;
        query: (opts?: QueryReplicationOpsOptions) => Promise<ReplicationOperation[]>;
    };
};
export default cluster;
export interface Cluster {
    /**
     * Get the status of all nodes in the cluster.
     *
     * @param {NodesOptions<O>} [opts] The options for the request.
     * @returns {Promise<Node<O>[]>} The status of all nodes in the cluster.
     */
    nodes: <O extends Output = undefined>(opts?: NodesOptions<O>) => Promise<Node<O>[]>;
    /**
     * Query the sharding state of a specific collection.
     *
     * @param {string} collection The name of the collection to query.
     * @param {QueryShardingStateOptions} [opts] The options for the request.
     * @returns {Promise<ShardingState>} The sharding state of the collection.
     */
    queryShardingState: (collection: string, opts?: QueryShardingStateOptions) => Promise<ShardingState>;
    /**
     * Replicate a shard from one node to another.
     *
     * @param {ReplicateArgs} args The arguments for the replication request.
     * @returns {Promise<string>} The ID of the replication request.
     */
    replicate: (args: ReplicateArgs) => Promise<string>;
    /**
     * Access replication operations.
     */
    replications: Replications;
}
export interface Replications {
    /**
     * Cancel a replication operation.
     *
     * @param {string} id The ID of the replication operation to cancel.
     * @returns {Promise<void>} A promise that resolves when the operation is cancelled.
     */
    cancel: (id: string) => Promise<void>;
    /**
     * Delete a replication operation.
     *
     * @param {string} id The ID of the replication operation to delete.
     * @returns {Promise<void>} A promise that resolves when the operation is deleted.
     */
    delete: (id: string) => Promise<void>;
    /**
     * Delete all replication operations.
     *
     * @returns {Promise<void>} A promise that resolves when all operations are deleted.
     */
    deleteAll: () => Promise<void>;
    /**
     * Get a specific replication operation by ID.
     *
     * @param {string} id The ID of the replication operation to get.
     * @param {boolean} [opts.includeHistory=false] Whether to include the status history in the response.
     * @returns {Promise<ReplicationOperation | null>} The replication operation or null if not found.
     */
    get: (id: string, opts?: {
        includeHistory?: boolean;
    }) => Promise<ReplicationOperation | null>;
    /**
     * Query all replication operations with optional filters.
     *
     * @param {QueryReplicationOpsOptions} [opts] Optional parameters for filtering the query.
     * @returns {Promise<ReplicationOperation[]>} A list of replication operations matching the query.
     */
    query: (opts?: QueryReplicationOpsOptions) => Promise<ReplicationOperation[]>;
}
