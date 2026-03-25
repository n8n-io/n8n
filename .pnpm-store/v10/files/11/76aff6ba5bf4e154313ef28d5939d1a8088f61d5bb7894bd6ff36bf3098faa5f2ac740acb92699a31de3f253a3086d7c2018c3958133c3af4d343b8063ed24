import { HttpBaseClient } from '../HttpClient';
import { Constructor, FetchOptions, HttpRolePrivilegeReq, HttpRoleDescribeResponse, HttpBaseResponse, HttpRoleBaseReq } from '../types';
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listRoles - Lists all roles in the system.
 * @method describeRole - Describes a role.
 * @method createRole - Creates a new role.
 * @method dropRole - Deletes a role.
 * @method grantPrivilegeToRole - Grants a privilege to a role.
 * @method revokePrivilegeFromRole - Revokes a privilege from a role.
 */
export declare function Role<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly rolePrefix: string;
        listRoles(options?: FetchOptions): Promise<HttpBaseResponse<string[]>>;
        describeRole(params: HttpRoleBaseReq, options?: FetchOptions): Promise<HttpRoleDescribeResponse>;
        createRole(params: HttpRoleBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        dropRole(params: HttpRoleBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        grantPrivilegeToRole(params: HttpRolePrivilegeReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        revokePrivilegeFromRole(params: HttpRolePrivilegeReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        config: import("../types").HttpClientConfig;
        readonly baseURL: string;
        readonly authorization: string;
        readonly database: string;
        readonly timeout: number;
        readonly headers: {
            Authorization: string;
            Accept: string;
            ContentType: string;
            'Accept-Type-Allow-Int64': string;
        };
        readonly fetch: ((input: any, init?: any) => Promise<any>) | typeof fetch;
        POST<T>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T>;
        GET<T_1>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
    };
} & T;
