import { RedisClientType } from '@redis/client/dist/lib/client/index';
import { RedisCommandArgument, RedisFunctions, RedisScripts } from '@redis/client/dist/lib/commands';
import { QueryOptions } from './commands';
import { QueryReply } from './commands/QUERY';
export type GraphReply<T> = Omit<QueryReply, 'headers' | 'data'> & {
    data?: Array<T>;
};
export type GraphClientType = RedisClientType<{
    graph: {
        query: typeof import('./commands/QUERY');
        roQuery: typeof import('./commands/RO_QUERY');
    };
}, RedisFunctions, RedisScripts>;
export default class Graph {
    #private;
    constructor(client: GraphClientType, name: string);
    query<T>(query: RedisCommandArgument, options?: QueryOptions): Promise<GraphReply<T>>;
    roQuery<T>(query: RedisCommandArgument, options?: QueryOptions): Promise<GraphReply<T>>;
}
