import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "weaviate.v1";
export declare enum TenantActivityStatus {
    TENANT_ACTIVITY_STATUS_UNSPECIFIED = 0,
    TENANT_ACTIVITY_STATUS_HOT = 1,
    TENANT_ACTIVITY_STATUS_COLD = 2,
    TENANT_ACTIVITY_STATUS_FROZEN = 4,
    TENANT_ACTIVITY_STATUS_UNFREEZING = 5,
    TENANT_ACTIVITY_STATUS_FREEZING = 6,
    /** TENANT_ACTIVITY_STATUS_ACTIVE - not used yet - added to let the clients already add code to handle this in the future */
    TENANT_ACTIVITY_STATUS_ACTIVE = 7,
    TENANT_ACTIVITY_STATUS_INACTIVE = 8,
    TENANT_ACTIVITY_STATUS_OFFLOADED = 9,
    TENANT_ACTIVITY_STATUS_OFFLOADING = 10,
    TENANT_ACTIVITY_STATUS_ONLOADING = 11,
    UNRECOGNIZED = -1
}
export declare function tenantActivityStatusFromJSON(object: any): TenantActivityStatus;
export declare function tenantActivityStatusToJSON(object: TenantActivityStatus): string;
export interface TenantsGetRequest {
    collection: string;
    names?: TenantNames | undefined;
}
export interface TenantNames {
    values: string[];
}
export interface TenantsGetReply {
    took: number;
    tenants: Tenant[];
}
export interface Tenant {
    name: string;
    activityStatus: TenantActivityStatus;
}
export declare const TenantsGetRequest: {
    encode(message: TenantsGetRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): TenantsGetRequest;
    fromJSON(object: any): TenantsGetRequest;
    toJSON(message: TenantsGetRequest): unknown;
    create(base?: DeepPartial<TenantsGetRequest>): TenantsGetRequest;
    fromPartial(object: DeepPartial<TenantsGetRequest>): TenantsGetRequest;
};
export declare const TenantNames: {
    encode(message: TenantNames, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): TenantNames;
    fromJSON(object: any): TenantNames;
    toJSON(message: TenantNames): unknown;
    create(base?: DeepPartial<TenantNames>): TenantNames;
    fromPartial(object: DeepPartial<TenantNames>): TenantNames;
};
export declare const TenantsGetReply: {
    encode(message: TenantsGetReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): TenantsGetReply;
    fromJSON(object: any): TenantsGetReply;
    toJSON(message: TenantsGetReply): unknown;
    create(base?: DeepPartial<TenantsGetReply>): TenantsGetReply;
    fromPartial(object: DeepPartial<TenantsGetReply>): TenantsGetReply;
};
export declare const Tenant: {
    encode(message: Tenant, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Tenant;
    fromJSON(object: any): Tenant;
    toJSON(message: Tenant): unknown;
    create(base?: DeepPartial<Tenant>): Tenant;
    fromPartial(object: DeepPartial<Tenant>): Tenant;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
