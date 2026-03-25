import * as stream from 'stream';
import { JWTInput } from './credentials';
import { GetTokenResponse, OAuth2Client, OAuth2ClientOptions } from './oauth2client';
export declare const USER_REFRESH_ACCOUNT_TYPE = "authorized_user";
export interface UserRefreshClientOptions extends OAuth2ClientOptions {
    /**
     * The authentication client ID.
     */
    clientId?: string;
    /**
     * The authentication client secret.
     */
    clientSecret?: string;
    /**
     * The authentication refresh token.
     */
    refreshToken?: string;
}
export declare class UserRefreshClient extends OAuth2Client {
    _refreshToken?: string | null;
    /**
     * The User Refresh Token client.
     *
     * @param optionsOrClientId The User Refresh Token client options. Passing an `clientId` directly is **@DEPRECATED**.
     * @param clientSecret **@DEPRECATED**. Provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead.
     * @param refreshToken **@DEPRECATED**. Provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead.
     * @param eagerRefreshThresholdMillis **@DEPRECATED**. Provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead.
     * @param forceRefreshOnFailure **@DEPRECATED**. Provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead.
     */
    constructor(optionsOrClientId?: string | UserRefreshClientOptions, 
    /**
     * @deprecated - provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead
     */
    clientSecret?: UserRefreshClientOptions['clientSecret'], 
    /**
     * @deprecated - provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead
     */
    refreshToken?: UserRefreshClientOptions['refreshToken'], 
    /**
     * @deprecated - provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead
     */
    eagerRefreshThresholdMillis?: UserRefreshClientOptions['eagerRefreshThresholdMillis'], 
    /**
     * @deprecated - provide a {@link UserRefreshClientOptions `UserRefreshClientOptions`} object in the first parameter instead
     */
    forceRefreshOnFailure?: UserRefreshClientOptions['forceRefreshOnFailure']);
    /**
     * Refreshes the access token.
     * @param refreshToken An ignored refreshToken..
     * @param callback Optional callback.
     */
    protected refreshTokenNoCache(): Promise<GetTokenResponse>;
    fetchIdToken(targetAudience: string): Promise<string>;
    /**
     * Create a UserRefreshClient credentials instance using the given input
     * options.
     * @param json The input object.
     */
    fromJSON(json: JWTInput): void;
    /**
     * Create a UserRefreshClient credentials instance using the given input
     * stream.
     * @param inputStream The input stream.
     * @param callback Optional callback.
     */
    fromStream(inputStream: stream.Readable): Promise<void>;
    fromStream(inputStream: stream.Readable, callback: (err?: Error) => void): void;
    private fromStreamAsync;
    /**
     * Create a UserRefreshClient credentials instance using the given input
     * options.
     * @param json The input object.
     */
    static fromJSON(json: JWTInput): UserRefreshClient;
}
