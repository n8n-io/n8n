import { FloatVector } from '..';
type Fetch = (input: any, init?: any) => Promise<any>;
export type Constructor<T = {}> = new (...args: any[]) => T;
export type FetchOptions = {
    abortController: AbortController;
    timeout: number;
};
type HttpClientConfigBase = {
    database?: string;
    token?: string;
    username?: string;
    password?: string;
    timeout?: number;
    fetch?: Fetch;
    acceptInt64?: boolean;
};
type HttpClientConfigAddress = HttpClientConfigBase & {
    endpoint: string;
    baseURL?: string;
};
type HttpClientConfigBaseURL = HttpClientConfigBase & {
    endpoint?: string;
    baseURL: string;
};
export type HttpClientConfig = HttpClientConfigAddress | HttpClientConfigBaseURL;
export interface HttpBaseReq {
    dbName?: string;
    collectionName: string;
}
export interface HttpBaseResponse<T = {}> {
    code: number;
    data: T;
    message?: string;
}
type CollectionIndexParam = {
    metricType: string;
    fieldName: string;
    indexName: string;
    params?: {
        index_type: string;
        nlist?: number;
        M?: string;
        efConstruction?: string;
    };
};
type CollectionCreateParams = {
    max_length?: number;
    enableDynamicField?: boolean;
    shardsNum?: number;
    consistencyLevel?: string;
    partitionsNum?: number;
    ttlSeconds?: number;
};
type CollectionCreateField = {
    fieldName: string;
    dataType: string;
    elementDataType?: string;
    isPrimary?: boolean;
    isPartitionKey?: boolean;
    elementTypeParams?: {
        max_length?: number;
        dim?: number;
        max_capacity?: number;
    };
};
type CollectionCreateSchema = {
    autoID?: boolean;
    enabledDynamicField?: boolean;
    fields: CollectionCreateField[];
};
export interface HttpCollectionCreateReq extends HttpBaseReq {
    dimension?: number;
    metricType?: string;
    idType?: string;
    autoID?: boolean;
    primaryFieldName?: string;
    vectorFieldName?: string;
    schema?: CollectionCreateSchema;
    indexParams?: CollectionIndexParam[];
    params?: CollectionCreateParams;
}
export interface HttpCollectionListReq extends Omit<HttpBaseReq, 'collectionName'> {
}
type Field = {
    autoId?: boolean;
    description: string;
    primaryKey?: boolean;
    type: string;
};
type Index = {
    fieldName: string;
    indexName: string;
    metricType: string;
};
export interface HttpCollectionDescribeResponse extends HttpBaseResponse<{
    collectionName: string;
    description: string;
    fields: Field[];
    indexes: Index[];
    load: string;
    shardsNum: number;
    enableDynamicField: boolean;
}> {
}
export interface HttpCollectionListResponse extends HttpBaseResponse<string[]> {
}
export interface HttpCollectionHasResponse extends HttpBaseResponse<{
    has: boolean;
}> {
}
export interface HttpCollectionRenameReq extends HttpBaseReq {
    newCollectionName: string;
    newDbName?: string;
}
export interface HttpCollectionStatisticsResponse extends HttpBaseResponse<{
    rowCount: number;
}> {
}
export interface HttpCollectionLoadStateReq extends HttpBaseReq {
    partitionNames?: string;
}
export interface HttpCollectionLoadStateResponse extends HttpBaseResponse<{
    loadProgress: number;
    loadState: string;
}> {
}
export interface HttpVectorInsertReq extends HttpBaseReq {
    data: Record<string, any>[];
}
export interface HttpVectorInsertResponse extends HttpBaseResponse<{
    insertCount: number;
    insertIds: number | string[];
}> {
}
export interface HttpVectorUpsertResponse extends HttpBaseResponse<{
    upsertCount: number;
    upsertIds: number | string[];
}> {
}
export interface HttpVectorGetReq extends HttpBaseReq {
    id: number | number[] | string | string[];
    outputFields: string[];
}
export interface HttpVectorDeleteReq extends HttpBaseReq {
    filter: string;
    partitionName?: string;
}
export interface HttpVectorQueryReq extends HttpBaseReq {
    outputFields: string[];
    filter?: string;
    limit?: number;
    offset?: number;
    partitionNames?: string[];
}
type QueryResult = Record<string, any>[];
export interface HttpVectorQueryResponse extends HttpBaseResponse<QueryResult> {
}
export interface HttpVectorSearchReq extends HttpVectorQueryReq {
    data: FloatVector[];
    annsField?: string;
    groupingField?: string;
    searchParams?: Record<string, any>;
}
interface HttpVectorHybridSearchParams {
    data: FloatVector[];
    limit: number;
    filter?: string;
    outputFields?: string[];
    offset?: number;
    annsField?: string;
    ignoreGrowing?: boolean;
    metricType?: string;
    params?: Record<string, string | number>;
}
export interface HttpVectorHybridSearchReq extends HttpBaseReq {
    search: HttpVectorHybridSearchParams[];
    rerank: Record<string, any>;
    partitionNames?: string[];
    outputFields?: string[];
    limit?: number;
}
export interface HttpVectorSearchResponse extends HttpVectorQueryResponse {
    data: QueryResult & {
        distance: number | string;
    };
}
export interface HttpPartitionBaseReq extends HttpBaseReq {
    partitionName: string;
}
export interface HttpPartitionListReq extends HttpBaseReq {
    partitionNames: string[];
}
export interface HttpPartitionHasResponse extends HttpBaseResponse<{
    has: boolean;
}> {
}
export interface HttpPartitionStatisticsResponse extends HttpBaseResponse<{
    rowCount: number;
}> {
}
export interface HttpUserBaseReq {
    userName: string;
}
export interface HttpUserCreateReq extends HttpUserBaseReq {
    password: string;
}
export interface HttpUserUpdatePasswordReq extends HttpUserCreateReq {
    newPassword: string;
}
export interface HttpUserRoleReq extends HttpUserBaseReq {
    roleName: string;
}
export interface HttpRoleBaseReq {
    roleName: string;
}
export interface HttpRolePrivilegeReq extends HttpRoleBaseReq {
    objectType: string;
    objectName: string;
    privilege: string;
}
export interface HttpRoleDescribeResponse extends HttpBaseResponse<HttpRolePrivilegeReq[]> {
}
export interface HttpIndexCreateReq extends HttpBaseReq {
    indexParams: CollectionIndexParam[];
}
export interface HttpIndexBaseReq extends HttpBaseReq {
    indexName: string;
}
type IndexDescribeType = {
    failReason: string;
    fieldName: string;
    indexName: string;
    indexState: string;
    indexType: string;
    indexedRows: number;
    metricType: string;
    pendingRows: number;
    totalRows: number;
};
export interface HttpIndexDescribeResponse extends HttpBaseResponse<IndexDescribeType[]> {
}
export type HttpAliasBaseReq = Pick<HttpBaseReq, 'dbName'>;
export interface HttpAliasCreateReq extends HttpBaseReq {
    aliasName: string;
}
export type HttpAliasAlterReq = HttpAliasCreateReq;
export interface HttpAliasDescribeReq extends HttpAliasBaseReq {
    aliasName: string;
}
export interface HttpAliasDescribeResponse extends HttpBaseResponse<{
    aliasName: string;
} & Required<HttpBaseReq>> {
}
export interface HttpAliasDropReq extends Partial<HttpBaseReq> {
    aliasName: string;
}
type ImportJobType = {
    collectionName: string;
    jobId: string;
    progress: number;
    state: string;
};
type ImportJobDetailType = {
    completeTime: string;
    fileName: string;
    fileSize: number;
    importedRows: number;
    progress: number;
    state: string;
    totalRows: number;
};
export interface HttpImportListResponse extends HttpBaseResponse<{
    records: ImportJobType[];
}> {
}
export interface HttpImportCreateReq extends HttpBaseReq {
    files: string[][];
    options?: {
        timeout: string;
    };
}
export interface HttpImportCreateResponse extends HttpBaseResponse<{
    jobId: string;
}> {
}
export interface HttpImportProgressReq extends Pick<HttpBaseReq, 'dbName'> {
    jobId: string;
}
export interface HttpImportProgressResponse extends HttpBaseResponse<{
    jobId: string;
    progress: number;
    state: string;
    totalRows?: number;
    importedRows?: number;
    fileSize?: number;
    completeTime?: string;
    collectionName?: string;
    details?: ImportJobDetailType[];
    reason?: string;
}> {
}
export {};
