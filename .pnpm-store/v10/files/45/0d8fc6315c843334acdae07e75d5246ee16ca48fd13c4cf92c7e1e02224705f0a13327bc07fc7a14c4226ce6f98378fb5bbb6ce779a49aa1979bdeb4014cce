import { RedisCommandArguments, RedisCommandArgument } from '.';
import { ClientInfoReply } from './CLIENT_INFO';
interface ListFilterType {
    TYPE: 'NORMAL' | 'MASTER' | 'REPLICA' | 'PUBSUB';
    ID?: never;
}
interface ListFilterId {
    ID: Array<RedisCommandArgument>;
    TYPE?: never;
}
export type ListFilter = ListFilterType | ListFilterId;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(filter?: ListFilter): RedisCommandArguments;
export declare function transformReply(rawReply: string): Array<ClientInfoReply>;
export {};
