export declare function transformArguments(): Array<string>;
type ClusterLinksRawReply = Array<[
    'direction',
    string,
    'node',
    string,
    'createTime',
    number,
    'events',
    string,
    'send-buffer-allocated',
    number,
    'send-buffer-used',
    number
]>;
type ClusterLinksReply = Array<{
    direction: string;
    node: string;
    createTime: number;
    events: string;
    sendBufferAllocated: number;
    sendBufferUsed: number;
}>;
export declare function transformReply(reply: ClusterLinksRawReply): ClusterLinksReply;
export {};
