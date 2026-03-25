import { RedisCommandArguments } from '.';
export declare function transformArguments(): RedisCommandArguments;
type ClusterSlotsRawNode = [ip: string, port: number, id: string];
type ClusterSlotsRawReply = Array<[
    from: number,
    to: number,
    master: ClusterSlotsRawNode,
    ...replicas: Array<ClusterSlotsRawNode>
]>;
export interface ClusterSlotsNode {
    ip: string;
    port: number;
    id: string;
}
export type ClusterSlotsReply = Array<{
    from: number;
    to: number;
    master: ClusterSlotsNode;
    replicas: Array<ClusterSlotsNode>;
}>;
export declare function transformReply(reply: ClusterSlotsRawReply): ClusterSlotsReply;
export {};
