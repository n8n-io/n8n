/// <reference types="node" />
import { EventEmitter } from "events";
import { RedisOptions, NodeKey, NodeRole } from "./util";
import Redis from "../Redis";
export default class ConnectionPool extends EventEmitter {
    private redisOptions;
    private nodes;
    private specifiedOptions;
    constructor(redisOptions: any);
    getNodes(role?: NodeRole): Redis[];
    getInstanceByKey(key: NodeKey): Redis;
    getSampleInstance(role: NodeRole): Redis;
    /**
     * Find or create a connection to the node
     */
    findOrCreate(node: RedisOptions, readOnly?: boolean): Redis;
    /**
     * Reset the pool with a set of nodes.
     * The old node will be removed.
     */
    reset(nodes: RedisOptions[]): void;
    /**
     * Remove a node from the pool.
     */
    private removeNode;
}
