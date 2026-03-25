/// <reference types="node" />
import Connection from '../../connection/grpc.js';
import { ConsistencyLevel } from '../../data/index.js';
import { DbVersionSupport } from '../../utils/dbVersion.js';
import { BaseBm25Options, BaseHybridOptions, BaseNearOptions, BaseNearTextOptions, FetchObjectsOptions, GroupByBm25Options, GroupByHybridOptions, GroupByNearOptions, GroupByNearTextOptions, NearMediaType } from '../query/types.js';
import { GenerateOptions, GenerativeConfigRuntime, GenerativeGroupByReturn, GenerativeReturn, ReturnVectors } from '../types/index.js';
import { IncludeVector } from '../types/internal.js';
import { Generate } from './types.js';
declare class GenerateManager<T, V> implements Generate<T, V> {
    private check;
    private constructor();
    static use<T, V>(connection: Connection, name: string, dbVersionSupport: DbVersionSupport, consistencyLevel?: ConsistencyLevel, tenant?: string): GenerateManager<T, V>;
    private parseReply;
    private parseGroupByReply;
    fetchObjects<C extends GenerativeConfigRuntime | undefined = undefined>(generate: GenerateOptions<T, C>, opts?: FetchObjectsOptions<T, V>): Promise<GenerativeReturn<T, V, C>>;
    bm25<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(query: string, generate: GenerateOptions<T, C>, opts?: BaseBm25Options<T, I>): Promise<GenerativeReturn<T, RV, C>>;
    bm25<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(query: string, generate: GenerateOptions<T, C>, opts: GroupByBm25Options<T, I>): Promise<GenerativeGroupByReturn<T, RV, C>>;
    hybrid<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(query: string, generate: GenerateOptions<T, C>, opts?: BaseHybridOptions<T, V, I>): Promise<GenerativeReturn<T, RV, C>>;
    hybrid<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(query: string, generate: GenerateOptions<T, C>, opts: GroupByHybridOptions<T, V, I>): Promise<GenerativeGroupByReturn<T, RV, C>>;
    nearImage<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(image: string | Buffer, generate: GenerateOptions<T, C>, opts?: BaseNearOptions<T, V, I>): Promise<GenerativeReturn<T, RV, C>>;
    nearImage<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(image: string | Buffer, generate: GenerateOptions<T, C>, opts: GroupByNearOptions<T, V, I>): Promise<GenerativeGroupByReturn<T, RV, C>>;
    nearObject<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(id: string, generate: GenerateOptions<T, C>, opts?: BaseNearOptions<T, V, I>): Promise<GenerativeReturn<T, RV, C>>;
    nearObject<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(id: string, generate: GenerateOptions<T, C>, opts: GroupByNearOptions<T, V, I>): Promise<GenerativeGroupByReturn<T, RV, C>>;
    nearText<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(query: string | string[], generate: GenerateOptions<T, C>, opts?: BaseNearTextOptions<T, V, I>): Promise<GenerativeReturn<T, RV, C>>;
    nearText<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(query: string | string[], generate: GenerateOptions<T, C>, opts: GroupByNearTextOptions<T, V, I>): Promise<GenerativeGroupByReturn<T, RV, C>>;
    nearVector<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(vector: number[], generate: GenerateOptions<T, C>, opts?: BaseNearOptions<T, V, I>): Promise<GenerativeReturn<T, RV, C>>;
    nearVector<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(vector: number[], generate: GenerateOptions<T, C>, opts: GroupByNearOptions<T, V, I>): Promise<GenerativeGroupByReturn<T, RV, C>>;
    nearMedia<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(media: string | Buffer, type: NearMediaType, generate: GenerateOptions<T, C>, opts?: BaseNearOptions<T, V, I>): Promise<GenerativeReturn<T, RV, C>>;
    nearMedia<I extends IncludeVector<V>, RV extends ReturnVectors<V, I>, C extends GenerativeConfigRuntime | undefined = undefined>(media: string | Buffer, type: NearMediaType, generate: GenerateOptions<T, C>, opts: GroupByNearOptions<T, V, I>): Promise<GenerativeGroupByReturn<T, RV, C>>;
}
declare const _default: typeof GenerateManager.use;
export default _default;
export { generativeParameters } from './config.js';
export { Generate } from './types.js';
