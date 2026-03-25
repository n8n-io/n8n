import { DataType, MetricType, CreateIndexParam, collectionNameReq, CreateCollectionReq, CreateIndexSimpleReq } from '../';
export interface CreateColReq extends collectionNameReq {
    dimension: number;
    primary_field_name?: string;
    id_type?: DataType.Int64 | DataType.VarChar;
    vector_field_name?: string;
    metric_type?: string | MetricType;
    enable_dynamic_field?: boolean;
    enableDynamicField?: boolean;
    description?: string;
    auto_id?: boolean;
    consistency_level?: 'Strong' | 'Session' | 'Bounded' | 'Eventually' | 'Customized';
    index_params?: CreateIndexParam;
    timeout?: number;
}
export type CreateColWithSchemaAndIndexParamsReq = CreateCollectionReq & {
    index_params: Omit<CreateIndexSimpleReq, 'collection_name'>[] | Omit<CreateIndexSimpleReq, 'collection_name'>;
};
