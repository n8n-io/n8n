import { Fetch } from './lib/fetch';
import { AdminUserAttributes, GenerateLinkParams, GenerateLinkResponse, Pagination, User, UserResponse, GoTrueAdminMFAApi, PageParams } from './lib/types';
import { AuthError } from './lib/errors';
export default class GoTrueAdminApi {
    /** Contains all MFA administration methods. */
    mfa: GoTrueAdminMFAApi;
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected fetch: Fetch;
    constructor({ url, headers, fetch, }: {
        url: string;
        headers?: {
            [key: string]: string;
        };
        fetch?: Fetch;
    });
    /**
     * Removes a logged-in session.
     * @param jwt A valid, logged-in JWT.
     * @param scope The logout sope.
     */
    signOut(jwt: string, scope?: 'global' | 'local' | 'others'): Promise<{
        data: null;
        error: AuthError | null;
    }>;
    /**
     * Sends an invite link to an email address.
     * @param email The email address of the user.
     * @param options Additional options to be included when inviting.
     */
    inviteUserByEmail(email: string, options?: {
        /** A custom data object to store additional metadata about the user. This maps to the `auth.users.user_metadata` column. */
        data?: object;
        /** The URL which will be appended to the email link sent to the user's email address. Once clicked the user will end up on this URL. */
        redirectTo?: string;
    }): Promise<UserResponse>;
    /**
     * Generates email links and OTPs to be sent via a custom email provider.
     * @param email The user's email.
     * @param options.password User password. For signup only.
     * @param options.data Optional user metadata. For signup only.
     * @param options.redirectTo The redirect url which should be appended to the generated link
     */
    generateLink(params: GenerateLinkParams): Promise<GenerateLinkResponse>;
    /**
     * Creates a new user.
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    createUser(attributes: AdminUserAttributes): Promise<UserResponse>;
    /**
     * Get a list of users.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     * @param params An object which supports `page` and `perPage` as numbers, to alter the paginated results.
     */
    listUsers(params?: PageParams): Promise<{
        data: {
            users: User[];
            aud: string;
        } & Pagination;
        error: null;
    } | {
        data: {
            users: [];
        };
        error: AuthError;
    }>;
    /**
     * Get user by id.
     *
     * @param uid The user's unique identifier
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    getUserById(uid: string): Promise<UserResponse>;
    /**
     * Updates the user data.
     *
     * @param attributes The data you want to update.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    updateUserById(uid: string, attributes: AdminUserAttributes): Promise<UserResponse>;
    /**
     * Delete a user. Requires a `service_role` key.
     *
     * @param id The user id you want to remove.
     * @param shouldSoftDelete If true, then the user will be soft-deleted from the auth schema. Soft deletion allows user identification from the hashed user ID but is not reversible.
     * Defaults to false for backward compatibility.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    deleteUser(id: string, shouldSoftDelete?: boolean): Promise<UserResponse>;
    private _listFactors;
    private _deleteFactor;
}
//# sourceMappingURL=GoTrueAdminApi.d.ts.map