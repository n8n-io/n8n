import { SelectedLabels, Labels, Filter } from '.';
import { MGetOptions, MGetRawReply, MGetReply } from './MGET';
import { RedisCommandArguments } from '@redis/client/dist/lib/commands';
export declare const IS_READ_ONLY = true;
interface MGetWithLabelsOptions extends MGetOptions {
    SELECTED_LABELS?: SelectedLabels;
}
export declare function transformArguments(filter: Filter, options?: MGetWithLabelsOptions): RedisCommandArguments;
export interface MGetWithLabelsReply extends MGetReply {
    labels: Labels;
}
export declare function transformReply(reply: MGetRawReply): Array<MGetWithLabelsReply>;
export {};
