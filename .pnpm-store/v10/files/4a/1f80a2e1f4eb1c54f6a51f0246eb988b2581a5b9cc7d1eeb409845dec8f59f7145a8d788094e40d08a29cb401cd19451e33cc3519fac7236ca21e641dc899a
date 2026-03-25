import { SearchOptions, SearchRawReply } from './SEARCH';
import { ProfileOptions, ProfileRawReply, ProfileReply } from '.';
import { RedisCommandArguments } from '@redis/client/dist/lib/commands';
export declare const IS_READ_ONLY = true;
export declare function transformArguments(index: string, query: string, options?: ProfileOptions & SearchOptions): RedisCommandArguments;
type ProfileSearchRawReply = ProfileRawReply<SearchRawReply>;
export declare function transformReply(reply: ProfileSearchRawReply, withoutDocuments: boolean): ProfileReply;
export {};
