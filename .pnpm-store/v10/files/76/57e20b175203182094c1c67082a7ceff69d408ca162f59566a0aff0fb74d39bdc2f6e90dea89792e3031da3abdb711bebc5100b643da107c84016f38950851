import { HttpClient } from './http.js';
/**
 * The allowed authentication credentials. See [the docs](https://weaviate.io/developers/weaviate/configuration/authentication) for more information.
 *
 * The following types are allowed:
 * - `AuthUserPasswordCredentials`
 * - `AuthAccessTokenCredentials`
 * - `AuthClientCredentials`
 * - `ApiKey`
 * - `string`
 *
 * A string is interpreted as an API key.
 */
export type AuthCredentials = AuthUserPasswordCredentials | AuthAccessTokenCredentials | AuthClientCredentials | ApiKey | string;
export declare const isApiKey: (creds?: AuthCredentials) => creds is string | ApiKey;
export declare const mapApiKey: (creds: ApiKey | string) => ApiKey;
interface AuthenticatorResult {
    accessToken: string;
    expiresAt: number;
    refreshToken: string;
}
interface OidcCredentials {
    silentRefresh: boolean;
}
export interface OidcAuthFlow {
    refresh: () => Promise<AuthenticatorResult>;
}
export declare class OidcAuthenticator {
    private readonly http;
    private readonly creds;
    private accessToken;
    private refreshToken?;
    private expiresAt;
    private refreshRunning;
    private refreshInterval;
    constructor(http: HttpClient, creds: any);
    refresh: (localConfig: any) => Promise<void>;
    getOpenidConfig: (localConfig: any) => Promise<{
        clientId: any;
        provider: any;
        scopes: any;
    }>;
    startTokenRefresh: (authenticator: {
        refresh: () => any;
    }) => void;
    stopTokenRefresh: () => void;
    refreshTokenProvided: () => boolean | "" | undefined;
    getAccessToken: () => string;
    getExpiresAt: () => number;
    resetExpiresAt(): void;
}
export interface UserPasswordCredentialsInput {
    username: string;
    password?: string;
    scopes?: any[];
    silentRefresh?: boolean;
}
export declare class AuthUserPasswordCredentials implements OidcCredentials {
    private username;
    private password?;
    private scopes?;
    readonly silentRefresh: boolean;
    constructor(creds: UserPasswordCredentialsInput);
}
export interface AccessTokenCredentialsInput {
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
    silentRefresh?: boolean;
}
export declare class AuthAccessTokenCredentials implements OidcCredentials {
    readonly accessToken: string;
    readonly expiresAt: number;
    readonly refreshToken?: string;
    readonly silentRefresh: boolean;
    constructor(creds: AccessTokenCredentialsInput);
    validate: (creds: AccessTokenCredentialsInput) => void;
}
export interface ClientCredentialsInput {
    clientSecret: string;
    scopes?: any[];
    silentRefresh?: boolean;
}
export declare class AuthClientCredentials implements OidcCredentials {
    private clientSecret;
    private scopes?;
    readonly silentRefresh: boolean;
    constructor(creds: ClientCredentialsInput);
}
export declare class ApiKey {
    readonly apiKey: string;
    constructor(apiKey: string);
}
export {};
