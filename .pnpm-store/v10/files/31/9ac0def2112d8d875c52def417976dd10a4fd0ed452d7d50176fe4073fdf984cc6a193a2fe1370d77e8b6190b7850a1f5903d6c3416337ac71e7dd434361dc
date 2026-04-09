/**
 * Bitset flags for cluster capabilities.
 */
export declare const ClusterCapability: {
    readonly READABLE: 1;
    readonly WRITABLE: 2;
    readonly PRIMARY: 3;
};
/**
 * Information about a cluster in the global topology.
 */
export interface ClusterInfo {
    clusterId: string;
    endpoint: string;
    capability: number;
}
/**
 * Global cluster topology containing all clusters.
 */
export interface GlobalTopology {
    version: number;
    clusters: ClusterInfo[];
}
