import { ConnectionGRPC } from '../../connection/index.js';
import { DbVersionSupport } from '../../utils/dbVersion.js';
import { Tenant, TenantBC, TenantBase, TenantCreate, TenantUpdate } from './types.js';
declare const tenants: (connection: ConnectionGRPC, collection: string, dbVersionSupport: DbVersionSupport) => Tenants;
export default tenants;
export { Tenant, TenantBase, TenantCreate, TenantUpdate };
/**
 * Represents all the CRUD methods available on a collection's multi-tenancy specification within Weaviate.

 * The collection must have been created with multi-tenancy enabled in order to use any of these methods. This class
 * should not be instantiated directly, but is available as a property of the `Collection` class under
 * the `collection.tenants` class attribute.
 *
 * Starting from Weaviate v1.26, the naming convention around tenant activitiy statuses is changing.
 * The changing nomenclature is as follows:
 * - `HOT` is now `ACTIVE`, which means loaded fully into memory and ready for use.
 * - `COLD` is now `INACTIVE`, which means not loaded into memory with files stored on disk.
 *
 * With this change, new statuses are being added. One is mutable and the other two are immutable. They are:
 * - `OFFLOADED`, which means the tenant is not loaded into memory with files stored on the cloud.
 * - `OFFLOADING`, which means the tenant is transitioning to the `OFFLOADED` status.
 * - `ONLOADING`, which means the tenant is transitioning from the `OFFLOADED` status.
 */
export interface Tenants {
    /**
     * Create the specified tenants for a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * For details on the new activity statuses, see the docstring for the `Tenants` interface type.
     *
     * @param {TenantCreate | TenantCreate[]} tenants The tenant or tenants to create.
     * @returns {Promise<Tenant[]>} The created tenant(s) as a list of Tenant.
     */
    create: (tenants: TenantBC | TenantCreate | (TenantBC | TenantCreate)[]) => Promise<Tenant[]>;
    /**
     * Return all tenants currently associated with a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * For details on the new activity statuses, see the docstring for the `Tenants` interface type.
     *
     * @returns {Promise<Record<string, Tenant>>} A list of tenants as an object of Tenant types, where the key is the tenant name.
     */
    get: () => Promise<Record<string, Tenant>>;
    /**
     * Return the specified tenants from a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * For details on the new activity statuses, see the docstring for the `Tenants` interface type.
     *
     * @typedef {TenantBase} T A type that extends TenantBase.
     * @param {(string | T)[]} names The tenants to retrieve.
     * @returns {Promise<Tenant[]>} The list of tenants. If the tenant does not exist, it will not be included in the list.
     */
    getByNames: <T extends TenantBase>(names: (string | T)[]) => Promise<Record<string, Tenant>>;
    /**
     * Return the specified tenant from a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * For details on the new activity statuses, see the docstring for the `Tenants` interface type.
     *
     * @typedef {TenantBase} T A type that extends TenantBase.
     * @param {string | T} name The name of the tenant to retrieve.
     * @returns {Promise<Tenant | null>} The tenant as a Tenant type, or null if the tenant does not exist.
     */
    getByName: <T extends TenantBase>(name: string | T) => Promise<Tenant | null>;
    /**
     * Remove the specified tenants from a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * For details on the new activity statuses, see the docstring for the `Tenants` interface type.
     *
     * @typedef {TenantBase} T A type that extends TenantBase.
     * @param {Tenant | Tenant[]} tenants The tenant or tenants to remove.
     * @returns {Promise<void>} An empty promise.
     */
    remove: <T extends TenantBase>(tenants: string | T | (string | T)[]) => Promise<void>;
    /**
     * Update the specified tenants for a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * For details on the new activity statuses, see the docstring for the `Tenants` interface type.
     *
     * @param {TenantInput | TenantInput[]} tenants The tenant or tenants to update.
     * @returns {Promise<Tenant[]>} The updated tenants as a list of Tenant.
     */
    update: (tenants: TenantBC | TenantUpdate | (TenantBC | TenantUpdate)[]) => Promise<Tenant[]>;
    /**
     * Activate the specified tenants for a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * @param {string | TenantBase | (string | TenantBase)[]} tenant The tenants to activate.
     * @returns {Promise<Tenant[]>} The list of Tenants that have been activated.
     */
    activate: (tenants: string | TenantBase | (string | TenantBase)[]) => Promise<Tenant[]>;
    /**
     * Deactivate the specified tenants for a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * @param {string | TenantBase | (string | TenantBase)[]} tenants The tenants to deactivate.
     * @returns {Promise<Tenant[]>} The list of Tenants that have been deactivated.
     */
    deactivate: (tenants: string | TenantBase | (string | TenantBase)[]) => Promise<Tenant[]>;
    /**
     * Offload the specified tenants for a collection in Weaviate.
     * The collection must have been created with multi-tenancy enabled.
     *
     * @param {string | TenantBase | (string | TenantBase)[]} tenants The tenants to offload.
     * @returns {Promise<Tenant[]>} The list of Tenants that have been offloaded.
     */
    offload: (tenants: string | TenantBase | (string | TenantBase)[]) => Promise<Tenant[]>;
}
