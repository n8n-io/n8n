import { AuthClient, BodyResponseCallback } from './authclient';
import { GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
import { Credentials } from './credentials';
import { SharedExternalAccountClientOptions } from './baseexternalclient';
/**
 * The credentials JSON file type for external account authorized user clients.
 */
export declare const EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE = "external_account_authorized_user";
/**
 * External Account Authorized User Credentials JSON interface.
 */
export interface ExternalAccountAuthorizedUserClientOptions extends SharedExternalAccountClientOptions {
    type: typeof EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE;
    client_id: string;
    client_secret: string;
    refresh_token: string;
    token_info_url: string;
    revoke_url?: string;
}
/**
 * Internal interface for tracking the access token expiration time.
 */
interface CredentialsWithResponse extends Credentials {
    res?: GaxiosResponse | null;
}
/**
 * External Account Authorized User Client. This is used for OAuth2 credentials
 * sourced using external identities through Workforce Identity Federation.
 * Obtaining the initial access and refresh token can be done through the
 * Google Cloud CLI.
 */
export declare class ExternalAccountAuthorizedUserClient extends AuthClient {
    private cachedAccessToken;
    private readonly externalAccountAuthorizedUserHandler;
    private refreshToken;
    /**
     * Instantiates an ExternalAccountAuthorizedUserClient instances using the
     * provided JSON object loaded from a credentials files.
     * An error is throws if the credential is not valid.
     * @param options The external account authorized user option object typically
     *   from the external accoutn authorized user JSON credential file.
     */
    constructor(options: ExternalAccountAuthorizedUserClientOptions);
    getAccessToken(): Promise<{
        token?: string | null;
        res?: GaxiosResponse | null;
    }>;
    getRequestHeaders(): Promise<Headers>;
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    request<T>(opts: GaxiosOptions, callback: BodyResponseCallback<T>): void;
    /**
     * Authenticates the provided HTTP request, processes it and resolves with the
     * returned response.
     * @param opts The HTTP request options.
     * @param reAuthRetried Whether the current attempt is a retry after a failed attempt due to an auth failure.
     * @return A promise that resolves with the successful response.
     */
    protected requestAsync<T>(opts: GaxiosOptions, reAuthRetried?: boolean): Promise<GaxiosResponse<T>>;
    /**
     * Forces token refresh, even if unexpired tokens are currently cached.
     * @return A promise that resolves with the refreshed credential.
     */
    protected refreshAccessTokenAsync(): Promise<CredentialsWithResponse>;
    /**
     * Returns whether the provided credentials are expired or not.
     * If there is no expiry time, assumes the token is not expired or expiring.
     * @param credentials The credentials to check for expiration.
     * @return Whether the credentials are expired or not.
     */
    private isExpired;
}
export {};
