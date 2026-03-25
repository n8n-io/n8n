import * as CONFIG_GET from './CONFIG_GET';
import * as CONFIG_SET from './CONFIG_SET';
import * as DELETE from './DELETE';
import * as EXPLAIN from './EXPLAIN';
import * as LIST from './LIST';
import * as PROFILE from './PROFILE';
import * as QUERY from './QUERY';
import * as RO_QUERY from './RO_QUERY';
import * as SLOWLOG from './SLOWLOG';
import { RedisCommandArgument, RedisCommandArguments } from '@redis/client/dist/lib/commands';
declare const _default: {
    CONFIG_GET: typeof CONFIG_GET;
    configGet: typeof CONFIG_GET;
    CONFIG_SET: typeof CONFIG_SET;
    configSet: typeof CONFIG_SET;
    DELETE: typeof DELETE;
    delete: typeof DELETE;
    EXPLAIN: typeof EXPLAIN;
    explain: typeof EXPLAIN;
    LIST: typeof LIST;
    list: typeof LIST;
    PROFILE: typeof PROFILE;
    profile: typeof PROFILE;
    QUERY: typeof QUERY;
    query: typeof QUERY;
    RO_QUERY: typeof RO_QUERY;
    roQuery: typeof RO_QUERY;
    SLOWLOG: typeof SLOWLOG;
    slowLog: typeof SLOWLOG;
};
export default _default;
type QueryParam = null | string | number | boolean | QueryParams | Array<QueryParam>;
type QueryParams = {
    [key: string]: QueryParam;
};
export interface QueryOptions {
    params?: QueryParams;
    TIMEOUT?: number;
}
export type QueryOptionsBackwardCompatible = QueryOptions | number;
export declare function pushQueryArguments(args: RedisCommandArguments, graph: RedisCommandArgument, query: RedisCommandArgument, options?: QueryOptionsBackwardCompatible, compact?: boolean): RedisCommandArguments;
