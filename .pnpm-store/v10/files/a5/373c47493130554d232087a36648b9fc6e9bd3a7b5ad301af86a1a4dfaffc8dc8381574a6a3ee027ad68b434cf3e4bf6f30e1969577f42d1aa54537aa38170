/// <reference types="node" resolution-mode="require"/>
import Connection from '../../connection/grpc.js';
import { ConsistencyLevel } from '../../data/index.js';
import { DbVersionSupport } from '../../utils/dbVersion.js';
import { GroupByReturn, ReturnVectors, WeaviateObject, WeaviateReturn } from '../types/index.js';
import { IncludeVector } from '../types/internal.js';
import { BaseBm25Options, BaseHybridOptions, BaseNearOptions, BaseNearTextOptions, FetchObjectByIdOptions, FetchObjectsOptions, GroupByBm25Options, GroupByHybridOptions, GroupByNearOptions, GroupByNearTextOptions, NearMediaType, NearVectorInputType, Query } from './types.js';
declare class QueryManager<T, V> implements Query<T, V> {
    private check;
    private constructor();
    static use<T, V>(connection: Connection, name: string, dbVersionSupport: DbVersionSupport, consistencyLevel?: ConsistencyLevel, tenant?: string): QueryManager<T, V>;
    private parseReply;
    private parseGroupByReply;
    fetchObjectById<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(id: string, opts?: FetchObjectByIdOptions<T, I>): Promise<WeaviateObject<T, RV> | null>;
    fetchObjects<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(opts?: FetchObjectsOptions<T, I>): Promise<WeaviateReturn<T, RV>>;
    bm25<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts?: BaseBm25Options<T, I>): Promise<WeaviateReturn<T, RV>>;
    bm25<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts: GroupByBm25Options<T, I>): Promise<GroupByReturn<T, RV>>;
    hybrid<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts?: BaseHybridOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    hybrid<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string, opts: GroupByHybridOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    nearImage<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(image: string | Buffer, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    nearImage<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(image: string | Buffer, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    nearMedia<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(media: string | Buffer, type: NearMediaType, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    nearMedia<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(media: string | Buffer, type: NearMediaType, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    nearObject<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(id: string, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    nearObject<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(id: string, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    nearText<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string | string[], opts?: BaseNearTextOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    nearText<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(query: string | string[], opts: GroupByNearTextOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
    nearVector<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(vector: NearVectorInputType, opts?: BaseNearOptions<T, V, I>): Promise<WeaviateReturn<T, RV>>;
    nearVector<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>>(vector: NearVectorInputType, opts: GroupByNearOptions<T, V, I>): Promise<GroupByReturn<T, RV>>;
}
declare const _default: typeof QueryManager.use;
export default _default;
export { queryFactory } from './factories.js';
export { BaseBm25Options, BaseHybridOptions, BaseNearOptions, BaseNearTextOptions, Bm25OperatorOptions, Bm25Options, FetchObjectByIdOptions, FetchObjectsOptions, GroupByBm25Options, GroupByHybridOptions, GroupByNearOptions, GroupByNearTextOptions, HybridNearTextSubSearch, HybridNearVectorSubSearch, HybridOptions, HybridSubSearchBase, MoveOptions, NearMediaType, NearOptions, NearTextOptions, Query, QueryReturn, SearchOptions, } from './types.js';
export { Bm25Operator } from './utils.js';
