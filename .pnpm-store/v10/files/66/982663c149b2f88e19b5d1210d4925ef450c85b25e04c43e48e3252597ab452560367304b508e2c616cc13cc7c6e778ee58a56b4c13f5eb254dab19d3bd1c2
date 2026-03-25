import { HttpBaseClient } from '../HttpClient';
import { Constructor, FetchOptions, HttpUserBaseReq, HttpUserCreateReq, HttpUserRoleReq, HttpUserUpdatePasswordReq, HttpBaseResponse } from '../types';
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method createUser - Creates a new user in Milvus.
 * @method updateUserPassword - Updates the password of a user.
 * @method dropUser - Deletes a user from Milvus.
 * @method describeUser - Retrieves the description of a specific user.
 * @method listUsers - Lists all users in the Milvus cluster.
 * @method grantRole - Grants a role to a user.
 * @method revokeRole - Revokes a role from a user.
 */
export declare function User<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly userPrefix: string;
        createUser(params: HttpUserCreateReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        updateUserPassword(params: HttpUserUpdatePasswordReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        dropUser(param: HttpUserBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        describeUser(param: HttpUserBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<string[]>>;
        listUsers(options?: FetchOptions): Promise<HttpBaseResponse<string[]>>;
        grantRoleToUser(params: HttpUserRoleReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        revokeRoleFromUser(params: HttpUserRoleReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
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
