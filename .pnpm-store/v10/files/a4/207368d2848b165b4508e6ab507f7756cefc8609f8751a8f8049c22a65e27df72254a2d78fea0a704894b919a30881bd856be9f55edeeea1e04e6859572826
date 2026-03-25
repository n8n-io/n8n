/// <reference types="node" />
import { SrvRecord } from "dns";
export declare type NodeKey = string;
export declare type NodeRole = "master" | "slave" | "all";
export interface RedisOptions {
    port: number;
    host: string;
    username?: string;
    password?: string;
    [key: string]: any;
}
export interface SrvRecordsGroup {
    totalWeight: number;
    records: SrvRecord[];
}
export interface GroupedSrvRecords {
    [key: number]: SrvRecordsGroup;
}
export declare function getNodeKey(node: RedisOptions): NodeKey;
export declare function nodeKeyToRedisOptions(nodeKey: NodeKey): RedisOptions;
export declare function normalizeNodeOptions(nodes: Array<string | number | object>): RedisOptions[];
export declare function getUniqueHostnamesFromOptions(nodes: RedisOptions[]): string[];
export declare function groupSrvRecords(records: SrvRecord[]): GroupedSrvRecords;
export declare function weightSrvRecords(recordsGroup: SrvRecordsGroup): SrvRecord;
export declare function getConnectionName(component: any, nodeConnectionName: any): string;
