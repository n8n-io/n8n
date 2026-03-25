export declare function transformArguments(): Array<string>;
interface ClusterInfoReply {
    state: string;
    slots: {
        assigned: number;
        ok: number;
        pfail: number;
        fail: number;
    };
    knownNodes: number;
    size: number;
    currentEpoch: number;
    myEpoch: number;
    stats: {
        messagesSent: number;
        messagesReceived: number;
    };
}
export declare function transformReply(reply: string): ClusterInfoReply;
export declare function extractLineValue(line: string): string;
export {};
