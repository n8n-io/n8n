import { ClusterCapability, ClusterInfo, GlobalTopology } from '../types/GlobalCluster';
export { ClusterCapability, ClusterInfo, GlobalTopology };
export declare const GLOBAL_CLUSTER_IDENTIFIER = "global-cluster";
export declare const DEFAULT_REFRESH_INTERVAL = 300000;
/**
 * Check if a ClusterInfo is the primary (writable) cluster.
 */
export declare function isPrimaryCluster(cluster: ClusterInfo): boolean;
/**
 * Get the primary cluster from a topology.
 * @throws Error if no primary cluster is found.
 */
export declare function getPrimaryCluster(topology: GlobalTopology): ClusterInfo;
/**
 * Check if the URI points to a global cluster endpoint.
 */
export declare function isGlobalEndpoint(uri: string): boolean;
/**
 * Fetch the global cluster topology from the REST API.
 *
 * @param globalEndpoint - The global cluster endpoint URL
 * @param token - Authentication token
 * @returns GlobalTopology object containing cluster information
 * @throws Error if topology cannot be fetched after retries
 */
export declare function fetchTopology(globalEndpoint: string, token: string): Promise<GlobalTopology>;
/**
 * Background refresher that periodically fetches the global cluster topology.
 */
export declare class TopologyRefresher {
    private globalEndpoint;
    private token;
    private topology;
    private refreshInterval;
    private onTopologyChange?;
    private intervalId;
    private refreshing;
    constructor(options: {
        globalEndpoint: string;
        token: string;
        topology: GlobalTopology;
        refreshInterval?: number;
        onTopologyChange?: (topology: GlobalTopology) => void;
    });
    /** Start the background refresh interval. */
    start(): void;
    /** Stop the background refresh interval. */
    stop(): void;
    /** Check if the refresher is running. */
    isRunning(): boolean;
    /** Get the current topology. */
    getTopology(): GlobalTopology;
    /** Trigger an immediate topology refresh (debounced). */
    triggerRefresh(): void;
    private tryRefresh;
}
