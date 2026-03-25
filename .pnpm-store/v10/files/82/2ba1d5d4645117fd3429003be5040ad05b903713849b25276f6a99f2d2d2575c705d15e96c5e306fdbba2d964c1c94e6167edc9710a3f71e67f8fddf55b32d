/** The base type for a tenant. Only the name is required. */
export type TenantBase = {
    /** The name of the tenant. */
    name: string;
};
/** The expected type when creating a tenant. */
export type TenantCreate = TenantBase & {
    /** The activity status of the tenant. Defaults to 'ACTIVE' if not provided. */
    activityStatus?: 'ACTIVE' | 'INACTIVE';
};
/** The expected type when updating a tenant. */
export type TenantUpdate = TenantBase & {
    /** The activity status of the tenant. Must be set to one of the options. */
    activityStatus: 'ACTIVE' | 'INACTIVE' | 'OFFLOADED';
};
/** The expected type when getting tenants. */
export type TenantsGetOptions = {
    tenants?: string;
};
/**
 * The expected type returned by all tenant methods.
 */
export type Tenant = TenantBase & {
    /** There are two statuses that are immutable: `OFFLOADED` and `ONLOADING, which are set by the server:
     * - `ONLOADING`, which means the tenant is transitioning from the `OFFLOADED` status to `ACTIVE/INACTIVE`.
     * - `OFFLOADING`, which means the tenant is transitioning from `ACTIVE/INACTIVE` to the `OFFLOADED` status.
     * The other three statuses are mutable within the `.create` and `.update`, methods:
     * - `ACTIVE`, which means loaded fully into memory and ready for use.
     * - `INACTIVE`, which means not loaded into memory with files stored on disk.
     * - `OFFLOADED`, which means not loaded into memory with files stored on the cloud.
     */
    activityStatus: 'ACTIVE' | 'INACTIVE' | 'OFFLOADED' | 'OFFLOADING' | 'ONLOADING';
};
/** This is the type of the Tenant as defined in Weaviate's OpenAPI schema. It is included here for Backwards Compatibility. */
export type TenantBC = TenantBase & {
    activityStatus?: 'HOT' | 'COLD' | 'FROZEN';
};
