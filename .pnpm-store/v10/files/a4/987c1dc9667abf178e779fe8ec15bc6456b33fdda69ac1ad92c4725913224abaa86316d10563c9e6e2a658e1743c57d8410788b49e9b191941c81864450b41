import { RedisCommandArguments } from '@redis/client/dist/lib/commands';
import { Filter, RawLabels, SampleRawReply, SampleReply } from '.';
export declare const IS_READ_ONLY = true;
export interface MGetOptions {
    LATEST?: boolean;
}
export declare function transformArguments(filter: Filter, options?: MGetOptions): RedisCommandArguments;
export type MGetRawReply = Array<[
    key: string,
    labels: RawLabels,
    sample: SampleRawReply
]>;
export interface MGetReply {
    key: string;
    sample: SampleReply;
}
export declare function transformReply(reply: MGetRawReply): Array<MGetReply>;
