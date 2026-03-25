import { Tenant as TenantREST } from '../../openapi/types.js';
import { AggregateReply } from '../../proto/v1/aggregate.js';
import { BatchObject as BatchObjectGRPC, BatchObjectsReply } from '../../proto/v1/batch.js';
import { BatchDeleteReply } from '../../proto/v1/batch_delete.js';
import { SearchReply } from '../../proto/v1/search_get.js';
import { TenantsGetReply } from '../../proto/v1/tenants.js';
import { DbVersionSupport } from '../../utils/dbVersion.js';
import { AggregateGroupByResult, AggregateResult, GenerativeConfigRuntime, PropertiesMetrics } from '../index.js';
import { Tenant } from '../tenants/index.js';
import { BatchObject, BatchObjectsReturn, DeleteManyReturn, GenerativeGroupByReturn, GenerativeReturn, GroupByReturn, WeaviateReturn } from '../types/index.js';
export declare class Deserialize {
    static use(support: DbVersionSupport): Promise<Deserialize>;
    private static aggregateBoolean;
    private static aggregateDate;
    private static aggregateInt;
    private static aggregateNumber;
    private static aggregateText;
    private static mapAggregate;
    private static aggregations;
    static aggregate<T, M extends PropertiesMetrics<T>>(reply: AggregateReply): AggregateResult<T, M>;
    static aggregateGroupBy<T, M extends PropertiesMetrics<T>>(reply: AggregateReply): AggregateGroupByResult<T, M>[];
    query<T, V>(reply: SearchReply): Promise<WeaviateReturn<T, V>>;
    generate<T, V, C extends GenerativeConfigRuntime | undefined>(reply: SearchReply): Promise<GenerativeReturn<T, V, C>>;
    queryGroupBy<T, V>(reply: SearchReply): Promise<GroupByReturn<T, V>>;
    generateGroupBy<T, V>(reply: SearchReply): Promise<GenerativeGroupByReturn<T, V, any>>;
    private properties;
    private references;
    private parsePropertyValue;
    private parseListValue;
    private objectProperties;
    private static metadata;
    private static uuid;
    /**
     * Convert an Uint8Array into a 2D vector array.
     *
     * Defined as an async method so that control can be relinquished back to the event loop on each outer loop for large vectors.
     */
    private static vectorsFromBytes;
    private static vectorFromBytes;
    private static intsFromBytes;
    private static numbersFromBytes;
    private static vectors;
    static batchObjects<T>(reply: BatchObjectsReply, originalObjs: BatchObject<T>[], mappedObjs: BatchObjectGRPC[], elapsed: number): BatchObjectsReturn<T>;
    static deleteMany<V extends boolean>(reply: BatchDeleteReply, verbose?: V): DeleteManyReturn<V>;
    private static activityStatusGRPC;
    static activityStatusREST(status: TenantREST['activityStatus']): Tenant['activityStatus'];
    static tenantsGet(reply: TenantsGetReply): Record<string, Tenant>;
}
