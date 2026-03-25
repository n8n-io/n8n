export declare const IS_READ_ONLY = true;
export declare const FIRST_KEY_INDEX = 1;
export declare function transformArguments(key: string): string[];
type SlowLogRawReply = Array<[
    timestamp: string,
    command: string,
    query: string,
    took: string
]>;
type SlowLogReply = Array<{
    timestamp: Date;
    command: string;
    query: string;
    took: number;
}>;
export declare function transformReply(logs: SlowLogRawReply): SlowLogReply;
export {};
